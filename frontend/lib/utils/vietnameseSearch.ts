/**
 * 👑 OngChu Lean POS - Ultra-Fast Vietnamese Diacritics & Fuzzy Search Engine
 * Tối giản chuẩn Ponytail: Dùng JS String.prototype.normalize('NFD') tiêu chuẩn thay vì map 70 ký tự bằng tay.
 */

const slugCache = new Map<string, string>();
const acronymCache = new Map<string, string>();

/**
 * Loại bỏ dấu tiếng Việt và chuyển về chữ thường bằng standard library
 */
export function removeVietnameseDiacritics(str: string): string {
  if (!str) return '';
  const cached = slugCache.get(str);
  if (cached !== undefined) return cached;

  const result = str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase();

  if (slugCache.size < 1000) {
    slugCache.set(str, result);
  }
  return result;
}

/**
 * Tạo chữ viết tắt đầu các từ (Acronym)
 * Ví dụ: 'Trà Đào Cam Sả' -> 'tdcs'
 */
export function getVietnameseAcronym(str: string): string {
  if (!str) return '';
  const cached = acronymCache.get(str);
  if (cached !== undefined) return cached;

  const normalized = removeVietnameseDiacritics(str);
  const words = normalized.split(/\s+/).filter(Boolean);
  const result = words.map((w) => w[0]).join('');

  if (acronymCache.size < 1000) {
    acronymCache.set(str, result);
  }
  return result;
}

/**
 * Thuật toán tính điểm độ khớp tìm kiếm (Relevance Score):
 * 100: Khớp chính xác tuyệt đối (Tên hoặc Mã SKU)
 *  90: Bắt đầu bằng từ khóa (Prefix match)
 *  75: Khớp chính xác chữ viết tắt (Exact Acronym: 'tdcs' -> 'Trà Đào Cam Sả')
 *  65: Chữ viết tắt bắt đầu bằng từ khóa (Prefix Acronym: 'td' -> 'Trà Đào Cam Sả')
 *  50: Chứa chuỗi con (Substring match)
 *  30: Chữ viết tắt chứa chuỗi con
 *   0: Không khớp
 */
export function scoreVietnameseSearch(
  targetName: string,
  searchQuery: string,
  code?: string
): number {
  if (!searchQuery) return 1;

  const cleanQuery = removeVietnameseDiacritics(searchQuery.trim());
  if (!cleanQuery) return 1;

  const rawCode = code ? code.toLowerCase() : '';
  const cleanCode = rawCode.replace(/[-#_\s]/g, '');
  const cleanQueryCode = cleanQuery.replace(/[-#_\s]/g, '');
  const cleanTarget = removeVietnameseDiacritics(targetName);

  // 1. Khớp chính xác tuyệt đối
  if (
    (cleanCode && cleanQueryCode && cleanCode === cleanQueryCode) ||
    rawCode === cleanQuery ||
    cleanTarget === cleanQuery
  ) {
    return 100;
  }

  // 2. Tiền tố (Prefix match)
  if (
    (cleanCode && cleanQueryCode && cleanCode.startsWith(cleanQueryCode)) ||
    (rawCode && rawCode.startsWith(cleanQuery)) ||
    cleanTarget.startsWith(cleanQuery)
  ) {
    return 90;
  }

  // 3. So khớp chữ cái viết tắt (Acronym)
  if (cleanQuery.length >= 2 && !cleanQuery.includes(' ')) {
    const acronym = getVietnameseAcronym(targetName);
    if (acronym === cleanQuery) return 75;
    if (acronym.startsWith(cleanQuery)) return 65;
    if (acronym.includes(cleanQuery)) return 30;
  }

  // 4. Khớp chuỗi con
  if (
    (cleanCode && cleanQueryCode && cleanCode.includes(cleanQueryCode)) ||
    (rawCode && rawCode.includes(cleanQuery)) ||
    cleanTarget.includes(cleanQuery)
  ) {
    return 50;
  }

  return 0;
}

export interface SearchIndexEntry<T> {
  item: T;
  rawName: string;
  cleanName: string;
  acronym: string;
  rawCode?: string;
  cleanCode?: string;
}

/**
 * Xây dựng chỉ mục tìm kiếm tính toán trước 1 lần duy nhất (Inverted Index Prep).
 * Giúp mọi thao tác lọc menu sau đó chạy trong < 0.1ms không chạy regex hay split.
 */
export function buildSearchIndex<T>(
  items: T[],
  getName: (item: T) => string,
  getCode?: (item: T) => string | undefined
): SearchIndexEntry<T>[] {
  return items.map((item) => {
    const rawName = getName(item) || '';
    const cleanName = removeVietnameseDiacritics(rawName);
    const acronym = getVietnameseAcronym(rawName);
    const rawCode = getCode ? getCode(item) : undefined;
    const cleanCode = rawCode ? rawCode.toLowerCase().replace(/[-#_\s]/g, '') : undefined;

    return {
      item,
      rawName,
      cleanName,
      acronym,
      rawCode: rawCode ? rawCode.toLowerCase() : undefined,
      cleanCode,
    };
  });
}

/**
 * Tìm kiếm siêu tốc trên chỉ mục đã tính sẵn (Zero Regex Runtime).
 */
export function searchWithPreIndex<T>(
  index: SearchIndexEntry<T>[],
  query: string
): T[] {
  if (!query || !query.trim()) {
    return index.map((entry) => entry.item);
  }

  const cleanQuery = removeVietnameseDiacritics(query.trim());
  if (!cleanQuery) return index.map((entry) => entry.item);

  const cleanQueryCode = cleanQuery.replace(/[-#_\s]/g, '');
  const isAcronymQuery = cleanQuery.length >= 2 && !cleanQuery.includes(' ');

  const scored: { item: T; score: number }[] = [];

  for (let i = 0; i < index.length; i++) {
    const entry = index[i];
    let score = 0;

    // 1. Khớp chính xác tuyệt đối
    if (
      (entry.cleanCode && cleanQueryCode && entry.cleanCode === cleanQueryCode) ||
      (entry.rawCode && entry.rawCode === cleanQuery) ||
      entry.cleanName === cleanQuery
    ) {
      score = 100;
    }
    // 2. Tiền tố (Prefix match)
    else if (
      (entry.cleanCode && cleanQueryCode && entry.cleanCode.startsWith(cleanQueryCode)) ||
      (entry.rawCode && entry.rawCode.startsWith(cleanQuery)) ||
      entry.cleanName.startsWith(cleanQuery)
    ) {
      score = 90;
    }
    // 3. So khớp viết tắt
    else if (isAcronymQuery) {
      if (entry.acronym === cleanQuery) score = 75;
      else if (entry.acronym.startsWith(cleanQuery)) score = 65;
      else if (entry.acronym.includes(cleanQuery)) score = 30;
    }

    // 4. Khớp chuỗi con
    if (score === 0) {
      if (
        (entry.cleanCode && cleanQueryCode && entry.cleanCode.includes(cleanQueryCode)) ||
        (entry.rawCode && entry.rawCode.includes(cleanQuery)) ||
        entry.cleanName.includes(cleanQuery)
      ) {
        score = 50;
      }
    }

    if (score > 0) {
      scored.push({ item: entry.item, score });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.item);
}

/**
 * Thuật toán so khớp thông minh F&B:
 */
export function matchesVietnameseSearch(
  targetName: string,
  searchQuery: string,
  code?: string
): boolean {
  return scoreVietnameseSearch(targetName, searchQuery, code) > 0;
}

/**
 * Lọc và tự động sắp xếp danh sách theo điểm số độ khớp cao nhất
 */
export function searchAndRankItems<T>(
  items: T[],
  query: string,
  getName: (item: T) => string,
  getCode?: (item: T) => string | undefined
): T[] {
  if (!query || !query.trim()) return items;

  const scored: { item: T; score: number }[] = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const name = getName(item);
    const code = getCode ? getCode(item) : undefined;
    const score = scoreVietnameseSearch(name, query, code);
    if (score > 0) {
      scored.push({ item, score });
    }
  }

  // Sắp xếp điểm cao lên trước (Stable sort)
  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.item);
}
