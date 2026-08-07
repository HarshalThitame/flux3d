export type UploadProgressHandler = (percent: number) => void

export function uploadFileWithProgress(
  url: string,
  file: File,
  productId: string,
  onProgress: UploadProgressHandler
) {
  return new Promise<{ publicUrl: string }>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', url)
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.min(99, Math.round((event.loaded / event.total) * 100)))
      }
    }
    xhr.onload = () => {
      let data: { publicUrl?: string; error?: string } = {}
      try {
        data = JSON.parse(xhr.responseText)
      } catch {
        data = {}
      }
      if (xhr.status >= 200 && xhr.status < 300 && data.publicUrl) {
        onProgress(100)
        resolve({ publicUrl: data.publicUrl })
      } else {
        reject(new Error(data.error || 'Upload failed.'))
      }
    }
    xhr.onerror = () => reject(new Error('Upload failed. Check your connection.'))
    xhr.ontimeout = () => reject(new Error('Upload timed out.'))
    const form = new FormData()
    form.append('file', file)
    form.append('productId', productId)
    xhr.send(form)
  })
}
