const MAX_DIMENSION = 1600
const JPEG_QUALITY = 0.8

/**
 * Resizes to at most MAX_DIMENSION on the longer side and re-exports as
 * JPEG. Re-exporting through <canvas> is also what makes HEIC photos (iPhone
 * default) work here without any special-casing — the canvas always outputs
 * JPEG regardless of the source format the browser managed to decode.
 */
export async function compressReceiptImage(file: File): Promise<Blob> {
  const image = await loadImage(file)
  const { width, height } = image
  const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height))
  const targetWidth = Math.round(width * scale)
  const targetHeight = Math.round(height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = targetWidth
  canvas.height = targetHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Não foi possível processar essa imagem.')
  ctx.drawImage(image, 0, 0, targetWidth, targetHeight)

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY),
  )
  if (!blob) throw new Error('Não foi possível processar essa imagem.')
  return blob
}

type DecodedImage = { width: number; height: number } & CanvasImageSource

async function loadImage(file: File): Promise<DecodedImage> {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(file)
    } catch {
      // Some browsers can't hand HEIC etc. to createImageBitmap but can
      // still decode it into an <img>. Fall through and try that instead.
    }
  }
  return loadImageElement(file)
}

function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Não foi possível abrir essa imagem.'))
    }
    img.src = url
  })
}
