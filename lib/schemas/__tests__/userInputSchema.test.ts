// ──────────────────────────────────────────────────────────────
// ARM – User Input Schema Smoke Tests (Jest)
// ──────────────────────────────────────────────────────────────

import { UserInputProfileSchema } from '../userInputSchema';
import { FederalState, SubjectType, ExamType } from '@/types/userInput';
import type { Subject } from '@/types/userInput';

// ─── Helpers ────────────────────────────────────────────────

/** Build a minimal valid subject. */
function makeSubject(
    overrides: Partial<Subject> & Pick<Subject, 'type' | 'isExamSubject' | 'examType'>
): Subject {
    return {
        id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        name: 'Mathematik',
        isMandatory: false,
        isBelegpflichtig: false,
        semesterGrades: { Q1_1: 10, Q1_2: 11, Q2_1: 9, Q2_2: 12 },
        finalExamGrade: null,
        confidence: 7,
        stressFactors: [],
        ...overrides,
    };
}

/** Shorthand LK exam subject. */
const lkExam = (name: string, examType: ExamType = ExamType.Written): Subject =>
    makeSubject({ name, type: SubjectType.LK, isExamSubject: true, examType });

/** Shorthand GK exam subject. */
const gkExam = (name: string, examType: ExamType = ExamType.Oral): Subject =>
    makeSubject({ name, type: SubjectType.GK, isExamSubject: true, examType });

/** Shorthand GK non-exam subject. */
const gkNonExam = (name: string): Subject =>
    makeSubject({ name, type: SubjectType.GK, isExamSubject: false, examType: ExamType.None });

// ─── Tests ──────────────────────────────────────────────────

describe('User Input Schema', () => {
    it('should parse a valid NRW profile (2 LK, 4 exam subjects)', () => {
        const result = UserInputProfileSchema.safeParse({
            federalState: FederalState.NRW,
            graduationYear: 2026,
            subjects: [
                lkExam('Mathematik', ExamType.Written),
                lkExam('Deutsch', ExamType.Written),
                gkExam('Englisch', ExamType.Oral),
                gkExam('Geschichte', ExamType.Oral),
                gkNonExam('Physik'),
            ],
        });
        expect(result.success).toBe(true);
    });

    it('should reject NRW profile with 3 LK subjects', () => {
        const result = UserInputProfileSchema.safeParse({
            federalState: FederalState.NRW,
            graduationYear: 2026,
            subjects: [
                lkExam('Mathematik'),
                lkExam('Deutsch'),
                lkExam('Physik'),
                gkExam('Englisch', ExamType.Oral),
                gkNonExam('Geschichte'),
            ],
        });
        expect(result.success).toBe(false);
        if (!result.success) {
            const msgs = result.error.issues.map((i) => i.message);
            expect(msgs.some((m) => m.includes('2 LK'))).toBe(true);
        }
    });

    it('should parse a valid General profile with rulesConfig', () => {
        const result = UserInputProfileSchema.safeParse({
            federalState: FederalState.General,
            graduationYear: 2026,
            rulesConfig: {
                lkWeight: 2,
                gkWeight: 1,
                deficitThreshold: 5,
                maxDeficits: 8,
                minTotalPoints: 300,
                zeroIsFatal: true,
                fatalScope: 'ALL_COURSES',
            },
            subjects: [gkNonExam('Kunst')],
        });
        expect(result.success).toBe(true);
    });

    it('should reject General profile without rulesConfig', () => {
        const result = UserInputProfileSchema.safeParse({
            federalState: FederalState.General,
            graduationYear: 2026,
            subjects: [gkNonExam('Kunst')],
        });
        expect(result.success).toBe(false);
    });

    it('should reject subject with isExamSubject=false but examType=Written', () => {
        const badSubject = makeSubject({
            name: 'Biologie',
            type: SubjectType.GK,
            isExamSubject: false,
            examType: ExamType.Written,
        });
        const result = UserInputProfileSchema.safeParse({
            federalState: FederalState.General,
            graduationYear: 2026,
            rulesConfig: {
                lkWeight: 2,
                gkWeight: 1,
                deficitThreshold: 5,
                maxDeficits: 8,
                minTotalPoints: 300,
                zeroIsFatal: false,
                fatalScope: 'NONE',
            },
            subjects: [badSubject],
        });
        expect(result.success).toBe(false);
        if (!result.success) {
            const msgs = result.error.issues.map((i) => i.message);
            expect(msgs.some((m) => m.includes('None'))).toBe(true);
        }
    });

    it('should parse a valid Bavaria profile (2 LK, 5 exam subjects)', () => {
        const result = UserInputProfileSchema.safeParse({
            federalState: FederalState.Bavaria,
            graduationYear: 2026,
            subjects: [
                lkExam('Mathematik', ExamType.Written),
                lkExam('Deutsch', ExamType.Written),
                gkExam('Englisch', ExamType.Written),
                gkExam('Geschichte', ExamType.Oral),
                gkExam('Physik', ExamType.Colloquium),
                gkNonExam('Kunst'),
            ],
        });
        expect(result.success).toBe(true);
    });
});
