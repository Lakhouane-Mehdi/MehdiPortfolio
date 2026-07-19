// Vercel serverless function: GET /api/stats
// Returns aggregate analytics. Requires a valid admin session (JWT from Supabase Auth).

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false }
})

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const auth = req.headers.authorization || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return res.status(401).json({ error: 'missing token' })

  const { data: userData, error: userErr } = await admin.auth.getUser(token)
  if (userErr || !userData?.user?.email) return res.status(401).json({ error: 'invalid token' })

  const email = userData.user.email
  const { data: adminRow } = await admin.from('admins').select('email').eq('email', email).maybeSingle()
  if (!adminRow) return res.status(403).json({ error: 'not an admin' })

  // Filter by date, not row count — the view has one row per day *per path*,
  // so a row limit would truncate arbitrarily once several pages have traffic.
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const { data, error } = await admin
    .from('pageviews_daily')
    .select('*')
    .gte('day', since)
    .order('day', { ascending: false })

  if (error) return res.status(500).json({ error: error.message })

  const { count: totalViews } = await admin
    .from('pageviews')
    .select('*', { count: 'exact', head: true })

  return res.status(200).json({ daily: data, totalViews })
}
