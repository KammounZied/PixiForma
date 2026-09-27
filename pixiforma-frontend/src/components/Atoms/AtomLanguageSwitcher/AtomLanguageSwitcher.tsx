import { useLocale } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';

export default function AtomLanguageSwitcher() {
    const locale = useLocale();
    const otherLocale = locale === 'en' ? 'fr' : 'en';
    const pathname = usePathname();

    const languages = [
        { code: 'en', name: 'English', flag: '🇺🇸' },
        { code: 'fr', name: 'Français', flag: '🇫🇷' }
    ];

    const currentLanguage = languages.find(lang => lang.code === locale);
    const otherLanguage = languages.find(lang => lang.code === otherLocale);

    return (
        <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">
                {currentLanguage?.flag} {currentLanguage?.name}
            </span>
            <Link
                href={pathname}
                locale={otherLocale}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-200"
            >
                <span className="mr-2">{otherLanguage?.flag}</span>
                {otherLanguage?.name}
            </Link>
        </div>
    );
}
