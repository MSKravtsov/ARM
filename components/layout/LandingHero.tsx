'use client';

import { motion } from 'framer-motion';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useAuthModal } from '@/lib/contexts/AuthModalContext';
import { createClient } from '@/lib/supabase/client';

export default function LandingHero() {
    const t = useTranslations();
    const locale = useLocale();
    const router = useRouter();
    const supabase = createClient();
    const { openModal } = useAuthModal();

    const [selectedState, setSelectedState] = useState('NRW');

    const handleStartAnalysis = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            router.push(`/${locale}/setup?state=${selectedState}`);
        } else {
            openModal(`/${locale}/setup?state=${selectedState}`);
        }
    };

    return (
        <>

            <section className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 lg:py-40 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">

                {/* Left Column: The Hook */}
                <motion.div
                    initial={{ opacity: 0, x: -20, filter: 'blur(10px)' }}
                    animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="space-y-8 relative z-10"
                >
                    <div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 block">
                            Abitur Risk Management
                        </span>
                        <h1 className="text-5xl lg:text-7xl font-extrabold text-slate-900 tracking-tight leading-[1.1] mb-6">
                            {t('landing.title')}
                            <br />
                            <span className="text-slate-400/50">{t('landing.titleHighlight')}</span>
                        </h1>
                    </div>

                    <p className="text-lg text-slate-600 max-w-lg leading-relaxed mb-8">
                        {t('landing.subtitle')}
                    </p>
                </motion.div>

                {/* Right Column: Configuration Card */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
                    className="relative"
                >
                    {/* Aurora Gradient Blob */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140%] h-[140%] pointer-events-none">
                        <div className="absolute top-0 right-0 w-3/4 h-3/4 bg-orange-300 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-blob"></div>
                        <div className="absolute bottom-0 left-0 w-3/4 h-3/4 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-blob animation-delay-2000"></div>
                    </div>

                    <div className="relative bg-white/80 backdrop-blur-md border border-white/40 rounded-3xl shadow-2xl shadow-orange-500/10 p-8 lg:p-10 space-y-8">
                        <div className="space-y-2">
                            <h3 className="text-2xl font-bold text-slate-900">
                                {t('configEngine.title')}
                            </h3>
                            <p className="text-slate-500 text-sm">
                                {t('configEngine.description')}
                            </p>
                        </div>

                        <div className="space-y-5">
                            <div className="space-y-2">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    {t('configEngine.federalState')}
                                </label>
                                <select
                                    value={selectedState}
                                    onChange={(e) => setSelectedState(e.target.value)}
                                    className="block w-full px-4 py-3 bg-white/50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none appearance-none cursor-pointer hover:bg-white/80"
                                >
                                    <option value="NRW">NRW</option>
                                    <option value="Bavaria">Bavaria</option>
                                    <option value="General">General</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    {t('configEngine.graduationYear')}
                                </label>
                                <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium">
                                    <span>2026</span>
                                    <div className="flex items-center gap-2">
                                        <span className="relative flex h-2.5 w-2.5">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4 pt-2">
                            <Button
                                fullWidth
                                size="lg"
                                onClick={handleStartAnalysis}
                                className="h-14 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold text-lg rounded-xl shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all"
                            >
                                {t('landing.cta')}
                            </Button>
                            <p className="text-xs text-center text-slate-400 font-medium">
                                {t('landing.updatedFor')}
                            </p>
                        </div>
                    </div>
                </motion.div>
            </section>
        </>
    );
}
