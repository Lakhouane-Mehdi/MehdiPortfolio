import { supabase } from './supabase.js'

const loginCard = document.getElementById('login-card')
const dashboard = document.getElementById('dashboard')
const loginMsg = document.getElementById('login-msg')
const who = document.getElementById('who')

function escapeHtml(s = '') {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}

async function loadMessages(token) {
  const res = await fetch('/api/messages', { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) throw new Error(`messages ${res.status}`)
  const { messages } = await res.json()
  const list = document.getElementById('messages-list')
  const unread = messages.filter(m => !m.read_at).length
  document.getElementById('msg-count').textContent = `(${messages.length} total, ${unread} unread)`

  list.innerHTML = ''
  if (messages.length === 0) {
    list.innerHTML = '<p class="muted">No messages yet.</p>'
    return
  }
  for (const m of messages) {
    const div = document.createElement('div')
    div.className = 'msg' + (m.read_at ? '' : ' unread')
    const when = new Date(m.created_at).toLocaleString()
    div.innerHTML = `
      <div class="meta">
        <strong>${escapeHtml(m.name)}</strong>
        <a href="mailto:${escapeHtml(m.email)}">${escapeHtml(m.email)}</a>
        <span>${when}</span>
        ${m.country ? `<span>${escapeHtml(m.country)}</span>` : ''}
      </div>
      <div class="body">${escapeHtml(m.message)}</div>
      <div class="actions">
        ${m.read_at ? '' : `<button data-read="${m.id}">Mark read</button>`}
        <button data-delete="${m.id}">Delete</button>
      </div>
    `
    list.appendChild(div)
  }

  list.querySelectorAll('[data-read]').forEach(btn => {
    btn.addEventListener('click', async () => {
      await fetch(`/api/messages?id=${btn.dataset.read}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      loadMessages(token)
    })
  })
  list.querySelectorAll('[data-delete]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this message?')) return
      await fetch(`/api/messages?id=${btn.dataset.delete}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      loadMessages(token)
    })
  })
}

async function renderDashboard(session) {
  loginCard.classList.add('hidden')
  dashboard.classList.remove('hidden')
  who.textContent = `Signed in as ${session.user.email}`

  try {
    const res = await fetch('/api/stats', {
      headers: { Authorization: `Bearer ${session.access_token}` }
    })
    if (res.status === 403) {
      dashboard.innerHTML = '<p>Your account is not allow-listed as admin.</p>'
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

    await loadMessages(session.access_token)
  } catch (err) {
    console.error(err)
    dashboard.insertAdjacentHTML('beforeend', `<p class="muted">Failed to load: ${err.message}</p>`)
  }
}

async function init() {
  const { data: { session } } = await supabase.auth.getSession()
  if (session) renderDashboard(session)

  supabase.auth.onAuthStateChange((_event, session) => {
    if (session) renderDashboard(session)
  })
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
