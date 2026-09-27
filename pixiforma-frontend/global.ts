import { routing } from '@/i18n/routing';
import common from './locales/en/common.json';

declare module 'next-intl' {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: typeof common;
  }
}
