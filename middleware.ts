import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Public routes that don't need protection
  const publicRoutes = ['/', '/login', '/signup', '/collector-signup']
  const isPublicRoute = publicRoutes.includes(pathname)

  if (!user && !isPublicRoute) {
    // Redirect unauthenticated users to login if trying to access protected routes
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user) {
    // Fetch user profile to get the role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = profile?.role || 'resident'

    // Redirect authenticated users away from public routes (like login/signup)
    if (isPublicRoute && pathname !== '/') {
      const url = request.nextUrl.clone()
      if (role === 'admin') url.pathname = '/admin'
      else if (role === 'collector') url.pathname = '/collector'
      else url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }

    // Role-based route protection
    if (pathname.startsWith('/admin') && role !== 'admin') {
      const url = request.nextUrl.clone()
      url.pathname = role === 'collector' ? '/collector' : '/dashboard'
      return NextResponse.redirect(url)
    }

    if (pathname.startsWith('/collector') && role !== 'collector' && role !== 'admin') {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }

    // Optional: Prevent collectors/admins from using the resident dashboard
    // If you want them to have access to the resident dashboard, remove this block
    if (pathname.startsWith('/dashboard') && role !== 'resident') {
        const url = request.nextUrl.clone()
        if (role === 'admin') url.pathname = '/admin'
        else if (role === 'collector') url.pathname = '/collector'
        return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
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