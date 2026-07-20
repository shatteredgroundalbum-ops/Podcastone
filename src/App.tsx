import { useState, useEffect, useCallback } from "react"

import { AuthProvider, useAuth } from "@/contexts/AuthContext"
import { SessionProvider } from "@/contexts/SessionContext"
import { SplashScreen } from "@/components/SplashScreen"
import { AuthScreen } from "@/components/AuthScreen"
import { HomeScreen } from "@/components/HomeScreen"
import { Wizard } from "@/components/wizard/Wizard"

type AppView = "splash" | "auth" | "home" | "wizard"

function AppContent() {
  const { user, isLoading } = useAuth()
  const [view, setView] = useState<AppView>("splash")

  useEffect(() => {
    if (!isLoading && view === "splash") return // let splash finish
    if (!isLoading) setView(user ? "home" : "auth")
  }, [user, isLoading])

  const handleStartWizard = useCallback(() => setView("wizard"), [])
  const handleExitWizard = useCallback(() => setView("home"), [])
  const handleSplashDone = useCallback(() => setView(user ? "home" : "auth"), [user])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    )
  }

  switch (view) {
    case "splash":
      return <SplashScreen onGetStarted={handleSplashDone} />
    case "auth":
      return <AuthScreen onBack={() => {}} />
    case "home":
      return <HomeScreen onStartWizard={handleStartWizard} />
    case "wizard":
      return <Wizard onExit={handleExitWizard} />
    default:
      return <AuthScreen onBack={() => {}} />
  }
}

function App() {
  return (
    <AuthProvider>
      <SessionProvider>
        <AppContent />
      </SessionProvider>
    </AuthProvider>
  )
}

export default App
