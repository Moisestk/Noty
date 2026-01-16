# NotyApp - Aplicación de Notas y Tareas

NotyApp es una aplicación moderna de notas y tareas construida con Next.js, Supabase y Cloudinary. Ofrece funcionalidades completas de gestión de notas, tareas, colaboración y más.

## 🚀 Características

- ✅ **Dashboard de Notas**: Crear, editar y eliminar notas con título y contenido
- 🔍 **Búsqueda**: Buscar notas por título
- 📱 **Vistas Dinámicas**: Cambiar entre vista de tarjetas grandes, lista y lista compacta
- 🖼️ **Multimedia**: Soporte para imagen de portada y múltiples imágenes con carrusel
- ✅ **Sistema de Tareas**: Checklists con progreso visual (ej. 2/5 completadas)
- 👥 **Colaboración**: Compartir notas con otros usuarios mediante correo electrónico
- 🔐 **Autenticación**: Login y registro con Supabase Auth
- 👤 **Perfil de Usuario**: Editar nombre e imagen de perfil
- 🌓 **Tema Claro/Oscuro**: Toggle entre modo claro y oscuro
- 📱 **100% Responsivo**: Diseño mobile-first completamente responsive

## 🛠️ Stack Tecnológico

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend/Database**: Supabase (PostgreSQL + Auth + Realtime)
- **UI/Icons**: shadcn/ui, Lucide React, Framer Motion
- **Imágenes**: Cloudinary (almacenamiento y optimización)
- **Carrusel**: Embla Carousel

## 📋 Prerrequisitos

- Node.js 18+ y npm/yarn
- Cuenta de Supabase
- Cuenta de Cloudinary

## 🔧 Instalación

1. **Clonar el repositorio**:
   ```bash
   git clone <tu-repositorio>
   cd Noty-App
   ```

2. **Instalar dependencias**:
   ```bash
   npm install
   # o
   yarn install
   ```

3. **Configurar variables de entorno**:
   Crea un archivo `.env.local` en la raíz del proyecto con las siguientes variables:
   ```env
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=tu_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_supabase_anon_key

   # Cloudinary
   NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=tu_cloudinary_cloud_name
   CLOUDINARY_API_KEY=tu_cloudinary_api_key
   CLOUDINARY_API_SECRET=tu_cloudinary_api_secret
   ```

4. **Configurar Supabase**:
   - Ve a tu proyecto de Supabase
   - Abre el SQL Editor
   - Ejecuta el contenido del archivo `supabase/schema.sql` para crear las tablas y políticas RLS

5. **Ejecutar el proyecto**:
   ```bash
   npm run dev
   # o
   yarn dev
   ```

6. **Abrir en el navegador**:
   Navega a [http://localhost:3000](http://localhost:3000)

## 📁 Estructura del Proyecto

```
Noty-App/
├── app/
│   ├── api/
│   │   └── upload/          # API route para subir imágenes a Cloudinary
│   ├── auth/
│   │   ├── login/          # Página de login
│   │   └── register/       # Página de registro
│   ├── dashboard/
│   │   ├── notes/
│   │   │   └── [id]/       # Página de detalle de nota
│   │   └── page.tsx        # Dashboard principal
│   ├── profile/            # Página de perfil
│   ├── layout.tsx          # Layout principal
│   ├── page.tsx            # Página de inicio (redirige)
│   └── globals.css         # Estilos globales
├── components/
│   ├── ui/                 # Componentes de shadcn/ui
│   ├── navbar.tsx          # Barra de navegación
│   └── theme-provider.tsx  # Proveedor de tema
├── lib/
│   ├── supabase/           # Clientes de Supabase
│   ├── cloudinary.ts       # Configuración de Cloudinary
│   └── utils.ts            # Utilidades
├── supabase/
│   └── schema.sql          # Script SQL para crear tablas
└── hooks/
    └── use-toast.ts        # Hook para toasts
```

## 🎨 Diseño y Branding

### Colores
- **Modo Claro**: Fondo #FFFFFF, texto y acentos en azul oscuro (#001F3F)
- **Modo Oscuro**: Fondo #001F3F, tarjetas en azul más claro para contraste, texto blanco

### Estética
- Tarjetas modernas con `rounded-2xl`
- Sombras suaves
- 100% responsivo (mobile-first)

## 🔐 Seguridad

La aplicación utiliza Row Level Security (RLS) de Supabase para garantizar que:
- Los usuarios solo pueden ver y editar sus propias notas
- Los usuarios pueden ver notas compartidas con ellos
- Las políticas RLS están configuradas en `supabase/schema.sql`

## 📝 Uso

### Crear una Nota
1. Haz clic en "Nueva Nota" en el dashboard
2. Ingresa un título y contenido
3. Opcionalmente, agrega una imagen de portada
4. Guarda la nota

### Agregar Tareas
1. Abre una nota
2. En la sección "Tareas", escribe el nombre de la tarea
3. Presiona Enter o haz clic en el botón "+"
4. Marca las tareas como completadas haciendo clic en el checkbox

### Compartir Notas
1. Abre una nota
2. Haz clic en "Compartir"
3. Ingresa el correo electrónico del usuario con quien quieres compartir
4. La nota será visible para ese usuario

### Cambiar Vista
En el dashboard, usa el selector de vista para cambiar entre:
- **Tarjetas Grandes**: Vista de tarjetas con imágenes
- **Lista**: Vista de lista estándar
- **Lista Compacta**: Vista compacta para ver más notas

## 🚀 Despliegue

### Vercel (Recomendado)
1. Conecta tu repositorio a Vercel
2. Agrega las variables de entorno en la configuración de Vercel
3. Despliega

### Otros proveedores
La aplicación puede desplegarse en cualquier plataforma que soporte Next.js:
- Netlify
- Railway
- AWS Amplify
- etc.

## 📄 Licencia

Este proyecto está bajo la Licencia MIT.

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor:
1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📧 Soporte

Para soporte, abre un issue en el repositorio o contacta al equipo de desarrollo.

---

Desarrollado con ❤️ usando Next.js y Supabase
