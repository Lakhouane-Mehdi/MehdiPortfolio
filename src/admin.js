import { supabase } from './supabase.js'

const loginCard = document.getElementById('login-card')
const dashboard = document.getElementById('dashboard')
const loginMsg = document.getElementById('login-msg')
const who = document.getElementById('who')

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
      tr.innerHTML = `<td>${day}</td><td>${row.path}</td><td>${row.views}</td><td>${row.unique_visitors}</td>`
      tbody.appendChild(tr)
    }
  } catch (err) {
    console.error(err)
    dashboard.insertAdjacentHTML('beforeend', `<p class="muted">Failed to load stats: ${err.message}</p>`)
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
