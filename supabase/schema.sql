-- Tabla de usuarios extendida (complementa auth.users de Supabase)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tabla de notas
CREATE TABLE IF NOT EXISTS public.notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  cover_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tabla de imágenes de notas (para el carrusel)
CREATE TABLE IF NOT EXISTS public.note_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  note_id UUID REFERENCES public.notes(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tabla de tareas independientes (tareas principales como en Trello)
CREATE TABLE IF NOT EXISTS public.user_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  completed BOOLEAN DEFAULT FALSE NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tabla de checklist items dentro de las tareas
CREATE TABLE IF NOT EXISTS public.task_checklist_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES public.user_tasks(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tabla de tareas (checklist dentro de notas)
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  note_id UUID REFERENCES public.notes(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tabla de notas compartidas
CREATE TABLE IF NOT EXISTS public.shared_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  note_id UUID REFERENCES public.notes(id) ON DELETE CASCADE NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  shared_with_email TEXT NOT NULL,
  shared_with_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  can_edit BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(note_id, shared_with_email)
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON public.notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_created_at ON public.notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_note_images_note_id ON public.note_images(note_id);
CREATE INDEX IF NOT EXISTS idx_user_tasks_user_id ON public.user_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tasks_created_at ON public.user_tasks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_checklist_items_task_id ON public.task_checklist_items(task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_note_id ON public.tasks(note_id);
CREATE INDEX IF NOT EXISTS idx_shared_notes_note_id ON public.shared_notes(note_id);
CREATE INDEX IF NOT EXISTS idx_shared_notes_shared_with_email ON public.shared_notes(shared_with_email);
CREATE INDEX IF NOT EXISTS idx_shared_notes_shared_with_user_id ON public.shared_notes(shared_with_user_id);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON public.notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_tasks_updated_at BEFORE UPDATE ON public.user_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Función para crear perfil automáticamente cuando se registra un usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para crear perfil al registrarse
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- POLÍTICAS RLS (Row Level Security)

-- Habilitar RLS en todas las tablas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_notes ENABLE ROW LEVEL SECURITY;

-- Políticas para profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Política para permitir buscar otros usuarios (necesario para compartir notas)
CREATE POLICY "Users can search other profiles"
  ON public.profiles FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Políticas para notes
CREATE POLICY "Users can view their own notes"
  ON public.notes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view shared notes"
  ON public.notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.shared_notes
      WHERE shared_notes.note_id = notes.id
      AND (
        shared_notes.shared_with_user_id = auth.uid()
        OR shared_notes.shared_with_email = (SELECT email FROM public.profiles WHERE id = auth.uid())
      )
    )
  );

CREATE POLICY "Users can create their own notes"
  ON public.notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notes"
  ON public.notes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update shared notes if they have permission"
  ON public.notes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.shared_notes
      WHERE shared_notes.note_id = notes.id
      AND shared_notes.can_edit = TRUE
      AND (
        shared_notes.shared_with_user_id = auth.uid()
        OR shared_notes.shared_with_email = (SELECT email FROM public.profiles WHERE id = auth.uid())
      )
    )
  );

CREATE POLICY "Users can delete their own notes"
  ON public.notes FOR DELETE
  USING (auth.uid() = user_id);

-- Políticas para note_images
CREATE POLICY "Users can view images of their own notes"
  ON public.note_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.notes
      WHERE notes.id = note_images.note_id
      AND notes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view images of shared notes"
  ON public.note_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.shared_notes
      WHERE shared_notes.note_id = note_images.note_id
      AND (
        shared_notes.shared_with_user_id = auth.uid()
        OR shared_notes.shared_with_email = (SELECT email FROM public.profiles WHERE id = auth.uid())
      )
    )
  );

CREATE POLICY "Users can insert images to their own notes"
  ON public.note_images FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.notes
      WHERE notes.id = note_images.note_id
      AND notes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete images from their own notes"
  ON public.note_images FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.notes
      WHERE notes.id = note_images.note_id
      AND notes.user_id = auth.uid()
    )
  );

-- Políticas para user_tasks
CREATE POLICY "Users can view their own tasks"
  ON public.user_tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tasks"
  ON public.user_tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks"
  ON public.user_tasks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tasks"
  ON public.user_tasks FOR DELETE
  USING (auth.uid() = user_id);

-- Políticas para task_checklist_items
CREATE POLICY "Users can view checklist items of their own tasks"
  ON public.task_checklist_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_tasks
      WHERE user_tasks.id = task_checklist_items.task_id
      AND user_tasks.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create checklist items in their own tasks"
  ON public.task_checklist_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_tasks
      WHERE user_tasks.id = task_checklist_items.task_id
      AND user_tasks.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update checklist items in their own tasks"
  ON public.task_checklist_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_tasks
      WHERE user_tasks.id = task_checklist_items.task_id
      AND user_tasks.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete checklist items from their own tasks"
  ON public.task_checklist_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_tasks
      WHERE user_tasks.id = task_checklist_items.task_id
      AND user_tasks.user_id = auth.uid()
    )
  );

-- Políticas para tasks (checklist de notas)
CREATE POLICY "Users can view tasks of their own notes"
  ON public.tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.notes
      WHERE notes.id = tasks.note_id
      AND notes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view tasks of shared notes"
  ON public.tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.shared_notes
      WHERE shared_notes.note_id = tasks.note_id
      AND (
        shared_notes.shared_with_user_id = auth.uid()
        OR shared_notes.shared_with_email = (SELECT email FROM public.profiles WHERE id = auth.uid())
      )
    )
  );

CREATE POLICY "Users can create tasks in their own notes"
  ON public.tasks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.notes
      WHERE notes.id = tasks.note_id
      AND notes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create tasks in shared notes if they have permission"
  ON public.tasks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.shared_notes
      WHERE shared_notes.note_id = tasks.note_id
      AND shared_notes.can_edit = TRUE
      AND (
        shared_notes.shared_with_user_id = auth.uid()
        OR shared_notes.shared_with_email = (SELECT email FROM public.profiles WHERE id = auth.uid())
      )
    )
  );

CREATE POLICY "Users can update tasks in their own notes"
  ON public.tasks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.notes
      WHERE notes.id = tasks.note_id
      AND notes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update tasks in shared notes if they have permission"
  ON public.tasks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.shared_notes
      WHERE shared_notes.note_id = tasks.note_id
      AND shared_notes.can_edit = TRUE
      AND (
        shared_notes.shared_with_user_id = auth.uid()
        OR shared_notes.shared_with_email = (SELECT email FROM public.profiles WHERE id = auth.uid())
      )
    )
  );

CREATE POLICY "Users can delete tasks from their own notes"
  ON public.tasks FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.notes
      WHERE notes.id = tasks.note_id
      AND notes.user_id = auth.uid()
    )
  );

-- Políticas para shared_notes
CREATE POLICY "Users can view shares of their own notes"
  ON public.shared_notes FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can view notes shared with them"
  ON public.shared_notes FOR SELECT
  USING (
    shared_with_user_id = auth.uid()
    OR shared_with_email = (SELECT email FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can share their own notes"
  ON public.shared_notes FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update shares of their own notes"
  ON public.shared_notes FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete shares of their own notes"
  ON public.shared_notes FOR DELETE
  USING (auth.uid() = owner_id);
