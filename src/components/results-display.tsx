'use client';

import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { AlertTriangle, CheckCircle, FileText, Loader2 } from 'lucide-react';
import type { ScanResult } from '@/types';
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
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]"></TableHead>
                <TableHead>{t('fileName') || 'File Name'}</TableHead>
                <TableHead>{t('surname')}</TableHead>
                <TableHead>{t('givenName')}</TableHead>
                <TableHead>{t('documentNumber')}</TableHead>
                <TableHead>{t('nationality')}</TableHead>
                <TableHead>{t('dateOfBirth')}</TableHead>
                <TableHead>{t('expiryDate')}</TableHead>
                <TableHead className="text-right">{t('status') || 'Status'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((result) => (
                <AccordionItem value={result.id} key={result.id}>
                    <TableRow className="font-mono text-sm">
                      <TableCell>
                        <AccordionTrigger className="p-2 [&[data-state=open]>svg]:rotate-180" />
                      </TableCell>
                      <TableCell className="font-medium truncate max-w-xs">{result.fileName}</TableCell>
                      <TableCell>{result.mrzData?.surname}</TableCell>
                      <TableCell>{result.mrzData?.givenName}</TableCell>
                      <TableCell>{result.mrzData?.documentNumber}</TableCell>
                      <TableCell>{result.mrzData?.nationality}</TableCell>
                      <TableCell>{result.mrzData?.dateOfBirth}</TableCell>
                      <TableCell>{result.mrzData?.expiryDate}</TableCell>
                      <TableCell className="text-right">
                         <div className="flex items-center justify-end gap-2">
                           <StatusIcon status={result.status} />
                           {result.status !== 'processing' && (
                             <Badge
                               variant={result.status === 'success' ? 'default' : 'destructive'}
                               className={result.status === 'success' ? 'bg-green-500/20 text-green-700 border-green-500/30' : ''}
                             >
                               {result.status === 'success' ? t('scanSuccessful') : t('scanFailed')}
                             </Badge>
                           )}
                         </div>
                      </TableCell>
                    </TableRow>
                    <AccordionContent asChild>
                       <tr className="bg-muted/50 hover:bg-muted/50">
                          <TableCell colSpan={9} className="p-4">
                              {result.status === 'error' && (
                                <p className="text-destructive">{result.error}</p>
                              )}
                              {(result.status === 'success' || result.status === 'processing') && (
                                <div>
                                  <h4 className="mb-2 font-semibold">{t('originalImage')}</h4>
                                  {result.originalImage ? (
                                    <Image
                                      src={result.originalImage}
                                      alt="Original Scan"
                                      width={400}
                                      height={250}
                                      className="rounded-lg border object-contain bg-white"
                                    />
                                  ) : <div className="h-[250px] w-[400px] bg-gray-200 rounded-lg flex items-center justify-center"><Loader2 className="animate-spin"/></div>}
                                </div>
                              )}
                          </TableCell>
                       </tr>
                    </AccordionContent>
                </AccordionItem>
              ))}
            </TableBody>
          </Table>
        </Accordion>
      </CardContent>
    </Card>
  );
}
