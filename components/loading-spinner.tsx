"use client"

import { Loader2 } from "lucide-react"
import { motion } from "framer-motion"

export function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{
          duration: 1,
          repeat: Infinity,
          ease: "linear"
        }}
      >
        <Loader2 className="h-8 w-8 text-primary" strokeWidth={2.5} />
      </motion.div>
    </div>
  )
}
