// Mobile Menu Toggle
const hamburger = document.querySelector('.hamburger');
const navLinks = document.querySelector('.nav-links');
const navLinksItems = document.querySelectorAll('.nav-links li a');

if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
        const isExpanded = hamburger.classList.toggle('active');
        navLinks.classList.toggle('active');
        hamburger.setAttribute('aria-expanded', isExpanded);
    });

    // Close menu when clicking a link
    navLinksItems.forEach(link => {
        link.addEventListener('click', () => {
            hamburger.classList.remove('active');
            navLinks.classList.remove('active');
            hamburger.setAttribute('aria-expanded', 'false');
        });
    });
}

// Scroll Progress Bar & Active Link Highlight
const sections = document.querySelectorAll('section');
const navItems = document.querySelectorAll('.nav-links a');
const progressBar = document.querySelector('.scroll-progress-bar');

let scrollTicking = false;
window.addEventListener('scroll', () => {
    if (scrollTicking) return;
    scrollTicking = true;
    requestAnimationFrame(() => {
        scrollTicking = false;

        // Progress bar
        if (progressBar) {
            const scrollTotal = document.documentElement.scrollHeight - document.documentElement.clientHeight;
            const scrollCurrent = document.documentElement.scrollTop;
            progressBar.style.width = ((scrollCurrent / scrollTotal) * 100) + '%';
        }

        // Active nav link
        let current = '';
        sections.forEach(section => {
            if (scrollY >= (section.offsetTop - 200)) {
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
}, { passive: true });

// Smooth Scroll for Hero Buttons (redundant with CSS scroll-behavior but good fallback)
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (href === '#') return; // Ignore plain "#"

        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth'
            });
        }
    });
});

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
