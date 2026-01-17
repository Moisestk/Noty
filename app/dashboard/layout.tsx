"use client"

import { createClient } from "@/lib/supabase/client"
import { useRouter, usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { Navbar } from "@/components/navbar"
import { Sidebar } from "@/components/sidebar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const [user, setUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Detectar si estamos en una página de edición (new o edit de notas, o new de tareas, o new de shared)
  const isEditorPage = 
    pathname?.includes("/notes/new") || 
    (pathname?.includes("/notes/") && pathname?.includes("/edit")) ||
    pathname?.includes("/tasks/new") ||
    pathname?.includes("/shared/new")

  useEffect(() => {
    let mounted = true
    let subscription: any = null

    async function checkUser() {
      try {
        setIsLoading(true)
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser()

        if (!mounted) return

        if (error || !user) {
          // Solo redirigir si realmente no hay sesión (no por errores temporales)
          console.log('No user found, redirecting to login')
          setIsLoading(false)
          router.push("/auth/login")
        } else {
          setUser(user)
          setIsLoading(false)
        }
      } catch (err) {
        console.error('Error checking user:', err)
        if (mounted) {
          // No redirigir inmediatamente por errores, dar tiempo a que se establezca la sesión
          setTimeout(async () => {
            if (mounted) {
              const { data: { user } } = await supabase.auth.getUser()
              if (!user) {
                setIsLoading(false)
                router.push("/auth/login")
              } else {
                setUser(user)
                setIsLoading(false)
              }
            }
          }, 500)
        }
      }
    }

    checkUser()

    // Escuchar cambios en el estado de autenticación
    subscription = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return

      console.log('Auth state changed:', event, session ? 'has session' : 'no session')
      
      if (event === 'SIGNED_OUT') {
        setUser(null)
        setIsLoading(false)
        router.push("/auth/login")
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.user) {
          setUser(session.user)
          setIsLoading(false)
        } else {
          // Si hay un evento SIGNED_IN pero sin sesión, esperar un momento y verificar
          setTimeout(async () => {
            if (mounted) {
              const { data: { user } } = await supabase.auth.getUser()
              if (user) {
                setUser(user)
                setIsLoading(false)
              }
            }
          }, 200)
        }
      }
    })

    return () => {
      mounted = false
      if (subscription?.data?.subscription) {
        subscription.data.subscription.unsubscribe()
      }
    }
  }, [supabase, router])

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    )
  }

  // Si estamos en una página de edición, mostrar solo el contenido sin sidebar ni navbar
  if (isEditorPage) {
    return <>{children}</>
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden lg:ml-0">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  )
}
