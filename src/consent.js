// DSGVO / TTDSG cookie consent banner.
// Stores choice in localStorage (essential — no consent needed per TTDSG §25(2)).
// Emits an event so analytics can load only after opt-in.

import { t } from './i18n.js'

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
  banner.setAttribute('aria-label', t('consent.aria_label', 'Cookie settings'))
  // data-i18n* attributes keep the banner in sync when the user switches language.
  banner.innerHTML = `
    <div class="consent-inner">
      <p data-i18n-html="consent.text_html">${t('consent.text_html',
        'This website uses technically necessary storage. With your consent, we additionally collect anonymous statistics (no cookies, no sharing with third parties) to improve the site. More in the <a href="/datenschutz.html">privacy policy</a>.')}</p>
      <div class="consent-actions">
        <button type="button" id="consent-reject" data-i18n="consent.reject">${t('consent.reject', 'Necessary only')}</button>
        <button type="button" id="consent-accept" class="primary" data-i18n="consent.accept">${t('consent.accept', 'Accept all')}</button>
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
