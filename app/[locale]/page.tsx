import { useTranslations } from 'next-intl';
import LandingHero from '@/components/layout/LandingHero';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';

export default async function Home({ params }: { params: { locale: string } }) {
    const t = (await import('../../messages/de.json')).default; // Fallback or server-side usage if needed, but client components use hook
    const { locale } = params;

    return (
        <main className="min-h-screen bg-slate-200 overflow-hidden font-sans selection:bg-orange-200 selection:text-orange-900">
            {/* Header */}
            <header className="absolute top-0 w-full z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex justify-between items-center">
                    <Image src="/logo.svg" alt="Abitur Risk Management" width={200} height={50} className="h-12 w-auto" priority />

                    <nav className="hidden md:flex items-center space-x-1 bg-white/70 backdrop-blur-md px-2 py-1.5 rounded-full shadow-sm border border-white/20">
                        <Link href="/" className="px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-white rounded-full transition-colors">Home</Link>
                        <Link href="#" className="px-4 py-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 hover:bg-white/50 rounded-full transition-colors">Pricing</Link>
                        <Link href="#" className="px-4 py-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 hover:bg-white/50 rounded-full transition-colors">About</Link>
                    </nav>

                    <div className="flex items-center space-x-4">
                        <div className="px-3 py-1.5 bg-white/70 backdrop-blur-md rounded-full border border-white/20 text-xs font-semibold text-slate-600 flex items-center shadow-sm">
                            <Link
                                href="/en"
                                className={`${locale === 'en' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'} transition-colors`}
                            >
                                EN
                            </Link>
                            <span className="mx-1 text-slate-300">|</span>
                            <Link
                                href="/de"
                                className={`${locale === 'de' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'} transition-colors`}
                            >
                                DE
                            </Link>
                        </div>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <LandingHero />

            {/* Feature Grid (Bottom Section) */}
            <section className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                {/* Risk Sensitivity Card */}
                <div className="bg-white/60 backdrop-blur-sm p-6 rounded-xl border border-white/30 hover:bg-white/80 transition-all cursor-default group">
                    <div className="h-10 w-10 bg-slate-200 rounded-lg mb-4 flex items-center justify-center group-hover:bg-orange-100 transition-colors">
                        <svg className="w-6 h-6 text-slate-500 group-hover:text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-800 mb-2">Risk Sensitivity</h3>
                    <p className="text-sm text-slate-500">Real-time analysis of deficit ceilings and point thresholds.</p>
                </div>

                {/* GPA Projection Card */}
                <div className="bg-white/60 backdrop-blur-sm p-6 rounded-xl border border-white/30 hover:bg-white/80 transition-all cursor-default group">
                    <div className="h-10 w-10 bg-slate-200 rounded-lg mb-4 flex items-center justify-center group-hover:bg-orange-100 transition-colors">
                        <svg className="w-6 h-6 text-slate-500 group-hover:text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-800 mb-2">GPA Projection</h3>
                    <p className="text-sm text-slate-500">Forecast your final Abitur grade based on current performance.</p>
                </div>

                {/* Trap Detection Card */}
                <div className="bg-white/60 backdrop-blur-sm p-6 rounded-xl border border-white/30 hover:bg-white/80 transition-all cursor-default group">
                    <div className="h-10 w-10 bg-slate-200 rounded-lg mb-4 flex items-center justify-center group-hover:bg-orange-100 transition-colors">
                        <svg className="w-6 h-6 text-slate-500 group-hover:text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-800 mb-2">Trap Detection</h3>
                    <p className="text-sm text-slate-500">Automatic alerts for mandatory course violations.</p>
                </div>

            </section>
        </main>
    );
}
