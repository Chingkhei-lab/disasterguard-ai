export async function GET() {
  const { createClient } = await import('@supabase/supabase-js')

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('active', true)

  return Response.json({
    subscriptions: data,
    count: data?.length ?? 0,
    error: error?.message ?? null,
    env_url_set: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    env_key_set: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  })
}
