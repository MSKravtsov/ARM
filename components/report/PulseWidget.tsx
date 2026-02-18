'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useReport } from '@/lib/contexts/ReportContext';
import { SleepDuration, EnergyLevel, PsychosocialRisk } from '@/types/psychosocial';
import SqueezeSlider from '@/components/ui/SqueezeSlider';

export default function PulseWidget() {
    const t = useTranslations('pulse');
    const { psychosocialData, setPsychosocialData, psychosocialRisk, profile, report } =
        useReport();
    const [isExpanded, setIsExpanded] = useState(false);
    const [shouldBreathe, setShouldBreathe] = useState(true);

    // Breathing animation interval
    useEffect(() => {
        if (!isExpanded && shouldBreathe) {
            const interval = setInterval(() => {
                setShouldBreathe(false);
                setTimeout(() => setShouldBreathe(true), 1000);
            }, 5000);
            return () => clearInterval(interval);
        }
    }, [isExpanded, shouldBreathe]);

    const projectedGPA = calculateProjectedGPA(report);

    // Risk color mapping
    const riskColors = {
        [PsychosocialRisk.LOW]: {
            ring: 'ring-emerald-500',
            bg: 'bg-emerald-500',
            text: 'text-emerald-700',
            bgLight: 'bg-emerald-50',
        },
        [PsychosocialRisk.MODERATE]: {
            ring: 'ring-amber-500',
            bg: 'bg-amber-500',
            text: 'text-amber-700',
            bgLight: 'bg-amber-50',
        },
        [PsychosocialRisk.HIGH]: {
            ring: 'ring-red-500',
            bg: 'bg-red-500',
            text: 'text-red-700',
            bgLight: 'bg-red-50',
        },
    };

    const currentColors = riskColors[psychosocialRisk.overallRisk];

    return (
        <>
            {/* Collapsed FAB */}
            <AnimatePresence>
                {!isExpanded && (
                    <motion.button
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{
                            scale: shouldBreathe ? 1.05 : 1,
                            opacity: 1,
                        }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{
                            scale: { duration: 0.6, ease: 'easeInOut' },
                            opacity: { duration: 0.3 },
                        }}
                        onClick={() => setIsExpanded(true)}
                        className={`fixed bottom-6 right-6 md:bottom-8 md:right-8 z-50
                            flex items-center gap-3 px-6 py-4 rounded-full
                            bg-white/90 backdrop-blur-xl shadow-2xl
                            border-2 ${currentColors.ring}
                            hover:scale-105 transition-transform`}
                    >
                        {/* Pulse icon */}
                        <svg
                            className={`w-6 h-6 ${currentColors.text}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                            />
                        </svg>
                        <span className="font-semibold text-slate-800">{t('title')}</span>
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Expanded Panel */}
            <AnimatePresence>
                {isExpanded && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsExpanded(false)}
                            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
                        />

                        {/* Panel */}
                        <motion.div
                            initial={{
                                opacity: 0,
                                y: window.innerWidth >= 768 ? 20 : 100,
                                scale: window.innerWidth >= 768 ? 0.95 : 1,
                            }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{
                                opacity: 0,
                                y: window.innerWidth >= 768 ? 20 : 100,
                                scale: window.innerWidth >= 768 ? 0.95 : 1,
                            }}
                            transition={{ duration: 0.3, ease: 'easeOut' }}
                            className={`fixed z-50
                                ${
                                    // Desktop: floating card above FAB
                                    window.innerWidth >= 768
                                        ? 'bottom-24 right-8 w-[420px] rounded-3xl'
                                        : // Mobile: bottom sheet
                                          'bottom-0 left-0 right-0 rounded-t-3xl max-h-[85vh] overflow-y-auto'
                                }
                                bg-white/90 backdrop-blur-xl shadow-2xl border border-white/20`}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-6 border-b border-slate-200/50">
                                <div className="flex items-center gap-3">
                                    <div
                                        className={`w-3 h-3 rounded-full ${currentColors.bg} animate-pulse`}
                                    />
                                    <h2 className="text-lg font-bold text-slate-800">
                                        {t('header')}
                                    </h2>
                                </div>
                                <button
                                    onClick={() => setIsExpanded(false)}
                                    className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                                >
                                    <svg
                                        className="w-5 h-5 text-slate-500"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M6 18L18 6M6 6l12 12"
                                        />
                                    </svg>
                                </button>
                            </div>

                            {/* Risk Summary Badge */}
                            <div className={`mx-6 mt-4 p-3 rounded-xl ${currentColors.bgLight}`}>
                                <div className="flex items-center justify-between">
                                    <span className={`text-sm font-semibold ${currentColors.text}`}>
                                        {t('currentRiskLevel')}
                                    </span>
                                    <span
                                        className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${currentColors.bg} text-white`}
                                    >
                                        {psychosocialRisk.overallRisk}
                                    </span>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-6 space-y-6">
                                {/* 1. The Squeeze */}
                                <div className="space-y-3">
                                    <label className="block text-sm font-semibold text-slate-700">
                                        {t('theSqueeze')}
                                        <span className="block text-xs font-normal text-slate-500 mt-0.5">
                                            {t('theSqueezeDesc')}
                                        </span>
                                    </label>
                                    <SqueezeSlider
                                        value={psychosocialData.weeklyCommitments}
                                        onChange={(value) =>
                                            setPsychosocialData({
                                                ...psychosocialData,
                                                weeklyCommitments: value,
                                            })
                                        }
                                        min={0}
                                        max={40}
                                    />
                                </div>

                                {/* 2. Recovery Debt */}
                                <div className="space-y-3">
                                    <label className="block text-sm font-semibold text-slate-700">
                                        {t('recoveryDebt')}
                                        <span className="block text-xs font-normal text-slate-500 mt-0.5">
                                            {t('recoveryDebtDesc')}
                                        </span>
                                    </label>

                                    {/* Sleep */}
                                    <div className="space-y-2">
                                        <span className="text-xs font-medium text-slate-600">
                                            {t('sleep')}
                                        </span>
                                        <div className="flex gap-2">
                                            {[
                                                { value: SleepDuration.LOW, label: '< 5h' },
                                                { value: SleepDuration.MEDIUM, label: '5-7h' },
                                                { value: SleepDuration.HIGH, label: '> 7h' },
                                            ].map((option) => (
                                                <button
                                                    key={option.value}
                                                    onClick={() =>
                                                        setPsychosocialData({
                                                            ...psychosocialData,
                                                            sleepDuration: option.value,
                                                        })
                                                    }
                                                    className={`flex-1 px-4 py-2.5 rounded-xl font-medium text-sm transition-all
                                                        ${
                                                            psychosocialData.sleepDuration ===
                                                            option.value
                                                                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                        }`}
                                                >
                                                    {option.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Energy */}
                                    <div className="space-y-2">
                                        <span className="text-xs font-medium text-slate-600">
                                            {t('energy')}
                                        </span>
                                        <div className="flex gap-2">
                                            {[
                                                { value: EnergyLevel.LOW, label: '🪫 Low' },
                                                { value: EnergyLevel.GOOD, label: '🔋 Good' },
                                                { value: EnergyLevel.HIGH, label: '⚡ High' },
                                            ].map((option) => (
                                                <button
                                                    key={option.value}
                                                    onClick={() =>
                                                        setPsychosocialData({
                                                            ...psychosocialData,
                                                            energyLevel: option.value,
                                                        })
                                                    }
                                                    className={`flex-1 px-4 py-2.5 rounded-xl font-medium text-sm transition-all
                                                        ${
                                                            psychosocialData.energyLevel ===
                                                            option.value
                                                                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                        }`}
                                                >
                                                    {option.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* 3. Expectation Gap */}
                                <div className="space-y-3">
                                    <label className="block text-sm font-semibold text-slate-700">
                                        {t('expectationGap')}
                                        <span className="block text-xs font-normal text-slate-500 mt-0.5">
                                            {t('expectationGapDesc')}
                                        </span>
                                    </label>
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs text-slate-600 w-20">
                                                {t('targetGPA')}
                                            </span>
                                            <input
                                                type="number"
                                                min="1.0"
                                                max="4.0"
                                                step="0.1"
                                                value={psychosocialData.targetGPA}
                                                onChange={(e) =>
                                                    setPsychosocialData({
                                                        ...psychosocialData,
                                                        targetGPA: parseFloat(e.target.value) || 2.0,
                                                    })
                                                }
                                                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 border-2 border-transparent
                                                    focus:bg-white focus:border-orange-500 focus:outline-none
                                                    text-sm font-medium transition-all"
                                            />
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs text-slate-600 w-20">
                                                {t('projected')}
                                            </span>
                                            <div className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-50 text-emerald-700 text-sm font-bold">
                                                {projectedGPA.toFixed(1)}
                                            </div>
                                        </div>
                                        {psychosocialRisk.gpaGap > 0.5 && (
                                            <div
                                                className={`p-3 rounded-xl ${
                                                    psychosocialRisk.hasUnrealisticExpectations
                                                        ? 'bg-red-50 border border-red-200'
                                                        : 'bg-amber-50 border border-amber-200'
                                                }`}
                                            >
                                                <div className="flex items-start gap-2">
                                                    <span
                                                        className={
                                                            psychosocialRisk.hasUnrealisticExpectations
                                                                ? 'text-red-600'
                                                                : 'text-amber-600'
                                                        }
                                                    >
                                                        {psychosocialRisk.hasUnrealisticExpectations
                                                            ? '⚠️'
                                                            : '⚡'}
                                                    </span>
                                                    <span
                                                        className={`text-xs font-medium ${
                                                            psychosocialRisk.hasUnrealisticExpectations
                                                                ? 'text-red-700'
                                                                : 'text-amber-700'
                                                        }`}
                                                    >
                                                        {psychosocialRisk.hasUnrealisticExpectations
                                                            ? t('unrealisticPressure')
                                                            : t('challengeZone')}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* 4. The Nemesis */}
                                {profile && profile.subjects.length > 0 && (
                                    <div className="space-y-3">
                                        <label className="block text-sm font-semibold text-slate-700">
                                            {t('theNemesis')}
                                            <span className="block text-xs font-normal text-slate-500 mt-0.5">
                                                {t('theNemesisDesc')}
                                            </span>
                                        </label>
                                        <select
                                            value={psychosocialData.anxietySubjectId || ''}
                                            onChange={(e) =>
                                                setPsychosocialData({
                                                    ...psychosocialData,
                                                    anxietySubjectId: e.target.value || null,
                                                })
                                            }
                                            className="w-full px-4 py-3 rounded-xl bg-slate-100 border-2 border-transparent
                                                focus:bg-white focus:border-orange-500 focus:outline-none
                                                text-sm font-medium transition-all"
                                        >
                                            <option value="">{t('none')}</option>
                                            {profile.subjects.map((subject) => (
                                                <option key={subject.id} value={subject.id}>
                                                    {subject.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}

// Helper function (duplicated from context for widget use)
function calculateProjectedGPA(report: any): number {
    if (!report) return 2.0;
    const points = report.stats.totalProjectedPoints;
    if (points >= 823) return 1.0;
    if (points >= 660) return 2.0;
    if (points >= 495) return 3.0;
    if (points >= 330) return 4.0;
    return 5.0;
}
