import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function uploadScreenshot(dataUrl: string, folder = 'labelforge/screenshots'): Promise<string> {
  const result = await cloudinary.uploader.upload(dataUrl, {
    folder,
    resource_type: 'image',
    format: 'webp',
    transformation: [{ quality: 'auto:good', fetch_format: 'auto' }],
  })
  return result.secure_url
}

export async function uploadScreenshots(dataUrls: string[], folder = 'labelforge/screenshots'): Promise<string[]> {
  return Promise.all(dataUrls.map(url => uploadScreenshot(url, folder)))
}
