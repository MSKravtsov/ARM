'use client';

import { useTranslations } from 'next-intl';
import { Rocket, Heart, Shield, CheckCircle, BookOpen, FlaskConical, Globe, GraduationCap, Atom } from 'lucide-react';
import type { RiskReport } from '@/types/riskEngine';
import { motion } from 'framer-motion';

export default function MetricsGrid({ report }: { report: RiskReport }) {
    const t = useTranslations('report');

    // 1. Points
    const minPoints = report.ruleset.minTotalPoints || 300;
    const currentPoints = report.stats.totalProjectedPoints;
    const pointsProgress = Math.min((currentPoints / minPoints) * 100, 100);
    const pointsCircumference = 2 * Math.PI * 24; // r=24

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

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

            {/* Card 1: Total Points */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                    <span className="text-sm font-semibold text-slate-700">Total Points (Progress)</span>
                    <Rocket className="w-5 h-5 text-slate-400" />
                </div>
                <div className="flex items-center gap-4">
                    <div className="relative w-16 h-16">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 60 60">
                            <circle cx="30" cy="30" r="24" fill="none" stroke="#e2e8f0" strokeWidth="6" />
                            <motion.circle
                                cx="30" cy="30" r="24" fill="none" stroke="#3b82f6" strokeWidth="6" strokeLinecap="round"
                                strokeDasharray={pointsCircumference}
                                initial={{ strokeDashoffset: pointsCircumference }}
                                animate={{ strokeDashoffset: pointsCircumference - (pointsProgress / 100) * pointsCircumference }}
                                transition={{ duration: 1, ease: 'easeOut' }}
                            />
                        </svg>
                        {/* Dot indicator if needed, but ring is enough */}
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-slate-900 leading-none">
                            {currentPoints} <span className="text-slate-400 text-lg font-normal">/ {minPoints}</span>
                        </div>
                        <div className="text-xs text-slate-400 font-medium mt-1">Min. to Pass</div>
                    </div>
                </div>
            </div>

            {/* Card 2: Deficits (Lives) */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                    <span className="text-sm font-semibold text-slate-700">Deficits ('Lives')</span>
                    <Heart className="w-5 h-5 text-slate-400" />
                </div>
                <div>
                    <div className="text-3xl font-bold text-slate-900 mb-2">
                        {livesRemaining} <span className="text-lg font-medium text-slate-400">Lives Remaining</span>
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                        {Array.from({ length: maxDeficits }).map((_, i) => {
                            const isLost = i < currentDeficits;
                            return (
                                <motion.div
                                    key={i}
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: i * 0.05 }}
                                    className={`w-6 h-6 rounded-full border-2 ${isLost ? 'bg-red-500 border-red-500' : 'bg-slate-100 border-slate-200'}`}
                                />
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Card 3: Zero-Point Semesters */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                    <span className="text-sm font-semibold text-slate-700">Zero-Point Semesters</span>
                    <Shield className="w-5 h-5 text-slate-400" />
                </div>
                <div className="flex items-baseline gap-2">
                    <span className={`text-4xl font-bold ${zeroPoints > 0 ? 'text-red-600' : 'text-slate-900'}`}>
                        {zeroPoints}
                    </span>
                    <span className="text-slate-500 font-medium">Found</span>
                </div>
            </div>

            {/* Card 4: Keystone Subjects */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                    <span className="text-sm font-semibold text-slate-700">Keystone Subjects</span>
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

        </div>
    );
}
