// GET /api/keepalive — hit by Vercel cron once a day. Two jobs:
// 1. A real database query counts as activity, which stops Supabase's
//    free tier from pausing the project after 7 idle days.
// 2. It runs the data-retention cleanup promised in the privacy policy
//    (see supabase/retention.sql).

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false }
})

export default async function handler(req, res) {
  // When CRON_SECRET is set in Vercel, its cron sends it as a Bearer token —
  // then only the cron may call this endpoint.
  const secret = process.env.CRON_SECRET
  if (secret && req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  try {
    // A plain select that returns a row. A count-only (HEAD) request is not
    // enough: its failures come back without a body and can look like success.
    const { data, error } = await admin.from('admins').select('email').limit(1)
    if (error || !Array.isArray(data)) {
      console.error('keepalive error', error)
      return res.status(500).json({ error: 'db unreachable' })
    }

    const { data: removed, error: retentionError } = await admin.rpc('run_retention')
    if (retentionError?.code === 'PGRST202') {
      // The function does not exist yet — supabase/retention.sql has not been run.
      console.warn('retention not installed: run supabase/retention.sql in Supabase')
      return res.status(200).json({ ok: true, retention: 'not installed' })
    }
    if (retentionError) {
      console.error('retention error', retentionError)
      return res.status(500).json({ error: 'retention failed' })
    }

    console.log('retention done', removed)
    return res.status(200).json({ ok: true, retention: 'done' })
  } catch (err) {
    console.error('keepalive error', err)
    return res.status(500).json({ error: 'db unreachable' })
  }
}
