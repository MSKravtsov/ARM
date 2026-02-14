'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import SubjectCard from '@/components/setup/SubjectCard';
import { UserInputProfileSchema } from '@/lib/schemas/userInputSchema';
import {
    FederalState,
    SubjectType,
    SubjectCategory,
    ExamType,
    FatalScope,
    ProfileType,
} from '@/types/userInput';
import type { Subject, GeneralRulesConfig } from '@/types/userInput';

// Simple UUID generator (no external dependency needed)
function generateId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

function createBlankSubject(): Subject {
    return {
        id: generateId(),
        name: '',
        type: SubjectType.GK,
        isMandatory: false,
        isBelegpflichtig: false,
        subjectCategory: SubjectCategory.SOCIAL,
        isActive: true,
        isExamSubject: false,
        examType: ExamType.None,
        semesterGrades: { Q1_1: null, Q1_2: null, Q2_1: null, Q2_2: null },
        finalExamGrade: null,
        confidence: 5,
        stressFactors: [],
    };
}

const DEFAULT_RULES_CONFIG: GeneralRulesConfig = {
    lkWeight: 2,
    gkWeight: 1,
    deficitThreshold: 5,
    maxDeficits: 8,
    minTotalPoints: 300,
    zeroIsFatal: true,
    fatalScope: FatalScope.MANDATORY_ONLY,
    anchorThreshold: 3.0,
    customMandatorySubjects: [],
    profileType: ProfileType.SCIENTIFIC,
    minLanguages: 1,
    minSciences: 1,
    volatilityThreshold: 4.0,
};

interface SetupFormProps {
    federalState: string;
    locale: string;
}

export default function SetupForm({ federalState, locale }: SetupFormProps) {
    const t = useTranslations('setup');
    const tConfig = useTranslations('configEngine');
    const router = useRouter();

    const state = (Object.values(FederalState).includes(federalState as FederalState)
        ? federalState
        : FederalState.NRW) as FederalState;

    const isGeneral = state === FederalState.General;

    const [subjects, setSubjects] = useState<Subject[]>([createBlankSubject()]);
    const [rulesConfig, setRulesConfig] = useState<GeneralRulesConfig>(DEFAULT_RULES_CONFIG);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [globalErrors, setGlobalErrors] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    const addSubject = () => {
        setSubjects((prev) => [...prev, createBlankSubject()]);
    };

    const removeSubject = (index: number) => {
        setSubjects((prev) => prev.filter((_, i) => i !== index));
    };

    const updateSubject = useCallback((index: number, updated: Subject) => {
        setSubjects((prev) => prev.map((s, i) => (i === index ? updated : s)));
    }, []);

    const updateRule = <K extends keyof GeneralRulesConfig>(field: K, value: string) => {
        const num = parseFloat(value);
        setRulesConfig((prev) => ({ ...prev, [field]: isNaN(num) ? 0 : num }));
    };

    const handleSubmit = () => {
        setIsSubmitting(true);
        setErrors({});
        setGlobalErrors([]);

        const profile: any = {
            federalState: state,
            graduationYear: 2026 as const,
            subjects,
            ...(isGeneral ? { rulesConfig } : {}),
        };

        const result = UserInputProfileSchema.safeParse(profile);

        if (!result.success) {
            const fieldErrors: Record<string, string> = {};
            const globalErrs: string[] = [];

            result.error.issues.forEach((issue) => {
                const path = issue.path.join('.');
                if (path.startsWith('subjects.')) {
                    fieldErrors[path] = issue.message;
                } else {
                    globalErrs.push(issue.message);
                }
            });

            setErrors(fieldErrors);
            setGlobalErrors(globalErrs);
            setIsSubmitting(false);
            return;
        }

        // Success — persist and navigate to report
        const validated = result.data;
        try {
            localStorage.setItem('arm_profile', JSON.stringify(validated));
        } catch (e) {
            console.error('Failed to save profile:', e);
        }
        setShowSuccess(true);
        setIsSubmitting(false);
        console.log('✅ Validated profile:', validated);

        // Brief delay so user sees the success banner, then navigate
        setTimeout(() => {
            router.push(`/${locale}/report`);
        }, 800);
    };

    // State-specific hints
    const stateHints: Record<FederalState, string> = {
        [FederalState.NRW]: t('hintNRW'),
        [FederalState.Bavaria]: t('hintBavaria'),
        [FederalState.General]: t('hintGeneral'),
    };

    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
            {/* Page header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
            >
                <button
                    onClick={() => router.push(`/${locale}`)}
                    className="text-sm text-slate-500 hover:text-orange-500 transition-colors flex items-center space-x-1 mb-4"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    <span>{t('backToHome')}</span>
                </button>

                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800">{t('title')}</h1>
                        <p className="text-slate-500 mt-1">{t('subtitle')}</p>
                    </div>
                    <div className="flex items-center space-x-3">
                        <span className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider
                            ${state === FederalState.NRW ? 'bg-blue-100 text-blue-700' :
                                state === FederalState.Bavaria ? 'bg-sky-100 text-sky-700' :
                                    'bg-purple-100 text-purple-700'}`}
                        >
                            {state}
                        </span>
                        <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
                            2026
                            <span className="ml-1.5 w-2 h-2 rounded-full bg-green-500"></span>
                        </span>
                    </div>
                </div>

                {/* State-specific hint */}
                <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-700">
                    <span className="font-semibold">ℹ️</span> {stateHints[state]}
                </div>
            </motion.div>

            {/* General mode: Rules Config */}
            <AnimatePresence>
                {isGeneral && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-white/80 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg p-6 space-y-4 overflow-hidden"
                    >
                        <h2 className="text-lg font-semibold text-slate-800 flex items-center space-x-2">
                            <svg className="w-5 h-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span>{t('rulesConfigTitle')}</span>
                        </h2>
                        <p className="text-sm text-slate-500">{t('rulesConfigDesc')}</p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {([
                                { key: 'lkWeight', label: t('lkWeight'), step: '0.1' },
                                { key: 'gkWeight', label: t('gkWeight'), step: '0.1' },
                                { key: 'deficitThreshold', label: t('deficitThreshold'), step: '1' },
                                { key: 'maxDeficits', label: t('maxDeficits'), step: '1' },
                                { key: 'minTotalPoints', label: t('minTotalPoints'), step: '1' },
                            ] as const).map(({ key, label, step }) => (
                                <div key={key}>
                                    <label className="block text-sm font-medium text-slate-600 mb-1">{label}</label>
                                    <input
                                        type="number"
                                        step={step}
                                        value={rulesConfig[key]}
                                        onChange={(e) => updateRule(key, e.target.value)}
                                        className="w-full px-3 py-2.5 rounded-lg bg-white/60 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/40 text-sm transition-all"
                                    />
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Subject List */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-slate-800">{t('subjectsTitle')}</h2>
                    <span className="text-xs text-slate-400">
                        {subjects.length} {subjects.length === 1 ? t('subjectSingular') : t('subjectPlural')}
                    </span>
                </div>

                <AnimatePresence mode="popLayout">
                    {subjects.map((subject, index) => (
                        <SubjectCard
                            key={subject.id}
                            subject={subject}
                            index={index}
                            errors={errors}
                            onChange={(updated) => updateSubject(index, updated)}
                            onRemove={() => removeSubject(index)}
                        />
                    ))}
                </AnimatePresence>

                <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    type="button"
                    onClick={addSubject}
                    className="w-full py-4 rounded-2xl border-2 border-dashed border-slate-300 text-slate-500 hover:border-orange-400 hover:text-orange-500 transition-all flex items-center justify-center space-x-2 bg-white/40"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span className="font-medium">{t('addSubject')}</span>
                </motion.button>
            </div>

            {/* Global Errors */}
            <AnimatePresence>
                {globalErrors.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-1"
                    >
                        <h3 className="text-sm font-semibold text-red-700">{t('validationErrors')}</h3>
                        {globalErrors.map((err, i) => (
                            <p key={i} className="text-sm text-red-600 flex items-start space-x-2">
                                <span className="text-red-400 mt-0.5">•</span>
                                <span>{err}</span>
                            </p>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Success Banner */}
            <AnimatePresence>
                {showSuccess && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="bg-green-50 border border-green-200 rounded-xl p-4"
                    >
                        <p className="text-sm font-semibold text-green-700">✅ {t('validationSuccess')}</p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Submit */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="flex justify-end space-x-3 pb-12"
            >
                <Button
                    variant="outline"
                    onClick={() => router.push(`/${locale}`)}
                >
                    {t('cancel')}
                </Button>
                <Button
                    size="lg"
                    isLoading={isSubmitting}
                    onClick={handleSubmit}
                    className="bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/30 transition-transform hover:scale-[1.02] px-8"
                >
                    {t('calculateRisk')}
                </Button>
            </motion.div>
        </div>
    );
}
