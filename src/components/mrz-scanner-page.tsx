'use client';

import { useState, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { Language, MrzData, ScanResult } from '@/types';
import { extractMrzAction, askYandexAction } from '@/app/actions';
import { exportToCsv, exportToXlsx } from '@/lib/export';
import { LanguageProvider, useLanguage } from '@/contexts/language-context';
import { FileUploader } from './file-uploader';
import { ResultsDisplay } from './results-display';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { Download, Trash2, CheckCircle, AlertTriangle, Loader2, BookUser } from 'lucide-react';
import { LanguageSwitcher } from './language-switcher';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';

const Header = () => {
  const { t } = useLanguage();
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-screen-2xl items-center">
        <div className="mr-4 flex items-center">
          <BookUser className="h-8 w-8 mr-2 text-primary" />
          <h1 className="text-xl font-bold tracking-tight">{t('appName')}</h1>
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
    return ''; // Return empty if not in YYMMDD format
  }
  const year = parseInt(dateStr.substring(0, 2), 10);
  const month = parseInt(dateStr.substring(2, 4), 10);
  const day = parseInt(dateStr.substring(4, 6), 10);

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return ''; // Basic validation for month and day
  }

  let fullYear: number;
  const currentYear = new Date().getFullYear();
  const currentCentury = Math.floor(currentYear / 100) * 100;
  const current2DigitYear = currentYear % 100;

  if (isExpiry) {
     fullYear = currentCentury + year;
     if (fullYear < currentYear - 10) {
        fullYear += 100;
     }
  } else { // Date of Birth
    fullYear = (year > current2DigitYear) ? (currentCentury - 100) + year : currentCentury + year;
    if (fullYear < 1940) {
        return ''; // Return empty if birth year is before 1940
    }
  }
  
  const monthStr = month.toString().padStart(2, '0');
  const dayStr = day.toString().padStart(2, '0');

  return `${dayStr}.${monthStr}.${fullYear}`;
}

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '';
  // Normalize separators: replace space, slash, or dash with a dot.
  const normalizedDateStr = dateStr.replace(/[\s\/-]/g, '.');
  
  // Try to parse dates like "25.08.2015"
  const parts = normalizedDateStr.split('.');
  if (parts.length === 3) {
    const [day, month, year] = parts.map(p => parseInt(p, 10));
    if (!isNaN(day) && !isNaN(month) && !isNaN(year) &&
        day > 0 && day <= 31 && month > 0 && month <= 12 &&
        String(year).length === 4)
    {
       return `${String(day).padStart(2, '0')}.${String(month).padStart(2, '0')}.${year}`;
    }
  }
  
  // Fallback for other formats like YYYY-MM-DD
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  }

  return dateStr; // Return original string if all parsing fails
}


const Overview = ({ results, isProcessing }: { results: ScanResult[], isProcessing: boolean }) => {
  const { t } = useLanguage();

  const stats = useMemo(() => {
    const total = results.length;
    const successful = results.filter(r => r.status === 'success').length;
    const failed = results.filter(r => r.status === 'error').length;
    const processing = results.filter(r => r.status === 'processing').length;
    const progress = total > 0 ? ((successful + failed) / total) * 100 : 0;
    
    return { total, successful, failed, processing, progress };
  }, [results]);

  if (stats.total === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('overview') || 'Overview'}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="flex flex-col items-center justify-center p-4 bg-muted/50 rounded-lg">
            <span className="text-2xl font-bold">{stats.total}</span>
            <span className="text-sm text-muted-foreground">{t('totalFiles') || 'Total Files'}</span>
          </div>
          <div className="flex flex-col items-center justify-center p-4 bg-green-500/10 rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600"/>
              <span className="text-2xl font-bold text-green-700">{stats.successful}</span>
            </div>
            <span className="text-sm text-green-800">{t('successful')}</span>
          </div>
           <div className="flex flex-col items-center justify-center p-4 bg-destructive/10 rounded-lg">
             <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive"/>
                <span className="text-2xl font-bold text-red-700">{stats.failed}</span>
             </div>
            <span className="text-sm text-red-800">{t('failed')}</span>
          </div>
          <div className="flex flex-col items-center justify-center p-4 bg-blue-500/10 rounded-lg">
            <div className="flex items-center gap-2">
                <Loader2 className={`h-5 w-5 text-blue-600 ${isProcessing ? 'animate-spin' : ''}`}/>
                <span className="text-2xl font-bold text-blue-700">{stats.processing}</span>
            </div>
            <span className="text-sm text-blue-800">{t('processing')}</span>
          </div>
        </div>
        {isProcessing && (
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-base font-medium text-primary">{t('processingProgress') || 'Processing...'}</span>
              <span className="text-sm font-medium text-primary">{Math.round(stats.progress)}%</span>
            </div>
            <Progress value={stats.progress} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

const YandexTest = () => {
  const { t } = useLanguage();
  const [prompt, setPrompt] = useState('Rusya nufuzu 2024 yili kac kisi isi?');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleTest = async () => {
    if (!prompt) return;
    setIsLoading(true);
    setResponse('');
    const result = await askYandexAction(prompt);
    if (result.success) {
      setResponse(result.data);
    } else {
      setResponse(`Error: ${result.error}`);
    }
    setIsLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('yandexTestTitle')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="yandex-prompt">{t('yandexTestLabel')}</Label>
          <Textarea
            id="yandex-prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={t('yandexTestPlaceholder')}
            className="min-h-[100px]"
          />
        </div>
        <Button onClick={handleTest} disabled={isLoading || !prompt}>
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {t('yandexTestButton')}
        </Button>
        {response && (
          <div className="p-4 bg-muted/50 rounded-lg space-y-2">
            <h4 className="font-semibold">{t('yandexTestResponseTitle')}</h4>
            <p className="font-mono whitespace-pre-wrap">{response}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};


const MrzScannerCore = () => {
  const [results, setResults] = useState<ScanResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  const handleFiles = async (files: File[]) => {
    setIsProcessing(true);

    const newScans = files.map((file) => ({
      id: `${file.name}-${Date.now()}`,
      fileName: file.name,
      originalImage: '',
      status: 'processing' as const,
    }));

    setResults((prev) => [...newScans, ...prev]);

    for (const file of files) {
      const id = newScans.find(s => s.fileName === file.name)!.id;
      const reader = new FileReader();

      reader.readAsDataURL(file);
      await new Promise<void>((resolve) => {
        reader.onload = async () => {
          const originalImage = reader.result as string;

          setResults((prev) => prev.map(r => r.id === id ? {...r, originalImage} : r));
          
          const mrzResult = await extractMrzAction({ photoDataUri: originalImage });

          if (mrzResult.success && mrzResult.data) {
            const formattedData = {
              ...mrzResult.data,
              dateOfBirth: formatMrzDate(mrzResult.data.dateOfBirth, false),
              expiryDate: formatMrzDate(mrzResult.data.expiryDate, true),
              dateOfIssue: formatDate(mrzResult.data.dateOfIssue),
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
          setResults((prev) =>
            prev.map((r) =>
              r.id === id ? { ...r, status: 'error', error: errorMsg } : r
            )
          );
          toast({ variant: 'destructive', title: 'Error', description: errorMsg });
          resolve();
        };
      });
    }
    setIsProcessing(false);
  };

  const getHeaders = (): Record<keyof MrzData | 'fileName', string> => ({
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
    dateOfIssue: t('dateOfIssue'),
    placeOfBirth: t('placeOfBirth'),
    authority: t('authority'),
    fileName: t('fileName'),
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
        <section className="flex flex-col items-center gap-6">
          <FileUploader
            onFilesAccepted={handleFiles}
            isProcessing={isProcessing}
          />
           <div className="w-full max-w-7xl">
            <Overview results={results} isProcessing={isProcessing} />
           </div>
        </section>

        <section>
          <div className="w-full max-w-7xl mx-auto">
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

        <section className="w-full max-w-7xl mx-auto">
          <YandexTest />
        </section>

      </main>
      <footer className="py-4">
        <div className="container mx-auto text-center text-base text-muted-foreground">
          <p>{t('privacyNotice')}</p>
        </div>
      </footer>
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
