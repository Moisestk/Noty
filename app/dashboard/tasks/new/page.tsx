"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Plus, X, Save } from "lucide-react"
import { motion } from "framer-motion"

export default function NewTaskPage() {
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()

  const [title, setTitle] = useState("")
  const [checklistItems, setChecklistItems] = useState<Array<{ id: string; title: string }>>([])
  const [loading, setLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const handleSaveTask = async () => {
    if (!title.trim()) {
      toast({
        title: "Error",
        description: "El título es requerido",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)
    setLoading(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/auth/login")
        return
      }

      // Crear la tarea
      const { data: taskData, error: taskError } = await supabase
        .from("user_tasks")
        .insert({
          user_id: user.id,
          title,
          completed: false,
          order_index: 0,
        })
        .select()
        .single()

      if (taskError) throw taskError

      // Crear los items del checklist si hay
      if (checklistItems.length > 0) {
        const itemsToInsert = checklistItems
          .filter((item) => item.title.trim() !== "")
          .map((item, index) => ({
            task_id: taskData.id,
            title: item.title,
            completed: false,
            order_index: index,
          }))

        if (itemsToInsert.length > 0) {
          const { error: checklistError } = await supabase
            .from("task_checklist_items")
            .insert(itemsToInsert)

          if (checklistError) throw checklistError
        }
      }

      toast({
        title: "Éxito",
        description: "Tarea creada exitosamente",
      })

      // Redirigir a la vista de la tarea
      router.push(`/dashboard/tasks/${taskData.id}`)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo crear la tarea",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Barra superior */}
      <div className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-2 sm:px-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" strokeWidth={2.5} />
          </Button>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleSaveTask}
              disabled={loading || isSaving}
              className="gap-1 sm:gap-2 text-xs sm:text-sm"
            >
              <Save className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">{isSaving ? "Guardando..." : "Guardar"}</span>
              <span className="sm:hidden">{isSaving ? "..." : "Guardar"}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Editor */}
      <div className="mx-auto max-w-4xl px-2 sm:px-4 py-4 sm:py-8">
        {/* Título */}
        <div className="mb-6">
          <Input
            placeholder="Título de la tarea..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="border-0 text-2xl sm:text-3xl md:text-4xl font-bold focus-visible:ring-0 focus-visible:ring-offset-0 p-0 h-auto break-words"
            autoFocus
          />
        </div>

        {/* Checklist */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Checklist</h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const newItem = {
                  id: `temp-${Date.now()}`,
                  title: "",
                }
                setChecklistItems([...checklistItems, newItem])
              }}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Agregar item
            </Button>
          </div>

          {/* Items de checklist */}
          {checklistItems.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="text-muted-foreground mb-4">
                No hay items en el checklist. Haz clic en &quot;Agregar item&quot; para comenzar.
              </p>
            </div>
          ) : (
            <div className="space-y-2 rounded-lg border p-4 bg-muted/30">
              {checklistItems.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2"
                >
                  <span className="text-muted-foreground text-lg">☐</span>
                  <Input
                    value={item.title}
                    onChange={(e) => {
                      const updated = [...checklistItems]
                      updated[index].title = e.target.value
                      setChecklistItems(updated)
                    }}
                    placeholder="Item de checklist..."
                    className="flex-1 border-0 bg-transparent focus-visible:ring-1"
                    autoFocus={index === checklistItems.length - 1}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        const newItem = {
                          id: `temp-${Date.now()}`,
                          title: "",
                        }
                        setChecklistItems([...checklistItems, newItem])
                      }
                      if (e.key === "Backspace" && item.title === "" && checklistItems.length > 1) {
                        setChecklistItems(checklistItems.filter((_, i) => i !== index))
                      }
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setChecklistItems(checklistItems.filter((_, i) => i !== index))
                    }}
                  >
                    <X className="h-4 w-4" strokeWidth={2.5} />
                  </Button>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
