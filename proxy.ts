import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  const response = NextResponse.next()

  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const supabaseUrl =
    envUrl.startsWith('http://') || envUrl.startsWith('https://') ? envUrl : 'http://localhost:54321'

  const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
  const supabaseAnonKey = envKey.trim() ? envKey : 'public-anon-key'

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const isProtected =
    pathname.startsWith('/dashboard') || pathname.startsWith('/reports') || pathname.startsWith('/profile')

  if (!user && isProtected) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('next', `${pathname}${request.nextUrl.search}`)
    return NextResponse.redirect(loginUrl)
  }

  if (user && (pathname === '/login' || pathname === '/signup')) {
    const dashboardUrl = request.nextUrl.clone()
    dashboardUrl.pathname = '/dashboard'
    dashboardUrl.search = ''
    return NextResponse.redirect(dashboardUrl)
  }

  return response
}

export const config = {
  matcher: ['/dashboard/:path*', '/reports/:path*', '/profile/:path*', '/login', '/signup'],
}

