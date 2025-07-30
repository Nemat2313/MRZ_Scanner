'use client';

import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { Language, MrzData, ScanResult } from '@/types';
import { enhanceImageAction } from '@/app/actions';
import { generateMockMrzData } from '@/lib/mrz';
import { exportToCsv } from '@/lib/export';
import { LanguageProvider, useLanguage } from '@/contexts/language-context';
import { FileUploader } from './file-uploader';
import { ResultsDisplay } from './results-display';
import { Button } from './ui/button';
import { Download, ScanText } from 'lucide-react';
import { LanguageSwitcher } from './language-switcher';

const Header = () => {
  const { t } = useLanguage();
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-screen-2xl items-center">
        <div className="mr-4 flex items-center">
          <ScanText className="h-7 w-7 mr-3 text-primary" />
          <h1 className="text-xl font-bold tracking-tight">{t('appName')}</h1>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-2">
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
};

const MrzScannerCore = () => {
  const [results, setResults] = useState<ScanResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  const handleFiles = async (files: File[]) => {
    setIsProcessing(true);
    const newResults: ScanResult[] = [];

    for (const file of files) {
      const id = `${file.name}-${Date.now()}`;
      const reader = new FileReader();

      reader.readAsDataURL(file);
      await new Promise<void>((resolve) => {
        reader.onload = async () => {
          const originalImage = reader.result as string;
          const initialResult: ScanResult = {
            id,
            fileName: file.name,
            originalImage,
            status: 'processing',
          };
          newResults.push(initialResult);
          setResults((prev) => [...prev, initialResult]);

          const result = await enhanceImageAction({ photoDataUri: originalImage });

          if (result.success && result.data) {
            setResults((prev) =>
              prev.map((r) =>
                r.id === id
                  ? {
                      ...r,
                      status: 'success',
                      enhancedImage: result.data.enhancedPhotoDataUri,
                      mrzData: generateMockMrzData(),
                    }
                  : r
              )
            );
          } else {
            const errorMsg = result.error || t('errorEnhancing');
            setResults((prev) =>
              prev.map((r) =>
                r.id === id ? { ...r, status: 'error', error: errorMsg } : r
              )
            );
            toast({
              variant: 'destructive',
              title: t('scanFailed'),
              description: `${file.name}: ${errorMsg}`,
            });
          }
          resolve();
        };
        reader.onerror = () => {
          const errorMsg = 'Failed to read file.';
          const errorResult = {
            id,
            fileName: file.name,
            originalImage: '',
            status: 'error' as const,
            error: errorMsg,
          };
          newResults.push(errorResult);
          setResults(prev => [...prev, errorResult]);
          toast({ variant: 'destructive', title: 'Error', description: errorMsg });
          resolve();
        }
      });
    }
    setIsProcessing(false);
  };
  
  const handleExport = () => {
    const headers: Record<keyof MrzData, string> = {
      documentType: t('documentType'),
      issuingCountry: t('issuingCountry'),
      surname: t('surname'),
      givenName: t('givenName'),
      documentNumber: t('documentNumber'),
      nationality: t('nationality'),
      dateOfBirth: t('dateOfBirth'),
      sex: t('sex'),
      expiryDate: t('expiryDate'),
      personalNumber: t('personalNumber'),
    };
    exportToCsv(results, headers);
  };

  const successfulScans = results.filter(r => r.status === 'success').length > 0;

  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header />
      <main className="flex-1 space-y-8 p-4 sm:p-8 md:p-12">
        <section className="flex flex-col items-center">
          <FileUploader onFilesAccepted={handleFiles} isProcessing={isProcessing} />
        </section>

        <section className="flex flex-col items-center">
          <div className="w-full max-w-4xl">
            <div className="flex justify-end mb-4">
              <Button onClick={handleExport} disabled={!successfulScans || isProcessing}>
                <Download className="mr-2 h-4 w-4" />
                {t('exportCsv')}
              </Button>
            </div>
            <ResultsDisplay results={results} />
          </div>
        </section>
      </main>
    </div>
  );
};

export function MrzScannerPage() {
  return (
    <LanguageProvider>
      <MrzScannerCore />
    </LanguageProvider>
  );
}
