-- Migración: Sistema de tareas estilo Trello con checklist
-- Ejecuta este script en el SQL Editor de Supabase

-- Agregar columna description a user_tasks si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_tasks' AND column_name = 'description'
  ) THEN
    ALTER TABLE public.user_tasks ADD COLUMN description TEXT;
  END IF;
END $$;

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

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_task_checklist_items_task_id ON public.task_checklist_items(task_id);

-- Trigger para updated_at
CREATE TRIGGER update_task_checklist_items_updated_at BEFORE UPDATE ON public.task_checklist_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Habilitar RLS
ALTER TABLE public.task_checklist_items ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para task_checklist_items
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
