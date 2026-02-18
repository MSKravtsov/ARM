'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import type { RiskFinding } from '@/types/riskEngine';

interface SuccessMetricProps {
    finding: RiskFinding;
}

/**
 * GREEN-level Success Metric card.
 * Displays safe zones and optimization opportunities.
 */
export default function SuccessMetric({ finding }: SuccessMetricProps) {
    const t = useTranslations('report');

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3 p-4 rounded-xl border-2 border-emerald-200 bg-emerald-50/60 backdrop-blur-sm"
        >
            {/* Icon */}
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                <svg
                    className="w-4 h-4 text-emerald-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                </svg>
            </div>

            {/* Content */}
            <div className="flex-1">
                <p className="font-semibold text-emerald-800 text-sm">
                    {finding.trapType.replace(/([A-Z])/g, ' $1').trim()}
                </p>
                <p className="text-emerald-700 text-sm mt-0.5">
                    {finding.i18nKey
                        ? t(finding.i18nKey.replace('report.', ''), finding.i18nParams || {})
                        : finding.message}
                </p>
            </div>
        </motion.div>
    );
}
