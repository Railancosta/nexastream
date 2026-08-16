'use client'

import { useEffect, useState } from 'react'
import { Download, Smartphone, Monitor, X } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function PWAProvider({ children }: { children: React.ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(true)
  const [showInstallBanner, setShowInstallBanner] = useState(false)

  useEffect(() => {
    // Check if already installed
    if (typeof window !== 'undefined') {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches
        || (window.navigator as any).standalone
        || document.referrer.includes('android-app://')
      
      setIsInstalled(isStandalone)

      // Listen for install prompt
      const handleBeforeInstallPrompt = (e: Event) => {
        e.preventDefault()
        setDeferredPrompt(e as BeforeInstallPromptEvent)
        setShowInstallBanner(true)
      }

      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

      // Handle app installed
      const handleAppInstalled = () => {
        setIsInstalled(true)
        setShowInstallBanner(false)
        setDeferredPrompt(null)
      }

      window.addEventListener('appinstalled', handleAppInstalled)

      // Register service worker
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('SW registered:', registration.scope)
          })
          .catch((error) => {
            console.log('SW registration failed:', error)
          })
      }

      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
        window.removeEventListener('appinstalled', handleAppInstalled)
      }
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    
    if (outcome === 'accepted') {
      setShowInstallBanner(false)
    }
    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    setShowInstallBanner(false)
    localStorage.setItem('pwa-install-dismissed', Date.now().toString())
  }

  // Check if dismissed recently (within 7 days)
  useEffect(() => {
    const dismissed = localStorage.getItem('pwa-install-dismissed')
    if (dismissed) {
      const daysSinceDismissed = (Date.now() - parseInt(dismissed)) / (1000 * 60 * 60 * 24)
      if (daysSinceDismissed < 7) {
        setShowInstallBanner(false)
      }
    }
  }, [])

  const isMobile = typeof window !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)

  return (
    <>
      {children}
      
      {showInstallBanner && !isInstalled && (
        <div className="fixed bottom-0 left-0 right-0 z-50 pwa-install-banner animate-slide-up">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between gap-4 bg-gradient-to-r from-purple-900/95 to-slate-900/95 backdrop-blur-lg border border-purple-500/30 rounded-2xl p-4 shadow-2xl">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl">▶️</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white text-sm sm:text-base">
                    Install NexaStream App
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 hidden sm:block">
                    Get the app for a better experience
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleInstall}
                  className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-medium rounded-xl hover:opacity-90 transition-opacity flex items-center gap-2"
                >
                  {isMobile ? (
                    <>
                      <Smartphone className="w-4 h-4" />
                      Install
                    </>
                  ) : (
                    <>
                      <Monitor className="w-4 h-4" />
                      Install
                    </>
                  )}
                </button>
                <button
                  onClick={handleDismiss}
                  className="p-2 text-slate-400 hover:text-white transition-colors"
                  aria-label="Dismiss"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
        
        /* Safe area insets for notched devices */
        .pwa-install-banner {
          padding-bottom: max(12px, env(safe-area-inset-bottom));
        }
        
        /* Prevent text selection on install button */
        .pwa-install-banner button {
          user-select: none;
          -webkit-user-select: none;
          -webkit-tap-highlight-color: transparent;
        }
        
        /* Touch action for better mobile experience */
        .pwa-install-banner button:active {
          transform: scale(0.98);
        }
      `}</style>
    </>
  )
}
