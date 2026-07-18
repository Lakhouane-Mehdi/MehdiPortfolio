// GET /api/messages — admin-only list of contact form submissions
// POST /api/messages?id=N&action=mark_read — mark as read
// DELETE /api/messages?id=N — delete

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false }
})

async function requireAdmin(req) {
  const auth = req.headers.authorization || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return { error: 'missing token', status: 401 }

  const { data: userData, error: userErr } = await admin.auth.getUser(token)
  if (userErr || !userData?.user?.email) return { error: 'invalid token', status: 401 }

  const email = userData.user.email
  const { data: row } = await admin.from('admins').select('email').eq('email', email).maybeSingle()
  if (!row) return { error: 'not an admin', status: 403 }

  return { email }
}

export default async function handler(req, res) {
  const auth = await requireAdmin(req)
  if (auth.error) return res.status(auth.status).json({ error: auth.error })

  if (req.method === 'GET') {
    const { data, error } = await admin
      .from('messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ messages: data })
  }

  if (req.method === 'POST') {
    const id = Number(req.query.id)
    if (!id) return res.status(400).json({ error: 'missing id' })
    const { error } = await admin
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('id', id)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(204).end()
  }

  if (req.method === 'DELETE') {
    const id = Number(req.query.id)
    if (!id) return res.status(400).json({ error: 'missing id' })
    const { error } = await admin.from('messages').delete().eq('id', id)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(204).end()
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
