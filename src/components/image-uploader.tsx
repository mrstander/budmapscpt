'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { uploadImage } from '@/lib/actions/upload-actions';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Trash2, UploadCloud } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface ImageUploaderProps {
  imageUrls: string[];
  onUrlsChange: (urls: string[]) => void;
  maxFiles?: number;
  uploadPath?: string; // Kept for compatibility but unused in local version
}

const ImageUploader = ({ imageUrls, onUrlsChange, maxFiles = 1, uploadPath }: ImageUploaderProps) => {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (imageUrls.length + acceptedFiles.length > maxFiles) {
      toast({
        variant: 'destructive',
        title: 'Upload limit reached',
        description: `You can only upload a maximum of ${maxFiles} files.`,
      });
      return;
    }

    setIsUploading(true);

    try {
      const uploadPromises = acceptedFiles.map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        // Call Server Action
        return await uploadImage(formData);
      });

      const newUrls = await Promise.all(uploadPromises);
      onUrlsChange([...imageUrls, ...newUrls]);
    } catch (error) {
      console.error("Error uploading files:", error);
      toast({
        variant: 'destructive',
        title: 'Upload Failed',
        description: 'One or more images could not be uploaded.',
      });
    } finally {
      setIsUploading(false);
    }
  }, [imageUrls, onUrlsChange, maxFiles, toast]);


  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    disabled: isUploading || imageUrls.length >= maxFiles,
  });

  const handleDelete = async (urlToDelete: string) => {
    // For local files, we just remove from the list. 
    // Ideally we should also delete from filesystem via Server Action but that's an optimization.
    onUrlsChange(imageUrls.filter(url => url !== urlToDelete));
    toast({
      title: 'Image Removed',
      description: 'The image has been removed from the list.',
    });
  };

  return (
    <div className="space-y-4">
      {imageUrls.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {imageUrls.map((url, index) => (
            <div key={index} className="relative group aspect-square">
              <Image src={url} alt={`Uploaded image ${index + 1}`} fill className="object-cover rounded-md border" />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-md">
                <Button variant="destructive" size="icon" onClick={() => handleDelete(url)} aria-label="Delete image">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {imageUrls.length < maxFiles && (
        <div
          {...getRootProps()}
          className={cn(
            'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
            'border-input hover:border-primary/50',
            isDragActive && 'border-primary bg-primary/10',
            isUploading && 'cursor-not-allowed opacity-50'
          )}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <UploadCloud className="w-8 h-8" />
            {isUploading ? (
              <p>Uploading...</p>
            ) : isDragActive ? (
              <p>Drop the files here ...</p>
            ) : (
              <p>Drag & drop images here, or click to select</p>
            )}
            <p className="text-xs">(Max {maxFiles} files, {maxFiles - imageUrls.length} remaining)</p>
          </div>
        </div>
      )}
      {/* Helper message for demo purposes */}
      <p className="text-xs text-muted-foreground mt-2">
        Images are uploaded to public/uploads
      </p>
    </div>
  );
};

export default ImageUploader;