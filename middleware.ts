import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';

const handleI18nRouting = createIntlMiddleware({
    locales: ['de', 'en'],
    defaultLocale: 'de',
    localeDetection: true,
});

/** Routes that require an authenticated session. */
const PROTECTED_PATHS = ['/setup', '/report'];

function isProtectedPath(pathname: string): boolean {
    return PROTECTED_PATHS.some((p) => pathname.includes(p));
}

export async function middleware(request: NextRequest) {
    // 1. Run i18n routing first.
    //    If it needs to redirect (e.g. add locale prefix) just return that.
    const intlResponse = handleI18nRouting(request);
    if (intlResponse.status !== 200) {
        return intlResponse;
    }

    // 2. Only check auth for protected routes.
    const { pathname } = request.nextUrl;
    if (!isProtectedPath(pathname)) {
        return intlResponse;
    }

    // 3. Verify Supabase session.
    //    Write any refreshed cookie tokens back onto the intlResponse so the
    //    browser session stays alive.
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name) {
                    return request.cookies.get(name)?.value;
                },
                set(name, value, options) {
                    intlResponse.cookies.set({ name, value, ...options });
                },
                remove(name, options) {
                    intlResponse.cookies.set({ name, value: '', ...options });
                },
            },
        }
    );

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        // Preserve locale in the login redirect.
        const locale = pathname.split('/')[1] ?? 'de';
        const loginUrl = new URL(`/${locale}/auth/login`, request.url);
        loginUrl.searchParams.set(
            'redirectTo',
            pathname + request.nextUrl.search
        );
        return NextResponse.redirect(loginUrl);
    }

    return intlResponse;
}

export const config = {
    matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
