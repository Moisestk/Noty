"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Image as ImageIcon, X, Save, Search, UserPlus } from "lucide-react"
import Image from "next/image"
import { motion } from "framer-motion"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface User {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
}

export default function NewSharedNotePage() {
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()

  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [coverImage, setCoverImage] = useState<File | null>(null)
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  
  // Estados para búsqueda de usuarios
  const [userSearchQuery, setUserSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [selectedUsers, setSelectedUsers] = useState<User[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false)

  useEffect(() => {
    if (userSearchQuery.trim().length > 2) {
      searchUsers()
    } else {
      setSearchResults([])
    }
  }, [userSearchQuery])

  const searchUsers = async () => {
    setIsSearching(true)
    try {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser()

      if (!currentUser) return

      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, avatar_url")
        .or(`email.ilike.%${userSearchQuery}%,full_name.ilike.%${userSearchQuery}%`)
        .neq("id", currentUser.id)
        .limit(10)

      if (error) throw error

      // Filtrar usuarios que ya están seleccionados
      const filtered = (data || []).filter(
        (user) => !selectedUsers.some((selected) => selected.id === user.id)
      )

      setSearchResults(filtered)
    } catch (error: any) {
      console.error("Error searching users:", error)
    } finally {
      setIsSearching(false)
    }
  }

  const handleAddUser = (user: User) => {
    if (!selectedUsers.some((u) => u.id === user.id)) {
      setSelectedUsers([...selectedUsers, user])
      setUserSearchQuery("")
      setSearchResults([])
    }
  }

  const handleRemoveUser = (userId: string) => {
    setSelectedUsers(selectedUsers.filter((u) => u.id !== userId))
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

    if (selectedUsers.length === 0) {
      toast({
        title: "Error",
        description: "Debes seleccionar al menos un usuario para compartir",
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
      const { data: noteData, error: noteError } = await supabase
        .from("notes")
        .insert({
          title,
          content,
          cover_image_url: coverImageUrl,
          user_id: user.id,
        })
        .select()
        .single()

      if (noteError) throw noteError

      // Compartir la nota con los usuarios seleccionados
      const sharesToInsert = selectedUsers.map((selectedUser) => ({
        note_id: noteData.id,
        owner_id: user.id,
        shared_with_email: selectedUser.email,
        shared_with_user_id: selectedUser.id,
        can_edit: true,
      }))

      const { error: shareError } = await supabase
        .from("shared_notes")
        .insert(sharesToInsert)

      if (shareError) throw shareError

      toast({
        title: "Éxito",
        description: "Nota compartida creada exitosamente",
      })

      // Redirigir a la vista de la nota
      router.push(`/dashboard/notes/${noteData.id}`)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo crear la nota compartida",
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
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-1 sm:gap-2 flex-1 justify-end min-w-0">
            {/* Usuarios seleccionados */}
            {selectedUsers.length > 0 && (
              <div className="hidden sm:flex items-center gap-2 mr-2 overflow-x-auto max-w-[200px] lg:max-w-none">
                {selectedUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-1 sm:gap-2 rounded-full border bg-background px-2 sm:px-3 py-1.5 shrink-0"
                  >
                    <Avatar className="h-5 w-5 sm:h-6 sm:w-6">
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {user.full_name
                          ?.split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase() || user.email[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs sm:text-sm truncate max-w-[80px] sm:max-w-none">{user.full_name || user.email}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 sm:h-5 sm:w-5"
                      onClick={() => handleRemoveUser(user.id)}
                    >
                      <X className="h-2 w-2 sm:h-3 sm:w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsUserDialogOpen(true)}
              className="shrink-0"
            >
              <UserPlus className="h-4 w-4" />
            </Button>
            <Button
              onClick={handleSaveNote}
              disabled={loading || isSaving || selectedUsers.length === 0}
              className="gap-1 sm:gap-2 text-xs sm:text-sm shrink-0"
            >
              <Save className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">{isSaving ? "Guardando..." : "Guardar y Compartir"}</span>
              <span className="sm:hidden">{isSaving ? "..." : "Guardar"}</span>
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
              <X className="h-4 w-4" />
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

      {/* Modal para añadir usuarios */}
      <Dialog 
        open={isUserDialogOpen} 
        onOpenChange={(open) => {
          setIsUserDialogOpen(open)
          if (!open) {
            setUserSearchQuery("")
            setSearchResults([])
          }
        }}
      >
        <DialogContent className="max-w-md w-[calc(100vw-2rem)] sm:w-full">
          <DialogHeader>
            <DialogTitle>Compartir con</DialogTitle>
            <DialogDescription>
              Busca y añade usuarios para compartir esta nota
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Buscador */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar usuario por nombre o email..."
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Resultados de búsqueda */}
            {searchResults.length > 0 && (
              <Card>
                <CardContent className="p-2 max-h-[300px] overflow-y-auto">
                  <div className="space-y-1">
                    {searchResults.map((user) => (
                      <Button
                        key={user.id}
                        variant="ghost"
                        className="w-full justify-start gap-2"
                        onClick={() => {
                          handleAddUser(user)
                          setIsUserDialogOpen(false)
                        }}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.avatar_url || undefined} />
                          <AvatarFallback>
                            {user.full_name
                              ?.split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase() || user.email[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col items-start">
                          <span className="text-sm font-medium">
                            {user.full_name || "Sin nombre"}
                          </span>
                          <span className="text-xs text-muted-foreground">{user.email}</span>
                        </div>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {userSearchQuery.trim().length > 2 && searchResults.length === 0 && !isSearching && (
              <p className="text-sm text-muted-foreground text-center py-2">
                No se encontraron usuarios
              </p>
            )}

            {userSearchQuery.trim().length <= 2 && (
              <p className="text-sm text-muted-foreground text-center py-2">
                Escribe al menos 3 caracteres para buscar
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
