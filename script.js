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
    document.querySelector('.scroll-progres-bar').style.width = scrollPercentage + '%';
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

// Ghost Mode Interaction
const ghostBtn = document.getElementById('ghost-mode-btn');
const body = document.body;

if (ghostBtn) {
    ghostBtn.addEventListener('click', () => {
        // Toggle the glitch class
        body.classList.toggle('glitch-active');

        // Update button text accordingly
        if (body.classList.contains('glitch-active')) {
            ghostBtn.textContent = "👻 RETURN";
            ghostBtn.style.color = "red";
            ghostBtn.style.borderColor = "red";
        } else {
            ghostBtn.textContent = "👻 Ghost Mode";
            ghostBtn.style.color = ""; // Reset to CSS default
            ghostBtn.style.borderColor = "";
        }
    });
}
