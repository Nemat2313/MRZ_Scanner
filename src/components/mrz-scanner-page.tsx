'use client';

import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { Language, MrzData, ScanResult } from '@/types';
import { extractMrzAction } from '@/app/actions';
import { exportToCsv, exportToXlsx } from '@/lib/export';
import { LanguageProvider, useLanguage } from '@/contexts/language-context';
import { FileUploader } from './file-uploader';
import { ResultsDisplay } from './results-display';
import { Button } from './ui/button';
import { Download, Trash2 } from 'lucide-react';
import { LanguageSwitcher } from './language-switcher';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const Header = () => {
  const { t } = useLanguage();
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-screen-2xl items-center">
        <div className="mr-4 flex items-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 256 256"
            className="h-8 w-8 mr-2 rounded-none"
            fill="none"
          >
             <rect width="256" height="256" fill="none" />
             <path 
                fill="hsl(var(--primary))"
                d="M128,24A104,104,0,1,0,232,128,104.1,104.1,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Z"
             />
             <path 
                fill="hsl(var(--accent))"
                d="M168,88H132.3a28,28,0,0,0-52.6,0H88a8,8,0,0,0,0,16h4v48a8,8,0,0,0,16,0V104h32v48a8,8,0,0,0,16,0V104h4a8,8,0,0,0,0-16Z"
            />
          </svg>
          <h1 className="text-xl font-bold tracking-tight">Plain2Do</h1>
          <span className="text-xl text-muted-foreground ml-2 font-medium">| MRZ Scanner</span>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-2">
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
};

function formatMrzDate(dateStr: string, isExpiry: boolean): string {
  if (!/^\d{6}$/.test(dateStr)) {
    return dateStr;
  }
  const year = parseInt(dateStr.substring(0, 2), 10);
  const month = dateStr.substring(2, 4);
  const day = dateStr.substring(4, 6);

  let fullYear: number;
  const currentYear = new Date().getFullYear();
  const currentCentury = Math.floor(currentYear / 100) * 100;
  const current2DigitYear = currentYear % 100;

  if (isExpiry) {
     // Expiry dates are always in the future or very recent past.
     // Heuristic: If expiry year is more than 10 years in the past, it's next century.
     // Otherwise, it's current century. This handles YY=07 for 2007 vs 1907 etc.
     // Assumes documents aren't issued with expiry > 90 years in the future.
     fullYear = (year < current2DigitYear - 10) ? currentCentury + 100 + year : currentCentury + year;
     // If the calculated year is far in the past, it must be the next century
     if (fullYear < currentYear - 10) {
        fullYear += 100;
     }

  } else { // Date of Birth
    // DOB is always in the past.
    fullYear = (year > current2DigitYear) ? (currentCentury - 100) + year : currentCentury + year;
  }
  return `${day}.${month}.${fullYear}`;
}


const MrzScannerCore = () => {
  const [results, setResults] = useState<ScanResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  const handleFiles = async (files: File[]) => {
    setIsProcessing(true);

    for (const file of files) {
      const id = `${file.name}-${Date.now()}`;
      const reader = new FileReader();

      reader.readAsDataURL(file);
      await new Promise<void>((resolve) => {
        reader.onload = async () => {
          const originalImage = reader.result as string;

          setResults((prev) => [
            {
              id,
              fileName: file.name,
              originalImage,
              status: 'processing',
            },
            ...prev,
          ]);
          
          const mrzResult = await extractMrzAction({ photoDataUri: originalImage });

          if (mrzResult.success && mrzResult.data) {
            const formattedData = {
              ...mrzResult.data,
              dateOfBirth: formatMrzDate(mrzResult.data.dateOfBirth, false),
              expiryDate: formatMrzDate(mrzResult.data.expiryDate, true),
            };

            setResults((prev) =>
              prev.map((r) =>
                r.id === id
                  ? {
                      ...r,
                      status: 'success',
                      mrzData: formattedData,
                    }
                  : r
              )
            );
          } else {
            const errorMsg = mrzResult.error || 'Failed to extract MRZ data.';
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
          setResults((prev) => [
            {
              id,
              fileName: file.name,
              originalImage: '',
              status: 'error' as const,
              error: errorMsg,
            },
            ...prev,
          ]);
          toast({ variant: 'destructive', title: 'Error', description: errorMsg });
          resolve();
        };
      });
    }
    setIsProcessing(false);
  };

  const getHeaders = (): Record<keyof MrzData, string> => ({
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
  });

  const handleExportCsv = () => {
    exportToCsv(results, getHeaders());
  };

  const handleExportXlsx = () => {
    exportToXlsx(results, getHeaders());
  };

  const handleClearResults = () => {
    setResults([]);
  };

  const successfulScans =
    results.filter((r) => r.status === 'success').length > 0;

  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header />
      <main className="flex-1 space-y-8 p-4 sm:p-8 md:p-12">
        <section className="flex flex-col items-center">
          <FileUploader
            onFilesAccepted={handleFiles}
            isProcessing={isProcessing}
          />
        </section>

        <section className="flex flex-col items-center">
          <div className="w-full max-w-4xl">
            <div className="flex justify-end gap-2 mb-4">
               {results.length > 0 && (
                <Button
                  variant="outline"
                  onClick={handleClearResults}
                  disabled={isProcessing}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t('clearResults')}
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button disabled={!successfulScans || isProcessing}>
                    <Download className="mr-2 h-4 w-4" />
                    {t('export')}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleExportCsv}>
                    {t('exportCsv')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportXlsx}>
                     {t('exportXlsx')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
