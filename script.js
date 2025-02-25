/* ---------- Global Styles ---------- */
:root {
  --primary: #2A9D8F;
  --secondary: #264653;
  --accent: #E9C46A;
  --light: #F8F9FA;
  --dark: #1A1A1A;
  --radius-lg: 24px;
  --radius-md: 12px;
  --shadow: 0 12px 32px rgba(0, 0, 0, 0.1);
  --transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Inter', sans-serif;
  line-height: 1.6;
  background: var(--light);
  color: var(--dark);
}

/* ---------- Header ---------- */
.main-header {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(12px);
  padding: 1.5rem 5%;
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
  position: fixed;
  top: 0;
  width: 100%;
  z-index: 1000;
  border-bottom: 1px solid rgba(255, 255, 255, 0.3);
}

.header-content {
  max-width: 1440px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo {
  font-size: 2rem;
  font-weight: 700;
  color: var(--secondary);
  text-decoration: none;
  transition: var(--transition);
}

.logo:hover {
  color: var(--primary);
}

.nav-links {
  display: flex;
  gap: 2rem;
}

.nav-link {
  font-size: 1rem;
  color: var(--secondary);
  text-decoration: none;
  font-weight: 500;
  padding: 0.8rem 1.2rem;
  border-radius: var(--radius-md);
  transition: var(--transition);
  position: relative;
}

.nav-link::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  width: 0;
  height: 2px;
  background: var(--primary);
  transition: var(--transition);
}

.nav-link:hover {
  color: var(--primary);
}

.nav-link:hover::after {
  width: 100%;
  left: 0;
}

/* ---------- Hero Section ---------- */
.hero-section {
  padding: 8rem 5% 4rem;
  text-align: center;
  background: linear-gradient(135deg, var(--secondary), var(--primary));
  color: white;
  margin-top: 100px; /* offset fixed header */
}

.hero-section .hero-content {
  max-width: 800px;
  margin: 0 auto;
}

.hero-section h1 {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.hero-section p {
  font-size: 1.25rem;
  margin-bottom: 2rem;
}

.search-bar {
  padding: 1rem 1.5rem;
  border: none;
  border-radius: var(--radius-md);
  width: 100%;
  max-width: 500px;
  font-size: 1rem;
  outline: none;
}

/* Additional styling for sell page hero */
.sell-hero {
  background: linear-gradient(135deg, var(--primary), var(--accent));
}

/* ---------- Books Section (Buy Page) ---------- */
.books-section {
  padding: 4rem 5%;
  background: var(--light);
}

.book-container {
  display: flex;
  flex-wrap: wrap;
  gap: 2rem;
  justify-content: center;
}

.book-card {
  background: white;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow);
  overflow: hidden;
  transition: var(--transition);
  width: 300px;
}

.book-card:hover {
  transform: translateY(-5px);
}

.book-images {
  height: 200px;
  overflow: hidden;
}

.book-images img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.book-details {
  padding: 1rem;
  text-align: center;
}

.book-details h3 {
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
  color: var(--secondary);
}

.book-details p {
  font-size: 1rem;
  margin-bottom: 1rem;
}

.book-price {
  font-size: 1.2rem;
  font-weight: bold;
  color: var(--primary);
}

/* ---------- Sell Form Section (Sell Page) ---------- */
.sell-form-section {
  padding: 4rem 5%;
  background: var(--light);
}

.sell-form {
  background: white;
  max-width: 600px;
  margin: 0 auto;
  padding: 2rem;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow);
}

.sell-form .form-title {
  text-align: center;
  font-size: 2rem;
  margin-bottom: 1.5rem;
  color: var(--secondary);
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group label {
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: var(--secondary);
}

.form-group input,
.form-group select {
  padding: 0.8rem 1rem;
  border: 1px solid rgba(0,0,0,0.1);
  border-radius: var(--radius-md);
  font-size: 1rem;
  outline: none;
  transition: var(--transition);
}

.form-group input:focus,
.form-group select:focus {
  border-color: var(--primary);
}

/* ---------- Image Upload Section ---------- */
.upload-section {
  margin-bottom: 2rem;
  text-align: center;
}

.upload-label {
  display: block;
  cursor: pointer;
  border: 2px dashed rgba(0,0,0,0.1);
  padding: 2rem;
  border-radius: var(--radius-md);
  transition: var(--transition);
  margin-bottom: 1rem;
}

.upload-label:hover {
  background: rgba(0,0,0,0.02);
}

.upload-box i {
  font-size: 2rem;
  color: var(--primary);
  margin-bottom: 1rem;
}

.upload-box h3 {
  font-size: 1.5rem;
  color: var(--secondary);
  margin-bottom: 0.5rem;
}

.upload-box p {
  font-size: 1rem;
  color: var(--dark);
}

.browse-btn {
  margin-top: 1rem;
  padding: 0.8rem 1.5rem;
  background: var(--accent);
  border: none;
  color: var(--secondary);
  font-weight: bold;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: var(--transition);
}

.browse-btn:hover {
  background: var(--primary);
  color: white;
}

.preview-grid {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  justify-content: center;
}

.preview-img {
  width: 100px;
  height: 100px;
  object-fit: cover;
  border-radius: var(--radius-md);
}

/* ---------- Submit Button ---------- */
.submit-btn {
  width: 100%;
  padding: 1rem;
  background: var(--accent);
  border: none;
  border-radius: var(--radius-md);
  font-size: 1.2rem;
  color: var(--secondary);
  font-weight: 600;
  cursor: pointer;
  transition: var(--transition);
}

.submit-btn:hover {
  background: var(--primary);
  color: white;
}

/* ---------- Responsive Design ---------- */
@media (max-width: 768px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
  .hero-section h1 {
    font-size: 2.5rem;
  }
  .hero-section p {
    font-size: 1rem;
  }
}.upload-container {
  text-align: center;
}

.upload-label {
  display: inline-block;
  background-color: #3498db;
  color: white;
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
}

.upload-label:hover {
  background-color: #2980b9;
}

.upload-label input[type="file"] {
  display: none; /* Keep this hidden */
}
