import type { Metadata } from 'next';
import SetupForm from '@/components/setup/SetupForm';
import Link from 'next/link';
import Image from 'next/image';

export const metadata: Metadata = {
    title: 'Fächer eingeben & Risiko berechnen',
    description:
        'Gib deine Abiturfächer und Noten ein. AbiturCheck berechnet sofort dein persönliches Risikoprofil und zeigt dir, wo du aufpassen musst.',
};

export default function SetupPage({
    params,
    searchParams,
}: {
    params: { locale: string };
    searchParams: { state?: string };
}) {
    const federalState = searchParams.state || 'NRW';
    const locale = params.locale;

    return (
        <main className="min-h-screen bg-slate-50/50 font-sans selection:bg-orange-200 selection:text-orange-900">
            {/* Header */}
            <header className="sticky top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/60">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-24 flex justify-between items-center">
                    <Link href={`/${locale}`} className="hover:opacity-80 transition-opacity">
                        <Image src="/logo.png" alt="Abitur Risk Management" width={2816} height={1536} className="h-24 w-auto" priority />
                    </Link>

                    <div className="flex items-center space-x-4">
                        <div className="px-3 py-1.5 bg-white/70 backdrop-blur-md rounded-full border border-white/20 text-xs font-semibold text-slate-600 flex items-center shadow-sm">
                            <Link
                                href={`/en/setup?state=${federalState}`}
                                className={`${locale === 'en' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'} transition-colors`}
                            >
                                EN
                            </Link>
                            <span className="mx-1 text-slate-300">|</span>
                            <Link
                                href={`/de/setup?state=${federalState}`}
                                className={`${locale === 'de' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'} transition-colors`}
                            >
                                DE
                            </Link>
                        </div>
                    </div>
                </div>
            </header>

            {/* Form */}
            <SetupForm federalState={federalState} locale={locale} />
        </main>
    );
}
