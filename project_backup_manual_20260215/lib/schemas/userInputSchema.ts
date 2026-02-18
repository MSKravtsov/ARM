// ──────────────────────────────────────────────────────────────
// ARM – User Input Zod Validation Schema
// ──────────────────────────────────────────────────────────────

import { z } from 'zod';
import {
    FederalState,
    SubjectType,
    ExamType,
    FatalScope,
    SubjectCategory,
    ProfileType,
    STRESS_FACTOR_OPTIONS,
} from '@/types/userInput';

// ─── Reusable Primitives ────────────────────────────────────

/** Grade value: integer 0-15, or null. */
const gradeValue = z
    .number()
    .int()
    .min(0, 'Grade must be at least 0')
    .max(15, 'Grade must be at most 15')
    .nullable();

// ─── Semester Grades ────────────────────────────────────────

export const SemesterGradesSchema = z.object({
    Q1_1: gradeValue,
    Q1_2: gradeValue,
    Q2_1: gradeValue,
    Q2_2: gradeValue,
});

// ─── Subject Schema ─────────────────────────────────────────

export const SubjectSchema = z
    .object({
        id: z.string().uuid(),
        name: z.string().min(1, 'Subject name is required'),
        type: z.nativeEnum(SubjectType),
        isMandatory: z.boolean(),
        isBelegpflichtig: z.boolean().default(false),

        subjectCategory: z.nativeEnum(SubjectCategory).default(SubjectCategory.SOCIAL),
        isActive: z.boolean().default(true),

        isExamSubject: z.boolean(),
        examType: z.nativeEnum(ExamType),

        semesterGrades: SemesterGradesSchema,
        finalExamGrade: gradeValue,

        confidence: z
            .number()
            .int()
            .min(1, 'Confidence must be at least 1')
            .max(10, 'Confidence must be at most 10'),
        stressFactors: z.array(z.enum(STRESS_FACTOR_OPTIONS)),
    })
    .superRefine((subject, ctx) => {
        // ── Cross-field: examType must be None when not an exam subject ──
        if (!subject.isExamSubject && subject.examType !== ExamType.None) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['examType'],
                message: `examType must be "${ExamType.None}" when isExamSubject is false`,
            });
        }

        // ── Cross-field: exam subjects should have a valid examType ──
        if (subject.isExamSubject && subject.examType === ExamType.None) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['examType'],
                message:
                    'Exam subjects must have an examType of Written, Oral, or Colloquium',
            });
        }
    });

// ─── General Rules Config ───────────────────────────────────

export const GeneralRulesConfigSchema = z.object({
    lkWeight: z.number().positive('LK weight must be positive'),
    gkWeight: z.number().positive('GK weight must be positive'),
    deficitThreshold: z
        .number()
        .int()
        .min(0, 'Deficit threshold must be non-negative'),
    maxDeficits: z
        .number()
        .int()
        .min(0, 'Max deficits must be non-negative'),
    minTotalPoints: z
        .number()
        .int()
        .min(0, 'Min total points must be non-negative'),
    zeroIsFatal: z.boolean().default(true),
    fatalScope: z.nativeEnum(FatalScope).default(FatalScope.ALL_COURSES),
    anchorThreshold: z.number().min(0).default(3.0),
    customMandatorySubjects: z.array(z.string()).default([]),
    profileType: z.nativeEnum(ProfileType).default(ProfileType.SCIENTIFIC),
    minLanguages: z.number().int().min(0).default(1),
    minSciences: z.number().int().min(0).default(1),
    volatilityThreshold: z.number().min(0).default(4.0),
});

// ─── Per-State Profile Schemas ──────────────────────────────

const baseFields = {
    graduationYear: z.number().int().min(2024).max(2030),
    subjects: z.array(SubjectSchema).min(1, 'At least one subject is required'),
};

export const NRWProfileSchema = z
    .object({
        federalState: z.literal(FederalState.NRW),
        rulesConfig: z.undefined(),
        ...baseFields,
    })
    .superRefine((profile, ctx) => {
        const lkCount = profile.subjects.filter(
            (s) => s.type === SubjectType.LK
        ).length;
        const examCount = profile.subjects.filter((s) => s.isExamSubject).length;

        if (lkCount !== 2) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['subjects'],
                message: `NRW requires exactly 2 LK subjects, found ${lkCount}`,
            });
        }
        if (examCount !== 4) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['subjects'],
                message: `NRW requires exactly 4 exam subjects, found ${examCount}`,
            });
        }
    });

export const BavariaProfileSchema = z
    .object({
        federalState: z.literal(FederalState.Bavaria),
        rulesConfig: z.undefined(),
        ...baseFields,
    })
    .superRefine((profile, ctx) => {
        const lkCount = profile.subjects.filter(
            (s) => s.type === SubjectType.LK
        ).length;
        const examCount = profile.subjects.filter((s) => s.isExamSubject).length;

        if (lkCount !== 2) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['subjects'],
                message: `Bavaria requires exactly 2 LK subjects, found ${lkCount}`,
            });
        }
        if (examCount !== 5) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['subjects'],
                message: `Bavaria requires exactly 5 exam subjects, found ${examCount}`,
            });
        }
    });

export const GeneralProfileSchema = z
    .object({
        federalState: z.literal(FederalState.General),
        rulesConfig: GeneralRulesConfigSchema,
        ...baseFields,
    })
    .superRefine((profile, ctx) => {
        // General mode: rulesConfig is enforced by the schema shape itself.
        // No LK / exam count limits.
        // Additional integrity: at least validate rulesConfig is populated
        // (already guaranteed by GeneralRulesConfigSchema being required).

        // Future-proof: add custom General-mode rules here.
        void profile;
        void ctx;
    });

// ─── Top-Level Discriminated Union ──────────────────────────

/**
 * The root validation schema for User Input.
 *
 * Uses `z.discriminatedUnion` on `federalState` for optimal
 * error messages — Zod will only validate the matching branch.
 */
export const UserInputProfileSchema = z.discriminatedUnion('federalState', [
    NRWProfileSchema,
    BavariaProfileSchema,
    GeneralProfileSchema,
]);

// ─── Inferred Types (optional convenience re-exports) ───────

export type UserInputProfileParsed = z.infer<typeof UserInputProfileSchema>;
export type SubjectParsed = z.infer<typeof SubjectSchema>;
