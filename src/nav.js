// Mobile menu
const hamburger = document.querySelector('.hamburger')
const navLinks = document.querySelector('.nav-links')

function closeMenu() {
  if (!hamburger || !navLinks) return
  hamburger.classList.remove('active')
  navLinks.classList.remove('active')
  hamburger.setAttribute('aria-expanded', 'false')
}

if (hamburger && navLinks) {
  hamburger.addEventListener('click', () => {
    const open = hamburger.classList.toggle('active')
    navLinks.classList.toggle('active', open)
    hamburger.setAttribute('aria-expanded', String(open))
  })
  navLinks.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu))
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu() })
}

// Highlight the nav link of the section in view
const links = new Map()
document.querySelectorAll('.nav-links a[href^="#"]').forEach(a => links.set(a.getAttribute('href').slice(1), a))

if (links.size && 'IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue
      links.forEach(a => a.classList.remove('active'))
      links.get(entry.target.id)?.classList.add('active')
    }
  }, { rootMargin: '-40% 0px -55% 0px' })
  links.forEach((_, id) => {
    const section = document.getElementById(id)
    if (section) observer.observe(section)
  })
  // Back at the top (hero) no section is current
  const hero = document.getElementById('home')
  if (hero) observer.observe(hero)
}

// Project filter
const chips = document.querySelectorAll('[data-filter]')
const items = document.querySelectorAll('[data-cat]')
const groups = document.querySelectorAll('[data-filter-group]')

chips.forEach(chip => {
  chip.addEventListener('click', () => {
    const filter = chip.dataset.filter
    chips.forEach(c => c.setAttribute('aria-pressed', String(c === chip)))
    // A filtered list is short, so show every match instead of the first six
    if (filter !== 'all') expandList()
    items.forEach(item => {
      item.hidden = filter !== 'all' && !item.dataset.cat.split(' ').includes(filter)
    })
    // Hide a group (and its heading) when the filter leaves it empty
    groups.forEach(group => {
      group.hidden = !group.querySelector('[data-cat]:not([hidden])')
    })
  })
})

// Phones start with the first six projects; this opens the rest.
const list = document.getElementById('project-list')
const showAll = document.querySelector('[data-show-all]')

function expandList() {
  if (!list) return
  list.classList.remove('collapsed')
  if (showAll) {
    showAll.setAttribute('aria-expanded', 'true')
    showAll.hidden = true
  }
}

if (showAll) showAll.addEventListener('click', expandList)
