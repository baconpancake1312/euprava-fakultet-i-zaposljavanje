import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Public routes that don't require authentication
const publicRoutes = ["/", "/login", "/register"]

// Protected routes that require authentication
const protectedRoutes = ["/dashboard"]

// Role-based route access
const roleRoutes: Record<string, string[]> = {
  "/dashboard/admin": ["ADMIN", "ADMINISTRATOR", "STUDENTSKA_SLUZBA"],
  "/dashboard/employer": ["EMPLOYER"],
  "/dashboard/candidate": ["CANDIDATE", "STUDENT"],
  "/dashboard/student": ["STUDENT"],
  "/dashboard/professor": ["PROFESSOR"],
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Check if route is public
  const isPublicRoute = publicRoutes.some((route) => pathname === route || pathname.startsWith(route + "/"))

  // If it's a public route, allow access
  if (isPublicRoute) {
    return NextResponse.next()
  }

  // Check if route is protected
  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route))

  if (isProtectedRoute) {
    // Get user data from cookie (set by client-side after login)
    const userCookie = request.cookies.get("user")
    const tokenCookie = request.cookies.get("token")

    // If no auth cookies, redirect to login
    if (!userCookie || !tokenCookie) {
      const loginUrl = new URL("/login", request.url)
      loginUrl.searchParams.set("redirect", pathname)
      return NextResponse.redirect(loginUrl)
    }

    // Check role-based access
    try {
      const user = JSON.parse(userCookie.value)
      const userType = user.user_type

      // Check if route requires specific role
      for (const [route, allowedRoles] of Object.entries(roleRoutes)) {
        if (pathname.startsWith(route)) {
          if (!allowedRoles.includes(userType)) {
            // Redirect to appropriate dashboard based on user type
            let redirectPath = "/dashboard"
            switch (userType) {
              case "EMPLOYER":
                redirectPath = "/dashboard/employer"
                break
              case "CANDIDATE":
              case "STUDENT":
                redirectPath = "/dashboard/candidate"
                break
              case "PROFESSOR":
                redirectPath = "/dashboard/professor"
                break
              case "ADMIN":
              case "ADMINISTRATOR":
              case "STUDENTSKA_SLUZBA":
                redirectPath = "/dashboard/admin"
                break
            }
            return NextResponse.redirect(new URL(redirectPath, request.url))
          }
          break
        }
      }
    } catch (error) {
      // Invalid user data, redirect to login
      const loginUrl = new URL("/login", request.url)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
