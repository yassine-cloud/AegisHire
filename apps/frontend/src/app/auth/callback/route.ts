import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token

      if (token) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

          const profileResponse = await fetch(`${API_BASE_URL}/api/v1/profile/me`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            signal: controller.signal,
          })

          clearTimeout(timeoutId);

          if (profileResponse.ok) {
            // Send all verified users to the profile settings page first.
            return NextResponse.redirect(`${origin}/profile`)
          }
        } catch (err) {
          // If fetch fails or times out, default to profile
          return NextResponse.redirect(`${origin}/profile`)
        }
      }
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/login?error=Could not authenticate user`)
}
