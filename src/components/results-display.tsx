'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, FileText, Loader2, ChevronDown } from 'lucide-react';
import type { ScanResult } from '@/types';
import { useLanguage } from '@/contexts/language-context';
import React from 'react';
import Image from 'next/image';

interface ResultsDisplayProps {
  results: ScanResult[];
}

const StatusIcon = ({ status }: { status: ScanResult['status'] }) => {
  if (status === 'processing') {
    return <Loader2 className="h-5 w-5 animate-spin text-blue-600" />;
  }
  if (status === 'success') {
    return <CheckCircle className="h-5 w-5 text-green-600" />;
  }
  if (status === 'error') {
    return <AlertTriangle className="h-5 w-5 text-destructive" />;
  }
  return null;
};

const DetailView = ({ result }: { result: ScanResult }) => {
  const { t } = useLanguage();
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-muted/30">
       <div>
         <h4 className="font-semibold mb-2">{t('originalImage')}</h4>
         <div className="relative w-full aspect-[3/2] rounded-md overflow-hidden border">
            <Image 
                src={result.originalImage} 
                alt={result.fileName}
                fill
                className="object-contain"
            />
         </div>
       </div>
       <div>
        <h4 className="font-semibold mb-2">{t('rawOcrText')}</h4>
         <Card className="max-h-80 overflow-y-auto">
            <CardContent className="p-4">
              <pre className="text-sm whitespace-pre-wrap font-mono break-words">
                {result.rawOcrText || t('noOcrText')}
              </pre>
            </CardContent>
         </Card>
       </div>
    </div>
  );
}

export function ResultsDisplay({ results }: ResultsDisplayProps) {
  const { t } = useLanguage();

  if (results.length === 0) {
    return (
      <Card>
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
    <Card>
      <CardHeader>
        <CardTitle>{t('results')}</CardTitle>
        <CardDescription>{t('resultsDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" className="w-full space-y-2">
          {results.map((result) => (
            <AccordionItem value={result.id} key={result.id} className="border-b-0 rounded-lg border bg-card text-card-foreground shadow-sm">
                <AccordionTrigger className="p-4 hover:no-underline data-[state=open]:border-b">
                    <div className="w-full overflow-x-auto">
                      <Table className="min-w-full">
                        <TableHeader className="sr-only">
                          <TableRow>
                             <TableHead className="w-[50px]"></TableHead>
                             <TableHead>{t('status')}</TableHead>
                             <TableHead>{t('surname')}</TableHead>
                             <TableHead>{t('givenName')}</TableHead>
                             <TableHead>{t('documentNumber')}</TableHead>
                             <TableHead>{t('fileName')}</TableHead>
                          </TableRow>
                        </TableHeader>
                         <TableBody>
                            <TableRow className="border-0 hover:bg-transparent">
                               <TableCell className="w-[50px] p-0 pl-2">
                                  <div className="flex items-center gap-4">
                                     <StatusIcon status={result.status} />
                                     <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                                  </div>
                               </TableCell>
                               <TableCell className="p-0 px-2 min-w-[120px]">
                                 {result.status !== 'processing' && (
                                     <Badge
                                       variant={result.status === 'success' ? 'default' : 'destructive'}
                                       className={result.status === 'success' ? 'bg-green-500/20 text-green-700 border-green-500/30' : ''}
                                     >
                                       {result.status === 'success' ? t('scanSuccessful') : t('scanFailed')}
                                     </Badge>
                                   )}
                               </TableCell>
                               <TableCell className="p-0 px-2 min-w-[150px] font-mono">{result.mrzData?.surname}</TableCell>
                               <TableCell className="p-0 px-2 min-w-[150px] font-mono">{result.mrzData?.givenName}</TableCell>
                               <TableCell className="p-0 px-2 min-w-[150px] font-mono">{result.mrzData?.documentNumber}</TableCell>
                               <TableCell className="p-0 px-2 font-medium truncate max-w-xs">{result.fileName}</TableCell>
                            </TableRow>
                         </TableBody>
                      </Table>
                    </div>
                </AccordionTrigger>
                <AccordionContent>
                  <DetailView result={result} />
                </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
