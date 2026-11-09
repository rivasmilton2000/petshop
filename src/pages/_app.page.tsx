import type { AppProps } from 'next/app';
import '@fontsource/montserrat/latin-400.css';
import '@fontsource/montserrat/latin-500.css';
import '@fontsource/montserrat/latin-600.css';
import '@fontsource/montserrat/latin-700.css';
import '@fontsource/playfair-display/latin-500.css';
import '@fontsource/playfair-display/latin-600.css';
import '@fontsource/playfair-display/latin-700.css';
import './website/css/website.css';
import { CartProvider } from '@/components/Cart';
import { AuthSessionProvider } from '@/components/AuthSession';

export default function App({ Component, pageProps }: AppProps) {
  return <AuthSessionProvider><CartProvider><Component {...pageProps} /></CartProvider></AuthSessionProvider>;
}
