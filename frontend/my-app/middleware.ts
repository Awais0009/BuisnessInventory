import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Get JWT token from localStorage equivalent (cookies or headers)
  const token = request.cookies.get('auth_token')?.value || 
                request.headers.get('authorization')?.replace('Bearer ', '')

  console.log('Middleware - checking path:', request.nextUrl.pathname)
  console.log('Middleware - token exists:', !!token)

  // Protected routes - main dashboard and sub-pages
  const protectedPaths = ['/', '/dashboard', '/investment-overview', '/transaction-ledger']
  const isProtectedPath = protectedPaths.some(path => 
    path === '/' ? request.nextUrl.pathname === '/' : request.nextUrl.pathname.startsWith(path)
  )

  // Auth routes that logged in users shouldn't access
  const authPaths = ['/auth/login', '/auth/signup', '/auth/forgot-password']
  const isAuthPath = authPaths.some(path => request.nextUrl.pathname.startsWith(path))

  // Landing page
  const isLandingPage = request.nextUrl.pathname === '/landing'

  // Auth callback route - always allow
  if (request.nextUrl.pathname.startsWith('/auth/callback')) {
    return NextResponse.next()
  }

  // If user has token and tries to access auth pages or landing, redirect to dashboard
  if (token && (isAuthPath || isLandingPage)) {
    console.log('Middleware - authenticated user trying to access auth page, redirecting to dashboard')
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // If accessing root without auth, redirect to landing
  if (request.nextUrl.pathname === '/' && !token) {
    console.log('Middleware - unauthenticated user trying to access root, redirecting to landing')
    const url = request.nextUrl.clone()
    url.pathname = '/landing'
    return NextResponse.redirect(url)
  }

  // If accessing protected routes without auth, redirect to landing
  if (isProtectedPath && !token) {
    console.log('Middleware - unauthenticated user trying to access protected route, redirecting to landing')
    const url = request.nextUrl.clone()
    url.pathname = '/landing'
    return NextResponse.redirect(url)
  }

  console.log('Middleware - allowing request to proceed')
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
