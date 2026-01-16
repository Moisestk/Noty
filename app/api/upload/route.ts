import { NextRequest, NextResponse } from "next/server"
import crypto from 'crypto'

// Configurar runtime para Vercel
export const runtime = 'nodejs'
export const maxDuration = 30

// Función para generar la firma de Cloudinary
function generateSignature(params: Record<string, string>, apiSecret: string): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&')
  
  return crypto
    .createHash('sha1')
    .update(sortedParams + apiSecret)
    .digest('hex')
}

// Subir imagen usando la API REST de Cloudinary (sin SDK)
async function uploadImageToCloudinary(file: File | Blob, folder: string = 'noty-app'): Promise<string> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  const apiKey = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Cloudinary configuration is missing. Please check environment variables.')
  }

  // Convertir el archivo a base64
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const base64Image = buffer.toString('base64')
  const dataUri = `data:${(file as File).type || 'image/jpeg'};base64,${base64Image}`

  // Preparar parámetros para la firma
  const timestamp = Math.round(new Date().getTime() / 1000)
  const params: Record<string, string> = {
    folder: folder,
    timestamp: timestamp.toString(),
  }

  // Generar firma
  const signature = generateSignature(params, apiSecret)

  // Crear FormData para la petición (usando multipart/form-data)
  const formData = new URLSearchParams()
  formData.append('file', dataUri)
  formData.append('api_key', apiKey)
  formData.append('timestamp', timestamp.toString())
  formData.append('signature', signature)
  formData.append('folder', folder)

  // Subir a Cloudinary usando la API REST
  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Cloudinary API error:', errorText)
    let errorMessage = `Cloudinary upload failed: ${response.status} ${response.statusText}`
    try {
      const errorJson = JSON.parse(errorText)
      errorMessage = errorJson.error?.message || errorMessage
    } catch (e) {
      // Si no es JSON, usar el texto tal cual
    }
    throw new Error(errorMessage)
  }

  const result = await response.json()
  
  if (!result.secure_url) {
    throw new Error('No URL returned from Cloudinary')
  }

  return result.secure_url
}

export async function POST(request: NextRequest) {
  // Wrapper de error al inicio para capturar cualquier error no manejado
  try {
    // Verificar que las variables de entorno estén configuradas primero
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
    const apiKey = process.env.CLOUDINARY_API_KEY
    const apiSecret = process.env.CLOUDINARY_API_SECRET

    if (!cloudName || !apiKey || !apiSecret) {
      console.error("Cloudinary environment variables are not set", {
        hasCloudName: !!cloudName,
        hasApiKey: !!apiKey,
        hasApiSecret: !!apiSecret,
      })
      return NextResponse.json(
        { 
          error: "Cloudinary configuration is missing. Please check environment variables in Vercel.",
          details: "Make sure NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET are set."
        },
        { status: 500 }
      )
    }

    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Validar que sea una imagen
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 })
    }

    // Validar tamaño del archivo (máximo 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: "File size must be less than 10MB" }, { status: 400 })
    }

    console.log("Starting image upload to Cloudinary...")
    const url = await uploadImageToCloudinary(file, "noty-app")
    console.log("Image uploaded successfully:", url)

    if (!url) {
      return NextResponse.json({ error: "Failed to upload image" }, { status: 500 })
    }

    return NextResponse.json({ url })
  } catch (error: any) {
    console.error("Upload error:", error)
    console.error("Error stack:", error?.stack)
    
    // Asegurar que siempre devolvamos JSON, nunca HTML
    return NextResponse.json(
      { 
        error: error?.message || "Upload failed. Please try again.",
        details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      },
      { status: 500 }
    )
  }
}
