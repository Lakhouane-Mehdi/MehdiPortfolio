// GET /api/messages — admin-only list of contact form submissions
// POST /api/messages?id=N — mark as read
// DELETE /api/messages?id=N — delete

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false }
})

const PAGE_SIZE = 100

async function requireAdmin(req) {
  const auth = req.headers.authorization || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return { error: 'missing token', status: 401 }

  const { data: userData, error: userErr } = await admin.auth.getUser(token)
  const user = userData?.user
  // The email must be verified — an unconfirmed account proves nothing about
  // who owns the address.
  if (userErr || !user?.email || !user.email_confirmed_at) {
    return { error: 'invalid token', status: 401 }
  }

  const { data: row } = await admin.from('admins').select('email').eq('email', user.email).maybeSingle()
  if (!row) return { error: 'not an admin', status: 403 }

  return { email: user.email }
}

function parseId(value) {
  const id = Number(value)
  return Number.isSafeInteger(id) && id > 0 ? id : null
}

export default async function handler(req, res) {
  try {
    const auth = await requireAdmin(req)
    if (auth.error) return res.status(auth.status).json({ error: auth.error })

    if (req.method === 'GET') {
      // count: 'exact' reports every row, not just the page returned.
      const { data, count, error } = await admin
        .from('messages')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE)
      if (error) return res.status(500).json({ error: error.message })

      const { count: unread } = await admin
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .is('read_at', null)

      return res.status(200).json({
        messages: data,
        total: count ?? data.length,
        unread: unread ?? data.filter(m => !m.read_at).length
      })
    }

    if (req.method === 'POST') {
      const id = parseId(req.query.id)
      if (!id) return res.status(400).json({ error: 'missing id' })
      const { error } = await admin
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('id', id)
      if (error) return res.status(500).json({ error: error.message })
      return res.status(204).end()
    }

    if (req.method === 'DELETE') {
      const id = parseId(req.query.id)
      if (!id) return res.status(400).json({ error: 'missing id' })
      const { error } = await admin.from('messages').delete().eq('id', id)
      if (error) return res.status(500).json({ error: error.message })
      return res.status(204).end()
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error('messages error', err)
    return res.status(500).json({ error: 'server error' })
  }
}
