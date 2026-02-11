/**
 * Export data to Excel (.xls) using HTML table format.
 * No external libraries needed – Excel reads HTML tables natively.
 */
export const exportToExcel = (
  headers: string[],
  rows: (string | number | null | undefined)[][],
  filename: string,
  sheetTitle?: string
) => {
  const title = sheetTitle || 'Báo Cáo';

  const headerCells = headers
    .map(h => `<th style="background:#f59e0b;color:#fff;font-weight:bold;padding:8px 12px;border:1px solid #d97706;white-space:nowrap;">${h}</th>`)
    .join('');

  const bodyRows = rows
    .map(
      row =>
        '<tr>' +
        row
          .map(cell => {
            const val = cell == null ? '' : String(cell);
            const isNum = typeof cell === 'number';
            return `<td style="padding:6px 10px;border:1px solid #e5e7eb;${isNum ? 'text-align:right;mso-number-format:General;' : ''}">${val}</td>`;
          })
          .join('') +
        '</tr>'
    )
    .join('');

  const html = `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="UTF-8">
<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
<x:Name>${title}</x:Name>
<x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
</x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
<style>table{border-collapse:collapse;font-family:Arial,sans-serif;font-size:12px;}th,td{border:1px solid #ccc;}</style>
</head>
<body>
<table><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>
</body>
</html>`;

  const blob = new Blob(['\ufeff' + html], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};
