'use client';

import { motion } from 'framer-motion';

interface KeystoneIndicatorProps {
    subjectName: string;
    /** Optional tooltip explaining why this subject is a keystone. */
    tooltip?: string;
}

/**
 * "Keystone" indicator — Lock icon for subjects that are legally
 * required and cannot be dropped without breaking qualification.
 */
export default function KeystoneIndicator({ subjectName, tooltip }: KeystoneIndicatorProps) {
    return (
        <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-medium text-slate-700"
            title={tooltip ?? `${subjectName} is a keystone subject (Einbringungspflicht)`}
        >
            {/* Lock icon */}
            <svg
                className="w-3.5 h-3.5 text-slate-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                />
            </svg>
            {subjectName}
        </motion.span>
    );
}
