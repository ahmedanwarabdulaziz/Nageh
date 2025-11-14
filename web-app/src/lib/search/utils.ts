export function normalizeArabic(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u064B-\u0652\u0670]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ئ/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ة/g, 'ه')
    .replace(/\u0640/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildSearchTokens(values: Array<string | null | undefined>): string[] {
  const tokens = new Set<string>();

  values
    .filter((value) => value != null)
    .forEach((value) => {
      const text = value!.toString();
      const normalized = normalizeArabic(text);

      text
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean)
        .forEach((word) => tokens.add(word));

      normalized
        .split(/\s+/)
        .filter(Boolean)
        .forEach((word) => {
          tokens.add(word);
          const maxPrefix = Math.min(word.length, 12);
          for (let i = 2; i <= maxPrefix; i += 1) {
            tokens.add(word.slice(0, i));
          }
        });
    });

  return Array.from(tokens);
}

export function tokenizeQuery(term: string): string[] {
  return normalizeArabic(term)
    .split(' ')
    .map((token) => token.trim())
    .filter(Boolean)
    .slice(0, 10); // Firestore array-contains-any limit
}


