'use client';

import Image from 'next/image';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, FileText, Loader2 } from 'lucide-react';
import type { ScanResult, MrzData } from '@/types';
import { useLanguage } from '@/contexts/language-context';

interface ResultsDisplayProps {
  results: ScanResult[];
}

const StatusIcon = ({ status }: { status: ScanResult['status'] }) => {
  if (status === 'processing') {
    return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;
  }
  if (status === 'success') {
    return <CheckCircle className="h-5 w-5 text-green-500" />;
  }
  if (status === 'error') {
    return <AlertTriangle className="h-5 w-5 text-destructive" />;
  }
  return null;
};

const MrzDataTable = ({ data, t }: { data: MrzData; t: (key: string) => string }) => {
  const fields: (keyof MrzData)[] = [
    'documentType',
    'issuingCountry',
    'surname',
    'givenName',
    'documentNumber',
    'nationality',
    'dateOfBirth',
    'sex',
    'expiryDate',
    'personalNumber',
  ];

  return (
    <div className="grid grid-cols-1 gap-x-4 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
      {fields.map((field) => (
        <div key={field}>
          <p className="font-medium text-muted-foreground">{t(field)}</p>
          <p className="font-mono text-foreground">{data[field]}</p>
        </div>
      ))}
    </div>
  );
};

export function ResultsDisplay({ results }: ResultsDisplayProps) {
  const { t } = useLanguage();

  if (results.length === 0) {
    return (
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle>{t('results')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
            <FileText className="h-16 w-16 text-muted-foreground" />
            <p className="text-muted-foreground">{t('noResults')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle>{t('results')}</CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {results.map((result) => (
            <AccordionItem value={result.id} key={result.id}>
              <AccordionTrigger className="hover:no-underline">
                <div className="flex w-full items-center justify-between gap-4 pr-4">
                  <div className="flex items-center gap-2">
                    <StatusIcon status={result.status} />
                    <span className="truncate font-medium">{result.fileName}</span>
                  </div>
                  {result.status !== 'processing' && (
                    <Badge
                      variant={result.status === 'success' ? 'default' : 'destructive'}
                      className={result.status === 'success' ? 'bg-green-500/20 text-green-700 border-green-500/30' : ''}
                    >
                      {result.status === 'success' ? t('scanSuccessful') : t('scanFailed')}
                    </Badge>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-2">
                {result.status === 'error' && (
                  <p className="text-destructive">{result.error}</p>
                )}
                {result.status === 'success' && result.mrzData && (
                  <div className="space-y-6">
                    <div>
                      <h4 className="mb-2 font-semibold">{t('originalImage')}</h4>
                      <Image
                        src={result.originalImage}
                        alt="Original Scan"
                        width={400}
                        height={250}
                        className="rounded-lg border object-contain"
                      />
                    </div>
                    <div>
                      <h4 className="mb-2 font-semibold">{t('mrzInformation')}</h4>
                      <MrzDataTable data={result.mrzData} t={t} />
                    </div>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
