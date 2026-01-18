"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Image as ImageIcon, X, Save } from "lucide-react"
import Image from "next/image"
import { motion } from "framer-motion"

export default function NewNotePage() {
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()
  
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [coverImage, setCoverImage] = useState<File | null>(null)
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Ajustar altura del textarea automáticamente
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      // Resetear altura para obtener el scrollHeight correcto
      textarea.style.height = 'auto'
      // Ajustar altura al contenido
      textarea.style.height = `${textarea.scrollHeight}px`
    }
  }, [content])

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value)
    // Ajustar altura inmediatamente
    const textarea = e.target
    textarea.style.height = 'auto'
    textarea.style.height = `${textarea.scrollHeight}px`
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
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/auth/login")
        return
      }

      let coverImageUrl = null

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

      // Crear nueva nota
      const { data, error } = await supabase.from("notes").insert({
        title,
        content,
        cover_image_url: coverImageUrl,
        user_id: user.id,
      }).select().single()

      if (error) throw error

      toast({
        title: "Éxito",
        description: "Nota creada exitosamente",
      })

      // Redirigir a la vista de la nota
      router.push(`/dashboard/notes/${data.id}`)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo crear la nota",
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
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
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

        {/* Botón para agregar portada */}
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
        <div>
          <Textarea
            ref={textareaRef}
            placeholder="Escribe algo... (o escribe '/' para comandos)"
            value={content}
            onChange={handleContentChange}
            className="border-0 text-base sm:text-lg focus-visible:ring-0 focus-visible:ring-offset-0 resize-none p-0 break-words overflow-hidden"
            style={{ 
              fontSize: '1rem', 
              lineHeight: '1.5rem',
              minHeight: '200px',
              height: 'auto'
            }}
          />
        </div>
      </div>
    </div>
  )
}
