// script.js - Final Working Version with Deletion Fix
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
  getDoc,     // Added import for getDoc
  getDocs     // Added import for getDocs
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCBg6RQXIiC2BKE2HjzochEeiajc7fBnZA",
  authDomain: "bookswap-bac8b.firebaseapp.com",
  projectId: "bookswap-bac8b",
  storageBucket: "bookswap-bac8b.firebasestorage.app",
  messagingSenderId: "145814837614",
  appId: "1:145814837614:web:7d52eb3c29fe659688097f",
  measurementId: "G-Q33CEMLPZ5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// User Session Management
let currentUser = localStorage.getItem('currentUser') || prompt("Please enter your name:");
localStorage.setItem('currentUser', currentUser);

// Book Manager Module
const BookManager = {
  MAX_IMAGES: 5,
  MAX_SIZE_MB: 1,

  async processImage(file) {
    return new Promise((resolve, reject) => {
      if (file.size > this.MAX_SIZE_MB * 1024 * 1024) {
        reject(`Image exceeds ${this.MAX_SIZE_MB}MB`);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject('Error reading image');
      reader.readAsDataURL(file);
    });
  },

  async saveListing(formData, existingId = null) {
    try {
      const images = [];
      const files = formData.images ? Array.from(formData.images).slice(0, this.MAX_IMAGES) : [];

      if (files.length === 0 && !existingId) {
        throw new Error('At least one image required');
      }

      for (const file of files) {
        if (!file.type.startsWith('image/')) {
          throw new Error('Only image files allowed');
        }
        images.push(await this.processImage(file));
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
        throw new Error('Invalid price');
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
      return null;
    }
  },

  async deleteListing(id) {
    try {
      await deleteDoc(doc(db, "books", id));
    } catch (error) {
      alert(`Error deleting: ${error.message}`);
    }
  }
};

// Sell Page Implementation
async function initializeSellPage() {
  const form = document.getElementById('sellForm');
  if (!form) return;

  const fileInput = document.getElementById('fileInput');
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
        previewContainer.innerHTML = book.images.map(img => `
          <img src="${img}" class="preview-img">
        `).join('');
      }
    } catch (error) {
      console.error('Error loading book:', error);
    }
  }

  fileInput.addEventListener('change', function() {
    previewContainer.innerHTML = '';
    const files = Array.from(this.files).slice(0, BookManager.MAX_IMAGES);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = e => {
        const img = document.createElement('img');
        img.className = 'preview-img';
        img.src = e.target.result;
        previewContainer.appendChild(img);
      };
      reader.readAsDataURL(file);
    });
  });

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
        phone: form.phone.value,
        images: fileInput.files
      };

      const bookId = await BookManager.saveListing(formData, editId);
      if (bookId) {
        window.location.href = `buy.html?new=${bookId}`;
      }
    } catch (error) {
      console.error('Submission error:', error);
    } finally {
      submitBtn.disabled = false;
    }
  });
}

// Buy Page Implementation
async function initializeBuyPage() {
  const bookGrid = document.getElementById('bookGrid');
  if (!bookGrid) return;

  const searchInput = document.getElementById('searchInput');

  function renderBooks(books) {
    bookGrid.innerHTML = books.map(book => `
      <div class="book-card" data-id="${book.id}">
        <div class="book-images">
          ${book.images.map(img => `
            <img src="${img}" class="book-image" alt="${book.title}">
          `).join('')}
        </div>
        <div class="book-details">
          <h3>${book.title}</h3>
          <p class="book-author">By ${book.author}</p>
          <span class="book-condition">${book.condition}</span>
          <div class="book-price">₹${book.price.toFixed(2)}</div>
          <div class="book-info">
            <span class="book-location">📍 ${book.location}</span>
            <span class="book-phone">📞 ${book.phone}</span>
          </div>
          ${book.owner === currentUser ? `
            <div class="owner-controls">
              <button class="edit-btn" 
                onclick="location.href='sell.html?edit=${book.id}'">
                Edit
              </button>
              <button class="remove-btn" 
                onclick="BookManager.deleteListing('${book.id}')">
                Remove
              </button>
            </div>
          ` : ''}
        </div>
      </div>
    `).join('');
  }

  // Real-time listener
  const q = query(collection(db, "books"), orderBy("timestamp", "desc"));
  onSnapshot(q, (snapshot) => {
    const books = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    renderBooks(books);
    highlightNewBook();
  });

  // Search functionality
  searchInput.addEventListener('input', async () => {
    const searchTerm = searchInput.value.toLowerCase();
    const snapshot = await getDocs(collection(db, "books"));
    const filtered = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(book => 
        book.title.toLowerCase().includes(searchTerm) ||
        book.author.toLowerCase().includes(searchTerm)
      );
    renderBooks(filtered);
  });

  function highlightNewBook() {
    const urlParams = new URLSearchParams(window.location.search);
    const newId = urlParams.get('new');
    if (newId) {
      history.replaceState(null, '', 'buy.html');
      const newBook = bookGrid.querySelector(`[data-id="${newId}"]`);
      if (newBook) {
        newBook.scrollIntoView({ behavior: 'smooth' });
        newBook.style.animation = 'highlight 1.5s ease 2';
      }
    }
  }
}

// Initialize the appropriate page
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('sellForm')) {
    initializeSellPage();
  }
  if (document.getElementById('bookGrid')) {
    initializeBuyPage();
  }
});

// Expose BookManager globally so inline onclick handlers can access it
window.BookManager = BookManager;
