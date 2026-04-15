import './consent.css'
import { initConsent } from './consent.js'

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initConsent)
} else {
  initConsent()
}
