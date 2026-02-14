'use client';

import { motion } from 'framer-motion';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';

export default function LandingHero() {
    const t = useTranslations();
    const locale = useLocale();
    const router = useRouter();
    const [selectedState, setSelectedState] = useState('NRW');

    const handleStartAnalysis = () => {
        router.push(`/${locale}/setup?state=${selectedState}`);
    };

    return (
        <section className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-24 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Column: Copy + Progress Bar */}
            <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="space-y-8"
            >
                <div className="space-y-4">
                    <span className="text-sm font-semibold text-slate-400 uppercase tracking-[0.25em]">Abitur Risk Management</span>
                    <h1 className="text-5xl lg:text-7xl font-bold text-slate-800 tracking-tight leading-none uppercase">
                        {t('landing.title')}
                    </h1>
                    <p className="text-xl text-slate-600 max-w-lg">
                        {t('landing.subtitle')}
                    </p>
                </div>

                {/* Progress Bar Container */}
                <div className="space-y-2">
                    {/* Segmented Progress Bar Visual */}
                    <div className="flex space-x-1 h-3">
                        {/* 20 Segments for visual flair */}
                        {[...Array(20)].map((_, i) => (
                            <div
                                key={i}
                                className={`flex-1 rounded-sm ${i < 1 ? 'bg-orange-500' : 'bg-slate-300/50'}`}
                            />
                        ))}
                    </div>
                    <p className="text-sm font-medium text-slate-500">
                        {t('setup.configStatus')}: 0%
                    </p>
                </div>
            </motion.div>

            {/* Right Column: State Selector Card (Glassmorphism) */}
            <motion.div
                initial={{ opacity: 0, y: 50, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="relative"
            >
                {/* Decorative backdrop blobs */}
                <div className="absolute -top-10 -right-10 w-64 h-64 bg-orange-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
                <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-slate-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>

                {/* The Card */}
                <div className="relative bg-white/80 backdrop-blur-md border border-white/20 rounded-2xl shadow-xl p-8 space-y-6">
                    <div className="space-y-2">
                        <h3 className="text-2xl font-semibold text-slate-800">
                            {t('configEngine.title')}
                        </h3>
                        <p className="text-slate-500 text-sm">
                            Select your academic region to initialize the correct risk model.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label htmlFor="federalState" className="block text-sm font-medium text-slate-600">
                                {t('configEngine.federalState')}
                            </label>
                            <div className="relative">
                                <select
                                    id="federalState"
                                    value={selectedState}
                                    onChange={(e) => setSelectedState(e.target.value)}
                                    className="block w-full pl-3 pr-10 py-3 text-base border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 sm:text-sm rounded-lg bg-white/50 backdrop-blur-sm shadow-sm transition-all"
                                >
                                    <option value="NRW">{t('configEngine.states.nrw')}</option>
                                    <option value="Bavaria">{t('configEngine.states.bavaria')}</option>
                                    <option value="General">{t('configEngine.states.general')}</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-slate-600">
                                {t('configEngine.graduationYear')}
                            </label>
                            <div className="inline-flex items-center px-4 py-2 rounded-lg bg-slate-100 text-slate-700 font-medium text-sm">
                                2026
                                <span className="ml-2 w-2 h-2 rounded-full bg-green-500"></span>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4">
                        <Button
                            fullWidth
                            size="lg"
                            onClick={handleStartAnalysis}
                            className="bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/30 transition-transform hover:scale-[1.02]"
                        >
                            {t('landing.cta')}
                        </Button>
                    </div>
                </div>
            </motion.div>
        </section>
    );
}
