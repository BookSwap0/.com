// script.js - Corrected Version
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
  getDocs,
  serverTimestamp
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

/* ---------------------------
   User Session Management
--------------------------- */
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

/* ---------------------------
   Book Manager Module
--------------------------- */
const BookManager = {
  MAX_IMAGES: 5,
  MAX_SIZE_MB: 1,

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

  async saveListing(formData, existingId = null) {
    try {
      const files = formData.images ? Array.from(formData.images).slice(0, this.MAX_IMAGES) : [];
      let images = [];

      if (existingId) {
        const docSnap = await getDoc(doc(db, "books", existingId));
        if (!docSnap.exists()) throw new Error('Document not found');
        images = docSnap.data().images;
      }

      if (files.length > 0) {
        images = [];
        for (const file of files) {
          if (!file.type.startsWith('image/')) {
            throw new Error('Only image files are allowed');
          }
          images.push(await this.processImage(file));
        }
      } else if (!existingId) {
        throw new Error('At least one image is required');
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
        timestamp: serverTimestamp()
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

/* ---------------------------
   Sell Page Implementation
--------------------------- */
async function initializeSellPage() {
  const form = document.getElementById('sellForm');
  if (!form) {
    console.error("Sell form not found.");
    return;
  }
  const fileInput = document.getElementById('bookCover');
  const previewContainer = document.getElementById('previewContainer');
  const urlParams = new URLSearchParams(window.location.search);
  const editId = urlParams.get('edit');

  // If editing an existing listing, load and display its details
  if (editId) {
    try {
      const docRef = doc(db, "books", editId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const book = docSnap.data();
        if (book.owner === currentUser) {
          // Fill form fields using name attributes
          form.elements['title'].value = book.title;
          form.elements['author'].value = book.author;
          form.elements['price'].value = book.price;
          form.elements['condition'].value = book.condition;
          form.elements['location'].value = book.location;
          form.elements['phone'].value = book.phone;
          // Display preview images
          previewContainer.innerHTML = '';
          if (book.images && Array.isArray(book.images)) {
            book.images.forEach(img => {
              const imageElement = document.createElement('img');
              imageElement.src = img;
              imageElement.className = 'preview-img';
              imageElement.alt = "Preview";
              previewContainer.appendChild(imageElement);
            });
          }
        } else {
          console.error("Current user is not the owner of this listing.");
        }
      } else {
        console.error("No such document found for editing.");
      }
    } catch (error) {
      console.error("Error loading book for editing:", error);
    }
  }

  // Update preview images when new files are selected
  if (fileInput) {
    fileInput.addEventListener('change', () => {
      previewContainer.innerHTML = '';
      const files = Array.from(fileInput.files).slice(0, BookManager.MAX_IMAGES);
      files.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = document.createElement('img');
          img.className = 'preview-img';
          img.src = e.target.result;
          previewContainer.appendChild(img);
        };
        reader.readAsDataURL(file);
      });
    });
  }

  // Handle form submission for new or edited listing
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    try {
      const formData = {
        title: form.elements['title'].value,
        author: form.elements['author'].value,
        price: form.elements['price'].value,
        condition: form.elements['condition'].value,
        location: form.elements['location'].value,
        phone: form.elements['phone'].value,
        images: fileInput.files
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

/* ---------------------------
   Buy Page Implementation
--------------------------- */
async function initializeBuyPage() {
  const bookGrid = document.getElementById('bookGrid');
  const searchInput = document.getElementById('searchInput');

  const renderBooks = (books) => {
    bookGrid.innerHTML = books.map(book => `
      <div class="book-card" data-id="${book.id}">
        <div class="book-images">
          ${book.images.map(img => `<img src="${img}" class="book-image" alt="${book.title}">`).join('')}
        </div>
        <div class="book-details">
          <h3>${book.title}</h3>
          <p class="book-author">By ${book.author}</p>
          <span class="book-condition">${book.condition}</span>
          <div class="book-price">₹${parseFloat(book.price).toFixed(2)}</div>
          <div class="book-info">
            <span class="book-location">📍 ${book.location}</span>
            <span class="book-phone">📞 ${book.phone}</span>
          </div>
          ${book.owner === currentUser ? `
            <div class="owner-controls">
              <button class="edit-btn" onclick="location.href='sell.html?edit=${book.id}'">Edit</button>
              <button class="remove-btn" onclick="BookManager.deleteListing('${book.id}')">Remove</button>
            </div>
          ` : ''}
        </div>
      </div>
    `).join('');
  };

  const q = query(collection(db, "books"), orderBy("timestamp", "desc"));
  onSnapshot(q, (snapshot) => {
    const books = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderBooks(books);
    highlightNewBook();
  });

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

  const highlightNewBook = () => {
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
  };
}

/* ---------------------------
   Initialization
--------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('sellForm')) {
    initializeSellPage();
  }
  if (document.getElementById('bookGrid')) {
    initializeBuyPage();
  }
});
window.BookManager = BookManager;
