// script.js

// Import Firebase modules (ensure you’re serving via a local web server)
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
  getDoc,
  getDocs
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// Firebase configuration (verify these for your project)
const firebaseConfig = {
  apiKey: "AIzaSyCBg6RQXIiC2BKE2HjzochEeiajc7fBnZA",
  authDomain: "bookswap-bac8b.firebaseapp.com",
  projectId: "bookswap-bac8b",
  storageBucket: "bookswap-bac8b.appspot.com",
  messagingSenderId: "145814837614",
  appId: "1:145814837614:web:7d52eb3c29fe659688097f"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Set a default current user (no modal)
const currentUser = "Anonymous";

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
      await deleteDoc(doc(db, "books", id));
      alert('Listing deleted successfully');
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
        // Create preview items for stored image URLs.
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
      }
    } catch (error) {
      console.error("Error loading listing:", error);
    }
  }

  // Image preview on file selection
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

  // Form submission handler.
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    try {
      const formData = {
        title: form.title.value,
        author: form.author.value,
        price: form.price.value,
        condition: form.condition.value,
        location: form.location.value,
        phone: form.phone.value
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

  const createBookCard = (book) => {
    return `
      <div class="book-card" data-id="${book.id}">
        <div class="book-images">
          ${book.images.map(src => `<img src="${src}" class="book-image" alt="${book.title} cover">`).join('')}
        </div>
        <div class="book-details">
          <h3>${book.title}</h3>
          <p class="book-author">By ${book.author}</p>
          <div class="book-meta">
            <span class="book-price">₹${book.price.toFixed(2)}</span>
            <span class="book-condition">${book.condition}</span>
          </div>
          <div class="book-location">📍 ${book.location}</div>
          <div class="book-contact">📞 ${book.phone}</div>
          ${book.owner === currentUser ? `
            <div class="owner-controls">
              <button class="edit-btn" onclick="location.href='sell.html?edit=${book.id}'">Edit</button>
              <button class="delete-btn" onclick="BookManager.deleteListing('${book.id}')">Delete</button>
            </div>` : ""}
        </div>
      </div>
    `;
  };

  const q = query(collection(db, "books"), orderBy("timestamp", "desc"));
  onSnapshot(q, (snapshot) => {
    const books = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    bookGrid.innerHTML = books.map(createBookCard).join('');
    highlightNewBook();
  });

  searchInput.addEventListener('input', async () => {
    const searchTerm = searchInput.value.toLowerCase().trim();
    const snapshot = await getDocs(collection(db, "books"));
    const filteredBooks = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(book =>
        book.title.toLowerCase().includes(searchTerm) ||
        book.author.toLowerCase().includes(searchTerm)
      );
    bookGrid.innerHTML = filteredBooks.map(createBookCard).join('');
  });

  const highlightNewBook = () => {
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
  };
}


// --- Initialize on DOMContentLoaded ---
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('sellForm')) initializeSellPage();
  if (document.getElementById('bookGrid')) initializeBuyPage();
  setupMobileMenu();
});

// Expose BookManager globally for inline HTML calls
window.BookManager = BookManager;
