import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';
import { IntlErrorCode } from 'next-intl';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
    const requested = await requestLocale;
    const locale = hasLocale(routing.locales, requested)
        ? requested
        : routing.defaultLocale;

    return {
        locale,
        messages: (await import(`../../locales/${locale}/common.json`)).default,
        timeZone: "TN",
        onError(error) {
            // Suppress timezone warnings
            if (error.code === IntlErrorCode.ENVIRONMENT_FALLBACK) {
                return; // Don't show the warning
            }
            // Only log other errors
            console.error(error);
        },
        getMessageFallback({ namespace, key, error }) {
            console.error(error)
            const path = [namespace, key].filter((part) => part != null).join('.');
            return path + ' is not yet translated';
        }
    };
});