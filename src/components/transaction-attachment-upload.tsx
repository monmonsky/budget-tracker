'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Upload, X, File, Image, FileText, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface Attachment {
  id: string
  file_name: string
  file_url: string
  file_size: number
  file_type: string
  uploaded_at: string
}

interface Props {
  transactionId: string
  attachments: Attachment[]
  onAttachmentsChange: () => void
}

export function TransactionAttachmentUpload({ transactionId, attachments, onAttachmentsChange }: Props) {
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <Image className="h-5 w-5" />
    if (fileType === 'application/pdf') return <FileText className="h-5 w-5" />
    return <File className="h-5 w-5" />
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const file = files[0]

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large', {
        description: 'Maximum file size is 5MB',
      })
      return
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type', {
        description: 'Only images (JPEG, PNG, GIF, WebP) and PDF files are allowed',
      })
      return
    }

    setUploading(true)
    setUploadProgress(0)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Generate unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `${user.id}/${transactionId}/${fileName}`

      // Upload to Supabase Storage
      const { error: uploadError, data } = await supabase.storage
        .from('transaction-attachments')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('transaction-attachments')
        .getPublicUrl(filePath)

      // Save metadata to database
      const { error: dbError } = await supabase
        .from('transaction_attachments')
        .insert({
          transaction_id: transactionId,
          file_name: file.name,
          file_url: urlData.publicUrl,
          file_size: file.size,
          file_type: file.type,
        })

      if (dbError) throw dbError

      toast.success('File uploaded successfully!', {
        description: `${file.name} has been attached`,
      })

      onAttachmentsChange()
    } catch (error) {
      console.error('Error uploading file:', error)
      toast.error('Failed to upload file', {
        description: (error as any).message || 'An unexpected error occurred',
      })
    } finally {
      setUploading(false)
      setUploadProgress(0)
      // Reset input
      e.target.value = ''
    }
  }

  const handleDelete = async (attachment: Attachment) => {
    if (!confirm(`Delete ${attachment.file_name}?`)) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Extract file path from URL
      const urlParts = attachment.file_url.split('/')
      const filePath = `${user.id}/${transactionId}/${urlParts[urlParts.length - 1]}`

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('transaction-attachments')
        .remove([filePath])

      if (storageError) throw storageError

      // Delete from database
      const { error: dbError } = await supabase
        .from('transaction_attachments')
        .delete()
        .eq('id', attachment.id)

      if (dbError) throw dbError

      toast.success('Attachment deleted', {
        description: `${attachment.file_name} has been removed`,
      })

      onAttachmentsChange()
    } catch (error) {
      console.error('Error deleting attachment:', error)
      toast.error('Failed to delete attachment', {
        description: (error as any).message || 'An unexpected error occurred',
      })
    }
  }

  const handleDownload = async (attachment: Attachment) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const urlParts = attachment.file_url.split('/')
      const filePath = `${user.id}/${transactionId}/${urlParts[urlParts.length - 1]}`

      const { data, error } = await supabase.storage
        .from('transaction-attachments')
        .download(filePath)

      if (error) throw error

      // Create blob and download
      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = attachment.file_name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success('Download started', {
        description: attachment.file_name,
      })
    } catch (error) {
      console.error('Error downloading file:', error)
      toast.error('Failed to download file', {
        description: (error as any).message || 'An unexpected error occurred',
      })
    }
  }

  return (
    <div className="space-y-4">
      {/* Upload Button */}
      <div className="flex items-center gap-2">
        <label htmlFor={`file-upload-${transactionId}`}>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => document.getElementById(`file-upload-${transactionId}`)?.click()}
            className="cursor-pointer"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading... {uploadProgress}%
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload Attachment
              </>
            )}
          </Button>
        </label>
        <input
          id={`file-upload-${transactionId}`}
          type="file"
          className="hidden"
          accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
          onChange={handleFileSelect}
          disabled={uploading}
        />
        <span className="text-xs text-muted-foreground">
          Max 5MB • JPG, PNG, GIF, WebP, PDF
        </span>
      </div>

      {/* Attachments List */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">
            Attachments ({attachments.length})
          </p>
          <div className="space-y-2">
            {attachments.map((attachment) => (
              <Card key={attachment.id} className="p-3 bg-card border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="text-muted-foreground">
                      {getFileIcon(attachment.file_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {attachment.file_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(attachment.file_size)} • {new Date(attachment.uploaded_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownload(attachment)}
                      title="Download"
                    >
                      <Upload className="h-4 w-4 rotate-180" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(attachment)}
                      title="Delete"
                    >
                      <X className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
