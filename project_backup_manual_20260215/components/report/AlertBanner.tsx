'use client';

import { motion } from 'framer-motion';
import type { RiskFinding } from '@/types/riskEngine';

interface AlertBannerProps {
    finding: RiskFinding;
}

/**
 * RED-level Alert Banner.
 * Displays a large, prominent alert for legal disqualifications / hard stops.
 */
export default function AlertBanner({ finding }: AlertBannerProps) {
    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-start gap-4 p-5 rounded-xl border-2 border-red-300 bg-red-50/80 backdrop-blur-sm"
        >
            {/* Icon */}
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <svg
                    className="w-5 h-5 text-red-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                    />
                </svg>
            </div>

            {/* Content */}
            <div className="flex-1">
                <p className="font-semibold text-red-800 text-sm uppercase tracking-wide mb-1">
                    {finding.trapType.replace(/([A-Z])/g, ' $1').trim()}
                </p>
                <p className="text-red-700 text-base">{finding.message}</p>
                {finding.affectedSubjectIds.length > 0 && (
                    <p className="text-red-500 text-xs mt-2">
                        Affected subjects: {finding.affectedSubjectIds.length}
                    </p>
                )}
            </div>
        </motion.div>
    );
}
