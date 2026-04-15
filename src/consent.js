// DSGVO / TTDSG cookie consent banner.
// Stores choice in localStorage (essential — no consent needed per TTDSG §25(2)).
// Emits an event so analytics can load only after opt-in.

const KEY = 'consent.v1'
const CONSENT_VERSION = '2026-04-15'

function read() {
  try { return JSON.parse(localStorage.getItem(KEY) || 'null') } catch { return null }
}

function write(choice) {
  localStorage.setItem(KEY, JSON.stringify({ ...choice, version: CONSENT_VERSION, at: Date.now() }))
}

function logConsent(analytics) {
  fetch('/api/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'consent', analytics })
  }).catch(() => {})
}

function trackPageview() {
  fetch('/api/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'pageview',
      path: location.pathname,
      referrer: document.referrer || ''
    })
  }).catch(() => {})
}

function showBanner() {
  const banner = document.createElement('div')
  banner.id = 'consent-banner'
  banner.setAttribute('role', 'dialog')
  banner.setAttribute('aria-label', 'Cookie-Einstellungen')
  banner.innerHTML = `
    <div class="consent-inner">
      <p>
        Diese Website verwendet technisch notwendige Speicherung. Mit Ihrer Einwilligung
        erheben wir zusätzlich anonyme Statistiken (keine Cookies, keine Weitergabe an Dritte)
        zur Verbesserung der Seite. Mehr in der
        <a href="/datenschutz.html">Datenschutzerklärung</a>.
      </p>
      <div class="consent-actions">
        <button type="button" id="consent-reject">Nur notwendige</button>
        <button type="button" id="consent-accept" class="primary">Alle akzeptieren</button>
      </div>
    </div>
  `
  document.body.appendChild(banner)

  document.getElementById('consent-accept').addEventListener('click', () => {
    write({ analytics: true })
    logConsent(true)
    trackPageview()
    banner.remove()
  })
  document.getElementById('consent-reject').addEventListener('click', () => {
    write({ analytics: false })
    logConsent(false)
    banner.remove()
  })
}

export function initConsent() {
  const stored = read()
  if (!stored || stored.version !== CONSENT_VERSION) {
    showBanner()
    return
  }
  if (stored.analytics) trackPageview()
}

export function revokeConsent() {
  localStorage.removeItem(KEY)
  location.reload()
}
