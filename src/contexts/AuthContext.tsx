import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import type { User, AuthState } from "@/types"

interface AuthContextValue extends AuthState {
  signup: (name: string, email: string, password: string) => Promise<void>
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  updateAccount: (name: string, email: string, currentPassword: string, newPassword?: string) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const storedToken = localStorage.getItem("podcast_token")
    const storedUser = localStorage.getItem("podcast_user")
    if (storedToken && storedUser) {
      setToken(storedToken)
      setUser(JSON.parse(storedUser))
    }
    setIsLoading(false)
  }, [])

  const persist = (t: string, u: User) => {
    setToken(t); setUser(u)
    localStorage.setItem("podcast_token", t)
    localStorage.setItem("podcast_user", JSON.stringify(u))
  }

  const signup = useCallback(async (name: string, email: string, password: string) => {
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.detail || "Signup failed")
    }
    const data = await res.json()
    persist(data.token, data.user)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.detail || "Login failed")
    }
    const data = await res.json()
    persist(data.token, data.user)
  }, [])

  const logout = useCallback(() => {
    setUser(null); setToken(null)
    localStorage.removeItem("podcast_token")
    localStorage.removeItem("podcast_user")
  }, [])

  const updateAccount = useCallback(async (name: string, email: string, currentPassword: string, newPassword?: string) => {
    const res = await fetch("/api/auth/me", {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name, email, current_password: currentPassword, new_password: newPassword }),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.detail || "Update failed")
    }
    const updated = await res.json()
    setUser(updated)
    localStorage.setItem("podcast_user", JSON.stringify(updated))
  }, [token])

  return (
    <AuthContext.Provider value={{ user, token, isLoading, signup, login, logout, updateAccount }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
