// Scroll Reveal
ScrollReveal().reveal('.feature-card, .book-card, .testimonial-card', {
    delay: 200,
    distance: '40px',
    interval: 100,
    easing: 'cubic-bezier(0.23, 1, 0.32, 1)',
    scale: 0.95
  });
  
  // Mobile Menu
  document.querySelector('.mobile-menu').addEventListener('click', () => {
    document.querySelector('.main-nav').classList.toggle('active');
  });
  
  // Smooth Scroll
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      document.querySelector(this.getAttribute('href')).scrollIntoView({
        behavior: 'smooth'
      });
    });
  });
  
  // Interactive Book Stack
  document.querySelectorAll('.stack-item').forEach((book, index) => {
    book.addEventListener('mouseover', () => {
      book.style.transform = `rotate(${index % 2 ? -3 : 3}deg) translateY(-10px)`;
    });
    book.addEventListener('mouseout', () => {
      book.style.transform = `rotate(${index % 2 ? -5 : 5}deg)`;
    });
  });