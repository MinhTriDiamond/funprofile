import { DonationRecord } from '@/hooks/useDonationHistory';
import { formatDate } from '@/lib/formatters';

/**
 * Export donations to CSV file
 */
export function exportDonationsToCSV(
  donations: DonationRecord[],
  type: 'sent' | 'received',
  filename?: string
) {
  // CSV headers
  const headers = [
    'Ngày giờ',
    'Người gửi',
    'Người nhận',
    'Số tiền',
    'Token',
    'Lời nhắn',
    'TX Hash',
    'Light Score',
    'Trạng thái'
  ];

  // Build rows
  const rows = donations.map(d => [
    formatDate(d.created_at),
    `@${d.sender?.username || 'Unknown'}`,
    `@${d.recipient?.username || 'Unknown'}`,
    d.amount,
    d.token_symbol,
    escapeCSV(d.message || ''),
    d.tx_hash,
    d.light_score_earned?.toString() || '0',
    translateStatus(d.status)
  ]);

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => escapeCSV(cell)).join(','))
  ].join('\n');

  // Add BOM for UTF-8 support in Excel
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });

  // Generate filename
  const date = new Date().toISOString().split('T')[0];
  const defaultFilename = `donation-history-${type}-${date}.csv`;

  // Trigger download
  downloadBlob(blob, filename || defaultFilename);
}

/**
 * Escape CSV special characters
 */
function escapeCSV(str: string): string {
  if (!str) return '';
  // If contains comma, quote, or newline, wrap in quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Translate status to Vietnamese
 */
function translateStatus(status: string): string {
  const statusMap: Record<string, string> = {
    pending: 'Đang xử lý',
    confirmed: 'Thành công',
    failed: 'Thất bại',
  };
  return statusMap[status] || status;
}

/**
 * Export donations to PDF using html2canvas
 */
export async function exportDonationsToPDF(
  donations: DonationRecord[],
  type: 'sent' | 'received',
  filename?: string
) {
  const html2canvas = (await import('html2canvas')).default;

  // Create a hidden container with styled table
  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;left:-9999px;top:0;width:1200px;background:#fff;padding:32px;font-family:system-ui,sans-serif;';

  const date = new Date().toISOString().split('T')[0];
  const title = type === 'sent' ? 'Lịch Sử Giao Dịch Đã Gửi' : 'Lịch Sử Giao Dịch Đã Nhận';

  container.innerHTML = `
    <h1 style="font-size:24px;font-weight:bold;margin-bottom:4px;color:#166534;">${title}</h1>
    <p style="font-size:12px;color:#666;margin-bottom:16px;">Ngày xuất: ${date} · Tổng: ${donations.length} giao dịch</p>
    <table style="width:100%;border-collapse:collapse;font-size:11px;">
      <thead>
        <tr style="background:#166534;color:#fff;">
          <th style="padding:8px;text-align:left;">Thời gian</th>
          <th style="padding:8px;text-align:left;">Người gửi</th>
          <th style="padding:8px;text-align:left;">Người nhận</th>
          <th style="padding:8px;text-align:right;">Số tiền</th>
          <th style="padding:8px;text-align:left;">Token</th>
          <th style="padding:8px;text-align:left;">Lời nhắn</th>
          <th style="padding:8px;text-align:left;">Trạng thái</th>
        </tr>
      </thead>
      <tbody>
        ${donations.map((d, i) => `
          <tr style="background:${i % 2 === 0 ? '#f0fdf4' : '#fff'};border-bottom:1px solid #e5e7eb;">
            <td style="padding:6px 8px;">${formatDate(d.created_at)}</td>
            <td style="padding:6px 8px;">@${d.sender?.username || 'Unknown'}</td>
            <td style="padding:6px 8px;">@${d.recipient?.username || 'Unknown'}</td>
            <td style="padding:6px 8px;text-align:right;font-weight:bold;color:#10b981;">${d.amount}</td>
            <td style="padding:6px 8px;">${d.token_symbol}</td>
            <td style="padding:6px 8px;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${d.message || ''}</td>
            <td style="padding:6px 8px;">${translateStatus(d.status)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, { scale: 2, useCORS: true });
    const imgData = canvas.toDataURL('image/png');

    // Create a printable window
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      // Fallback: download as image
      const link = document.createElement('a');
      link.href = imgData;
      link.download = filename || `donation-history-${type}-${date}.png`;
      link.click();
      return;
    }

    printWindow.document.write(`
      <html><head><title>${title}</title>
      <style>@media print { body { margin: 0; } img { width: 100%; } }</style>
      </head><body>
      <img src="${imgData}" style="width:100%;" />
      <script>window.onload = function() { window.print(); }</script>
      </body></html>
    `);
    printWindow.document.close();
  } finally {
    document.body.removeChild(container);
  }
}

/**
 * Trigger file download
 */
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
