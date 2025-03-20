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
let currentUser = localStorage.getItem('ownerId');
if (!currentUser) {
  currentUser = (crypto.randomUUID && crypto.randomUUID()) || Math.random().toString(36).substr(2, 9);
  localStorage.setItem('ownerId', currentUser);
}
console.log("Current User ID:", currentUser);

// --- BookManager Object ---
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
      reader.onerror = () => reject(new Error('Error reading image'));
      reader.readAsDataURL(file);
    });
  },

  async handleImages(files) {
    try {
      const images = await Promise.all(
        Array.from(files)
          .slice(0, this.MAX_IMAGES)
          .map(file =>
            this.processImage(file).then(src => ({ src, name: file.name }))
          )
      );
      return images;
    } catch (error) {
      throw new Error(error.message);
    }
  },

  // Note: Ensure your formData contains coordinates (lat/lon) if available.
  async saveListing(formData, files, existingId = null) {
    try {
      let images = [];
      if (existingId) {
        const docSnap = await getDoc(doc(db, "books", existingId));
        images = docSnap.exists() ? docSnap.data().images : [];
      }
      if (files.length > 0 || !existingId) {
        const processedImages = await this.handleImages(files);
        images = processedImages.map(imgObj => imgObj.src);
      }
      const bookData = {
        owner: currentUser,  
        title: formData.title.trim(),
        author: formData.author.trim(),
        price: parseFloat(formData.price),
        condition: formData.condition,
        location: formData.location.trim(),
        phone: formData.phone.replace(/\D/g, '').slice(0, 10),
        images,
        // Optionally include coordinates if provided by your form or geocoding API.
        coordinates: formData.coordinates || null,
        timestamp: new Date().toISOString()
      };

      if (isNaN(bookData.price) || bookData.price <= 0) {
        throw new Error('Please enter a valid price');
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
        alert('Listing deleted successfully');
      }
    } catch (error) {
      alert(`Deletion failed: ${error.message}`);
      console.error("deleteListing error:", error);
    }
  }
};

// --- Sell Page Implementation ---
async function initializeSellPage() {
  const form = document.getElementById('sellForm');
  const fileInput = document.getElementById('bookCover');
  const previewContainer = document.getElementById('previewContainer');
  const urlParams = new URLSearchParams(window.location.search);
  const editId = urlParams.get('edit');

  if (editId) {
    try {
      const docSnap = await getDoc(doc(db, "books", editId));
      if (docSnap.exists() && docSnap.data().owner === currentUser) {
        const book = docSnap.data();
        form.title.value = book.title;
        form.author.value = book.author;
        form.price.value = book.price;
        form.condition.value = book.condition;
        form.location.value = book.location;
        form.phone.value = book.phone;
        // Optionally prefill coordinates if available
        if (book.coordinates) {
          form.coordinates.value = `${book.coordinates.lat}, ${book.coordinates.lon}`;
        }
        previewContainer.innerHTML = book.images
          .map(src => `
            <div class="preview-item">
              <img src="${src}" class="preview-img" alt="Book preview" onerror="this.style.display='none';">
            </div>
          `)
          .join('');
        if (book.images.length > 0) {
          previewContainer.style.display = 'grid';
        }
      } else {
        alert("You are not authorized to edit this listing.");
        window.location.href = "buy.html";
        return;
      }
    } catch (error) {
      console.error("Error loading listing:", error);
    }
  }

  fileInput.addEventListener('change', () => {
    const files = fileInput.files;
    previewContainer.innerHTML = "";
    if (!files || files.length === 0) {
      previewContainer.style.display = 'none';
      return;
    }
    Array.from(files).forEach(file => {
      const previewItem = document.createElement('div');
      previewItem.className = 'preview-item';
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = document.createElement('img');
          img.src = e.target.result;
          img.className = 'preview-img';
          img.alt = file.name;
          previewItem.appendChild(img);
        };
        reader.readAsDataURL(file);
      } else {
        const span = document.createElement('span');
        span.textContent = file.name;
        previewItem.appendChild(span);
      }
      previewContainer.appendChild(previewItem);
    });
    previewContainer.style.display = "grid";
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    try {
      // Optional: Parse coordinates from a new input field if available.
      let coords = null;
      if (form.coordinates && form.coordinates.value) {
        const parts = form.coordinates.value.split(',');
        if (parts.length === 2) {
          coords = { lat: parseFloat(parts[0]), lon: parseFloat(parts[1]) };
        }
      }
      const formData = {
        title: form.title.value,
        author: form.author.value,
        price: form.price.value,
        condition: form.condition.value,
        location: form.location.value,
        phone: form.phone.value,
        coordinates: coords
      };
      const bookId = await BookManager.saveListing(formData, fileInput.files, editId);
      if (bookId) {
        window.location.href = `buy.html?new=${bookId}`;
      }
    } finally {
      submitBtn.disabled = false;
    }
  });
}

// --- Buy Page Implementation ---
async function initializeBuyPage() {
  const bookGrid = document.getElementById('bookGrid');
  const searchInput = document.getElementById('searchInput');
  const nearMeBtn = document.getElementById('nearMeBtn');

  if (!bookGrid) {
    console.error("Element with ID 'bookGrid' not found.");
    return;
  }

  let allBooks = [];

  function renderBooks(books) {
    if (!books || books.length === 0) {
      bookGrid.innerHTML = "<p>No books available</p>";
      return;
    }
    console.log("Rendering books:", books);
    bookGrid.innerHTML = books.map(createBookCard).join('');
    highlightNewBook();
  }

  const q = query(collection(db, "books"), orderBy("timestamp", "desc"));
  onSnapshot(q, (snapshot) => {
    if (snapshot.empty) {
      bookGrid.innerHTML = "<p>No books available</p>";
      allBooks = [];
      return;
    }
    allBooks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log("Fetched books:", allBooks);
    renderBooks(allBooks);
  });

  searchInput.addEventListener('input', () => {
    const searchTerm = searchInput.value.toLowerCase().trim();
    const filteredBooks = allBooks.filter(book =>
      book.title.toLowerCase().includes(searchTerm) ||
      book.author.toLowerCase().includes(searchTerm)
    );
    if (filteredBooks.length === 0) {
      bookGrid.innerHTML = "<p>No matching books found</p>";
    } else {
      renderBooks(filteredBooks);
    }
  });

  // --- Geolocation & Sorting by Distance ---
  function getUserPosition() {
    const options = {
      enableHighAccuracy: false,
      timeout: 5000,
      maximumAge: 60000
    };
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });
  }

  // Haversine formula to calculate distance in kilometers
  function computeDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  // Sort books by distance if they have coordinates; those without coordinates fall to the end.
  function sortBooksByDistance(userLat, userLon) {
    console.log("Sorting books by distance from:", userLat, userLon);
    allBooks.sort((a, b) => {
      const distA = a.coordinates ? computeDistance(userLat, userLon, a.coordinates.lat, a.coordinates.lon) : Infinity;
      const distB = b.coordinates ? computeDistance(userLat, userLon, b.coordinates.lat, b.coordinates.lon) : Infinity;
      return distA - distB;
    });
    renderBooks(allBooks);
  }

  if (nearMeBtn) {
    nearMeBtn.addEventListener('click', async () => {
      nearMeBtn.disabled = true;
      nearMeBtn.textContent = "Locating...";
      try {
        const position = await getUserPosition();
        const userLat = position.coords.latitude;
        const userLon = position.coords.longitude;
        console.log("User coordinates:", userLat, userLon);
        sortBooksByDistance(userLat, userLon);
        alert("Showing local listings sorted by distance.");
      } catch (error) {
        alert("Geolocation error: " + error.message);
      } finally {
        nearMeBtn.disabled = false;
        nearMeBtn.textContent = "Near Me";
      }
    });
  }

  function highlightNewBook() {
    const urlParams = new URLSearchParams(window.location.search);
    const newId = urlParams.get('new');
    if (newId) {
      history.replaceState(null, '', 'buy.html');
      const newBookCard = document.querySelector(`[data-id="${newId}"]`);
      if (newBookCard) {
        newBookCard.scrollIntoView({ behavior: 'smooth' });
        newBookCard.style.animation = 'highlightPulse 1.5s ease 2';
      }
    }
  }
}

// Helper: Create HTML for a single book card
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

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('sellForm')) initializeSellPage();
  if (document.getElementById('bookGrid')) initializeBuyPage();
});

// Expose BookManager globally for inline HTML calls
window.BookManager = BookManager;
