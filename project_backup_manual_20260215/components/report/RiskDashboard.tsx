'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import type { RiskReport } from '@/types/riskEngine';
import { RiskSeverity } from '@/types/riskEngine';
import AlertBanner from './AlertBanner';
import WarningCard from './WarningCard';
import SuccessMetric from './SuccessMetric';

interface RiskDashboardProps {
    report: RiskReport;
}

/**
 * Main Risk Dashboard container.
 *
 * Displays findings in severity order:
 * 1. RED (Alert Banners) — must be resolved before lower levels show
 * 2. ORANGE (Warning Cards) — structural risks
 * 3. GREEN (Success Metrics) — optimization opportunities
 */
export default function RiskDashboard({ report }: RiskDashboardProps) {
    const t = useTranslations('report');

    const redFindings = report.findings.filter((f) => f.severity === RiskSeverity.RED);
    const orangeFindings = report.findings.filter((f) => f.severity === RiskSeverity.ORANGE);
    const greenFindings = report.findings.filter((f) => f.severity === RiskSeverity.GREEN);

    const hasRedAlerts = redFindings.length > 0;

    return (
        <div className="space-y-8">
            {/* ── Summary Stats Bar ── */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-2 md:grid-cols-4 gap-4"
            >
                <StatCard
                    label={t('totalPoints')}
                    value={report.stats.totalProjectedPoints}
                    severity={
                        report.stats.totalProjectedPoints < report.ruleset.minTotalPoints
                            ? 'danger'
                            : 'safe'
                    }
                />
                <StatCard
                    label={t('deficits')}
                    value={`${report.stats.totalDeficits} / ${report.ruleset.maxDeficits}`}
                    severity={
                        report.stats.totalDeficits > report.ruleset.maxDeficits
                            ? 'danger'
                            : report.stats.totalDeficits >= report.ruleset.maxDeficits - 1
                                ? 'warning'
                                : 'safe'
                    }
                />
                <StatCard
                    label={t('zeroPoints')}
                    value={report.stats.totalZeroPoints}
                    severity={report.stats.totalZeroPoints > 0 ? 'danger' : 'safe'}
                />
                <StatCard
                    label={t('keystones')}
                    value={report.stats.keystoneCount}
                    severity="neutral"
                />
            </motion.div>

            {/* ── Level 1: RED — Hard Stops ── */}
            {redFindings.length > 0 && (
                <motion.section
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                >
                    <h2 className="text-lg font-bold text-red-700 mb-3 flex items-center gap-2">
                        <span className="inline-block w-3 h-3 rounded-full bg-red-500" />
                        {t('hardStops')}
                    </h2>
                    <div className="space-y-3">
                        {redFindings.map((finding, i) => (
                            <AlertBanner key={i} finding={finding} />
                        ))}
                    </div>
                </motion.section>
            )}

            {/* ── Level 2: ORANGE — Structural Risks ── */}
            {!hasRedAlerts && orangeFindings.length > 0 && (
                <motion.section
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                >
                    <h2 className="text-lg font-bold text-amber-700 mb-3 flex items-center gap-2">
                        <span className="inline-block w-3 h-3 rounded-full bg-amber-500" />
                        {t('structuralRisks')}
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {orangeFindings.map((finding, i) => (
                            <WarningCard key={i} finding={finding} />
                        ))}
                    </div>
                </motion.section>
            )}

            {/* ── Level 3: GREEN — Safe Zones ── */}
            {!hasRedAlerts && greenFindings.length > 0 && (
                <motion.section
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                >
                    <h2 className="text-lg font-bold text-emerald-700 mb-3 flex items-center gap-2">
                        <span className="inline-block w-3 h-3 rounded-full bg-emerald-500" />
                        {t('optimizations')}
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {greenFindings.map((finding, i) => (
                            <SuccessMetric key={i} finding={finding} />
                        ))}
                    </div>
                </motion.section>
            )}

            {/* ── No Findings ── */}
            {report.findings.length === 0 && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-16 text-slate-500"
                >
                    <p className="text-lg">{t('noFindings')}</p>
                </motion.div>
            )}
        </div>
    );
}

// ─── Internal Stat Card Component ───────────────────────────

function StatCard({
    label,
    value,
    severity,
}: {
    label: string;
    value: string | number;
    severity: 'danger' | 'warning' | 'safe' | 'neutral';
}) {
    const borderColor = {
        danger: 'border-red-300 bg-red-50/50',
        warning: 'border-amber-300 bg-amber-50/50',
        safe: 'border-emerald-300 bg-emerald-50/50',
        neutral: 'border-slate-200 bg-white/50',
    }[severity];

    const valueColor = {
        danger: 'text-red-700',
        warning: 'text-amber-700',
        safe: 'text-emerald-700',
        neutral: 'text-slate-800',
    }[severity];

    return (
        <div className={`rounded-xl border-2 ${borderColor} p-4 text-center`}>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                {label}
            </p>
            <p className={`text-2xl font-bold ${valueColor}`}>{value}</p>
        </div>
    );
}
