// Mobile Menu Toggle
const hamburger = document.querySelector('.hamburger');
const navLinks = document.querySelector('.nav-links');
const navLinksItems = document.querySelectorAll('.nav-links li a');

hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navLinks.classList.toggle('active');
});

// Close menu when clicking a link
navLinksItems.forEach(link => {
    link.addEventListener('click', () => {
        hamburger.classList.remove('active');
        navLinks.classList.remove('active');
    });
});

// Scroll Progress Bar
window.addEventListener('scroll', () => {
    const scrollTotal = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrollCurrent = document.documentElement.scrollTop;

    const scrollPercentage = (scrollCurrent / scrollTotal) * 100;
    document.querySelector('.scroll-progress-bar').style.width = scrollPercentage + '%';
});

// Active Link Highlight on Scroll
const sections = document.querySelectorAll('section');
const navItems = document.querySelectorAll('.nav-links a');

window.addEventListener('scroll', () => {
    let current = '';

    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;

        if (scrollY >= (sectionTop - 200)) {
            current = section.getAttribute('id');
        }
    });

    navItems.forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('href').includes(current)) {
            item.classList.add('active');
        }
    });
});

// Smooth Scroll for Hero Buttons (redundant with CSS scroll-behavior but good fallback)
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth'
            });
        }
    });
});

// Email Obfuscation Logic
const emailLink = document.getElementById('email-link');
if (emailLink) {
    emailLink.addEventListener('click', (e) => {
        e.preventDefault();
        const user = emailLink.getAttribute('data-user');
        const domain = emailLink.getAttribute('data-domain');
        const email = `${user}@${domain}`;

        // Update the link to be a real mailto and click it programmatically or just open window
        window.location.href = `mailto:${email}`;

        // Optional: Update text to show email
        emailLink.querySelector('span').textContent = email;
    });
}

// 3D Flip Card Interaction (Mobile/Click Support)
document.querySelectorAll('.project-card').forEach(card => {
    card.addEventListener('click', (e) => {
        // Prevent flip if clicking a link or button
        if (e.target.closest('a') || e.target.closest('button')) {
            return;
        }
        card.classList.toggle('flipped');
    });
});
