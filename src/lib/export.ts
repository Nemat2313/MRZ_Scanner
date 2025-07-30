import type { ScanResult, MrzData } from '@/types';
import * as xlsx from 'xlsx';

function getSuccessfulScans(data: ScanResult[]) {
  return data.filter((item) => item.status === 'success' && item.mrzData);
}

function createDataArray(
  scans: ScanResult[],
  headers: Record<keyof MrzData, string>
) {
  const headerKeys = Object.keys(headers) as (keyof MrzData)[];
  const headerValues = Object.values(headers);

  const dataArray = [headerValues];

  scans.forEach((scan) => {
    const mrz = scan.mrzData!;
    const row = headerKeys.map((key) => mrz[key] || '');
    dataArray.push(row);
  });

  return dataArray;
}


export function exportToCsv(
  data: ScanResult[],
  headers: Record<keyof MrzData, string>
) {
  const successfulScans = getSuccessfulScans(data);
  if (successfulScans.length === 0) return;

  const dataArray = createDataArray(successfulScans, headers);
  const csvContent = dataArray.map(row => 
    row.map(value => {
      let valStr = String(value);
      if (valStr.includes(',') || valStr.includes('"') || valStr.includes('\n')) {
        return `"${valStr.replace(/"/g, '""')}"`;
      }
      return valStr;
    }).join(',')
  ).join('\r\n');

  downloadBlob(
    new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' }),
    'mrz_data.csv'
  );
}

export function exportToXlsx(
  data: ScanResult[],
  headers: Record<keyof MrzData, string>
) {
  const successfulScans = getSuccessfulScans(data);
  if (successfulScans.length === 0) return;

  const dataArray = createDataArray(successfulScans, headers);
  
  const worksheet = xlsx.utils.aoa_to_sheet(dataArray);
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, 'MRZ Data');

  const xlsxBuffer = xlsx.write(workbook, { bookType: 'xlsx', type: 'array' });
  
  downloadBlob(
    new Blob([xlsxBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    'mrz_data.xlsx'
  );
}

function downloadBlob(blob: Blob, fileName: string) {
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
}
