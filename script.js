// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  getDoc
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// Firebase configuration (replace with your own config)
const firebaseConfig = {
  apiKey: "AIzaSyCBg6RQXIiC2BKE2HjzochEeiajc7fBnZA",
  authDomain: "bookswap-bac8b.firebaseapp.com",
  projectId: "bookswap-bac8b",
  storageBucket: "bookswap-bac8b.firebasestorage.app",
  messagingSenderId: "145814837614",
  appId: "1:145814837614:web:7d52eb3c29fe659688097f",
  measurementId: "G-Q33CEMLPZ5"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Generate a unique identifier for the user if not already set.
let currentUser = localStorage.getItem("ownerId");
if (!currentUser) {
  currentUser =
    (crypto.randomUUID && crypto.randomUUID()) ||
    Math.random().toString(36).substr(2, 9);
  localStorage.setItem("ownerId", currentUser);
}
console.log("Current User ID:", currentUser);

// ------------------------------
// BookManager Object
// ------------------------------
const BookManager = {
  MAX_IMAGES: 5,
  MAX_SIZE_MB: 2,

  processImage(file) {
    return new Promise((resolve, reject) => {
      if (file.size > this.MAX_SIZE_MB * 1024 * 1024) {
        reject(new Error(`Image exceeds ${this.MAX_SIZE_MB}MB`));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Error reading image"));
      reader.readAsDataURL(file);
    });
  },

  async handleImages(files) {
    try {
      const images = await Promise.all(
        Array.from(files)
          .slice(0, this.MAX_IMAGES)
          .map((file) =>
            this.processImage(file).then((src) => ({ src, name: file.name }))
          )
      );
      return images;
    } catch (error) {
      throw new Error(error.message);
    }
  },

  async saveListing(formData, files, existingId = null) {
    try {
      let images = [];
      if (existingId) {
        const docSnap = await getDoc(doc(db, "books", existingId));
        images = docSnap.exists() ? docSnap.data().images : [];
      }
      if (files.length > 0 || !existingId) {
        const processedImages = await this.handleImages(files);
        images = processedImages.map((imgObj) => imgObj.src);
      }
      const bookData = {
        owner: currentUser,
        title: formData.title.trim(),
        author: formData.author.trim(),
        price: parseFloat(formData.price),
        condition: formData.condition,
        location: formData.location.trim(),
        phone: formData.phone.replace(/\D/g, "").slice(0, 10),
        images,
        timestamp: new Date().toISOString(),
      };

      if (isNaN(bookData.price) || bookData.price <= 0) {
        throw new Error("Please enter a valid price");
      }

      if (existingId) {
        await updateDoc(doc(db, "books", existingId), bookData);
        return existingId;
      } else {
        const docRef = await addDoc(collection(db, "books"), bookData);
        return docRef.id;
      }
    } catch (error) {
      alert(`Error: ${error.message}`);
      console.error("saveListing error:", error);
      return null;
    }
  },

  async deleteListing(id) {
    try {
      if (confirm("Are you sure you want to delete this listing?")) {
        await deleteDoc(doc(db, "books", id));
        alert("Listing deleted successfully");
      }
    } catch (error) {
      alert(`Deletion failed: ${error.message}`);
      console.error("deleteListing error:", error);
    }
  },
};

// ------------------------------
// Helper Functions for "Near Me"
// ------------------------------

// Convert degrees to radians
function toRad(deg) {
  return deg * Math.PI / 180;
}

// Calculate distance (in km) between two coordinates using the Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Reverse geocode user's coordinates to get the city (or town/village)
async function getCityFromCoordinates(lat, lon) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`
    );
    const data = await response.json();
    return data.address.city || data.address.town || data.address.village || "";
  } catch (e) {
    console.error("Reverse geocoding failed", e);
    return "";
  }
}

// Cache for geocoding listings to reduce API calls
const geocodeCache = {};

// Get coordinates for a given location string using Nominatim Search API (with caching)
async function getCoordinatesForLocation(location) {
  if (geocodeCache[location]) {
    return geocodeCache[location];
  }
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(location)}`
    );
    const data = await response.json();
    if (data && data.length > 0) {
      const coords = { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
      geocodeCache[location] = coords;
      return coords;
    }
  } catch (e) {
    console.error("Geocoding failed for location:", location, e);
  }
  geocodeCache[location] = null;
  return null;
}

// ------------------------------
// Buy Page Implementation
// ------------------------------
async function initializeBuyPage() {
  const bookGrid = document.getElementById("bookGrid");
  const searchInput = document.getElementById("searchInput");
  const nearMeBtn = document.getElementById("nearMeBtn");

  if (!bookGrid) {
    console.error("Element with ID 'bookGrid' not found.");
    return;
  }

  // Store all books locally.
  let allBooks = [];

  // Render books to the grid.
  function renderBooks(books) {
    bookGrid.innerHTML = books.map(createBookCard).join("");
    highlightNewBook();
  }

  // Listen for Firestore updates.
  const q = query(collection(db, "books"), orderBy("timestamp", "desc"));
  onSnapshot(q, (snapshot) => {
    if (snapshot.empty) {
      bookGrid.innerHTML = "<p>No books available</p>";
      allBooks = [];
      return;
    }
    allBooks = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    renderBooks(allBooks);
  });

  // Search functionality.
  searchInput.addEventListener("input", () => {
    const searchTerm = searchInput.value.toLowerCase().trim();
    const filteredBooks = allBooks.filter(
      (book) =>
        book.title.toLowerCase().includes(searchTerm) ||
        book.author.toLowerCase().includes(searchTerm)
    );
    if (filteredBooks.length === 0) {
      bookGrid.innerHTML = "<p>No matching books found</p>";
    } else {
      renderBooks(filteredBooks);
    }
  });

  // New "Near Me" sorting function:
  // For each book, calculate the distance from the user.
  // If the book's location does NOT include the user's city, add a penalty so it sorts lower.
  async function sortBooksByDistance(userLat, userLon) {
    const userCity = await getCityFromCoordinates(userLat, userLon);
    console.log("User City:", userCity);
    const PENALTY = 1000; // km penalty for listings not matching the user's city

    const booksWithDistance = await Promise.all(
      allBooks.map(async (book) => {
        const coords = await getCoordinatesForLocation(book.location);
        let distance = Number.MAX_VALUE;
        if (coords) {
          distance = calculateDistance(userLat, userLon, coords.lat, coords.lon);
        }
        // If the book's location string does not include the user city, add penalty.
        if (userCity && !book.location.toLowerCase().includes(userCity.toLowerCase())) {
          distance += PENALTY;
        }
        return { ...book, distance };
      })
    );
    booksWithDistance.sort((a, b) => a.distance - b.distance);
    renderBooks(booksWithDistance);
  }

  // Near Me button functionality.
  if (nearMeBtn) {
    nearMeBtn.addEventListener("click", () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const userLat = position.coords.latitude;
            const userLon = position.coords.longitude;
            await sortBooksByDistance(userLat, userLon);
            alert("Books sorted by proximity from your location.");
          },
          (error) => {
            alert("Geolocation error: " + error.message);
          }
        );
      } else {
        alert("Geolocation is not supported by your browser.");
      }
    });
  }

  // Highlight new book if applicable.
  function highlightNewBook() {
    const urlParams = new URLSearchParams(window.location.search);
    const newId = urlParams.get("new");
    if (newId) {
      history.replaceState(null, "", "buy.html");
      const newBookCard = document.querySelector(`[data-id="${newId}"]`);
      if (newBookCard) {
        newBookCard.scrollIntoView({ behavior: "smooth" });
        newBookCard.style.animation = "highlightPulse 1.5s ease 2";
      }
    }
  }
}

// Helper: Create HTML for a single book card.
function createBookCard(book) {
  return `
    <div class="book-card" data-id="${book.id}">
      <div class="book-images">
        ${book.images.map(src => `<img src="${src}" class="book-image" alt="${book.title} cover">`).join('')}
      </div>
      <div class="book-details">
        <h3>${book.title}</h3>
        <p class="book-author">By ${book.author}</p>
        <div class="book-meta">
          <span class="book-price">₹${parseFloat(book.price).toFixed(2)}</span>
          <span class="book-condition">${book.condition}</span>
        </div>
        <div class="book-location">📍 ${book.location}</div>
        <div class="book-contact">📞 ${book.phone}</div>
        ${
          (book.owner === currentUser)
            ? `<div class="owner-controls">
                 <button class="edit-btn" onclick="location.href='sell.html?edit=${book.id}'">Edit</button>
                 <button class="delete-btn" onclick="BookManager.deleteListing('${book.id}')">Delete</button>
               </div>`
            : ""
        }
      </div>
    </div>
  `;
}

// Initialize the page on DOMContentLoaded.
document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("bookGrid")) {
    initializeBuyPage();
  }
});

// Expose BookManager globally for inline HTML calls.
window.BookManager = BookManager;
