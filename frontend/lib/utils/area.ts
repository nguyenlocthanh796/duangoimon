/**
 * Chuẩn hóa tên khu vực (Area Name Normalizer)
 * Giúp hợp nhất các tên trùng lặp do thiếu dấu hoặc viết hoa/thường khác nhau.
 */
export function normalizeAreaName(areaName?: string | null): string {
  if (!areaName || !areaName.trim()) return 'Bàn Khác';
  const trimmed = areaName.trim();
  const lower = trimmed.toLowerCase();

  if (lower.includes('ngoai troi') || lower.includes('ngoài trời') || lower.includes('n.trời') || lower.includes('n.troi')) {
    return 'Ngoài trời';
  }
  if (lower.includes('trong nha') || lower.includes('trong nhà') || lower.includes('t.nhà') || lower.includes('t.nha')) {
    return 'Trong nhà';
  }
  if (lower === 'vip' || lower.includes('phòng vip') || lower.includes('phong vip')) {
    return 'VIP';
  }
  if (lower.includes('tang 1') || lower.includes('tầng 1')) {
    return 'Tầng 1';
  }
  if (lower.includes('tang 2') || lower.includes('tầng 2')) {
    return 'Tầng 2';
  }
  if (lower.includes('tang 3') || lower.includes('tầng 3')) {
    return 'Tầng 3';
  }
  if (lower.includes('mang ve') || lower.includes('mang về') || lower.includes('takeaway')) {
    return 'Mang về';
  }

  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

export function abbreviateAreaName(areaName?: string | null, isWide = false): string {
  const normalized = normalizeAreaName(areaName);
  if (isWide) return normalized;
  if (normalized === 'Ngoài trời') return 'N.Trời';
  if (normalized === 'Trong nhà') return 'T.Nhà';
  return normalized;
}
