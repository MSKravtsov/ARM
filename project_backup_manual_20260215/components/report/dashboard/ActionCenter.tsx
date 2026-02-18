'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { XCircle, ArrowRight } from 'lucide-react';
import type { RiskFinding } from '@/types/riskEngine';
import { RiskSeverity } from '@/types/riskEngine';
import { motion } from 'framer-motion';

export default function ActionCenter({ findings }: { findings: RiskFinding[] }) {
    const t = useTranslations('report');
    const redFindings = findings.filter(f => f.severity === RiskSeverity.RED);

    if (redFindings.length === 0) return null;

    return (
        <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 space-y-6">
            <div className="flex items-center gap-3">
                <div className="w-2 h-8 bg-red-500 rounded-full" />
                <h2 className="text-xl font-bold text-slate-900">
                    Action Required: Profile Setup
                </h2>
            </div>

            <div className="space-y-0 divide-y divide-slate-100 border-t border-b border-slate-100">
                {redFindings.map((finding, idx) => (
                    <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-4 group hover:bg-slate-50/50 transition-colors px-2 rounded-lg"
                    >
                        <div className="flex items-start gap-4">
                            <XCircle className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
                            <span className="text-slate-700 font-medium">
                                {finding.message}
                            </span>
                        </div>

                        <Link
                            href="/en/setup"
                            className="flex items-center gap-2 px-4 py-2 bg-white text-slate-700 font-medium text-sm rounded-lg border border-slate-200 shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-95 whitespace-nowrap group-hover:bg-white"
                        >
                            <span>Fix Issue</span>
                            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                        </Link>
                    </motion.div>
                ))}
            </div>
        </section>
    );
}
