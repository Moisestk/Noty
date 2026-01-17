"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Image as ImageIcon, X, Save } from "lucide-react"
import Image from "next/image"
import { LoadingSpinner } from "@/components/loading-spinner"
import { motion } from "framer-motion"

interface Note {
  id: string
  title: string
  content: string | null
  cover_image_url: string | null
}

export default function EditNotePage() {
  const params = useParams()
  const router = useRouter()
  const noteId = params.id as string
  const supabase = createClient()
  const { toast } = useToast()
  
  const [note, setNote] = useState<Note | null>(null)
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [coverImage, setCoverImage] = useState<File | null>(null)
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    loadNote()
  }, [noteId])

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
    setTitle(data.title)
    setContent(data.content || "")
    setCoverImagePreview(data.cover_image_url)
  }

  const handleSaveNote = async () => {
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
      let coverImageUrl = note?.cover_image_url || null

      // Subir imagen de portada si hay una nueva
      if (coverImage) {
        try {
          const formData = new FormData()
          formData.append("file", coverImage)
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
          coverImageUrl = data.url
        } catch (uploadError: any) {
          console.error("Upload error:", uploadError)
          toast({
            title: "Error al subir imagen",
            description: uploadError.message || "No se pudo subir la imagen. Verifica tu conexión y las variables de entorno de Cloudinary.",
            variant: "destructive",
          })
          setIsSaving(false)
          setLoading(false)
          return
        }
      }

      // Actualizar nota
      const { error } = await supabase
        .from("notes")
        .update({
          title,
          content,
          cover_image_url: coverImageUrl,
        })
        .eq("id", noteId)

      if (error) throw error

      toast({
        title: "Éxito",
        description: "Nota actualizada exitosamente",
      })

      // Redirigir a la vista de la nota
      router.push(`/dashboard/notes/${noteId}`)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar la nota",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
      setLoading(false)
    }
  }

  if (!note) {
    return <LoadingSpinner />
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Barra superior */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <Button variant="ghost" size="icon" onClick={() => router.push(`/dashboard/notes/${noteId}`)}>
            <ArrowLeft className="h-4 w-4" strokeWidth={2.5} />
          </Button>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleSaveNote}
              disabled={loading || isSaving}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              {isSaving ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </div>
      </div>

      {/* Editor */}
      <div className="mx-auto max-w-4xl px-2 sm:px-4 py-4 sm:py-8">
        {/* Imagen de portada */}
        {coverImagePreview && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative mb-8 h-64 w-full overflow-hidden rounded-2xl"
          >
            <Image
              src={coverImagePreview}
              alt="Portada"
              fill
              className="object-cover"
            />
            <Button
              variant="destructive"
              size="icon"
              className="absolute right-4 top-4"
              onClick={() => {
                setCoverImage(null)
                setCoverImagePreview(null)
              }}
            >
              <X className="h-4 w-4" strokeWidth={2.5} />
            </Button>
          </motion.div>
        )}

        {/* Botón para agregar/cambiar portada */}
        {!coverImagePreview && (
          <div className="mb-8">
            <Label htmlFor="cover" className="cursor-pointer">
              <Button variant="outline" className="gap-2" asChild>
                <span>
                  <ImageIcon className="h-4 w-4" />
                  Agregar portada
                </span>
              </Button>
              <Input
                id="cover"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    setCoverImage(file)
                    const reader = new FileReader()
                    reader.onloadend = () => {
                      setCoverImagePreview(reader.result as string)
                    }
                    reader.readAsDataURL(file)
                  }
                }}
              />
            </Label>
          </div>
        )}

        {/* Título */}
        <div className="mb-6">
          <Input
            placeholder="Título sin formato..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="border-0 text-3xl sm:text-4xl md:text-5xl font-bold focus-visible:ring-0 focus-visible:ring-offset-0 p-0 h-auto break-words"
            autoFocus
          />
        </div>

        {/* Contenido */}
        <div className="min-h-[300px] sm:min-h-[500px]">
          <Textarea
            placeholder="Escribe algo... (o escribe '/' para comandos)"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[300px] sm:min-h-[500px] border-0 text-base sm:text-lg focus-visible:ring-0 focus-visible:ring-offset-0 resize-none p-0 break-words"
            style={{ fontSize: '1rem', lineHeight: '1.5rem' }}
          />
        </div>
      </div>
    </div>
  )
}
