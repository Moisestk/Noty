"use client"

import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Navbar } from "@/components/navbar"
import { LoadingSpinner } from "@/components/loading-spinner"

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    async function checkUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/auth/login")
      } else {
        setUser(user)
      }
    }

    checkUser()
  }, [supabase, router])

  if (!user) {
    return <LoadingSpinner />
  }

  return (
    <>
      <Navbar />
      <main className="container mx-auto p-4">{children}</main>
    </>
  )
}
