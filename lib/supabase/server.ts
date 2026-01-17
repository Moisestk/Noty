import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            // Configurar opciones de persistencia para cookies de autenticación
            const cookieOptions: CookieOptions = {
              ...options,
              // Persistir cookies de autenticación por 30 días
              maxAge: name.includes('sb-') && name.includes('auth-token')
                ? 60 * 60 * 24 * 30
                : (options.maxAge || 60 * 60 * 24 * 7),
              sameSite: (options.sameSite || 'lax') as 'lax' | 'strict' | 'none',
              secure: options.secure ?? (process.env.NODE_ENV === 'production'),
              path: options.path || '/',
            }
            cookieStore.set({ name, value, ...cookieOptions })
          } catch (error) {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // The `delete` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}
