'use client';

import {useState, useMemo} from 'react';
import {useToast} from '@/hooks/use-toast';
import type {Language, MrzData, ScanResult} from '@/types';
import {extractMrzDataAction} from '@/app/actions';
import {exportToCsv, exportToXlsx} from '@/lib/export';
import {LanguageProvider, useLanguage} from '@/contexts/language-context';
import {FileUploader} from './file-uploader';
import {ResultsDisplay} from './results-display';
import {Button} from './ui/button';
import {Card, CardContent, CardHeader, CardTitle} from './ui/card';
import {Progress} from './ui/progress';
import {
  Download,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Loader2,
  BookUser,
} from 'lucide-react';
import {LanguageSwitcher} from './language-switcher';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const Header = () => {
  const {t} = useLanguage();
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

const Overview = ({
  results,
  isProcessing,
}: {
  results: ScanResult[];
  isProcessing: boolean;
}) => {
  const {t} = useLanguage();

  const stats = useMemo(() => {
    const total = results.length;
    const successful = results.filter((r) => r.status === 'success').length;
    const failed = results.filter((r) => r.status === 'error').length;
    const processing = results.filter((r) => r.status === 'processing').length;
    const progress = total > 0 ? ((successful + failed) / total) * 100 : 0;

    return {total, successful, failed, processing, progress};
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
            <span className="text-sm text-muted-foreground">
              {t('totalFiles') || 'Total Files'}
            </span>
          </div>
          <div className="flex flex-col items-center justify-center p-4 bg-green-500/10 rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-2xl font-bold text-green-700">
                {stats.successful}
              </span>
            </div>
            <span className="text-sm text-green-800">{t('successful')}</span>
          </div>
          <div className="flex flex-col items-center justify-center p-4 bg-destructive/10 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <span className="text-2xl font-bold text-red-700">
                {stats.failed}
              </span>
            </div>
            <span className="text-sm text-red-800">{t('failed')}</span>
          </div>
          <div className="flex flex-col items-center justify-center p-4 bg-blue-500/10 rounded-lg">
            <div className="flex items-center gap-2">
              <Loader2
                className={`h-5 w-5 text-blue-600 ${
                  isProcessing ? 'animate-spin' : ''
                }`}
              />
              <span className="text-2xl font-bold text-blue-700">
                {stats.processing}
              </span>
            </div>
            <span className="text-sm text-blue-800">{t('processing')}</span>
          </div>
        </div>
        {isProcessing && (
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-base font-medium text-primary">
                {t('processingProgress') || 'Processing...'}
              </span>
              <span className="text-sm font-medium text-primary">
                {Math.round(stats.progress)}%
              </span>
            </div>
            <Progress value={stats.progress} />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const MrzScannerCore = () => {
  const [results, setResults] = useState<ScanResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const {toast} = useToast();
  const {t} = useLanguage();

  const fileToDataUri = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve(reader.result as string);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFiles = async (files: File[]) => {
    setIsProcessing(true);

    const newScans = files.map((file) => ({
      id: `${file.name}-${Date.now()}`,
      fileName: file.name,
      originalImage: URL.createObjectURL(file), // Use object URL for display
      status: 'processing' as const,
    }));

    setResults((prev) => [...newScans, ...prev]);

    for (const file of files) {
      const scan = newScans.find((s) => s.fileName === file.name)!;
      try {
        const photoDataUri = await fileToDataUri(file);
        const result = await extractMrzDataAction({photoDataUri});

        if (result.success && result.data) {
          setResults((prev) =>
            prev.map((r) =>
              r.id === scan.id
                ? {...r, status: 'success', mrzData: result.data as MrzData}
                : r
            )
          );
        } else {
          throw new Error(result.error || 'Failed to analyze MRZ data.');
        }
      } catch (error) {
        const errorMsg =
          error instanceof Error
            ? error.message
            : 'An unknown error occurred during processing.';
        setResults((prev) =>
          prev.map((r) =>
            r.id === scan.id ? {...r, status: 'error', error: errorMsg} : r
          )
        );
        toast({
          variant: 'destructive',
          title: t('scanFailed'),
          description: `${file.name}: ${errorMsg}`,
          duration: 20000, // Show for 20 seconds
        });
      }
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
