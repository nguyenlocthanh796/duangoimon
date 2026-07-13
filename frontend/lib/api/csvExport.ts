// Client-side CSV export helpers (web target). No backend dependency.

/** Build a CSV string from headers + rows of cells (UTF-8 BOM for Excel). */
export function toCsv(headers: string[], rows: (string | number)[][]): string {
  const esc = (v: string | number) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return '﻿' + [headers.map(esc).join(','), ...rows.map((r) => r.map(esc).join(','))].join('\n');
}

/** Trigger a browser download of text content (no-op outside browser). */
export function downloadText(
  filename: string,
  content: string,
  mime = 'text/csv;charset=utf-8'
): void {
  if (typeof window === 'undefined' || !window.document) return;
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = window.document.createElement('a');
  a.href = url;
  a.download = filename;
  window.document.body.appendChild(a);
  a.click();
  window.document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
