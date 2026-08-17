/** Lowercases and strips accents/diacritics, so "café" and "cafe" match each other in search. */
export function normalizeForSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}
