"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Grid3x3, List, ListChecks, Share2, Search } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"

type ViewMode = "cards" | "list" | "compact"

interface Note {
  id: string
  title: string
  content: string | null
  cover_image_url: string | null
  created_at: string
  updated_at: string
  owner_id: string
  shared_notes?: {
    shared_with_email: string
    can_edit: boolean
  }
}

export default function SharedNotesPage() {
  const [sharedNotes, setSharedNotes] = useState<Note[]>([])
  const [filteredNotes, setFilteredNotes] = useState<Note[]>([])
  const [viewMode, setViewMode] = useState<ViewMode>("cards")
  const [searchQuery, setSearchQuery] = useState("")
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false)
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)
  const [shareEmail, setShareEmail] = useState("")
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()

  useEffect(() => {
    loadSharedNotes()
  }, [])

  useEffect(() => {
    filterNotes()
  }, [searchQuery, sharedNotes])

  const loadSharedNotes = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      router.push("/auth/login")
      return
    }

    try {
      // Obtener el email del usuario
      const { data: profile } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", user.id)
        .single()

      const userEmail = profile?.email || user.email

      // Cargar notas compartidas conmigo (por email o user_id)
      const { data: sharedWithMe, error: error1 } = await supabase
        .from("shared_notes")
        .select(`
          *,
          notes!shared_notes_note_id_fkey (*)
        `)
        .or(`shared_with_email.eq.${userEmail},shared_with_user_id.eq.${user.id}`)

      // Cargar notas que yo he compartido
      const { data: sharedByMe, error: error2 } = await supabase
        .from("shared_notes")
        .select(`
          *,
          notes!shared_notes_note_id_fkey (*)
        `)
        .eq("owner_id", user.id)

      if (error1 || error2) {
        console.error("Error loading shared notes:", error1 || error2)
        toast({
          title: "Error",
          description: "No se pudieron cargar las notas compartidas",
          variant: "destructive",
        })
        return
      }

      // Procesar notas compartidas conmigo
      const notesSharedWithMe = (sharedWithMe || [])
        .map((share: any) => ({
          ...share.notes,
          isSharedWithMe: true,
          shared_with_email: share.shared_with_email,
        }))
        .filter((note: any) => note !== null)

      // Procesar notas que yo compartí
      const notesIShared = (sharedByMe || [])
        .map((share: any) => ({
          ...share.notes,
          isSharedByMe: true,
          shared_with_email: share.shared_with_email,
        }))
        .filter((note: any) => note !== null)

      // Combinar y eliminar duplicados
      const allNotes = [...notesSharedWithMe, ...notesIShared]
      const uniqueNotes = Array.from(
        new Map(allNotes.map((note) => [note.id, note])).values()
      )

      setSharedNotes(uniqueNotes as Note[])
    } catch (err: any) {
      console.error("Unexpected error:", err)
      toast({
        title: "Error",
        description: err.message || "Error inesperado al cargar notas compartidas",
        variant: "destructive",
      })
    }
  }

  const filterNotes = () => {
    if (!searchQuery.trim()) {
      setFilteredNotes(sharedNotes)
      return
    }

    const filtered = sharedNotes.filter((note) =>
      note.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
    setFilteredNotes(filtered)
  }

  const handleShareNote = async () => {
    if (!shareEmail.trim() || !selectedNoteId) {
      toast({
        title: "Error",
        description: "Ingresa un correo electrónico",
        variant: "destructive",
      })
      return
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    // Buscar el usuario por email
    const { data: sharedUser } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", shareEmail)
      .single()

    const { error } = await supabase.from("shared_notes").insert({
      note_id: selectedNoteId,
      owner_id: user.id,
      shared_with_email: shareEmail,
      shared_with_user_id: sharedUser?.id || null,
      can_edit: true,
    })

    if (error) {
      if (error.code === "23505") {
        toast({
          title: "Error",
          description: "Esta nota ya está compartida con este usuario",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Error",
          description: "No se pudo compartir la nota",
          variant: "destructive",
        })
      }
    } else {
      toast({
        title: "Éxito",
        description: "Nota compartida exitosamente",
      })
      setIsShareDialogOpen(false)
      setShareEmail("")
      setSelectedNoteId(null)
      loadSharedNotes()
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Notytogether</h1>
          <p className="text-muted-foreground">
            Notas compartidas contigo y que has compartido
          </p>
        </div>
        <Button onClick={() => router.push("/dashboard/shared/new")} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Nueva Nota Compartida
        </Button>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar por título..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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
              {searchQuery
                ? "No se encontraron notas compartidas"
                : "No tienes notas compartidas aún"}
            </p>
            {!searchQuery && (
              <Button
                onClick={() => router.push("/dashboard/shared/new")}
                className="mt-4"
              >
                <Plus className="mr-2 h-4 w-4" />
                Crear nota compartida
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div
          className={
            viewMode === "cards"
              ? "grid gap-4 md:grid-cols-2 lg:grid-cols-3"
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
                className={`cursor-pointer transition-shadow hover:shadow-lg ${
                  viewMode === "compact" ? "p-3" : ""
                }`}
              >
                <Link href={`/dashboard/notes/${note.id}`}>
                  {note.cover_image_url && viewMode === "cards" && (
                    <div className="relative h-48 w-full overflow-hidden rounded-t-2xl">
                      <Image
                        src={note.cover_image_url}
                        alt={note.title}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  <CardHeader className={viewMode === "compact" ? "p-0" : ""}>
                    <CardTitle className={viewMode === "compact" ? "text-base" : ""}>
                      {note.title}
                    </CardTitle>
                    {viewMode !== "compact" && (
                      <CardDescription className="line-clamp-2">
                        {note.content || "Sin contenido"}
                      </CardDescription>
                    )}
                  </CardHeader>
                </Link>
                <CardContent className={viewMode === "compact" ? "p-0" : ""}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {(note as any).isSharedWithMe
                        ? "Compartida contigo"
                        : "Compartida por ti"}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedNoteId(note.id)
                        setIsShareDialogOpen(true)
                      }}
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Compartir Nota</DialogTitle>
            <DialogDescription>
              Comparte esta nota con otro usuario mediante su correo electrónico
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="share-email">Correo electrónico</Label>
              <Input
                id="share-email"
                type="email"
                placeholder="usuario@email.com"
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsShareDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleShareNote}>Compartir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
