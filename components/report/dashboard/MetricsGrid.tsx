'use client';

import { useTranslations } from 'next-intl';
import { Heart, Shield, CheckCircle, BookOpen, FlaskConical, Globe, GraduationCap, Atom, Brain, TrendingDown } from 'lucide-react';
import type { RiskReport } from '@/types/riskEngine';
import { TrapType } from '@/types/riskEngine';
import { motion } from 'framer-motion';
import { calculatePredictedGrade, calculateGradeProgress } from '@/lib/utils/gradeCalculations';
import { useReport } from '@/lib/contexts/ReportContext';

export default function MetricsGrid({ report }: { report: RiskReport }) {
    const t = useTranslations('report');
    const { profile } = useReport();

    // 1. Average GPA / Predicted Grade
    const { grade, averagePoints, nextGradeBracket } = calculatePredictedGrade(profile?.subjects || []);

    const gradeProgress = calculateGradeProgress(averagePoints);
    const gradeCircumference = 2 * Math.PI * 24; // r=24

    // Check for anchor risk (Module 3)
    const hasAnchorRisk = report.findings.some(f => f.trapType === TrapType.Anchor);

    // 2. Deficits (Lives)
    const maxDeficits = report.ruleset.maxDeficits || 8;
    const currentDeficits = report.stats.totalDeficits;
    const livesRemaining = Math.max(0, maxDeficits - currentDeficits);

    // 3. Zero Points
    const zeroPoints = report.stats.totalZeroPoints;

    // 4. Keystones
    // Assume 5 for visual consistency if standard is 4 or 5
    const totalKeystones = 5;
    const activeKeystones = report.stats.keystoneCount;

    const keystoneIcons = [BookOpen, FlaskConical, Globe, GraduationCap, Atom];

    // 5. Psychosocial Risk Summary
    const annotations = Array.from(report.subjectAnnotations.values());
    const fragileCount = annotations.filter(a => a.isFragile).length;
    const unstableCount = annotations.filter(a => a.isUnstable).length;
    const avgRiskMultiplier = annotations.length > 0
        ? annotations.reduce((sum, a) => sum + (a.riskMultiplier ?? 1.0), 0) / annotations.length
        : 1.0;
    const psychosocialSeverity =
        unstableCount >= 2 ? 'HIGH' :
            fragileCount >= 2 ? 'MODERATE' :
                avgRiskMultiplier > 1.3 ? 'MODERATE' : 'LOW';

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">

            {/* Card 1: Average GPA / Predicted Grade */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                    <span className="text-sm font-semibold text-slate-700">{t('predictedGrade')}</span>
                    <GraduationCap className={`w-5 h-5 ${averagePoints === 0 ? 'text-slate-300' : grade <= 2.0 ? 'text-green-500' : grade <= 3.0 ? 'text-blue-500' : 'text-slate-400'}`} />
                </div>
                <div className="flex items-center gap-4">
                    {/* Progress Ring */}
                    <div className="relative w-20 h-20 flex-shrink-0">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 60 60">
                            <circle cx="30" cy="30" r="24" fill="none" stroke="#e2e8f0" strokeWidth="6" />
                            <motion.circle
                                cx="30" cy="30" r="24" fill="none"
                                stroke={averagePoints === 0 ? '#cbd5e1' : grade <= 2.0 ? '#10b981' : grade <= 3.0 ? '#3b82f6' : '#f59e0b'}
                                strokeWidth="6" strokeLinecap="round"
                                strokeDasharray={gradeCircumference}
                                initial={{ strokeDashoffset: gradeCircumference }}
                                animate={{ strokeDashoffset: averagePoints === 0 ? gradeCircumference : gradeCircumference - (gradeProgress / 100) * gradeCircumference }}
                                transition={{ duration: 1, ease: 'easeOut' }}
                            />
                        </svg>
                        {/* Grade in center */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center">
                                <div className={`text-2xl font-bold leading-none ${averagePoints === 0 ? 'text-slate-400' : grade <= 2.0 ? 'text-green-600' : grade <= 3.0 ? 'text-blue-600' : 'text-amber-600'}`}>
                                    {averagePoints === 0 ? '--' : grade.toFixed(1)}
                                    {hasAnchorRisk && averagePoints > 0 && (
                                        <TrendingDown className="inline w-4 h-4 ml-0.5 text-orange-500" />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div>
                        <div className="text-xs text-slate-500 font-medium mb-1">{t('average')}</div>
                        <div className={`text-lg font-bold leading-none ${averagePoints === 0 ? 'text-slate-400' : 'text-slate-900'}`}>
                            {averagePoints === 0 ? '--' : `${averagePoints.toFixed(1)} Pts`}
                        </div>
                        {averagePoints > 0 && nextGradeBracket && nextGradeBracket.pointsNeeded > 0 && (
                            <div className="text-xs text-slate-400 font-medium mt-1">
                                +{nextGradeBracket.pointsNeeded.toFixed(1)} to {nextGradeBracket.grade.toFixed(1)}
                            </div>
                        )}
                        {averagePoints > 0 && hasAnchorRisk && (
                            <div className="text-xs text-orange-600 font-medium mt-1 flex items-center gap-1">
                                <span>⚓</span> Anchor Effect
                            </div>
                        )}
                        {averagePoints === 0 && (
                            <div className="text-xs text-slate-400 font-medium mt-1">
                                {t('noGradesYet')}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Card 2: Deficits (Lives) */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                    <span className="text-sm font-semibold text-slate-700">{t('deficits')}</span>
                    <Heart className="w-5 h-5 text-slate-400" />
                </div>
                <div>
                    <div className="flex items-baseline gap-2 mb-2">
                        <span className="text-3xl font-bold text-slate-900">{livesRemaining}</span>
                        <span className="text-sm font-medium text-slate-400 whitespace-nowrap">{t('livesRemaining')}</span>
                    </div>
                    <div className="flex gap-1">
                        {Array.from({ length: maxDeficits }).map((_, i) => {
                            const isLost = i < currentDeficits;
                            return (
                                <motion.div
                                    key={i}
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: i * 0.05 }}
                                    className={`w-5 h-5 rounded-full border-2 shrink-0 ${isLost ? 'bg-red-500 border-red-500' : 'bg-slate-100 border-slate-200'}`}
                                />
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Card 3: Zero-Point Semesters */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                    <span className="text-sm font-semibold text-slate-700">{t('zeroPoints')}</span>
                    <Shield className="w-5 h-5 text-slate-400" />
                </div>
                <div className="flex items-baseline gap-2">
                    <span className={`text-4xl font-bold ${zeroPoints > 0 ? 'text-red-600' : 'text-slate-900'}`}>
                        {zeroPoints}
                    </span>
                    <span className="text-slate-500 font-medium">{t('found')}</span>
                </div>
            </div>

            {/* Card 4: Keystone Subjects */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                    <span className="text-sm font-semibold text-slate-700">{t('keystoneSubjects')}</span>
                    <CheckCircle className="w-5 h-5 text-slate-400" />
                </div>
                <div>
                    <div className="text-2xl font-bold text-slate-900 mb-2">
                        {activeKeystones} <span className="text-lg text-slate-400 font-normal">of {totalKeystones} Active</span>
                    </div>
                    <div className="flex gap-3 text-slate-300">
                        {keystoneIcons.map((Icon, i) => {
                            const isActive = i < activeKeystones;
                            return (
                                <Icon
                                    key={i}
                                    className={`w-6 h-6 ${isActive ? 'text-slate-800' : 'text-slate-200'} transition-colors duration-500`}
                                    strokeWidth={2}
                                />
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Card 5: Psychosocial Risk (Module 7) */}
            <div className={`bg-white rounded-2xl shadow-sm border p-6 flex flex-col justify-between hover:shadow-md transition-shadow ${psychosocialSeverity === 'HIGH' ? 'border-orange-200 bg-orange-50/30' :
                    psychosocialSeverity === 'MODERATE' ? 'border-amber-200 bg-amber-50/30' :
                        'border-slate-100'
                }`}>
                <div className="flex justify-between items-start mb-4">
                    <span className="text-sm font-semibold text-slate-700">{t('psychosocialRisk')}</span>
                    <Brain className={`w-5 h-5 ${psychosocialSeverity === 'HIGH' ? 'text-orange-500' :
                            psychosocialSeverity === 'MODERATE' ? 'text-amber-500' :
                                'text-slate-400'
                        }`} />
                </div>
                <div>
                    <div className="space-y-2 mb-3">
                        {fragileCount > 0 && (
                            <div className="flex items-center gap-2 text-sm">
                                <div className="w-2 h-2 rounded-full bg-amber-500" />
                                <span className="text-slate-700">{t('fragileCount', { count: fragileCount })}</span>
                            </div>
                        )}
                        {unstableCount > 0 && (
                            <div className="flex items-center gap-2 text-sm">
                                <div className="w-2 h-2 rounded-full bg-orange-500" />
                                <span className="text-slate-700">{t('unstableCount', { count: unstableCount })}</span>
                            </div>
                        )}
                        {fragileCount === 0 && unstableCount === 0 && (
                            <div className="flex items-center gap-2 text-sm">
                                <div className="w-2 h-2 rounded-full bg-green-500" />
                                <span className="text-slate-700">{t('noCriticalRisks')}</span>
                            </div>
                        )}
                    </div>
                    <div className="text-xs text-slate-500 font-medium">
                        {t('avgRisk')}: <span className={`font-bold ${avgRiskMultiplier > 1.5 ? 'text-orange-600' : avgRiskMultiplier > 1.2 ? 'text-amber-600' : 'text-green-600'}`}>
                            {avgRiskMultiplier.toFixed(2)}x
                        </span>
                    </div>
                </div>
            </div>

        </div>
    );
}
