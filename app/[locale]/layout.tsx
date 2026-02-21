import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Analytics } from '@vercel/analytics/react';
import '../globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
    title: {
        default: 'AbiturCheck – Abitur Risikoanalyse & Notenprognose',
        template: '%s | AbiturCheck',
    },
    description:
        'Berechne dein Abitur-Risiko kostenlos. AbiturCheck analysiert deine Fächerwahl, erkennt Notenrisiken und gibt dir eine klare Prognose für dein Abitur 2026.',
    keywords: [
        'Abitur',
        'Abitur Rechner',
        'Abiturnote berechnen',
        'Abitur Risikoanalyse',
        'Notenprognose',
        'Abitur 2026',
        'Abitur NRW',
        'Abitur Bayern',
        'Oberstufe',
        'Abiturcheck',
        'Fächerwahl Abitur',
    ],
    authors: [{ name: 'AbiturCheck' }],
    metadataBase: new URL('https://abiturcheck.de'),
    openGraph: {
        title: 'AbiturCheck – Abitur Risikoanalyse & Notenprognose',
        description:
            'Berechne dein Abitur-Risiko kostenlos. Analyse deiner Fächerwahl, Notenrisiken erkennen und klare Prognose für dein Abitur 2026.',
        url: 'https://abiturcheck.de',
        siteName: 'AbiturCheck',
        locale: 'de_DE',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'AbiturCheck – Abitur Risikoanalyse',
        description:
            'Berechne dein Abitur-Risiko kostenlos. Notenprognose & Risikoanalyse für Abitur 2026.',
    },
    robots: {
        index: true,
        follow: true,
    },
    alternates: {
        languages: {
            'de': '/de',
            'en': '/en',
        },
    },
};

import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';

export default async function LocaleLayout({
    children,
    params: { locale }
}: {
    children: React.ReactNode;
    params: { locale: string };
}) {
    const messages = await getMessages();

    return (
        <html lang={locale}>
            <body className={inter.className}>
                <NextIntlClientProvider messages={messages}>
                    {children}
                    <Analytics />
                </NextIntlClientProvider>
            </body>
        </html>
    );
}
