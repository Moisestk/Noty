"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Plus, Grid3x3, List, ListChecks, Search, MoreVertical, Edit, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"
import { useSearch } from "@/contexts/search-context"

type ViewMode = "cards" | "list" | "compact"

interface Note {
  id: string
  title: string
  content: string | null
  cover_image_url: string | null
  created_at: string
  updated_at: string
}

export default function DashboardPage() {
  const [notes, setNotes] = useState<Note[]>([])
  const [filteredNotes, setFilteredNotes] = useState<Note[]>([])
  const [viewMode, setViewMode] = useState<ViewMode>("cards")
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null)
  const { searchQuery, setSearchQuery } = useSearch()
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()

  useEffect(() => {
    loadNotes()
  }, [])

  useEffect(() => {
    filterNotes()
  }, [searchQuery, notes])

  const loadNotes = async () => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        console.error("User error:", userError)
        router.push("/auth/login")
        return
      }

      // Cargar todas las notas del usuario
      const { data: allNotes, error: notesError } = await supabase
        .from("notes")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })

      if (notesError) {
        console.error("Error loading notes:", notesError)
        toast({
          title: "Error",
          description: notesError.message || "No se pudieron cargar las notas. Verifica tus permisos en Supabase.",
          variant: "destructive",
        })
        setNotes([])
        return
      }

      // Obtener las IDs de las notas que están compartidas
      const { data: sharedNotesData } = await supabase
        .from("shared_notes")
        .select("note_id")
        .eq("owner_id", user.id)

      // Crear un Set con las IDs de notas compartidas para búsqueda rápida
      const sharedNoteIds = new Set(
        (sharedNotesData || []).map((share: any) => share.note_id)
      )

      // Filtrar las notas para excluir las que están compartidas
      const ownNotes = (allNotes || []).filter(
        (note) => !sharedNoteIds.has(note.id)
      )

      setNotes(ownNotes)
    } catch (err: any) {
      console.error("Unexpected error:", err)
      toast({
        title: "Error",
        description: err.message || "Error inesperado al cargar las notas",
        variant: "destructive",
      })
      setNotes([])
    }
  }

  const filterNotes = () => {
    if (!searchQuery.trim()) {
      setFilteredNotes(notes)
      return
    }

    const filtered = notes.filter((note) =>
      note.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
    setFilteredNotes(filtered)
  }

  const handleCreateNote = () => {
    router.push("/dashboard/notes/new")
  }

  const handleEditNote = (note: Note) => {
    router.push(`/dashboard/notes/${note.id}/edit`)
  }


  const handleDeleteNote = (noteId: string) => {
    setNoteToDelete(noteId)
    setIsDeleteDialogOpen(true)
  }

  const confirmDeleteNote = async () => {
    if (!noteToDelete) return

    const { error } = await supabase.from("notes").delete().eq("id", noteToDelete)

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar la nota",
        variant: "destructive",
      })
    } else {
      toast({
        title: "Éxito",
        description: "Nota eliminada",
      })
      loadNotes()
    }

    setIsDeleteDialogOpen(false)
    setNoteToDelete(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Mis Notas</h1>
          <p className="text-muted-foreground">
            Gestiona todas tus notas y tareas
          </p>
        </div>
        <Button onClick={handleCreateNote} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Nueva Nota
        </Button>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Input
            type="search"
            placeholder="Buscar notas..."
            value={searchQuery}
            onChange={(e) => {
              const query = e.target.value
              // Actualizar el contexto de búsqueda
              const event = new CustomEvent('search', { detail: query })
              window.dispatchEvent(event)
            }}
            className="pl-10"
          />
        </div>
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

      {filteredNotes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">
              {searchQuery ? "No se encontraron notas" : "No tienes notas aún"}
            </p>
            {!searchQuery && (
              <Button onClick={handleCreateNote} className="mt-4">
                <Plus className="mr-2 h-4 w-4" />
                Crear primera nota
              </Button>
            )}
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
          {filteredNotes.map((note) => (
            <motion.div
              key={note.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Card
                className={`cursor-pointer transition-shadow hover:shadow-lg relative ${
                  viewMode === "compact" ? "p-3" : ""
                } ${viewMode === "cards" ? "aspect-square" : ""}`}
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
                          handleEditNote(note)
                        }}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteNote(note.id)
                        }}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <Link href={`/dashboard/notes/${note.id}`}>
                  {note.cover_image_url && viewMode === "cards" && (
                    <div className="relative h-full w-full overflow-hidden rounded-t-2xl">
                      <Image
                        src={note.cover_image_url}
                        alt={note.title}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  <CardHeader className={viewMode === "compact" ? "p-0" : viewMode === "cards" && note.cover_image_url ? "absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/95 to-transparent p-4" : viewMode === "cards" ? "p-4" : ""}>
                    <CardTitle className={`${viewMode === "compact" ? "text-base" : ""} ${viewMode === "cards" && note.cover_image_url ? "text-white drop-shadow-lg" : ""} line-clamp-2`}>
                      {note.title}
                    </CardTitle>
                    {viewMode !== "compact" && viewMode !== "cards" && (
                      <CardDescription className="line-clamp-2">
                        {note.content || "Sin contenido"}
                      </CardDescription>
                    )}
                  </CardHeader>
                </Link>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal de confirmación para eliminar nota */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar nota?</DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. La nota será eliminada permanentemente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false)
                setNoteToDelete(null)
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteNote}
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
