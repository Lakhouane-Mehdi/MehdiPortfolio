// Light / dark switch. Light is the default for everyone; the choice is only
// stored (localStorage "site.theme") once the visitor clicks the toggle.
const KEY = 'site.theme'
const COLORS = { light: '#f7f5f0', dark: '#0f1012' }

function apply(theme) {
  document.documentElement.dataset.theme = theme
  document.querySelectorAll('[data-theme-toggle]').forEach(btn => {
    btn.setAttribute('aria-pressed', String(theme === 'dark'))
  })
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', COLORS[theme])
}

export function initTheme() {
  const current = () => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light')
  apply(current())

  document.querySelectorAll('[data-theme-toggle]').forEach(btn => {
    btn.addEventListener('click', () => {
      const next = current() === 'dark' ? 'light' : 'dark'
      apply(next)
      try { localStorage.setItem(KEY, next) } catch (e) { /* storage blocked */ }
    })
  })

  // Keep several open tabs in sync.
  window.addEventListener('storage', e => {
    if (e.key === KEY && (e.newValue === 'dark' || e.newValue === 'light')) apply(e.newValue)
  })
}
