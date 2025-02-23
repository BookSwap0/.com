// script.js - Final Corrected Version
let currentUser = sessionStorage.getItem('currentUser') || prompt("Please enter your name:");
sessionStorage.setItem('currentUser', currentUser);

const BookManager = {
    MAX_IMAGES: 5,
    MAX_SIZE_MB: 1,

    getListings() {
        try {
            return JSON.parse(localStorage.getItem('bookListings') || '[]');
        } catch (error) {
            console.error('Error loading listings:', error);
            return [];
        }
    },

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
                Array.from(formData.images).slice(0, this.MAX_IMAGES) : 
                [];

            if (files.length === 0 && !existingId) {
                throw new Error('At least one image required');
            }

            for (const file of files) {
                if (!file.type.startsWith('image/')) {
                    throw new Error('Only image files allowed');
                }
                images.push(await this.processImage(file));
            }

            const existingBook = existingId ? 
                this.getListings().find(b => b.id === existingId) : 
                null;

            const newListing = {
                id: existingId || Date.now(),
                owner: currentUser,
                title: formData.title.trim(),
                author: formData.author.trim(),
                price: parseFloat(formData.price),
                condition: formData.condition,
                location: formData.location.trim(),
                phone: formData.phone.replace(/\D/g, '').slice(0, 10),
                images: images.length ? images : existingBook?.images || [],
                date: existingBook?.date || new Date().toISOString()
            };

            if (isNaN(newListing.price) || newListing.price <= 0) {
                throw new Error('Invalid price');
            }

            const listings = this.getListings().filter(b => b.id !== existingId);
            localStorage.setItem('bookListings', JSON.stringify([...listings, newListing]));
            return newListing.id;
        } catch (error) {
            alert(`Error: ${error.message}`);
            return null;
        }
    },

    deleteListing(id) {
        const listings = this.getListings().filter(book => book.id !== id);
        localStorage.setItem('bookListings', JSON.stringify(listings));
    }
};

// Sell Page Implementation
if (document.getElementById('sellForm')) {
    const form = document.getElementById('sellForm');
    const fileInput = document.getElementById('fileInput');
    const previewContainer = document.getElementById('previewContainer');
    const urlParams = new URLSearchParams(window.location.search);
    const editId = urlParams.get('edit');

    // Load existing data for editing
    if (editId) {
        const book = BookManager.getListings().find(b => b.id === parseInt(editId));
        if (book && book.owner === currentUser) {
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

            const bookId = await BookManager.saveListing(formData, editId ? parseInt(editId) : null);
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

    const renderBooks = () => {
        const books = BookManager.getListings();
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
                                onclick="BookManager.deleteListing(${book.id}); renderBooks()">
                                Remove
                            </button>
                        </div>
                    ` : ''}
                </div>
            </div>
        `).join('');
    };

    // Initial render
    renderBooks();

    // Real-time updates
    window.addEventListener('storage', () => {
        renderBooks();
        highlightNewBook();
    });

    // Search functionality
    searchInput.addEventListener('input', () => {
        const query = searchInput.value.toLowerCase();
        const filtered = BookManager.getListings().filter(book => 
            book.title.toLowerCase().includes(query) ||
            book.author.toLowerCase().includes(query)
        );
        bookGrid.innerHTML = filtered.map(book => `
            <div class="book-card" data-id="${book.id}">
                ${book.images.map(img => `
                    <img src="${img}" class="book-image" alt="${book.title}">
                `).join('')}
                <div class="book-details">
                    <!-- Same structure as above -->
                </div>
            </div>
        `).join('');
    });

    // Highlight new book
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
    highlightNewBook();
}