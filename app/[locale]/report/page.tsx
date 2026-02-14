'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import RiskDashboard from '@/components/report/RiskDashboard';
import { runRiskEngine } from '@/lib/engine/riskEngine';
import type { RiskReport } from '@/types/riskEngine';
import type { UserInputProfile } from '@/types/userInput';
import { FederalState, SubjectType, ExamType } from '@/types/userInput';
import { UserInputProfileSchema } from '@/lib/schemas/userInputSchema';

/**
 * Report Page — `/[locale]/report`
 *
 * Reads the validated UserInputProfile from localStorage
 * (persisted by SetupForm) and runs the risk engine.
 */
export default function ReportPage() {
    const params = useParams();
    const router = useRouter();
    const locale = (params?.locale as string) ?? 'en';
    const t = useTranslations('report');

    const [report, setReport] = useState<RiskReport | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        try {
            const raw = localStorage.getItem('arm_profile');
            if (!raw) {
                setError('No profile data found. Please complete the setup first.');
                return;
            }

            const parsed = JSON.parse(raw);
            const result = UserInputProfileSchema.safeParse(parsed);

            if (!result.success) {
                console.error('Profile validation failed:', result.error);
                setError('Invalid profile data. Please return to setup and try again.');
                return;
            }

            const riskReport = runRiskEngine(result.data);
            setReport(riskReport);
        } catch (e) {
            console.error('Error loading report:', e);
            setError('Failed to load profile data.');
        }
    }, []);

    // Loading state
    if (!report && !error) {
        return (
            <main className="min-h-screen bg-gradient-to-b from-slate-50 via-blue-50/30 to-slate-100 flex items-center justify-center">
                <div className="text-center space-y-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500 mx-auto" />
                    <p className="text-slate-500 text-sm">Calculating risk analysis...</p>
                </div>
            </main>
        );
    }

    // Error state — redirect user back to setup
    if (error) {
        return (
            <main className="min-h-screen bg-gradient-to-b from-slate-50 via-blue-50/30 to-slate-100">
                <header className="sticky top-0 z-50 bg-white/70 backdrop-blur-xl border-b border-slate-200/60">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                        <Link href={`/${locale}`} className="hover:opacity-80 transition-opacity">
                            <Image
                                src="/logo.svg"
                                alt="Abitur Risk Management"
                                width={200}
                                height={50}
                                className="h-12 w-auto"
                            />
                        </Link>
                    </div>
                </header>
                <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-6">
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                        <p className="text-amber-700 font-medium">{error}</p>
                    </div>
                    <button
                        onClick={() => router.push(`/${locale}/setup`)}
                        className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-medium transition-colors shadow-lg shadow-orange-500/30"
                    >
                        Go to Setup
                    </button>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-gradient-to-b from-slate-50 via-blue-50/30 to-slate-100">
            {/* ── Header ── */}
            <header className="sticky top-0 z-50 bg-white/70 backdrop-blur-xl border-b border-slate-200/60">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <Link href={`/${locale}`} className="hover:opacity-80 transition-opacity">
                        <Image
                            src="/logo.svg"
                            alt="Abitur Risk Management"
                            width={200}
                            height={50}
                            className="h-12 w-auto"
                        />
                    </Link>
                    <div className="flex items-center gap-4">
                        <Link
                            href={`/${locale}/setup`}
                            className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                        >
                            {t('backToSetup')}
                        </Link>
                        <div className="flex items-center gap-1 text-xs font-medium text-slate-500 bg-white/60 px-3 py-1.5 rounded-full border border-slate-200/80">
                            <Link href={`/en/report`} className={locale === 'en' ? 'text-slate-900' : ''}>EN</Link>
                            <span className="text-slate-300">|</span>
                            <Link href={`/de/report`} className={locale === 'de' ? 'text-slate-900' : ''}>DE</Link>
                        </div>
                    </div>
                </div>
            </header>

            {/* ── Dashboard Content ── */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-slate-900">{t('title')}</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        {report!.federalState} · {t('overallStatus')}: {t(report!.overallSeverity.toLowerCase())}
                    </p>
                </div>

                <RiskDashboard report={report!} />
            </div>
        </main>
    );
}
