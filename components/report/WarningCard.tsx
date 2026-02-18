'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import type { RiskFinding } from '@/types/riskEngine';

interface WarningCardProps {
    finding: RiskFinding;
}

/**
 * ORANGE-level Warning Card with expandable drill-down details.
 */
export default function WarningCard({ finding }: WarningCardProps) {
    const t = useTranslations('report');
    const [expanded, setExpanded] = useState(false);

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border-2 border-amber-200 bg-amber-50/60 backdrop-blur-sm overflow-hidden cursor-pointer"
            onClick={() => setExpanded(!expanded)}
        >
            <div className="flex items-start gap-3 p-4">
                {/* Icon */}
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                    <svg
                        className="w-4 h-4 text-amber-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                        />
                    </svg>
                </div>

                {/* Content */}
                <div className="flex-1">
                    <p className="font-semibold text-amber-800 text-sm">
                        {finding.trapType.replace(/([A-Z])/g, ' $1').trim()}
                    </p>
                    <p className="text-amber-700 text-sm mt-0.5">
                        {finding.i18nKey
                            ? t(finding.i18nKey.replace('report.', ''), finding.i18nParams || {})
                            : finding.message}
                    </p>
                </div>

                {/* Expand chevron */}
                <motion.svg
                    animate={{ rotate: expanded ? 180 : 0 }}
                    className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </motion.svg>
            </div>

            {/* Drill-down details */}
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-amber-200 bg-amber-50/40 px-4 py-3"
                    >
                        <p className="text-xs text-amber-600">
                            {finding.affectedSubjectIds.length > 0
                                ? `Affects ${finding.affectedSubjectIds.length} subject(s)`
                                : 'General structural finding'}
                        </p>
                        {finding.i18nParams && (
                            <div className="mt-2 text-xs text-amber-500 space-y-0.5">
                                {Object.entries(finding.i18nParams).map(([key, val]) => (
                                    <p key={key}>
                                        <span className="font-medium">{key}:</span> {val}
                                    </p>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
