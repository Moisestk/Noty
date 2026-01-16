# Guía de Configuración de NotyApp

Esta guía te ayudará a configurar NotyApp desde cero.

## 📋 Paso 1: Configurar Supabase

1. **Crear un proyecto en Supabase**:
   - Ve a [supabase.com](https://supabase.com)
   - Crea una cuenta o inicia sesión
   - Crea un nuevo proyecto
   - Anota la URL y la clave anónima (anon key)

2. **Ejecutar el script SQL**:
   - En tu proyecto de Supabase, ve a "SQL Editor"
   - Abre el archivo `supabase/schema.sql` de este proyecto
   - Copia todo el contenido y pégalo en el editor SQL
   - Ejecuta el script (esto creará todas las tablas y políticas RLS)

3. **Verificar las tablas**:
   - Ve a "Table Editor" en Supabase
   - Deberías ver las siguientes tablas:
     - `profiles`
     - `notes`
     - `note_images`
     - `tasks`
     - `shared_notes`

## 📋 Paso 2: Configurar Cloudinary

1. **Crear una cuenta en Cloudinary**:
   - Ve a [cloudinary.com](https://cloudinary.com)
   - Crea una cuenta gratuita
   - Ve al Dashboard

2. **Obtener las credenciales**:
   - En el Dashboard, encontrarás:
     - Cloud Name
     - API Key
     - API Secret

## 📋 Paso 3: Configurar Variables de Entorno

1. **Crear archivo `.env.local`**:
   ```bash
   # En la raíz del proyecto
   touch .env.local
   ```

2. **Agregar las variables**:
   ```env
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_aqui

   # Cloudinary
   NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=tu_cloud_name
   CLOUDINARY_API_KEY=tu_api_key
   CLOUDINARY_API_SECRET=tu_api_secret
   ```

   ⚠️ **Importante**: Reemplaza los valores con tus credenciales reales.

## 📋 Paso 4: Instalar Dependencias

```bash
npm install
# o
yarn install
```

## 📋 Paso 5: Ejecutar el Proyecto

```bash
npm run dev
# o
yarn dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## ✅ Verificación

1. **Registrar un usuario**:
   - Ve a `/auth/register`
   - Crea una cuenta de prueba
   - Deberías ser redirigido al dashboard

2. **Crear una nota**:
   - En el dashboard, haz clic en "Nueva Nota"
   - Completa el formulario y guarda
   - La nota debería aparecer en el dashboard

3. **Verificar en Supabase**:
   - Ve a "Table Editor" en Supabase
   - Abre la tabla `profiles` - deberías ver tu perfil
   - Abre la tabla `notes` - deberías ver tu nota

## 🔧 Solución de Problemas

### Error: "Invalid API key" (Cloudinary)
- Verifica que las credenciales de Cloudinary estén correctas
- Asegúrate de que `CLOUDINARY_API_KEY` y `CLOUDINARY_API_SECRET` no tengan espacios

### Error: "Failed to fetch" (Supabase)
- Verifica que `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` sean correctos
- Asegúrate de que el script SQL se haya ejecutado correctamente

### Error: "Row Level Security policy violation"
- Verifica que las políticas RLS estén activas en Supabase
- Asegúrate de que el usuario esté autenticado
- Revisa que el script SQL se haya ejecutado completamente

### Las imágenes no se cargan
- Verifica que Cloudinary esté configurado correctamente
- Revisa la consola del navegador para errores
- Asegúrate de que el dominio `res.cloudinary.com` esté permitido en `next.config.js`

## 📚 Recursos Adicionales

- [Documentación de Supabase](https://supabase.com/docs)
- [Documentación de Next.js](https://nextjs.org/docs)
- [Documentación de Cloudinary](https://cloudinary.com/documentation)
- [Documentación de shadcn/ui](https://ui.shadcn.com)

## 🆘 Soporte

Si encuentras problemas:
1. Revisa los logs en la consola del navegador
2. Revisa los logs del servidor (terminal donde ejecutas `npm run dev`)
3. Verifica que todas las variables de entorno estén configuradas
4. Asegúrate de que todas las dependencias estén instaladas

---

¡Listo! Tu aplicación NotyApp debería estar funcionando correctamente. 🎉
