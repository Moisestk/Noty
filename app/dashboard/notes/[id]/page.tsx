"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { motion } from "framer-motion"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Share2, Image as ImageIcon, Trash2, Edit, Check, Info, Church, Home, DollarSign, Code, Book, User, Utensils, CheckSquare, GraduationCap, Tag as TagIcon } from "lucide-react"
import Image from "next/image"
import { LoadingSpinner } from "@/components/loading-spinner"
import { Badge } from "@/components/ui/badge"

interface Note {
  id: string
  title: string
  content: string | null
  cover_image_url: string | null
  created_at: string
  updated_at: string
}


interface NoteImage {
  id: string
  image_url: string
  order_index: number
}

interface ChecklistItem {
  id: string
  title: string
  completed: boolean
  order_index: number
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

function NoteTagBadge({ tag }: { tag: { id: string; name: string; icon: string } }) {
  const Icon = iconMap[tag.icon] || TagIcon
  return (
    <Badge variant="outline" className="gap-1.5 px-3 py-1.5 text-sm">
      {Icon && <Icon className="h-4 w-4" />}
      <span>{tag.name}</span>
    </Badge>
  )
}

export default function NoteDetailPage() {
  const params = useParams()
  const router = useRouter()
  const noteId = params.id as string
  const [note, setNote] = useState<Note | null>(null)
  const [images, setImages] = useState<NoteImage[]>([])
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([])
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false)
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false)
  const [shareEmail, setShareEmail] = useState("")
  const [noteTag, setNoteTag] = useState<{ id: string; name: string; icon: string } | null>(null)
  const supabase = createClient()
  const { toast } = useToast()

  useEffect(() => {
    loadNote()
    loadImages()
    loadChecklist()
    loadNoteTag()
  }, [noteId])

  const loadChecklist = async () => {
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .eq("note_id", noteId)
      .order("order_index", { ascending: true })

    if (data) {
      setChecklistItems(data)
    }
  }

  const loadNote = async () => {
    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .eq("id", noteId)
      .single()

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo cargar la nota",
        variant: "destructive",
      })
      router.push("/dashboard")
      return
    }

    setNote(data)
  }

  const loadNoteTag = async () => {
    const { data: noteTagsData } = await supabase
      .from("note_tags")
      .select(`
        tag_id,
        tags (
          id,
          name,
          icon
        )
      `)
      .eq("note_id", noteId)
      .limit(1)

    if (noteTagsData && noteTagsData.length > 0) {
      const tagData = noteTagsData[0].tags
      // Supabase puede devolver tags como objeto o array dependiendo de la relación
      if (tagData && !Array.isArray(tagData)) {
        setNoteTag(tagData as { id: string; name: string; icon: string })
      } else if (Array.isArray(tagData) && tagData.length > 0) {
        setNoteTag(tagData[0] as { id: string; name: string; icon: string })
      } else {
        setNoteTag(null)
      }
    } else {
      setNoteTag(null)
    }
  }

  const loadImages = async () => {
    const { data } = await supabase
      .from("note_images")
      .select("*")
      .eq("note_id", noteId)
      .order("order_index", { ascending: true })

    setImages(data || [])
  }



  const handleAddImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const formData = new FormData()
      formData.append("file", file)
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        let errorMessage = "Error al subir la imagen"
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } catch (e) {
          // Si la respuesta no es JSON, usar el texto de la respuesta
          const text = await response.text()
          errorMessage = text || `Error del servidor (${response.status})`
        }
        throw new Error(errorMessage)
      }

      const data = await response.json()

      if (!data || !data.url) {
        throw new Error("No se recibió la URL de la imagen")
      }

      const maxOrder = images.length > 0 ? Math.max(...images.map((img) => img.order_index)) : -1

      const { error } = await supabase.from("note_images").insert({
        note_id: noteId,
        image_url: data.url,
        order_index: maxOrder + 1,
      })

      if (error) {
        toast({
          title: "Error",
          description: "No se pudo agregar la imagen",
          variant: "destructive",
        })
      } else {
        loadImages()
      }
    } catch (uploadError: any) {
      console.error("Upload error:", uploadError)
      toast({
        title: "Error al subir imagen",
        description: uploadError.message || "No se pudo subir la imagen. Verifica tu conexión y las variables de entorno de Cloudinary.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteImage = async (imageId: string) => {
    const { error } = await supabase.from("note_images").delete().eq("id", imageId)

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar la imagen",
        variant: "destructive",
      })
    } else {
      loadImages()
    }
  }

  const handleToggleChecklistItem = async (itemId: string, completed: boolean) => {
    const { error } = await supabase
      .from("tasks")
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

  const handleShareNote = async () => {
    if (!shareEmail.trim()) {
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
      note_id: noteId,
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
    }
  }

  if (!note) {
    return <LoadingSpinner />
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Barra superior */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-2 sm:px-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" strokeWidth={2.5} />
          </Button>
          <div className="flex items-center gap-1 sm:gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/dashboard/notes/${noteId}/edit`)}
              className="gap-1 sm:gap-2 text-xs sm:text-sm"
            >
              <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Editar</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setIsShareDialogOpen(true)}
              className="gap-1 sm:gap-2 text-xs sm:text-sm"
            >
              <Share2 className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Compartir</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setIsDetailsDialogOpen(true)}
              className="gap-1 sm:gap-2 text-xs sm:text-sm"
            >
              <Info className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Detalles</span>
            </Button>
            <Label htmlFor="image-upload" className="cursor-pointer">
              <Button variant="outline" size="sm" asChild className="gap-1 sm:gap-2 text-xs sm:text-sm">
                <span>
                  <ImageIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Agregar Imagen</span>
                </span>
              </Button>
              <Input
                id="image-upload"
                type="file"
                accept="image/*"
                onChange={handleAddImage}
                className="hidden"
              />
            </Label>
          </div>
        </div>
      </div>

      {/* Vista de la nota (modo lectura) */}
      <div className="mx-auto max-w-4xl px-2 sm:px-4 py-4 sm:py-8">
        {/* Imagen de portada */}
        {note.cover_image_url && (
          <div className="relative mb-8 h-64 w-full overflow-hidden rounded-2xl">
            <Image
              src={note.cover_image_url}
              alt={note.title}
              fill
              className="object-cover"
            />
          </div>
        )}

        {/* Etiqueta */}
        {noteTag && (
          <div className="mb-4">
            <NoteTagBadge tag={noteTag} />
          </div>
        )}

        {/* Título */}
        <div className="mb-6">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold break-words">{note.title}</h1>
        </div>

        {/* Contenido */}
        <div className="min-h-[300px] sm:min-h-[500px]">
          <div className="text-base sm:text-lg whitespace-pre-wrap leading-relaxed break-words">
            {note.content || "Sin contenido"}
          </div>
        </div>

        {/* Checklist (interactivo) */}
        {checklistItems.length > 0 && (
          <div className="mt-8 rounded-lg border p-6 bg-muted/30">
            <h2 className="text-xl font-semibold mb-4">Checklist</h2>
            <div className="space-y-2">
              {checklistItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3"
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleToggleChecklistItem(item.id, item.completed)}
                    className="shrink-0 h-6 w-6"
                  >
                    {item.completed ? (
                      <Check className="h-5 w-5 text-green-500" />
                    ) : (
                      <div className="h-5 w-5 rounded border-2" />
                    )}
                  </Button>
                  <span
                    className={`text-base flex-1 ${
                      item.completed ? "text-muted-foreground line-through" : ""
                    }`}
                  >
                    {item.title}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Galería de imágenes */}
        {images.length > 0 && (
          <div className="mt-8 sm:mt-12">
            <h2 className="text-xl sm:text-2xl font-semibold mb-4">Galería de Imágenes</h2>
            <div className="overflow-x-auto -mx-2 sm:mx-0 px-2 sm:px-0">
              <div className="flex gap-4 pb-4">
                {images.map((img) => (
                  <div key={img.id} className="flex-shrink-0 w-[280px] sm:w-96">
                    <div className="relative h-64 w-full overflow-hidden rounded-lg">
                      <Image
                        src={img.image_url}
                        alt={`Imagen ${img.order_index + 1}`}
                        fill
                        className="object-cover"
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute right-2 top-2"
                        onClick={() => handleDeleteImage(img.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>

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

      {/* Modal de detalles */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalles de la nota</DialogTitle>
            <DialogDescription>
              Información sobre esta nota
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {note && (
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Fecha de creación</p>
                  <p className="text-base">
                    {new Date(note.created_at).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                {note.updated_at && note.updated_at !== note.created_at && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Última actualización</p>
                    <p className="text-base">
                      {new Date(note.updated_at).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailsDialogOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
