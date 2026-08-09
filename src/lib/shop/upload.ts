export type UploadProgressHandler = (percent: number) => void

export function uploadFormFileWithProgress(
  url: string,
  file: File,
  fields: Record<string, string>,
  onProgress: UploadProgressHandler
) {
  return new Promise<Record<string, unknown>>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', url)
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.min(99, Math.round((event.loaded / event.total) * 100)))
      }
    }
    xhr.onload = () => {
      let data: Record<string, unknown> = {}
      try {
        data = JSON.parse(xhr.responseText)
      } catch {
        data = {}
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100)
        resolve(data)
      } else {
        const errorBody = data as { error?: string }
        reject(new Error(errorBody.error || 'Upload failed.'))
      }
    }
    xhr.onerror = () => reject(new Error('Upload failed. Check your connection.'))
    xhr.ontimeout = () => reject(new Error('Upload timed out.'))
    const form = new FormData()
    form.append('file', file)
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined && value !== null) form.append(key, value)
    }
    xhr.send(form)
  })
}

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

export function uploadModelFileWithProgress(
  file: File,
  productId: string,
  onProgress: UploadProgressHandler
) {
  return new Promise<{ publicUrl: string }>((resolve, reject) => {
    void (async () => {
      try {
        onProgress(5)
        const urlResponse = await fetch('/api/3d-shop/admin/models/upload-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName: file.name, fileSize: file.size, productId }),
        })
        const body = (await urlResponse.json().catch(() => ({}))) as {
          signedUrl?: string
          publicUrl?: string
          error?: string
        }

        if (!urlResponse.ok || !body.signedUrl || !body.publicUrl) {
          reject(new Error(body.error || 'Failed to initialize upload.'))
          return
        }

        onProgress(15)
        const xhr = new XMLHttpRequest()
        xhr.open('PUT', body.signedUrl)
        xhr.setRequestHeader('Content-Type', 'application/octet-stream')
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            onProgress(Math.min(99, Math.round(15 + (event.loaded / event.total) * 84)))
          }
        }
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            onProgress(100)
            resolve({ publicUrl: body.publicUrl! })
          } else {
            reject(new Error(`Upload failed (HTTP ${xhr.status}).`))
          }
        }
        xhr.onerror = () => reject(new Error('Upload failed. Check your connection.'))
        xhr.ontimeout = () => reject(new Error('Upload timed out.'))
        xhr.send(file)
      } catch (error) {
        reject(error instanceof Error ? error : new Error('Upload failed.'))
      }
    })()
  })
}
