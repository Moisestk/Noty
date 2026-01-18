-- Migración: Sistema de etiquetas para notas y tareas
-- Ejecuta este script en el SQL Editor de Supabase

-- Tabla de etiquetas predefinidas
CREATE TABLE IF NOT EXISTS public.tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  icon TEXT NOT NULL,
  color TEXT DEFAULT '#001F3F',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Insertar etiquetas predefinidas
INSERT INTO public.tags (name, icon, color) VALUES
  ('Iglesia', 'Church', '#001F3F'),
  ('Hogar', 'Home', '#001F3F'),
  ('Finanzas', 'DollarSign', '#001F3F'),
  ('Programacion', 'Code', '#001F3F'),
  ('Libros', 'Book', '#001F3F'),
  ('Desarrollo personal', 'User', '#001F3F'),
  ('Comidas', 'Utensils', '#001F3F'),
  ('Deberes', 'CheckSquare', '#001F3F'),
  ('Otros', 'Tag', '#001F3F')
ON CONFLICT (name) DO NOTHING;

-- Tabla de relación entre notas y etiquetas
CREATE TABLE IF NOT EXISTS public.note_tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  note_id UUID REFERENCES public.notes(id) ON DELETE CASCADE NOT NULL,
  tag_id UUID REFERENCES public.tags(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(note_id, tag_id)
);

-- Tabla de relación entre tareas y etiquetas
CREATE TABLE IF NOT EXISTS public.task_tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES public.user_tasks(id) ON DELETE CASCADE NOT NULL,
  tag_id UUID REFERENCES public.tags(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(task_id, tag_id)
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_note_tags_note_id ON public.note_tags(note_id);
CREATE INDEX IF NOT EXISTS idx_note_tags_tag_id ON public.note_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_task_tags_task_id ON public.task_tags(task_id);
CREATE INDEX IF NOT EXISTS idx_task_tags_tag_id ON public.task_tags(tag_id);

-- Habilitar RLS
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_tags ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para tags (todos pueden ver las etiquetas)
CREATE POLICY "Anyone can view tags"
  ON public.tags FOR SELECT
  USING (true);

-- Políticas RLS para note_tags
CREATE POLICY "Users can view note tags of their own notes"
  ON public.note_tags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.notes
      WHERE notes.id = note_tags.note_id
      AND notes.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.shared_notes
      WHERE shared_notes.note_id = note_tags.note_id
      AND shared_notes.shared_with_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create note tags for their own notes"
  ON public.note_tags FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.notes
      WHERE notes.id = note_tags.note_id
      AND notes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete note tags from their own notes"
  ON public.note_tags FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.notes
      WHERE notes.id = note_tags.note_id
      AND notes.user_id = auth.uid()
    )
  );

-- Políticas RLS para task_tags
CREATE POLICY "Users can view task tags of their own tasks"
  ON public.task_tags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_tasks
      WHERE user_tasks.id = task_tags.task_id
      AND user_tasks.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create task tags for their own tasks"
  ON public.task_tags FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_tasks
      WHERE user_tasks.id = task_tags.task_id
      AND user_tasks.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete task tags from their own tasks"
  ON public.task_tags FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_tasks
      WHERE user_tasks.id = task_tags.task_id
      AND user_tasks.user_id = auth.uid()
    )
  );
