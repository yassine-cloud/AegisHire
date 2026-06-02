import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001'

const roleRouteMap: Record<string, string[]> = {
  developer: ['/profile', '/jobs', '/test-gap-report'],
  company: ['/profile', '/company', '/test-gap-report', '/dashboard'],
  admin: ['/profile', '/admin', '/test-gap-report', '/dashboard'],
}

const defaultRouteByRole: Record<string, string> = {
  developer: '/profile',
  company: '/company',
  admin: '/admin',
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/auth') || pathname.startsWith('/_next')) {
    return NextResponse.next()
  }

  const response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    if (pathname === '/') {
      return NextResponse.next()
    }

    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token

  if (!token) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  if (pathname === '/') {
    if (!user.email_confirmed_at) {
      return NextResponse.redirect(new URL('/auth/email-unverified', request.url))
    }

    return NextResponse.redirect(new URL('/profile', request.url))
  }

  let accountType = 'developer'

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3000)

    const profileResponse = await fetch(`${API_BASE_URL}/api/v1/profile/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (profileResponse.ok) {
      const profile = await profileResponse.json()
      accountType = profile.accountType || 'developer'
    }
  } catch {
    // Fall back to developer if the profile lookup fails.
  }

  const allowedRoutes = roleRouteMap[accountType] || roleRouteMap.developer
  const canAccess = allowedRoutes.some((route) => pathname.startsWith(route))

  if (!canAccess) {
    return NextResponse.redirect(new URL(defaultRouteByRole[accountType] || '/profile', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public/).*)'],
}
