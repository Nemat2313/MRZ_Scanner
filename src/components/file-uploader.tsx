'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud } from 'lucide-react';
import { useLanguage } from '@/contexts/language-context';

interface FileUploaderProps {
  onFilesAccepted: (files: File[]) => void;
  isProcessing: boolean;
  isDisabled: boolean;
}

export function FileUploader({ onFilesAccepted, isProcessing, isDisabled }: FileUploaderProps) {
  const { t } = useLanguage();
  const [isDragActive, setIsDragActive] = useState(false);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onFilesAccepted(acceptedFiles);
      }
      setIsDragActive(false);
    },
    [onFilesAccepted]
  );

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: {
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'application/pdf': ['.pdf'],
    },
    disabled: isProcessing || isDisabled,
    onDragEnter: () => setIsDragActive(true),
    onDragLeave: () => setIsDragActive(false),
  });

  return (
    <div
      {...getRootProps()}
      className={`w-full max-w-2xl rounded-xl border-2 border-dashed p-8 text-center transition-all duration-300
      ${
        isProcessing || isDisabled
          ? 'cursor-not-allowed border-muted bg-muted/50'
          : isDragActive
          ? 'border-primary bg-primary/10'
          : 'border-border hover:border-primary/50 hover:bg-accent/20'
      }`}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center justify-center gap-4">
        <UploadCloud
          className={`h-16 w-16 transition-colors ${
            isDisabled ? 'text-muted-foreground/50' : 
            isDragActive ? 'text-primary' : 'text-muted-foreground'
          }`}
        />
        <h3 className="text-2xl font-bold">{t('uploadTitle')}</h3>
        <p className="text-muted-foreground">{t('uploadSubtitle')}</p>
        {isDisabled && <p className="text-sm font-semibold text-destructive">{t('consentRequired')}</p>}
      </div>
    </div>
  );
}
