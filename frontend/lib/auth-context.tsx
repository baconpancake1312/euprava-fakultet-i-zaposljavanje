"use client"

import { createContext, useContext, useState, useEffect, type ReactNode, useCallback } from "react"
import type { User } from "./types"

interface AuthContextType {
  user: User | null
  token: string | null
  login: (user: User, token: string) => void
  logout: () => void
  updateUser: (userData: Partial<User> & { id: string }) => void
  isAuthenticated: boolean
  isLoading: boolean
  refreshToken: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Check if token is expired (strict check - only return true if actually expired)
  const isTokenExpired = useCallback((token: string): boolean => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      const expirationTime = payload.exp * 1000 // Convert to milliseconds
      // Token is only expired if current time is past the expiration time
      return Date.now() >= expirationTime
    } catch {
      return true
    }
  }, [])

  // Logout function - defined early so it can be used in useEffect
  const logout = useCallback(() => {
    setUser(null)
    setToken(null)
    localStorage.removeItem("user")
    localStorage.removeItem("token")
    // Clear cookies
    if (typeof document !== "undefined") {
      document.cookie = "user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
      document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
    }
  }, [])

  // Refresh token function (re-login with stored credentials would be needed)
  const refreshToken = useCallback(async (): Promise<boolean> => {
    // Since Keycloak doesn't provide refresh tokens in your current setup,
    // we'll prompt user to re-login when token expires
    console.log("Token has expired. Please log in again.")
    return false
  }, [])

  // Check token validity periodically (less frequently for long-lived tokens)
  useEffect(() => {
    if (!token) return

    const checkTokenValidity = () => {
      if (isTokenExpired(token)) {
        console.warn("Token has expired. Logging out...")
        logout()
      }
    }

    // Check immediately
    checkTokenValidity()

    // Check every 5 minutes (reasonable interval for 24-hour tokens)
    const interval = setInterval(checkTokenValidity, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [token, isTokenExpired, logout])

  useEffect(() => {
    // Load from localStorage on mount
    const storedUser = localStorage.getItem("user")
    const storedToken = localStorage.getItem("token")

    if (storedUser && storedToken) {
      try {
        const parsedUser = JSON.parse(storedUser)
        // Check if token is still valid
        if (!isTokenExpired(storedToken)) {
          setUser(parsedUser)
          setToken(storedToken)
        } else {
          // Token expired, clear storage
          console.log("Stored token has expired, clearing...")
          localStorage.removeItem("user")
          localStorage.removeItem("token")
        }
      } catch (error) {
        console.error("Failed to parse stored user data:", error)
        // Don't clear on parse error - might be temporary
        // Only clear if it's a critical error
        try {
          const parsedUser = JSON.parse(storedUser)
          setUser(parsedUser)
          setToken(storedToken)
        } catch {
          localStorage.removeItem("user")
          localStorage.removeItem("token")
        }
      }
    }
    setIsLoading(false)
  }, [isTokenExpired])

  const login = (userData: User, authToken: string) => {
    setUser(userData)
    setToken(authToken)
    localStorage.setItem("user", JSON.stringify(userData))
    localStorage.setItem("token", authToken)
    // Also set cookies for middleware
    if (typeof document !== "undefined") {
      document.cookie = `user=${JSON.stringify(userData)}; path=/; max-age=86400` // 24 hours
      document.cookie = `token=${authToken}; path=/; max-age=86400` // 24 hours
    }
  }

  const updateUser = (userData: Partial<User> & { id: string }) => {
    setUser((prev) => {
      if (!prev || prev.id !== userData.id) return prev
      const next = { ...prev, ...userData }
      localStorage.setItem("user", JSON.stringify(next))
      return next
    })
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        updateUser,
        refreshToken,
        isAuthenticated: !!user && !!token,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
