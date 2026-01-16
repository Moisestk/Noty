"use client"

import { ThemeProvider } from "@/components/theme-provider"
import { SearchProvider } from "@/contexts/search-context"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <SearchProvider>{children}</SearchProvider>
    </ThemeProvider>
  )
}
