import { useState, useEffect } from 'react';

const UI_DICTIONARY: Record<string, Record<string, string>> = {
  en: {
    "Feed": "Feed",
    "Login": "Login",
    "Register": "Register",
    "Upload": "Upload Video",
    "No videos available yet": "No videos available yet",
    "Loading...": "Loading...",
    "views": "views"
  },
  pt: {
    "Feed": "Feed",
    "Login": "Entrar",
    "Register": "Registrar",
    "Upload": "Enviar Vídeo",
    "No videos available yet": "Nenhum vídeo disponível ainda",
    "Loading...": "Carregando...",
    "views": "visualizações"
  },
  es: {
    "Feed": "Inicio",
    "Login": "Iniciar sesión",
    "Register": "Registrarse",
    "Upload": "Subir Vídeo",
    "No videos available yet": "Aún no hay vídeos disponibles",
    "Loading...": "Cargando...",
    "views": "vistas"
  }
};

export function useAutoTranslate() {
  const [lang, setLang] = useState('en');
  const [t, setT] = useState<Record<string, string>>(UI_DICTIONARY.en);

  useEffect(() => {
    // 1. Detectar idioma pelo IP (API gratuita, sem chave)
    fetch('https://ipwho.is/')
      .then(res => res.json())
      .then(data => {
        const countryCode = data.connection?.country_code?.toLowerCase() || 'us';
        
        // Mapeamento simples de país para idioma
        const langMap: Record<string, string> = {
          'br': 'pt', 'pt': 'pt', 'us': 'en', 'gb': 'en',
          'es': 'es', 'mx': 'es', 'ar': 'es', 'fr': 'fr',
          'de': 'de', 'it': 'it', 'jp': 'ja', 'cn': 'zh'
        };
        
        const detectedLang = langMap[countryCode] || 'en';
        setLang(detectedLang);
        
        // 2. Carregar dicionário (se não existir, usa fallback ou API MyMemory)
        if (UI_DICTIONARY[detectedLang]) {
          setT(UI_DICTIONARY[detectedLang]);
        } else {
          // Fallback para inglês se o idioma não estiver no dicionário local
          setT(UI_DICTIONARY.en);
        }
      })
      .catch(() => {
        setLang('en');
        setT(UI_DICTIONARY.en);
      });
  }, []);

  const translate = (key: string) => t[key] || key;

  return { lang, t: translate };
}
