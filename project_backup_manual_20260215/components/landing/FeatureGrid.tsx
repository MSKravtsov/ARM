'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Gauge, TrendingUp, AlertTriangle } from 'lucide-react';

export default function FeatureGrid() {
    const t = useTranslations('landing.features');

    const featureKeys = ['riskSensitivity', 'gpaProjection', 'trapDetection'];

    return (
        <section className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-32 -mt-10 lg:-mt-20 z-20">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                {/* 1. Risk Sensitivity */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                    whileHover={{ y: -5 }}
                    className="bg-white rounded-2xl p-6 shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col justify-between gap-4 group"
                >
                    <div className="flex justify-between items-start">
                        <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center text-red-500">
                            <Gauge className="w-6 h-6" />
                        </div>
                        <div className="bg-red-100 text-red-700 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider">
                            {t('riskSensitivity.badge')}
                        </div>
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900 text-lg mb-1">{t('riskSensitivity.title')}</h3>
                        <p className="text-slate-500 text-sm">{t('riskSensitivity.desc')}</p>
                    </div>
                </motion.div>

                {/* 2. GPA Projection */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.5 }}
                    whileHover={{ y: -5 }}
                    className="bg-white rounded-2xl p-6 shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col justify-between gap-4 group"
                >
                    <div className="flex justify-between items-start">
                        <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500">
                            <TrendingUp className="w-6 h-6" />
                        </div>
                        <div className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider">
                            {t('gpaProjection.badge', { grade: '2.3' })}
                        </div>
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900 text-lg mb-1">{t('gpaProjection.title')}</h3>
                        <p className="text-slate-500 text-sm">{t('gpaProjection.desc')}</p>
                    </div>
                </motion.div>

                {/* 3. Trap Detection */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.6 }}
                    whileHover={{ y: -5 }}
                    className="bg-white rounded-2xl p-6 shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col justify-between gap-4 group"
                >
                    <div className="flex justify-between items-start">
                        <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500">
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                        <div className="bg-orange-100 text-orange-800 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider">
                            {t('trapDetection.badge', { count: 2 })}
                        </div>
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900 text-lg mb-1">{t('trapDetection.title')}</h3>
                        <p className="text-slate-500 text-sm">{t('trapDetection.desc')}</p>
                    </div>
                </motion.div>

            </div>
        </section>
    );
}
