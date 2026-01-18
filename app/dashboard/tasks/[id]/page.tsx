"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ArrowLeft, Plus, Check, X, Save, Trash2, MoreVertical, Edit, Church, Home, DollarSign, Code, Book, User, Utensils, CheckSquare, GraduationCap, Gamepad2, Tag as TagIcon } from "lucide-react"
import { motion } from "framer-motion"
import { LoadingSpinner } from "@/components/loading-spinner"
import { TagSelector } from "@/components/tag-selector"
import { Badge } from "@/components/ui/badge"

interface ChecklistItem {
  id: string
  task_id: string
  title: string
  completed: boolean
  order_index: number
}

interface Task {
  id: string
  title: string
  description: string | null
  completed: boolean
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Church,
  Home,
  DollarSign,
  Code,
  Book,
  User,
  Utensils,
  CheckSquare,
  GraduationCap,
  Gamepad2,
  Tag: TagIcon,
}

function TaskTagBadge({ tag }: { tag: { id: string; name: string; icon: string } }) {
  const Icon = iconMap[tag.icon] || TagIcon
  return (
    <Badge variant="outline" className="gap-1.5 px-3 py-1.5 text-sm">
      {Icon && <Icon className="h-4 w-4" />}
      <span>{tag.name}</span>
    </Badge>
  )
}

export default function TaskDetailPage() {
  const params = useParams()
  const router = useRouter()
  const taskId = params.id as string
  const supabase = createClient()
  const { toast } = useToast()

  const [task, setTask] = useState<Task | null>(null)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([])
  const [newChecklistItem, setNewChecklistItem] = useState("")
  const [loading, setLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [taskTag, setTaskTag] = useState<{ id: string; name: string; icon: string } | null>(null)

  useEffect(() => {
    loadTask()
    loadChecklist()
    loadTags()
    loadTaskTag()
  }, [taskId])

  const loadTask = async () => {
    const { data, error } = await supabase
      .from("user_tasks")
      .select("*")
      .eq("id", taskId)
      .single()

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo cargar la tarea",
        variant: "destructive",
      })
      router.push("/dashboard/tasks")
      return
    }

    setTask(data)
    setTitle(data.title)
    setDescription(data.description || "")
  }

  const loadTags = async () => {
    const { data: tagsData } = await supabase
      .from("task_tags")
      .select("tag_id")
      .eq("task_id", taskId)

    if (tagsData) {
      setSelectedTagIds(tagsData.map(t => t.tag_id))
    }
  }

  const loadTaskTag = async () => {
    const { data: taskTagsData } = await supabase
      .from("task_tags")
      .select(`
        tag_id,
        tags (
          id,
          name,
          icon
        )
      `)
      .eq("task_id", taskId)
      .limit(1)

    if (taskTagsData && taskTagsData.length > 0) {
      const tagData = taskTagsData[0].tags
      // Supabase puede devolver tags como objeto o array dependiendo de la relación
      if (tagData && !Array.isArray(tagData)) {
        setTaskTag(tagData as { id: string; name: string; icon: string })
      } else if (Array.isArray(tagData) && tagData.length > 0) {
        setTaskTag(tagData[0] as { id: string; name: string; icon: string })
      } else {
        setTaskTag(null)
      }
    } else {
      setTaskTag(null)
    }
  }

  const loadChecklist = async () => {
    const { data } = await supabase
      .from("task_checklist_items")
      .select("*")
      .eq("task_id", taskId)
      .order("order_index", { ascending: true })

    if (data) {
      setChecklistItems(data)
    }
  }

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

    try {
      const { error } = await supabase
        .from("user_tasks")
        .update({
          title,
          description: description || null,
        })
        .eq("id", taskId)

      if (error) throw error

      // Actualizar etiquetas
      // Primero eliminar todas las etiquetas existentes
      await supabase
        .from("task_tags")
        .delete()
        .eq("task_id", taskId)

      // Luego insertar las nuevas etiquetas
      if (selectedTagIds.length > 0) {
        const tagInserts = selectedTagIds.map(tagId => ({
          task_id: taskId,
          tag_id: tagId,
        }))
        
        const { error: tagsError } = await supabase
          .from("task_tags")
          .insert(tagInserts)

        if (tagsError) {
          console.error("Error updating tags:", tagsError)
        }
      }

      toast({
        title: "Éxito",
        description: "Tarea actualizada exitosamente",
      })
      
      // Recargar la etiqueta después de guardar
      loadTaskTag()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar la tarea",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddChecklistItem = async () => {
    if (!newChecklistItem.trim()) {
      toast({
        title: "Error",
        description: "Escribe el título del item",
        variant: "destructive",
      })
      return
    }

    const maxOrder = checklistItems.length > 0 ? Math.max(...checklistItems.map((item) => item.order_index)) : -1

    const { error } = await supabase.from("task_checklist_items").insert({
      task_id: taskId,
      title: newChecklistItem,
      completed: false,
      order_index: maxOrder + 1,
    })

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo agregar el item",
        variant: "destructive",
      })
    } else {
      setNewChecklistItem("")
      loadChecklist()
    }
  }

  const handleToggleChecklistItem = async (itemId: string, completed: boolean) => {
    const { error } = await supabase
      .from("task_checklist_items")
      .update({ completed: !completed })
      .eq("id", itemId)

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el item",
        variant: "destructive",
      })
    } else {
      loadChecklist()
    }
  }

  const handleDeleteChecklistItem = async (itemId: string) => {
    const { error } = await supabase.from("task_checklist_items").delete().eq("id", itemId)

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar el item",
        variant: "destructive",
      })
    } else {
      loadChecklist()
    }
  }

  const handleDeleteTask = async () => {
    if (!confirm("¿Estás seguro de que quieres eliminar esta tarea?")) return

    const { error } = await supabase.from("user_tasks").delete().eq("id", taskId)

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar la tarea",
        variant: "destructive",
      })
    } else {
      toast({
        title: "Éxito",
        description: "Tarea eliminada exitosamente",
      })
      router.push("/dashboard/tasks")
    }
  }

  if (!task) {
    return <LoadingSpinner />
  }

  const completedItems = checklistItems.filter((item) => item.completed).length
  const totalItems = checklistItems.length
  const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Barra superior */}
      <div className="flex items-center justify-between px-2 sm:px-0">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" strokeWidth={2.5} />
        </Button>
        <div className="flex items-center gap-1 sm:gap-2">
          <TagSelector
            selectedTagIds={selectedTagIds}
            onTagsChange={setSelectedTagIds}
            type="task"
            itemId={taskId}
          />
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleSaveTask} 
            disabled={isSaving}
            className="gap-1 sm:gap-2 text-xs sm:text-sm"
          >
            <Save className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">{isSaving ? "Guardando..." : "Guardar"}</span>
            <span className="sm:hidden">{isSaving ? "..." : "Guardar"}</span>
          </Button>
          <Button 
            variant="destructive" 
            size="sm"
            onClick={handleDeleteTask}
            className="gap-1 sm:gap-2 text-xs sm:text-sm"
          >
            <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Eliminar</span>
          </Button>
        </div>
      </div>

      {/* Información de la tarea */}
      <Card>
        <CardHeader>
          {/* Etiqueta */}
          {taskTag && (
            <div className="mb-3">
              <TaskTagBadge tag={taskTag} />
            </div>
          )}
          <Input
            placeholder="Título de la tarea..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-xl sm:text-2xl font-bold border-0 focus-visible:ring-1 break-words"
          />
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Descripción (opcional)..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="min-h-[100px] resize-none"
          />
        </CardContent>
      </Card>

      {/* Checklist */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Checklist</CardTitle>
            {totalItems > 0 && (
              <span className="text-sm text-muted-foreground">
                {completedItems}/{totalItems} completados ({progress}%)
              </span>
            )}
          </div>
          {totalItems > 0 && (
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-secondary">
              <motion.div
                className="h-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Agregar nuevo item */}
          <div className="flex gap-2">
            <Input
              placeholder="Nuevo item de checklist..."
              value={newChecklistItem}
              onChange={(e) => setNewChecklistItem(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleAddChecklistItem()
                }
              }}
            />
            <Button onClick={handleAddChecklistItem}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Lista de items */}
          <div className="space-y-2">
            {checklistItems.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No hay items en el checklist. Agrega uno arriba.
              </p>
            ) : (
              checklistItems.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleToggleChecklistItem(item.id, item.completed)}
                    className="shrink-0"
                  >
                    {item.completed ? (
                      <Check className="h-5 w-5 text-green-500" />
                    ) : (
                      <div className="h-5 w-5 rounded border-2" />
                    )}
                  </Button>
                  <span
                    className={`flex-1 ${item.completed ? "line-through text-muted-foreground" : ""}`}
                  >
                    {item.title}
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleDeleteChecklistItem(item.id)}
                        className="text-destructive"
                      >
                        <X className="mr-2 h-4 w-4" strokeWidth={2.5} />
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </motion.div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
