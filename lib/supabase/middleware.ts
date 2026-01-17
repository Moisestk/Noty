import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          // Configurar opciones de persistencia para las cookies de autenticación de Supabase
          const cookieOptions: CookieOptions = {
            ...options,
            // Persistir cookies de autenticación por 30 días (en segundos)
            maxAge: name.includes('sb-') && name.includes('auth-token') 
              ? 60 * 60 * 24 * 30 
              : (options.maxAge || 60 * 60 * 24 * 7), // 7 días por defecto para otras cookies
            // Configurar sameSite para permitir cookies en navegadores modernos
            sameSite: (options.sameSite || 'lax') as 'lax' | 'strict' | 'none',
            // Secure solo en producción (HTTPS)
            secure: options.secure ?? (process.env.NODE_ENV === 'production'),
            // Path raíz para que esté disponible en toda la app
            path: options.path || '/',
          }
          
          request.cookies.set({
            name,
            value,
            ...cookieOptions,
          })
          supabaseResponse = NextResponse.next({
            request,
          })
          supabaseResponse.cookies.set({
            name,
            value,
            ...cookieOptions,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          supabaseResponse = NextResponse.next({
            request,
          })
          supabaseResponse.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  await supabase.auth.getUser()

  return supabaseResponse
}
