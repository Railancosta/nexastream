import type { Locale } from './config';

export const messages = {
  'pt-BR': {
    home: 'Início', discover: 'Descobrir', trending: 'Em alta', upload: 'Enviar',
    search: 'Pesquisar vídeos, criadores e temas...', signIn: 'Entrar', dashboard: 'Painel',
    wallet: 'Carteira', profile: 'Perfil', settings: 'Configurações', disconnect: 'Desconectar',
  },
  'en-US': {
    home: 'Home', discover: 'Discover', trending: 'Trending', upload: 'Upload',
    search: 'Search videos, creators, topics...', signIn: 'Sign In', dashboard: 'Dashboard',
    wallet: 'Wallet', profile: 'Profile', settings: 'Settings', disconnect: 'Disconnect',
  },
} as const;

type MessageKey = keyof typeof messages['pt-BR'];

export function t(locale: Locale, key: MessageKey): string {
  const selected = (messages as Partial<Record<Locale, Record<MessageKey, string>>>)[locale];
  return selected?.[key] ?? messages['en-US'][key] ?? messages['pt-BR'][key];
}

/**
 * Translation expansion contract:
 * locale files may be generated/updated by a local Ollama agent, but the
 * production application must always fall back to canonical human-reviewed
 * strings. No remote paid translation API is required at runtime.
 */
export type TranslationDictionary = Record<MessageKey, string>;
