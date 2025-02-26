// script.js - Fully Corrected Version
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

// User Session Management
let currentUser = localStorage.getItem('currentUser');
const usernameModal = document.getElementById('usernameModal');
const usernameInput = document.getElementById('usernameInput');
const usernameSubmit = document.getElementById('usernameSubmit');

if (!currentUser && usernameModal) {
  usernameModal.style.display = 'flex';

  const handleUsernameSubmit = () => {
    const name = usernameInput.value.trim();
    if (name) {
      currentUser = name;
      localStorage.setItem('currentUser', name);
      usernameModal.style.display = 'none';
      location.reload(); // Refresh to apply user context
    } else {
      usernameInput.placeholder = "Please enter your name!";
      usernameInput.style.borderColor = "#e74c3c";
      setTimeout(() => {
        usernameInput.style.borderColor = "#3498db";
        usernameInput.placeholder = "Enter your name";
      }, 2000);
    }
  };

  usernameSubmit.addEventListener('click', handleUsernameSubmit);
  usernameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleUsernameSubmit();
  });
  setTimeout(() => usernameInput.focus(), 100);
}

// Book Manager with Image Handling
const BookManager = {
  MAX_IMAGES: 5,
  MAX_SIZE_MB: 2,

  async processImage(file) {
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

  async handleImages(files, existingImages = []) {
    try {
      const newImages = await Promise.all(
        Array.from(files)
          .slice(0, this.MAX_IMAGES - existingImages.length)
          .map(file => this.processImage(file))
      );
      return [...existingImages, ...newImages].slice(0, this.MAX_IMAGES);
    } catch (error) {
      throw new Error(error.message);
    }
  },

  async saveListing(formData, existingId = null) {
    try {
      const fileInput = document.getElementById('bookCover');
      const files = fileInput.files;
      let images = [];

      if (existingId) {
        const docSnap = await getDoc(doc(db, "books", existingId));
        images = docSnap.exists() ? docSnap.data().images : [];
      }

      if (files.length > 0 || !existingId) {
        images = await this.handleImages(files, existingId ? images : []);
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
      return null;
    }
  },

  async deleteListing(id) {
    try {
      await deleteDoc(doc(db, "books", id));
      alert('Listing deleted successfully');
    } catch (error) {
      alert(`Deletion failed: ${error.message}`);
    }
  }
};

// Sell Page Implementation
async function initializeSellPage() {
  const form = document.getElementById('sellForm');
  const fileInput = document.getElementById('bookCover');
  const previewContainer = document.getElementById('previewContainer');
  const urlParams = new URLSearchParams(window.location.search);
  const editId = urlParams.get('edit');

  // Load existing listing for editing
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
        
        // Display existing images
        previewContainer.innerHTML = book.images
          .map(img => `<img src="${img}" class="preview-img" alt="Book preview">`)
          .join('');
      }
    } catch (error) {
      console.error('Error loading listing:', error);
    }
  }

  // Real-time image preview handler
  fileInput.addEventListener('change', async () => {
    try {
      const files = Array.from(fileInput.files);
      const images = await BookManager.handleImages(files);
      
      previewContainer.innerHTML = images
        .map(img => `<img src="${img}" class="preview-img" alt="Upload preview">`)
        .join('');
    } catch (error) {
      alert(error.message);
      fileInput.value = '';
    }
  });

  // Form submission handler
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

      const bookId = await BookManager.saveListing(formData, editId);
      if (bookId) {
        window.location.href = `buy.html?new=${bookId}`;
      }
    } finally {
      submitBtn.disabled = false;
    }
  });
}

// Buy Page Implementation
async function initializeBuyPage() {
  const bookGrid = document.getElementById('bookGrid');
  const searchInput = document.getElementById('searchInput');

  const createBookCard = (book) => `
    <div class="book-card" data-id="${book.id}">
      <div class="book-images">
        ${book.images.map(img => `
          <img src="${img}" class="book-image" alt="${book.title} cover">
        `).join('')}
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
          </div>
        ` : ''}
      </div>
    </div>
  `;

  // Real-time updates listener
  const q = query(collection(db, "books"), orderBy("timestamp", "desc"));
  onSnapshot(q, (snapshot) => {
    const books = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    bookGrid.innerHTML = books.map(createBookCard).join('');
    highlightNewBook();
  });

  // Search functionality
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

  // Highlight new listing animation
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

// Initialize appropriate page
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('sellForm')) initializeSellPage();
  if (document.getElementById('bookGrid')) initializeBuyPage();
});

// Global access for inline handlers
window.BookManager = BookManager;
// Add to script.js
document.addEventListener('DOMContentLoaded', () => {
  const hamburger = document.querySelector('.hamburger');
  const mobileMenu = document.querySelector('.mobile-menu');
  
  if (hamburger) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('active');
      mobileMenu.classList.toggle('active');
    });
  }
  
  // Close menu when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.header-content') && mobileMenu.classList.contains('active')) {
      hamburger.classList.remove('active');
      mobileMenu.classList.remove('active');
    }
  });
  
  // Close menu on link click
  document.querySelectorAll('.mobile-nav-link').forEach(link => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('active');
      mobileMenu.classList.remove('active');
    });
  });
});
