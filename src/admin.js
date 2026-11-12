import { supabase } from './supabase.js'

const loginCard = document.getElementById('login-card')
const dashboard = document.getElementById('dashboard')
const dashBody = document.getElementById('dash-body')
const dashMsg = document.getElementById('dash-msg')
const loginMsg = document.getElementById('login-msg')
const who = document.getElementById('who')

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}

// Percent-encode everything except the "@", so an address can never add
// extra mailto fields (?bcc=…, &body=…) to the reply link.
function mailtoHref(email) {
  return 'mailto:' + encodeURIComponent(String(email ?? '')).replace(/%40/g, '@')
}

// Always fetch with a fresh access token — a token captured at render time
// expires after ~1h and requests would silently fail.
async function authFetch(url, opts = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Session expired — please sign in again.')
  return fetch(url, {
    ...opts,
    headers: { ...(opts.headers || {}), Authorization: `Bearer ${session.access_token}` }
  })
}

async function loadMessages() {
  const res = await authFetch('/api/messages')
  if (!res.ok) throw new Error(`messages ${res.status}`)
  const payload = await res.json()
  const messages = payload.messages || []
  const total = payload.total ?? messages.length
  const unread = payload.unread ?? messages.filter(m => !m.read_at).length
  const list = document.getElementById('messages-list')

  let summary = `(${total} total, ${unread} unread)`
  if (total > messages.length) summary += ` — showing the newest ${messages.length}`
  document.getElementById('msg-count').textContent = summary

  list.innerHTML = ''
  if (messages.length === 0) {
    list.innerHTML = '<p class="muted">No messages yet.</p>'
    return
  }
  for (const m of messages) {
    const id = Number(m.id)
    const div = document.createElement('div')
    div.className = 'msg' + (m.read_at ? '' : ' unread')
    const when = new Date(m.created_at).toLocaleString()
    div.innerHTML = `
      <div class="meta">
        <strong>${escapeHtml(m.name)}</strong>
        <a href="${escapeHtml(mailtoHref(m.email))}">${escapeHtml(m.email)}</a>
        <span>${escapeHtml(when)}</span>
        ${m.country ? `<span>${escapeHtml(m.country)}</span>` : ''}
      </div>
      <div class="body">${escapeHtml(m.message)}</div>
      <div class="actions">
        ${m.read_at ? '' : `<button data-read="${id}">Mark read</button>`}
        <button data-delete="${id}">Delete</button>
      </div>
    `
    list.appendChild(div)
  }

  list.querySelectorAll('[data-read]').forEach(btn => {
    btn.addEventListener('click', async () => {
      try {
        const res = await authFetch(`/api/messages?id=${btn.dataset.read}`, { method: 'POST' })
        if (!res.ok && res.status !== 204) throw new Error(`mark read failed (${res.status})`)
        await loadMessages()
      } catch (err) {
        alert(err.message)
      }
    })
  })
  list.querySelectorAll('[data-delete]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this message?')) return
      try {
        const res = await authFetch(`/api/messages?id=${btn.dataset.delete}`, { method: 'DELETE' })
        if (!res.ok && res.status !== 204) throw new Error(`delete failed (${res.status})`)
        await loadMessages()
      } catch (err) {
        alert(err.message)
      }
    })
  })
}

async function renderDashboard(session) {
  loginCard.classList.add('hidden')
  dashboard.classList.remove('hidden')
  dashBody.classList.remove('hidden')
  dashMsg.textContent = ''
  who.textContent = `Signed in as ${session.user.email}`

  try {
    const res = await authFetch('/api/stats')
    if (res.status === 403) {
      // Hide only the data — the Sign out button above must stay usable.
      dashBody.classList.add('hidden')
      dashMsg.textContent = 'Your account is not allow-listed as admin.'
      return
    }
    if (!res.ok) throw new Error(`stats ${res.status}`)
    const { daily, totalViews } = await res.json()
    document.getElementById('total').textContent = totalViews ?? 0
    const tbody = document.querySelector('#daily-table tbody')
    tbody.innerHTML = ''
    for (const row of daily || []) {
      const tr = document.createElement('tr')
      const day = new Date(row.day).toISOString().slice(0, 10)
      for (const value of [day, row.path, row.views, row.unique_visitors]) {
        const td = document.createElement('td')
        td.textContent = value ?? ''
        tr.appendChild(td)
      }
      tbody.appendChild(tr)
    }

    await loadMessages()
  } catch (err) {
    console.error(err)
    dashMsg.textContent = `Failed to load: ${err.message}`
  }
}

// Supabase reports the same signed-in user several times (on page load, on
// every hourly token refresh, when the tab regains focus). Render once per user.
let renderedUserId = null

function onSession(session) {
  if (!session || session.user.id === renderedUserId) return
  renderedUserId = session.user.id
  renderDashboard(session)
}

async function init() {
  // Deferred with setTimeout: Supabase calls must not run inside its own
  // auth-change callback.
  supabase.auth.onAuthStateChange((_event, session) => {
    setTimeout(() => onSession(session), 0)
  })

  const { data: { session } } = await supabase.auth.getSession()
  onSession(session)
}

document.getElementById('send-link').addEventListener('click', async () => {
  const email = document.getElementById('email').value.trim()
  if (!email) { loginMsg.textContent = 'Enter an email.'; return }
  loginMsg.textContent = 'Sending…'
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${location.origin}/admin.html` }
  })
  loginMsg.textContent = error ? `Error: ${error.message}` : 'Check your inbox for the magic link.'
})

document.getElementById('signout').addEventListener('click', async () => {
  await supabase.auth.signOut()
  location.reload()
})

init()
