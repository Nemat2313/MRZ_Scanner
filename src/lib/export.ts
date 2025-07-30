import type { ScanResult, MrzData } from '@/types';

export function exportToCsv(
  data: ScanResult[],
  headers: Record<keyof MrzData, string>
) {
  const successfulScans = data.filter(
    (item) => item.status === 'success' && item.mrzData
  );

  if (successfulScans.length === 0) {
    return;
  }

  const headerKeys = Object.keys(headers) as (keyof MrzData)[];
  const headerValues = Object.values(headers);

  let csvContent = headerValues.join(',') + '\r\n';

  successfulScans.forEach((scan) => {
    const mrz = scan.mrzData!;
    const row = headerKeys
      .map((key) => {
        let value = mrz[key] || '';
        // Escape commas and quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          value = `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      })
      .join(',');
    csvContent += row + '\r\n';
  });

  const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'mrz_data.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
