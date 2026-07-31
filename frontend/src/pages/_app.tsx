import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import { useEffect } from 'react';
import { useAuth } from '@/lib/store';
export default function App({ Component, pageProps }: AppProps) {
  const { checkAuth } = useAuth();
  useEffect(() => { checkAuth(); }, []);
  return <Component {...pageProps} />;
}
