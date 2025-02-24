// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_BUCKET.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let currentUser = sessionStorage.getItem('currentUser') || prompt("Please enter your name:");
sessionStorage.setItem('currentUser', currentUser);

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
            const files = formData.images ? 
                Array.from(formData.images).slice(0, this.MAX_IMAGES) : [];

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
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            };

            if (isNaN(bookData.price) || bookData.price <= 0) {
                throw new Error('Invalid price');
            }

            if (existingId) {
                await db.collection("books").doc(existingId).update(bookData);
                return existingId;
            } else {
                const docRef = await db.collection("books").add(bookData);
                return docRef.id;
            }
        } catch (error) {
            alert(`Error: ${error.message}`);
            return null;
        }
    },

    async deleteListing(id) {
        try {
            await db.collection("books").doc(id).delete();
        } catch (error) {
            alert(`Error deleting: ${error.message}`);
        }
    }
};

// Sell Page Implementation
if (document.getElementById('sellForm')) {
    // ... [Keep existing sell page DOM code unchanged] ...

    // Modified form submission handler
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
if (document.getElementById('bookGrid')) {
    const bookGrid = document.getElementById('bookGrid');
    const searchInput = document.getElementById('searchInput');

    // Real-time listener
    db.collection("books").orderBy("timestamp", "desc").onSnapshot((snapshot) => {
        const books = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        renderBooks(books);
        highlightNewBook();
    });

    const renderBooks = (books) => {
        bookGrid.innerHTML = books.map(book => `
            <div class="book-card" data-id="${book.id}">
                <!-- Keep existing book card structure -->
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
        `).join('');
    };

    // Search functionality
    searchInput.addEventListener('input', () => {
        const query = searchInput.value.toLowerCase();
        db.collection("books").get().then((snapshot) => {
            const filtered = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(book => 
                    book.title.toLowerCase().includes(query) ||
                    book.author.toLowerCase().includes(query)
                );
            renderBooks(filtered);
        });
    });

    // Highlight new book (keep existing implementation)
}
