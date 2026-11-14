// Runs before the page paints so a visitor who chose dark mode never sees a
// light flash. Light is the default; dark only applies after the visitor
// picked it with the toggle. Kept as a file (not inline) because the
// Content-Security-Policy forbids inline scripts.
try {
  if (localStorage.getItem('site.theme') === 'dark') {
    document.documentElement.dataset.theme = 'dark'
  }
} catch (e) { /* storage blocked: stay light */ }
