'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { SubjectType, ExamType, STRESS_FACTOR_OPTIONS } from '@/types/userInput';
import type { Subject } from '@/types/userInput';
import ConfidenceSlider from '@/components/ui/ConfidenceSlider';

interface SubjectCardProps {
    subject: Subject;
    index: number;
    errors: Record<string, string>;
    onChange: (updated: Subject) => void;
    onRemove: () => void;
}

export default function SubjectCard({ subject, index, errors, onChange, onRemove }: SubjectCardProps) {
    const t = useTranslations('setup');

    const updateField = <K extends keyof Subject>(field: K, value: Subject[K]) => {
        const updated = { ...subject, [field]: value };
        // Auto-set examType to None when unchecking exam subject
        if (field === 'isExamSubject' && value === false) {
            updated.examType = ExamType.None;
            updated.finalExamGrade = null;
        }
        onChange(updated);
    };

    const updateGrade = (semester: 'Q1_1' | 'Q1_2' | 'Q2_1' | 'Q2_2', raw: string) => {
        const val = raw === '' ? null : Math.min(15, Math.max(0, parseInt(raw, 10)));
        onChange({
            ...subject,
            semesterGrades: { ...subject.semesterGrades, [semester]: isNaN(val as number) ? null : val },
        });
    };

    const toggleStressFactor = (factor: string) => {
        const current = subject.stressFactors as string[];
        const next = current.includes(factor)
            ? current.filter((f) => f !== factor)
            : [...current, factor];
        updateField('stressFactors', next as any);
    };

    const fieldError = (path: string) => errors[`subjects.${index}.${path}`];

    const semesterLabels = ['Q1.1', 'Q1.2', 'Q2.1', 'Q2.2'] as const;
    const semesterKeys = ['Q1_1', 'Q1_2', 'Q2_1', 'Q2_2'] as const;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.97 }}
            transition={{ duration: 0.3 }}
            className="bg-white/80 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg p-6 space-y-5"
        >
            {/* Header row */}
            <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    {t('subjectLabel')} {index + 1}
                </span>
                <button
                    type="button"
                    onClick={onRemove}
                    className="text-slate-400 hover:text-red-500 transition-colors p-1 rounded-lg hover:bg-red-50"
                    title={t('removeSubject')}
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>
            </div>

            {/* Row 1: Name + Type + Mandatory */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-5">
                    <label className="block text-sm font-medium text-slate-600 mb-1">{t('subjectName')}</label>
                    <input
                        type="text"
                        value={subject.name}
                        onChange={(e) => updateField('name', e.target.value)}
                        placeholder={t('subjectNamePlaceholder')}
                        className={`w-full px-3 py-2.5 rounded-lg bg-white/60 border ${fieldError('name') ? 'border-red-400' : 'border-slate-200'} focus:outline-none focus:ring-2 focus:ring-orange-500/40 text-sm transition-all`}
                    />
                    {fieldError('name') && <p className="text-xs text-red-500 mt-1">{fieldError('name')}</p>}
                </div>
                <div className="md:col-span-3">
                    <label className="block text-sm font-medium text-slate-600 mb-1">{t('subjectType')}</label>
                    <select
                        value={subject.type}
                        onChange={(e) => updateField('type', e.target.value as SubjectType)}
                        className="w-full px-3 py-2.5 rounded-lg bg-white/60 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/40 text-sm transition-all"
                    >
                        <option value={SubjectType.LK}>LK ({t('lkLabel')})</option>
                        <option value={SubjectType.GK}>GK ({t('gkLabel')})</option>
                    </select>
                </div>
                <div className="md:col-span-4 flex items-end">
                    <label className="flex items-center space-x-2 cursor-pointer group py-2.5">
                        <input
                            type="checkbox"
                            checked={subject.isMandatory}
                            onChange={(e) => updateField('isMandatory', e.target.checked)}
                            className="w-4 h-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500/40"
                        />
                        <span className="text-sm text-slate-600 group-hover:text-slate-800 transition-colors">{t('mandatory')}</span>
                    </label>
                </div>
            </div>

            {/* Row 2: Exam flags */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                <div className="md:col-span-4 flex items-end">
                    <label className="flex items-center space-x-2 cursor-pointer group py-2.5">
                        <input
                            type="checkbox"
                            checked={subject.isExamSubject}
                            onChange={(e) => updateField('isExamSubject', e.target.checked)}
                            className="w-4 h-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500/40"
                        />
                        <span className="text-sm text-slate-600 group-hover:text-slate-800 transition-colors">{t('examSubject')}</span>
                    </label>
                </div>
                <div className="md:col-span-4">
                    <label className="block text-sm font-medium text-slate-600 mb-1">{t('examType')}</label>
                    <select
                        value={subject.examType}
                        onChange={(e) => updateField('examType', e.target.value as ExamType)}
                        disabled={!subject.isExamSubject}
                        className={`w-full px-3 py-2.5 rounded-lg bg-white/60 border ${fieldError('examType') ? 'border-red-400' : 'border-slate-200'} focus:outline-none focus:ring-2 focus:ring-orange-500/40 text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                        <option value={ExamType.None}>{t('examTypeNone')}</option>
                        <option value={ExamType.Written}>{t('examTypeWritten')}</option>
                        <option value={ExamType.Oral}>{t('examTypeOral')}</option>
                        <option value={ExamType.Colloquium}>{t('examTypeColloquium')}</option>
                    </select>
                    {fieldError('examType') && <p className="text-xs text-red-500 mt-1">{fieldError('examType')}</p>}
                </div>
                {subject.isExamSubject && (
                    <div className="md:col-span-4">
                        <label className="block text-sm font-medium text-slate-600 mb-1">{t('finalExamGrade')}</label>
                        <input
                            type="number"
                            min={0}
                            max={15}
                            value={subject.finalExamGrade ?? ''}
                            onChange={(e) => updateField('finalExamGrade', e.target.value === '' ? null : Math.min(15, Math.max(0, parseInt(e.target.value, 10))))}
                            placeholder="0–15"
                            className="w-full px-3 py-2.5 rounded-lg bg-white/60 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/40 text-sm transition-all"
                        />
                    </div>
                )}
            </div>

            {/* Row 3: Semester Grades */}
            <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">{t('semesterGrades')}</label>
                <div className="grid grid-cols-4 gap-3">
                    {semesterKeys.map((key, i) => (
                        <div key={key}>
                            <label className="block text-xs text-slate-400 mb-1 text-center">{semesterLabels[i]}</label>
                            <input
                                type="number"
                                min={0}
                                max={15}
                                value={subject.semesterGrades[key] ?? ''}
                                onChange={(e) => updateGrade(key, e.target.value)}
                                placeholder="0–15"
                                className={`w-full px-2 py-2 rounded-lg bg-white/60 border ${fieldError(`semesterGrades.${key}`) ? 'border-red-400' : 'border-slate-200'} focus:outline-none focus:ring-2 focus:ring-orange-500/40 text-sm text-center transition-all`}
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* Row 4: Confidence + Stress Factors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                    <label className="block text-sm font-medium text-slate-600 mb-2">
                        {t('confidence')}: <span className="text-orange-500 font-bold">{subject.confidence}</span>/10
                    </label>
                    <ConfidenceSlider
                        value={subject.confidence}
                        onChange={(value) => updateField('confidence', value)}
                        min={1}
                        max={10}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-600 mb-2">{t('stressFactors')}</label>
                    <div className="flex flex-wrap gap-2">
                        {STRESS_FACTOR_OPTIONS.map((factor) => (
                            <button
                                key={factor}
                                type="button"
                                onClick={() => toggleStressFactor(factor)}
                                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${(subject.stressFactors as string[]).includes(factor)
                                        ? 'bg-orange-100 text-orange-700 border border-orange-300 shadow-sm'
                                        : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                                    }`}
                            >
                                {factor}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
