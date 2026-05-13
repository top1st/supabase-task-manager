import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// This runs on the server only – the secret key is never exposed to the browser
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!  // Secret key – store it in .env.local
)

export async function GET(request: Request) {
  // 1. Verify that the requesting user is an admin
  // We need to get the user's JWT from the Authorization header
  const authHeader = request.headers.get('Authorization')
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)

  if (userError || !user) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  // 2. Check the user's role from the profiles table
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // 3. Fetch all tasks (bypasses RLS because we're using the secret key client)
  const { data: tasks, error } = await supabaseAdmin
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // 4. Fetch user emails separately (or join manually)
  const userIds = [...new Set(tasks.map(t => t.user_id))]
  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id, email')
    .in('id', userIds)

  const emailMap = Object.fromEntries((profiles || []).map(p => [p.id, p.email]))

  const tasksWithEmails = tasks.map(task => ({
    ...task,
    user_email: emailMap[task.user_id] || task.user_id
  }))

  return NextResponse.json(tasksWithEmails)
}