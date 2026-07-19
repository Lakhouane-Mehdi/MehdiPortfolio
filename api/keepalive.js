// GET /api/keepalive — hit by Vercel cron twice a week.
// A single tiny query counts as API activity, which stops Supabase's
// free tier from pausing the project after 7 idle days.

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false }
})

export default async function handler(req, res) {
  const { error } = await admin
    .from('admins')
    .select('*', { count: 'exact', head: true })
  if (error) {
    console.error('keepalive error', error)
    return res.status(500).json({ error: 'db unreachable' })
  }
  return res.status(204).end()
}
