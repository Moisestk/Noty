import { v2 as cloudinary } from 'cloudinary'

// Función para configurar Cloudinary (se llama en cada uso para asegurar que las variables estén disponibles)
function configureCloudinary() {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  const apiKey = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Cloudinary configuration is missing. Please check environment variables.')
  }

  // Configurar cada vez para asegurar que las variables estén disponibles
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  })

  return { cloudName, apiKey, apiSecret }
}

export async function uploadImage(file: File | Blob, folder: string = 'noty-app'): Promise<string> {
  // Configurar Cloudinary antes de usar
  configureCloudinary()

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder,
          resource_type: 'image',
          transformation: [
            {
              quality: 'auto',
              fetch_format: 'auto',
            },
          ],
        },
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload error:', error)
            console.error('Error details:', {
              message: error.message,
              http_code: error.http_code,
              name: error.name,
            })
            reject(new Error(error.message || 'Failed to upload image to Cloudinary'))
          } else if (result && result.secure_url) {
            resolve(result.secure_url)
          } else {
            reject(new Error('Upload failed: No URL returned from Cloudinary'))
          }
        }
      )
      .end(buffer)
  })
}

export async function deleteImage(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId)
}
