export const DEFAULT_LOCALE = 'pt-BR';

/**
 * BCP-47 locales supported by the NexaStream UI.
 * The architecture is data-driven so additional locales can be added
 * without changing application components.
 */
export const SUPPORTED_LOCALES = [
  'af-ZA','am-ET','ar','az-AZ','be-BY','bg-BG','bn-BD','bs-BA','ca-ES','cs-CZ',
  'cy-GB','da-DK','de-DE','el-GR','en-US','es-ES','et-EE','eu-ES','fa-IR','fi-FI',
  'fil-PH','fr-FR','ga-IE','gl-ES','gu-IN','he-IL','hi-IN','hr-HR','hu-HU','hy-AM',
  'id-ID','is-IS','it-IT','ja-JP','ka-GE','kk-KZ','km-KH','kn-IN','ko-KR','ky-KG',
  'lo-LA','lt-LT','lv-LV','mk-MK','ml-IN','mn-MN','mr-IN','ms-MY','mt-MT','my-MM',
  'ne-NP','nl-NL','no-NO','pa-IN','pl-PL','pt-BR','pt-PT','ro-RO','ru-RU','sk-SK',
  'sl-SI','sq-AL','sr-RS','sv-SE','sw-KE','ta-IN','te-IN','tg-TJ','th-TH','tr-TR',
  'uk-UA','ur-PK','uz-UZ','vi-VN','zh-CN','zh-TW','zu-ZA'
] as const;

export type Locale = typeof SUPPORTED_LOCALES[number];

export function normalizeLocale(input?: string | null): Locale {
  if (!input) return DEFAULT_LOCALE;
  const exact = SUPPORTED_LOCALES.find((locale) => locale.toLowerCase() === input.toLowerCase());
  if (exact) return exact;
  const language = input.toLowerCase().split('-')[0];
  const regional = SUPPORTED_LOCALES.find((locale) => locale.toLowerCase().startsWith(`${language}-`));
  return regional ?? DEFAULT_LOCALE;
}

export function detectLocale(acceptLanguage?: string | null): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;
  const candidates = acceptLanguage.split(',').map((part) => part.split(';')[0].trim());
  for (const candidate of candidates) {
    const locale = normalizeLocale(candidate);
    if (locale !== DEFAULT_LOCALE || candidate.toLowerCase().startsWith('pt')) return locale;
  }
  return DEFAULT_LOCALE;
}
