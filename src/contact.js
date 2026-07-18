import { t } from './i18n.js'

const form = document.getElementById('contact-form')
if (form) {
  const status = document.getElementById('cf-status')
  const submit = document.getElementById('cf-submit')

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    status.textContent = ''
    status.classList.remove('error', 'success')

    const body = {
      name: document.getElementById('cf-name').value,
      email: document.getElementById('cf-email').value,
      message: document.getElementById('cf-message').value,
      website: document.getElementById('cf-website').value,
      consent: document.getElementById('cf-consent').checked
    }

    submit.disabled = true
    submit.textContent = t('contact.sending', 'Sending…')

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      if (res.ok || res.status === 204) {
        status.textContent = t('contact.success', 'Thanks — your message has been sent.')
        status.classList.add('success')
        form.reset()
      } else {
        const data = await res.json().catch(() => ({}))
        status.textContent = data.error || `${t('contact.error_generic', 'Error')} ${res.status}`
        status.classList.add('error')
      }
    } catch (err) {
      status.textContent = t('contact.error_network', 'Network error. Please try again.')
      status.classList.add('error')
    } finally {
      submit.disabled = false
      submit.textContent = t('contact.submit', 'Send message')
    }
  })
}
