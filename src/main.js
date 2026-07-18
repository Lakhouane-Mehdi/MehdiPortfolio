import './consent.css'
import './contact.css'
import { initConsent, revokeConsent } from './consent.js'
import './contact.js'
import { initI18n } from './i18n.js'
import './nav.js'

function boot() {
  initI18n().catch(err => console.warn('i18n init failed:', err))
  initConsent()
  const btn = document.getElementById('cookie-settings')
  if (btn) btn.addEventListener('click', revokeConsent)
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot)
} else {
  boot()
}
