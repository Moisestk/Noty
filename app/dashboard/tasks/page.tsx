"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { Search, Calendar, Plus, Grid3x3, List, ListChecks, MoreVertical, Edit, Trash2, Tag } from "lucide-react"
import { motion } from "framer-motion"
import Link from "next/link"

interface UserTask {
  id: string
  user_id: string
  title: string
  description: string | null
  completed: boolean
  order_index: number
  created_at: string
  updated_at: string
  checklist_items?: ChecklistItem[]
  task_tags?: Array<{ tag_id: string; tag: { id: string; name: string; icon: string } }>
}

interface ChecklistItem {
  id: string
  completed: boolean
}

type ViewMode = "cards" | "list" | "compact"
type DateFilter = "all" | "today" | "week" | "month" | "year"

export default function TasksPage() {
  const [tasks, setTasks] = useState<UserTask[]>([])
  const [filteredTasks, setFilteredTasks] = useState<UserTask[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [dateFilter, setDateFilter] = useState<DateFilter>("all")
  const [tagFilter, setTagFilter] = useState<string>("all")
  const [availableTags, setAvailableTags] = useState<Array<{ id: string; name: string; icon: string }>>([])
  const [viewMode, setViewMode] = useState<ViewMode>("cards")
  const [loading, setLoading] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()

  useEffect(() => {
    loadTasks()
    loadTags()
  }, [])

  useEffect(() => {
    filterTasks()
  }, [searchQuery, dateFilter, tagFilter, tasks])

  const loadTags = async () => {
    try {
      const { data, error } = await supabase
        .from("tags")
        .select("*")
        .order("name", { ascending: true })

      if (error) {
        console.error("Error loading tags:", error)
        return
      }

      setAvailableTags(data || [])
    } catch (error: any) {
      console.error("Error loading tags:", error)
    }
  }

  const loadTasks = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      router.push("/auth/login")
      return
    }

    setLoading(true)
    try {
      // Cargar tareas con sus checklist items
      const { data: tasksData, error: tasksError } = await supabase
        .from("user_tasks")
        .select(`
          *,
          checklist_items:task_checklist_items (
            id,
            completed
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (tasksError) throw tasksError

      // Cargar etiquetas para todas las tareas
      if (tasksData && tasksData.length > 0) {
        const taskIds = tasksData.map(task => task.id)
        const { data: taskTagsData } = await supabase
          .from("task_tags")
          .select(`
            task_id,
            tag_id,
            tags (
              id,
              name,
              icon
            )
          `)
          .in("task_id", taskIds)

        // Crear un mapa de task_id -> tags
        const tagsMap = new Map<string, Array<{ tag_id: string; tag: { id: string; name: string; icon: string } }>>()
        
        if (taskTagsData) {
          taskTagsData.forEach((tt: any) => {
            if (!tagsMap.has(tt.task_id)) {
              tagsMap.set(tt.task_id, [])
            }
            tagsMap.get(tt.task_id)!.push({
              tag_id: tt.tag_id,
              tag: tt.tags
            })
          })
        }

        // Agregar las etiquetas a cada tarea
        const tasksWithTags = tasksData.map(task => ({
          ...task,
          task_tags: tagsMap.get(task.id) || []
        }))

        setTasks(tasksWithTags as UserTask[])
      } else {
        setTasks((tasksData || []) as UserTask[])
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudieron cargar las tareas",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const filterTasks = () => {
    let filtered = [...tasks]

    // Filtrar por búsqueda
    if (searchQuery.trim()) {
      filtered = filtered.filter((task) =>
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Filtrar por fecha
    if (dateFilter !== "all") {
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      
      filtered = filtered.filter((task) => {
        const taskDate = new Date(task.created_at)
        const taskDateOnly = new Date(taskDate.getFullYear(), taskDate.getMonth(), taskDate.getDate())
        
        switch (dateFilter) {
          case "today":
            return taskDateOnly.getTime() === today.getTime()
          case "week":
            const weekAgo = new Date(today)
            weekAgo.setDate(weekAgo.getDate() - 7)
            return taskDateOnly >= weekAgo
          case "month":
            const monthAgo = new Date(today)
            monthAgo.setMonth(monthAgo.getMonth() - 1)
            return taskDateOnly >= monthAgo
          case "year":
            const yearAgo = new Date(today)
            yearAgo.setFullYear(yearAgo.getFullYear() - 1)
            return taskDateOnly >= yearAgo
          default:
            return true
        }
      })
    }

    // Filtrar por etiqueta
    if (tagFilter !== "all") {
      filtered = filtered.filter((task) => {
        const taskTagIds = task.task_tags?.map(t => t.tag_id) || []
        return taskTagIds.includes(tagFilter)
      })
    }

    setFilteredTasks(filtered)
  }

  const calculateProgress = (task: UserTask): number => {
    if (!task.checklist_items || task.checklist_items.length === 0) {
      return task.completed ? 100 : 0
    }
    const completed = task.checklist_items.filter((item) => item.completed).length
    return Math.round((completed / task.checklist_items.length) * 100)
  }

  const getTotalProgress = (): number => {
    if (filteredTasks.length === 0) return 0
    const totalProgress = filteredTasks.reduce((sum, task) => sum + calculateProgress(task), 0)
    return Math.round(totalProgress / filteredTasks.length)
  }

  const handleEditTask = (task: UserTask) => {
    router.push(`/dashboard/tasks/${task.id}`)
  }

  const handleDeleteTask = (taskId: string) => {
    setTaskToDelete(taskId)
    setIsDeleteDialogOpen(true)
  }

  const confirmDeleteTask = async () => {
    if (!taskToDelete) return

    const { error } = await supabase.from("user_tasks").delete().eq("id", taskToDelete)

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar la tarea",
        variant: "destructive",
      })
    } else {
      toast({
        title: "Éxito",
        description: "Tarea eliminada",
      })
      loadTasks()
    }

    setIsDeleteDialogOpen(false)
    setTaskToDelete(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tareas</h1>
          <p className="text-muted-foreground">
            Gestiona tus tareas estilo Trello con checklist
          </p>
        </div>
        <Button onClick={() => router.push("/dashboard/tasks/new")} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Nueva Tarea
        </Button>
      </div>

      {/* Búsqueda y filtros */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar tareas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={tagFilter} onValueChange={(value) => setTagFilter(value)}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <Tag className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Todas las etiquetas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las etiquetas</SelectItem>
              {availableTags.map((tag) => (
                <SelectItem key={tag.id} value={tag.id}>
                  {tag.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={dateFilter} onValueChange={(value: any) => setDateFilter(value)}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las fechas</SelectItem>
              <SelectItem value="today">Hoy</SelectItem>
              <SelectItem value="week">Última semana</SelectItem>
              <SelectItem value="month">Último mes</SelectItem>
              <SelectItem value="year">Último año</SelectItem>
            </SelectContent>
          </Select>
          <Select value={viewMode} onValueChange={(value) => setViewMode(value as ViewMode)}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cards">
                <div className="flex items-center">
                  <Grid3x3 className="mr-2 h-4 w-4" />
                  Tarjetas Grandes
                </div>
              </SelectItem>
              <SelectItem value="list">
                <div className="flex items-center">
                  <List className="mr-2 h-4 w-4" />
                  Lista
                </div>
              </SelectItem>
              <SelectItem value="compact">
                <div className="flex items-center">
                  <ListChecks className="mr-2 h-4 w-4" />
                  Lista Compacta
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Estadísticas */}
      {filteredTasks.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Progreso general</p>
                <p className="text-2xl font-bold">{getTotalProgress()}%</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total de tareas</p>
                <p className="text-2xl font-bold">{filteredTasks.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de tareas */}
      {filteredTasks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">
              {searchQuery || dateFilter !== "all" || tagFilter !== "all"
                ? "No se encontraron tareas"
                : "No hay tareas. Crea una nueva tarea arriba."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div
          className={
            viewMode === "cards"
              ? "grid gap-4 grid-cols-2 md:grid-cols-2 lg:grid-cols-3"
              : "space-y-2"
          }
        >
          {filteredTasks.map((task) => {
            const progress = calculateProgress(task)
            const checklistCount = task.checklist_items?.length || 0
            const completedCount = task.checklist_items?.filter((item) => item.completed).length || 0

            return (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Card
                  className={`cursor-pointer transition-shadow hover:shadow-lg relative ${
                    viewMode === "compact" ? "p-3" : viewMode === "cards" ? "aspect-square h-full" : "h-full"
                  }`}
                >
                  {/* Menú de 3 puntos */}
                  <div className="absolute top-2 right-2 z-10" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                          }}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEditTask(task)
                          }}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteTask(task.id)
                          }}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <Link href={`/dashboard/tasks/${task.id}`}>
                    <CardHeader className={viewMode === "compact" ? "p-0" : viewMode === "cards" ? "p-4" : ""}>
                      <CardTitle className={`${viewMode === "compact" ? "text-base line-clamp-1" : "line-clamp-2"}`}>
                        {task.title}
                      </CardTitle>
                      {task.description && viewMode !== "compact" && viewMode !== "cards" && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                          {task.description}
                        </p>
                      )}
                    </CardHeader>
                    <CardContent className={viewMode === "compact" ? "p-0 mt-1" : viewMode === "cards" ? "hidden" : ""}>
                      {checklistCount > 0 ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                              Checklist: {completedCount}/{checklistCount}
                            </span>
                            <span className="font-medium">{progress}%</span>
                          </div>
                          {viewMode !== "compact" && (
                            <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                              <motion.div
                                className="h-full bg-primary"
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                transition={{ duration: 0.3 }}
                              />
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          {viewMode === "compact" ? "Sin checklist" : "Sin checklist. Haz clic para agregar items."}
                        </p>
                      )}
                    </CardContent>
                  </Link>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Modal de confirmación para eliminar tarea */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar tarea?</DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. La tarea será eliminada permanentemente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false)
                setTaskToDelete(null)
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteTask}
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
