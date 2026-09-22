export function formatCurrency(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) return '0';
  return Math.round(amount).toLocaleString('vi-VN');
}

export function formatVND(amount: number): string {
  return `${formatCurrency(amount)} đ`;
}

export function formatK(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) return '0k';
  if (amount >= 1000) return `${Math.round(amount / 1000)}k`;
  return `${Math.round(amount)}đ`;
}

export function formatDateShort(dateString: string): string {
  try {
    const d = new Date(dateString);
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return dateString;
  }
}

export function formatDate(dateInput: string | Date | undefined | null): string {
  if (!dateInput) return '';
  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return String(dateInput);
    return d.toLocaleDateString('vi-VN');
  } catch {
    return String(dateInput);
  }
}

export function formatDateTime(dateInput: string | Date | undefined | null): string {
  if (!dateInput) return '';
  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return String(dateInput);
    return `${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} · ${d.toLocaleDateString('vi-VN')}`;
  } catch {
    return String(dateInput);
  }
}

export function parseCurrency(val: string | number | undefined | null): number {
  if (val === undefined || val === null) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const str = String(val).trim();
  const isNegative = str.startsWith('-');
  const cleaned = str.replace(/\D/g, '');
  const parsed = parseInt(cleaned, 10);
  if (isNaN(parsed)) return 0;
  return isNegative ? -parsed : parsed;
}
