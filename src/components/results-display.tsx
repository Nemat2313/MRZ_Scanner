'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, FileText, Loader2 } from 'lucide-react';
import type { ScanResult } from '@/types';
import { useLanguage } from '@/contexts/language-context';
import React from 'react';

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
        <div className="w-full overflow-x-auto">
          <Table className="min-w-full">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]"></TableHead>
                <TableHead>{t('status') || 'Status'}</TableHead>
                <TableHead>{t('documentType')}</TableHead>
                <TableHead>{t('issuingCountry')}</TableHead>
                <TableHead>{t('surname')}</TableHead>
                <TableHead>{t('givenName')}</TableHead>
                <TableHead>{t('documentNumber')}</TableHead>
                <TableHead>{t('nationality')}</TableHead>
                <TableHead>{t('dateOfBirth')}</TableHead>
                <TableHead>{t('sex')}</TableHead>
                <TableHead>{t('expiryDate')}</TableHead>
                <TableHead>{t('personalNumber')}</TableHead>
                <TableHead>{t('dateOfIssue')}</TableHead>
                <TableHead>{t('placeOfBirth')}</TableHead>
                <TableHead>{t('authority')}</TableHead>
                <TableHead>{t('fileName') || 'File Name'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((result) => (
                <TableRow key={result.id} className="font-mono text-sm whitespace-nowrap">
                  <TableCell>
                    <StatusIcon status={result.status} />
                  </TableCell>
                  <TableCell>
                     {result.status !== 'processing' && (
                         <Badge
                           variant={result.status === 'success' ? 'default' : 'destructive'}
                           className={result.status === 'success' ? 'bg-green-500/20 text-green-700 border-green-500/30' : ''}
                         >
                           {result.status === 'success' ? t('scanSuccessful') : t('scanFailed')}
                         </Badge>
                       )}
                  </TableCell>
                  <TableCell>{result.mrzData?.documentType}</TableCell>
                  <TableCell>{result.mrzData?.issuingCountry}</TableCell>
                  <TableCell>{result.mrzData?.surname}</TableCell>
                  <TableCell>{result.mrzData?.givenName}</TableCell>
                  <TableCell>{result.mrzData?.documentNumber}</TableCell>
                  <TableCell>{result.mrzData?.nationality}</TableCell>
                  <TableCell>{result.mrzData?.dateOfBirth}</TableCell>
                  <TableCell>{result.mrzData?.sex}</TableCell>
                  <TableCell>{result.mrzData?.expiryDate}</TableCell>
                  <TableCell>{result.mrzData?.personalNumber}</TableCell>
                  <TableCell>{result.mrzData?.dateOfIssue}</TableCell>
                  <TableCell>{result.mrzData?.placeOfBirth}</TableCell>
                  <TableCell>{result.mrzData?.authority}</TableCell>
                  <TableCell className="font-medium truncate max-w-xs">{result.fileName}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
