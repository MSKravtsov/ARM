'use client';

import { useTranslations } from 'next-intl';
import { RefreshCw } from 'lucide-react';
import type { RiskReport } from '@/types/riskEngine';
import { RiskSeverity } from '@/types/riskEngine';
import { motion } from 'framer-motion';

export default function StatusHero({ report }: { report: RiskReport }) {
    const t = useTranslations('report'); // Ensure 'report' namespace exists

    // 1. Determine Style based on Severity
    const isRed = report.overallSeverity === RiskSeverity.RED;
    const isOrange = report.overallSeverity === RiskSeverity.ORANGE;
    const isGreen = report.overallSeverity === RiskSeverity.GREEN;

    let gradientClass = 'bg-gradient-to-r from-red-50 to-orange-50 border-red-100';
    let needleRotation = -45; // Left (Critical)
    let statusLabel = t('red');
    let statusColor = 'text-red-700 bg-red-100/50';

    if (isOrange) {
        gradientClass = 'bg-gradient-to-r from-orange-50 to-amber-50 border-amber-100';
        needleRotation = 0; // Center (Warning)
        statusLabel = t('orange');
        statusColor = 'text-amber-700 bg-amber-100/50';
    } else if (isGreen) {
        gradientClass = 'bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-100';
        needleRotation = 45; // Right (Safe)
        statusLabel = t('green');
        statusColor = 'text-emerald-700 bg-emerald-100/50';
    }

    const handleRecalculate = () => {
        window.location.reload();
    };

    return (
        <div className={`rounded-3xl shadow-sm border p-8 ${gradientClass} relative overflow-hidden`}>
            {/* Background Decoration Removed */}

            <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
                {/* Left: Gauge & Info */}
                <div className="flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
                    {/* Gauge Visual */}
                    <div className="relative w-40 h-28 flex flex-col items-center justify-end">
                        <svg viewBox="0 0 200 110" className="w-full h-full overflow-visible">
                            {/* Defs for gradients */}
                            <defs>
                                <linearGradient id="gradRed" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="#ef4444" stopOpacity="1" />
                                    <stop offset="100%" stopColor="#ef4444" stopOpacity="0.5" />
                                </linearGradient>
                            </defs>

                            {/* Gauge Background Track (Semi-Circle) */}
                            <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="currentColor" strokeOpacity="0.1" strokeWidth="18" strokeLinecap="round" className="text-slate-400" />

                            {/* Colorful Segments (Simplified visual representation) */}
                            {/* Colorful Segments (Mathematically aligned) */}
                            {/* Red Zone (Left: 180->135 deg) */}
                            <path d="M 20 100 A 80 80 0 0 1 43.43 43.43" fill="none" stroke={isRed ? "#ef4444" : "#fee2e2"} strokeWidth={isRed ? "18" : "14"} strokeLinecap="round" />
                            {/* Orange Zone (Top: 115->65 deg) */}
                            <path d="M 66.19 27.52 A 80 80 0 0 1 133.81 27.52" fill="none" stroke={isOrange ? "#f59e0b" : "#fef3c7"} strokeWidth={isOrange ? "18" : "14"} strokeLinecap="round" />
                            {/* Green Zone (Right: 45->0 deg) */}
                            <path d="M 156.57 43.43 A 80 80 0 0 1 180 100" fill="none" stroke={isGreen ? "#10b981" : "#d1fae5"} strokeWidth={isGreen ? "18" : "14"} strokeLinecap="round" />

                            {/* Needle Logic */}
                            <motion.g
                                initial={{ rotate: -90, originX: '100px', originY: '100px' }}
                                animate={{ rotate: needleRotation + (isRed ? -45 : isOrange ? 0 : 45) - (isRed ? -45 : isOrange ? 0 : 45) }}
                                // Actually, rotation logic: Red = -45deg from top? No, Top is 0. 
                                // SVG coords: 0 is right (3 o'clock). -90 is top (12). -180 is left (9).
                                // My arc is from 9 o'clock to 3 o'clock.
                                // Needle pivot is 100,100.
                                // Left (Red) ~ -135deg. Center (Orange) ~ -90deg. Right (Green) ~ -45deg.
                                style={{ originX: '100px', originY: '100px' }}
                            >
                                {/* We use React style for rotation to fix center, Framer for animation */}
                            </motion.g>
                            {/* Simple Needle: Line from center */}
                            <motion.line
                                x1="100" y1="100" x2="100" y2="30"
                                stroke="#1e293b" strokeWidth="6" strokeLinecap="round"
                                initial={{ rotate: -45 }}
                                animate={{ rotate: isRed ? -45 : isOrange ? 0 : 45 }}
                                style={{ originX: '100px', originY: '100px' }}
                            />
                            <circle cx="100" cy="100" r="10" fill="#1e293b" />
                        </svg>

                        <div className={`absolute -bottom-4 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase ${statusColor}`}>
                            {statusLabel}
                        </div>
                    </div>

                    {/* Text Info */}
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight leading-tight">
                            {t('dashboardTitle')}
                        </h1>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-2 text-slate-500 font-medium text-sm">
                            <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                                {report.federalState === 'General' ? t('generalProfile') : `${report.federalState} ${t('profile')}`}
                            </span>
                            <span className="hidden sm:inline text-slate-300">•</span>
                            <span>
                                {report.stats.totalProjectedPoints > 0
                                    ? t('pointsAccumulated', { points: report.stats.totalProjectedPoints })
                                    : t('setupIncomplete')}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Right: Action Button */}
                <button
                    onClick={handleRecalculate}
                    className="flex items-center gap-2 px-6 py-3 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-xl shadow-sm border border-slate-200 transition-all hover:-translate-y-0.5"
                >
                    <RefreshCw className="w-5 h-5 text-slate-400" />
                    <span>{t('recalculate')}</span>
                </button>
            </div>
        </div>
    );
}
