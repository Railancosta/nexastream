'use client'
import { ReactNode, useState, useEffect, createContext, useContext } from 'react'

// Auth context for when Clerk is not configured
interface AuthCtx { user: any; isLoaded: boolean; isSignedIn: boolean; signOut: () => void }
const AuthContext = createContext<AuthCtx>({ user: null, isLoaded: true, isSignedIn: false, signOut: () => {} })
export const useAuthCtx = () => useContext(AuthContext)

export default function ClerkProvider({ children }: { children: ReactNode }) {
  const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

  if (key && key.startsWith('pk_') && !key.includes('placeholder')) {
    return <RealClerkProvider pkKey={key}>{children}</RealClerkProvider>
  }

  // Fallback: localStorage-based auth (no Clerk key configured)
  return <FallbackAuthProvider>{children}</FallbackAuthProvider>
}

function RealClerkProvider({ pkKey, children }: { pkKey: string; children: ReactNode }) {
  // Dynamic import to avoid build issues when key is missing
  const [ClerkComp, setClerkComp] = useState<any>(null)
  useEffect(() => {
    import('@clerk/clerk-react').then(m => setClerkComp(() => m.ClerkProvider))
  }, [])

  if (!ClerkComp) return <>{children}</>

  return (
    <ClerkComp
      publishableKey={pkKey}
      appearance={{
        variables: { colorPrimary: '#6366f1', colorBackground: '#030712', borderRadius: '0.5rem' },
        elements: {
          card: 'bg-gray-900 border border-gray-800',
          formButtonPrimary: 'bg-indigo-600 hover:bg-indigo-500',
          footerActionLink: 'text-indigo-400 hover:text-indigo-300',
        }
      }}
    >
      {children}
    </ClerkComp>
  )
}

function FallbackAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('nst_user')
      if (stored) setUser(JSON.parse(stored))
    } catch {}
    setIsLoaded(true)
  }, [])

  const signOut = () => { localStorage.removeItem('nst_user'); localStorage.removeItem('nst_token'); setUser(null) }

  return (
    <AuthContext.Provider value={{ user, isLoaded, isSignedIn: !!user, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
