import { type NextRequest, NextResponse } from 'next/server'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001"

const roleRouteMap: Record<string, string[]> = {
  developer: ['/profile'],
  company: ['/profile', '/company'],
  admin: ['/profile', '/company', '/admin'],
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip middleware for auth, callback, and public routes
  if (pathname.startsWith('/auth') || pathname === '/' || pathname.includes('_next')) {
    return NextResponse.next()
  }

  // Get token from cookies
  const token = request.cookies.get('sb-access-token')?.value

  // For protected routes, check role-based access
  if (pathname.startsWith('/profile') || pathname.startsWith('/company') || pathname.startsWith('/admin')) {
    if (!token) {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }

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
        const profile = await profileResponse.json()
        const accountType = profile.accountType || 'developer'
        const allowedRoutes = roleRouteMap[accountType] || roleRouteMap['developer']

        // Check if user can access this route
        const canAccess = allowedRoutes.some(route => pathname.startsWith(route))

        if (!canAccess) {
          // Redirect to their default page
          const defaultRoutes: Record<string, string> = {
            developer: '/profile',
            company: '/company',
            admin: '/admin',
          }
          const redirectPath = defaultRoutes[accountType] || '/profile'
          return NextResponse.redirect(new URL(redirectPath, request.url))
        }
      }
    } catch (err) {
      // On error, allow the request to continue (the page handler will validate)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}
