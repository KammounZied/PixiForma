import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from 'next-auth/middleware';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { PublicRoutes } from './lib/routes';
import { getToken } from 'next-auth/jwt';

const intlMiddleware = createMiddleware(routing);

const authMiddleware = withAuth(
  (req) => intlMiddleware(req),
  {
    callbacks: {
      authorized: ({ token }) => token != null
    },
    pages: {
      signIn: '/login'
    }
  }
);

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const localeMatch = pathname.match(`^/(${routing.locales.join('|')})(/.*)?$`);
  const locale = localeMatch?.[1] || routing.defaultLocale;
  const pathWithoutLocale = localeMatch?.[2] || pathname;

  const publicPagesWithoutHome = PublicRoutes.filter(route => route !== '/');

  const isPublicPage = publicPagesWithoutHome.some(route =>
    pathWithoutLocale === route || pathWithoutLocale.startsWith(route + '/')
  );

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (isPublicPage) {
    if (token) {
      return NextResponse.redirect(new URL(`/${locale}`, req.url));
    }
    return intlMiddleware(req);
  } else {
    return (authMiddleware as any)(req);
  }
}

export const config = {
  matcher: ['/((?!api|trpc|_next|_vercel|.*\\..*).*)']
};