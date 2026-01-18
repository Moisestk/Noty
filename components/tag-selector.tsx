"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { 
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
  Tag as TagIcon,
  X
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Tag {
  id: string
  name: string
  icon: string
  color: string
}

interface TagSelectorProps {
  selectedTagIds: string[]
  onTagsChange: (tagIds: string[]) => void
  type: "note" | "task"
  itemId?: string
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

export function TagSelector({ selectedTagIds, onTagsChange, type, itemId }: TagSelectorProps) {
  const [tags, setTags] = useState<Tag[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    if (isOpen) {
      loadTags()
    }
  }, [isOpen])

  const loadTags = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from("tags")
        .select("*")
        .order("name", { ascending: true })

      if (error) {
        console.error("Error loading tags:", error)
        setError(error.message || "Error al cargar etiquetas")
        throw error
      }
      setTags(data || [])
      if (!data || data.length === 0) {
        setError("No hay etiquetas disponibles. Ejecuta el SQL de migración en Supabase.")
      }
    } catch (error: any) {
      console.error("Error loading tags:", error)
      setError(error.message || "Error al cargar etiquetas. Verifica que la tabla 'tags' exista en Supabase.")
    } finally {
      setLoading(false)
    }
  }

  const handleTagToggle = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      // Si ya está seleccionada, quitar la etiqueta
      onTagsChange([])
    } else {
      // Solo permitir una etiqueta a la vez
      onTagsChange([tagId])
    }
  }

  const getSelectedTags = tags.filter(tag => selectedTagIds.includes(tag.id))
  const selectedTag = getSelectedTags[0] // Solo mostramos una etiqueta

  const IconComponent = selectedTag ? iconMap[selectedTag.icon] || TagIcon : TagIcon

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="gap-1 sm:gap-2 text-xs sm:text-sm"
      >
        {selectedTag ? (
          <>
            {IconComponent && <IconComponent className="h-3 w-3 sm:h-4 sm:w-4" />}
            <span className="hidden sm:inline">{selectedTag.name}</span>
            <span className="sm:hidden">{selectedTag.name.length > 8 ? selectedTag.name.substring(0, 6) + '...' : selectedTag.name}</span>
          </>
        ) : (
          <>
            <TagIcon className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Etiqueta</span>
            <span className="sm:hidden">Tag</span>
          </>
        )}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Seleccionar Etiqueta</DialogTitle>
            <DialogDescription>
              Elige una etiqueta para esta {type === "note" ? "nota" : "tarea"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 py-4 max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="col-span-full text-center text-muted-foreground py-8">
                Cargando etiquetas...
              </div>
            ) : error ? (
              <div className="col-span-full text-center py-8">
                <p className="text-destructive text-sm mb-2">{error}</p>
                <p className="text-xs text-muted-foreground">
                  Ejecuta el archivo <code className="bg-muted px-1 rounded">supabase/migration_tags.sql</code> en el SQL Editor de Supabase
                </p>
              </div>
            ) : tags.length === 0 ? (
              <div className="col-span-full text-center text-muted-foreground py-8">
                <p className="text-sm mb-2">No hay etiquetas disponibles</p>
                <p className="text-xs">
                  Ejecuta el archivo <code className="bg-muted px-1 rounded">supabase/migration_tags.sql</code> en Supabase
                </p>
              </div>
            ) : (
              <>
                {tags.map((tag) => {
                  const Icon = iconMap[tag.icon] || TagIcon
                  const isSelected = selectedTagIds.includes(tag.id)
                  return (
                    <Button
                      key={tag.id}
                      variant={isSelected ? "default" : "outline"}
                      className={cn(
                        "flex flex-col items-center gap-2 h-auto py-3",
                        isSelected && "bg-primary text-primary-foreground"
                      )}
                      onClick={() => handleTagToggle(tag.id)}
                    >
                      {Icon && <Icon className="h-5 w-5" />}
                      <span className="text-xs">{tag.name}</span>
                    </Button>
                  )
                })}
                {selectedTagIds.length > 0 && (
                  <Button
                    variant="outline"
                    className="flex flex-col items-center gap-2 h-auto py-3 col-span-full border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => onTagsChange([])}
                  >
                    <X className="h-5 w-5" />
                    <span className="text-xs">Quitar etiqueta</span>
                  </Button>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
