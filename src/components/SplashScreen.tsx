import { useEffect, useState } from "react"

interface SplashScreenProps {
  onGetStarted: () => void
}

export function SplashScreen({ onGetStarted }: SplashScreenProps) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    let current = 0
    const interval = setInterval(() => {
      const remaining = 100 - current
      const increment = Math.max(1, Math.floor(remaining * 0.045))
      current = Math.min(100, current + increment)
      setProgress(current)
      if (current >= 100) {
        clearInterval(interval)
        setTimeout(onGetStarted, 400)
      }
    }, 50)
    return () => clearInterval(interval)
  }, [onGetStarted])

  const radius = 28
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (progress / 100) * circumference

  // The image is 1568x1045. Content (logo+title+tagline) ends at row ~664 (63.5%).
  // We show the image in a container that clips at 64% height, then add
  // the circle and copyright as normal flow elements below.
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-white">

      {/* Image container — clip the 36% blank bottom */}
      <div
        className="w-full max-w-2xl overflow-hidden"
        style={{ height: "0", paddingBottom: "42.5%", position: "relative" }}
      >
        <img
          src="/splash-reference.png"
          alt="Podcast One"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "156%",
            objectFit: "cover",
            objectPosition: "top",
          }}
          draggable={false}
        />
      </div>

      {/* Loading circle + percentage */}
      <div className="relative flex items-center justify-center mt-8">
        <svg width="72" height="72" viewBox="0 0 72 72" className="-rotate-90">
          <circle cx="36" cy="36" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="5" />
          <circle
            cx="36" cy="36" r={radius}
            fill="none"
            stroke="url(#splashGrad)"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: "stroke-dashoffset 0.05s linear" }}
          />
          <defs>
            <linearGradient id="splashGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
          </defs>
        </svg>
        <span className="absolute text-sm font-semibold tabular-nums" style={{ color: "#1e2d4d" }}>
          {progress}%
        </span>
      </div>

      {/* Copyright */}
      <div className="mt-6 mb-10 text-center space-y-0.5" style={{ color: "#64748b" }}>
        <p className="text-sm">Version 1.0.0</p>
        <p className="text-sm">Copyright © 2026 Podcast One</p>
      </div>

    </div>
  )
}
