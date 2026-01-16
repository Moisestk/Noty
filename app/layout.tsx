import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"
import { Providers } from "@/components/providers"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "NotyApp - Notas y Tareas",
  description: "Aplicación moderna de notas y tareas con colaboración",
  icons: {
    icon: [
      { url: "/img/logo azul.ico", type: "image/x-icon" },
      { url: "/img/logo azul.png", type: "image/png" },
    ],
    shortcut: "/img/logo azul.ico",
    apple: "/img/logo azul.png",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/img/logo azul.ico" type="image/x-icon" />
        <link rel="shortcut icon" href="/img/logo azul.ico" type="image/x-icon" />
        <link rel="apple-touch-icon" href="/img/logo azul.png" />
      </head>
      <body className={inter.className}>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}
