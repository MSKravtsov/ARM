// ──────────────────────────────────────────────────────────────
// ARM – Special 2026 MVP Indicators Unit Tests
// ──────────────────────────────────────────────────────────────

import { special2026Detector, _internals } from '../detectors/special2026Detector';
import { RiskSeverity, TrapType } from '@/types/riskEngine';
import {
    FederalState,
    SubjectType,
    ExamType,
    FatalScope,
    SubjectCategory,
    ProfileType,
} from '@/types/userInput';
import type { UserInputProfile, Subject, GeneralRulesConfig } from '@/types/userInput';
import { NRW_RULESET, BAVARIA_RULESET, buildGeneralRuleset } from '../constants';

// ─── Test Helpers ──────────────────────────────────────────

function makeSubject(overrides: Partial<Subject> = {}): Subject {
    return {
        id: overrides.id ?? `subject-${Math.random().toString(36).slice(2, 8)}`,
        name: overrides.name ?? 'Test Subject',
        type: overrides.type ?? SubjectType.GK,
        isMandatory: overrides.isMandatory ?? false,
        isBelegpflichtig: overrides.isBelegpflichtig ?? false,
        subjectCategory: overrides.subjectCategory ?? SubjectCategory.SOCIAL,
        isActive: overrides.isActive ?? true,
        isExamSubject: overrides.isExamSubject ?? false,
        examType: overrides.examType ?? ExamType.None,
        semesterGrades: overrides.semesterGrades ?? {
            Q1_1: 10, Q1_2: 10, Q2_1: 10, Q2_2: 10,
        },
        finalExamGrade: overrides.finalExamGrade ?? null,
        confidence: overrides.confidence ?? 7,
        stressFactors: overrides.stressFactors ?? [],
    };
}

function nrwProfile(subjects: Subject[], year = 2026): UserInputProfile {
    return { federalState: FederalState.NRW, graduationYear: year, subjects };
}

function bavariaProfile(subjects: Subject[], year = 2026): UserInputProfile {
    return { federalState: FederalState.Bavaria, graduationYear: year, subjects };
}

function generalProfile(subjects: Subject[]): UserInputProfile {
    return {
        federalState: FederalState.General,
        graduationYear: 2026,
        subjects,
        rulesConfig: {
            lkWeight: 2,
            gkWeight: 1,
            deficitThreshold: 5,
            maxDeficits: 7,
            minTotalPoints: 200,
            zeroIsFatal: true,
            fatalScope: FatalScope.ALL_COURSES,
            anchorThreshold: 3.0,
            customMandatorySubjects: [],
            profileType: ProfileType.SCIENTIFIC,
            minLanguages: 1,
            minSciences: 1,
            volatilityThreshold: 4.0,
        },
    };
}

/** Create a subject with many deficit grades. */
function deficitSubject(name: string, grades: { Q1_1: number | null; Q1_2: number | null; Q2_1: number | null; Q2_2: number | null }): Subject {
    return makeSubject({ name, semesterGrades: grades });
}

/** Create a seminar subject (W or P). */
function seminarSubject(
    name: string,
    type: SubjectType.SEMINAR_W | SubjectType.SEMINAR_P,
    grades: { Q1_1: number | null; Q1_2: number | null; Q2_1: number | null; Q2_2: number | null },
    overrides: Partial<Subject> = {}
): Subject {
    return makeSubject({ name, type, semesterGrades: grades, ...overrides });
}

// ═══════════════════════════════════════════════════════════════
//   Internal Helpers
// ═══════════════════════════════════════════════════════════════

describe('Special 2026 – Internal Helpers', () => {
    it('countDeficits should count grades below threshold', () => {
        const subjects = [
            deficitSubject('Math', { Q1_1: 3, Q1_2: 4, Q2_1: 10, Q2_2: 2 }),
            deficitSubject('Bio', { Q1_1: 10, Q1_2: 10, Q2_1: 10, Q2_2: 10 }),
        ];
        // Threshold 5: grades 3, 4, 2 are deficits → 3
        expect(_internals.countDeficits(subjects, 5)).toBe(3);
    });

    it('countDeficits should skip inactive subjects', () => {
        const subjects = [
            makeSubject({
                name: 'Inactive',
                isActive: false,
                semesterGrades: { Q1_1: 1, Q1_2: 1, Q2_1: 1, Q2_2: 1 },
            }),
        ];
        expect(_internals.countDeficits(subjects, 5)).toBe(0);
    });

    it('countDeficits should skip null grades', () => {
        const subjects = [
            deficitSubject('Math', { Q1_1: 3, Q1_2: null, Q2_1: null, Q2_2: null }),
        ];
        expect(_internals.countDeficits(subjects, 5)).toBe(1);
    });

    it('isStudentDisqualified should return true when deficits exceed max', () => {
        const subjects = [makeSubject()];
        expect(_internals.isStudentDisqualified(subjects, 8, 7)).toBe(true);
    });

    it('isStudentDisqualified should return false when deficits within limit', () => {
        const subjects = [makeSubject()];
        expect(_internals.isStudentDisqualified(subjects, 5, 7)).toBe(false);
    });

    it('isStudentDisqualified should return true for zero-point in mandatory subject', () => {
        const subjects = [
            makeSubject({
                isMandatory: true,
                semesterGrades: { Q1_1: 0, Q1_2: 10, Q2_1: 10, Q2_2: 10 },
            }),
        ];
        expect(_internals.isStudentDisqualified(subjects, 0, 7)).toBe(true);
    });

    it('isStudentDisqualified should return true for zero-point in belegpflichtig subject', () => {
        const subjects = [
            makeSubject({
                isBelegpflichtig: true,
                semesterGrades: { Q1_1: 10, Q1_2: 0, Q2_1: 10, Q2_2: 10 },
            }),
        ];
        expect(_internals.isStudentDisqualified(subjects, 0, 7)).toBe(true);
    });

    it('isStudentDisqualified should ignore zero-point in non-mandatory subject', () => {
        const subjects = [
            makeSubject({
                isMandatory: false,
                isBelegpflichtig: false,
                semesterGrades: { Q1_1: 0, Q1_2: 10, Q2_1: 10, Q2_2: 10 },
            }),
        ];
        expect(_internals.isStudentDisqualified(subjects, 0, 7)).toBe(false);
    });

    it('seminarMean should compute average of non-null grades', () => {
        const subject = seminarSubject('W-Sem', SubjectType.SEMINAR_W, {
            Q1_1: 10, Q1_2: 8, Q2_1: 6, Q2_2: 4,
        });
        expect(_internals.seminarMean(subject)).toBe(7);
    });

    it('seminarMean should return null for all-null grades', () => {
        const subject = seminarSubject('W-Sem', SubjectType.SEMINAR_W, {
            Q1_1: null, Q1_2: null, Q2_1: null, Q2_2: null,
        });
        expect(_internals.seminarMean(subject)).toBeNull();
    });
});

// ═══════════════════════════════════════════════════════════════
//   NRW – Bündelungsgymnasium Trap
// ═══════════════════════════════════════════════════════════════

describe('Special 2026 – NRW Bündelungsgymnasium Trap', () => {
    it('should return TrapType.Special2026', () => {
        const profile = nrwProfile([makeSubject()]);
        const result = special2026Detector.detect(profile, NRW_RULESET);
        expect(result.trapType).toBe(TrapType.Special2026);
    });

    it('should fire ORANGE for high deficits (≥6) in NRW 2026', () => {
        // 6 deficit grades across two subjects → >= threshold
        const subjects = [
            deficitSubject('Math', { Q1_1: 3, Q1_2: 4, Q2_1: 3, Q2_2: 4 }),
            deficitSubject('Bio', { Q1_1: 3, Q1_2: 4, Q2_1: 10, Q2_2: 10 }),
        ];
        const profile = nrwProfile(subjects, 2026);
        const result = special2026Detector.detect(profile, NRW_RULESET);

        const orangeFindings = result.findings.filter(
            (f) => f.severity === RiskSeverity.ORANGE
        );
        expect(orangeFindings).toHaveLength(1);
        expect(orangeFindings[0].i18nKey).toBe('report.special2026.nrw.highDeficits');
        expect(orangeFindings[0].message).toContain('Bündelungsgymnasium');
    });

    it('should fire RED for disqualified student in NRW 2026', () => {
        // > 7 deficits → disqualified
        const subjects = [
            deficitSubject('Math', { Q1_1: 1, Q1_2: 2, Q2_1: 1, Q2_2: 2 }),
            deficitSubject('Bio', { Q1_1: 1, Q1_2: 2, Q2_1: 1, Q2_2: 2 }),
        ];
        const profile = nrwProfile(subjects, 2026);
        const result = special2026Detector.detect(profile, NRW_RULESET);

        const redFindings = result.findings.filter(
            (f) => f.severity === RiskSeverity.RED
        );
        expect(redFindings).toHaveLength(1);
        expect(redFindings[0].i18nKey).toBe('report.special2026.nrw.criticalTransition');
        expect(redFindings[0].message).toContain('G8-Repeater');
    });

    it('should fire RED (not ORANGE) when disqualified with ≥6 deficits', () => {
        // Disqualified takes precedence over high-deficit warning
        const subjects = [
            deficitSubject('Math', { Q1_1: 1, Q1_2: 2, Q2_1: 1, Q2_2: 2 }),
            deficitSubject('Bio', { Q1_1: 1, Q1_2: 2, Q2_1: 1, Q2_2: 2 }),
        ];
        const profile = nrwProfile(subjects, 2026);
        const result = special2026Detector.detect(profile, NRW_RULESET);

        // Should only have RED, not both RED + ORANGE
        expect(result.findings).toHaveLength(1);
        expect(result.findings[0].severity).toBe(RiskSeverity.RED);
    });

    it('should NOT fire for NRW with non-2026 year', () => {
        const subjects = [
            deficitSubject('Math', { Q1_1: 1, Q1_2: 1, Q2_1: 1, Q2_2: 1 }),
            deficitSubject('Bio', { Q1_1: 1, Q1_2: 1, Q2_1: 1, Q2_2: 1 }),
        ];
        const profile = nrwProfile(subjects, 2025);
        const result = special2026Detector.detect(profile, NRW_RULESET);
        expect(result.findings).toHaveLength(0);
    });

    it('should NOT fire for NRW 2027', () => {
        const subjects = [
            deficitSubject('Math', { Q1_1: 1, Q1_2: 1, Q2_1: 1, Q2_2: 1 }),
        ];
        const profile = nrwProfile(subjects, 2027);
        const result = special2026Detector.detect(profile, NRW_RULESET);
        expect(result.findings).toHaveLength(0);
    });

    it('should NOT fire for NRW 2026 with few deficits (< 6)', () => {
        // 4 deficits → below threshold
        const subjects = [
            deficitSubject('Math', { Q1_1: 3, Q1_2: 4, Q2_1: 3, Q2_2: 4 }),
            makeSubject({ name: 'Bio', semesterGrades: { Q1_1: 10, Q1_2: 10, Q2_1: 10, Q2_2: 10 } }),
        ];
        const profile = nrwProfile(subjects, 2026);
        const result = special2026Detector.detect(profile, NRW_RULESET);
        expect(result.findings).toHaveLength(0);
    });

    it('should fire RED for zero-point in mandatory subject in NRW 2026', () => {
        const subjects = [
            makeSubject({
                name: 'Deutsch',
                isMandatory: true,
                semesterGrades: { Q1_1: 0, Q1_2: 10, Q2_1: 10, Q2_2: 10 },
            }),
        ];
        const profile = nrwProfile(subjects, 2026);
        const result = special2026Detector.detect(profile, NRW_RULESET);

        expect(result.findings).toHaveLength(1);
        expect(result.findings[0].severity).toBe(RiskSeverity.RED);
    });
});

// ═══════════════════════════════════════════════════════════════
//   Bavaria – Seminar Anchor
// ═══════════════════════════════════════════════════════════════

describe('Special 2026 – Bavaria Seminar Anchor', () => {
    it('should fire RED for seminar with mean < 5', () => {
        const subjects = [
            seminarSubject('W-Seminar', SubjectType.SEMINAR_W, {
                Q1_1: 3, Q1_2: 4, Q2_1: 3, Q2_2: 2,
            }),
        ];
        const profile = bavariaProfile(subjects);
        const result = special2026Detector.detect(profile, BAVARIA_RULESET);

        const redFindings = result.findings.filter(
            (f) => f.severity === RiskSeverity.RED
        );
        expect(redFindings).toHaveLength(1);
        expect(redFindings[0].i18nKey).toBe('report.special2026.bavaria.seminarHardAnchor');
        expect(redFindings[0].message).toContain('structurally dangerous');
    });

    it('should fire ORANGE for seminar with mean between 5 and 8', () => {
        const subjects = [
            seminarSubject('P-Seminar', SubjectType.SEMINAR_P, {
                Q1_1: 7, Q1_2: 7, Q2_1: 7, Q2_2: 7,
            }),
        ];
        const profile = bavariaProfile(subjects);
        const result = special2026Detector.detect(profile, BAVARIA_RULESET);

        const orangeFindings = result.findings.filter(
            (f) => f.severity === RiskSeverity.ORANGE
        );
        expect(orangeFindings).toHaveLength(1);
        expect(orangeFindings[0].i18nKey).toBe('report.special2026.bavaria.seminarOptimization');
        expect(orangeFindings[0].message).toContain('high-yield');
    });

    it('should NOT fire for seminar with mean ≥ 9', () => {
        const subjects = [
            seminarSubject('W-Seminar', SubjectType.SEMINAR_W, {
                Q1_1: 10, Q1_2: 9, Q2_1: 10, Q2_2: 9,
            }),
        ];
        const profile = bavariaProfile(subjects);
        const result = special2026Detector.detect(profile, BAVARIA_RULESET);
        expect(result.findings).toHaveLength(0);
    });

    it('should fire RED (not ORANGE) for mean < 5 (deficit takes priority)', () => {
        const subjects = [
            seminarSubject('W-Seminar', SubjectType.SEMINAR_W, {
                Q1_1: 2, Q1_2: 3, Q2_1: 2, Q2_2: 3,
            }),
        ];
        const profile = bavariaProfile(subjects);
        const result = special2026Detector.detect(profile, BAVARIA_RULESET);

        // Only RED, no ORANGE for the same seminar
        expect(result.findings).toHaveLength(1);
        expect(result.findings[0].severity).toBe(RiskSeverity.RED);
    });

    it('should handle both W-Seminar and P-Seminar independently', () => {
        const subjects = [
            seminarSubject('W-Seminar', SubjectType.SEMINAR_W, {
                Q1_1: 3, Q1_2: 3, Q2_1: 3, Q2_2: 3,
            }), // mean 3 → RED
            seminarSubject('P-Seminar', SubjectType.SEMINAR_P, {
                Q1_1: 7, Q1_2: 7, Q2_1: 7, Q2_2: 7,
            }), // mean 7 → ORANGE
        ];
        const profile = bavariaProfile(subjects);
        const result = special2026Detector.detect(profile, BAVARIA_RULESET);

        expect(result.findings).toHaveLength(2);
        expect(result.findings.some((f) => f.severity === RiskSeverity.RED)).toBe(true);
        expect(result.findings.some((f) => f.severity === RiskSeverity.ORANGE)).toBe(true);
    });

    it('should NOT fire for regular (non-seminar) subjects', () => {
        const subjects = [
            makeSubject({
                name: 'Mathe',
                type: SubjectType.GK,
                semesterGrades: { Q1_1: 3, Q1_2: 3, Q2_1: 3, Q2_2: 3 },
            }),
        ];
        const profile = bavariaProfile(subjects);
        const result = special2026Detector.detect(profile, BAVARIA_RULESET);
        expect(result.findings).toHaveLength(0);
    });

    it('should skip seminars with no grades', () => {
        const subjects = [
            seminarSubject('W-Seminar', SubjectType.SEMINAR_W, {
                Q1_1: null, Q1_2: null, Q2_1: null, Q2_2: null,
            }),
        ];
        const profile = bavariaProfile(subjects);
        const result = special2026Detector.detect(profile, BAVARIA_RULESET);
        expect(result.findings).toHaveLength(0);
    });

    it('should fire for Bavaria regardless of graduation year', () => {
        const subjects = [
            seminarSubject('W-Seminar', SubjectType.SEMINAR_W, {
                Q1_1: 3, Q1_2: 3, Q2_1: 3, Q2_2: 3,
            }),
        ];
        // Year 2028 — Bavaria seminar rules still apply
        const profile = bavariaProfile(subjects, 2028);
        const result = special2026Detector.detect(profile, BAVARIA_RULESET);

        expect(result.findings).toHaveLength(1);
        expect(result.findings[0].severity).toBe(RiskSeverity.RED);
    });

    it('should skip inactive seminar subjects', () => {
        const subjects = [
            seminarSubject('W-Seminar', SubjectType.SEMINAR_W, {
                Q1_1: 2, Q1_2: 2, Q2_1: 2, Q2_2: 2,
            }, { isActive: false }),
        ];
        const profile = bavariaProfile(subjects);
        const result = special2026Detector.detect(profile, BAVARIA_RULESET);
        expect(result.findings).toHaveLength(0);
    });

    it('should include subjectId in affectedSubjectIds', () => {
        const subjects = [
            seminarSubject('W-Seminar', SubjectType.SEMINAR_W, {
                Q1_1: 3, Q1_2: 3, Q2_1: 3, Q2_2: 3,
            }, { id: 'w-sem-1' }),
        ];
        const profile = bavariaProfile(subjects);
        const result = special2026Detector.detect(profile, BAVARIA_RULESET);

        expect(result.findings[0].affectedSubjectIds).toContain('w-sem-1');
    });
});

// ═══════════════════════════════════════════════════════════════
//   General Mode – N/A
// ═══════════════════════════════════════════════════════════════

describe('Special 2026 – General Mode', () => {
    it('should return empty findings for General mode', () => {
        const subjects = [
            makeSubject({
                semesterGrades: { Q1_1: 1, Q1_2: 1, Q2_1: 1, Q2_2: 1 },
            }),
        ];
        const profile = generalProfile(subjects);
        const ruleset = buildGeneralRuleset(profile.rulesConfig!);
        const result = special2026Detector.detect(profile, ruleset);

        expect(result.findings).toHaveLength(0);
        expect(result.trapType).toBe(TrapType.Special2026);
    });
});

// ═══════════════════════════════════════════════════════════════
//   Edge Cases / Integration
// ═══════════════════════════════════════════════════════════════

describe('Special 2026 – Edge Cases', () => {
    it('should handle empty subjects array', () => {
        const profile = nrwProfile([], 2026);
        const result = special2026Detector.detect(profile, NRW_RULESET);
        expect(result.findings).toHaveLength(0);
    });

    it('should handle NRW 2026 with exactly 6 deficits', () => {
        // Exactly at threshold → fires
        const subjects = [
            deficitSubject('Math', { Q1_1: 3, Q1_2: 4, Q2_1: 3, Q2_2: 10 }),
            deficitSubject('Bio', { Q1_1: 3, Q1_2: 4, Q2_1: 3, Q2_2: 10 }),
        ];
        const profile = nrwProfile(subjects, 2026);
        const result = special2026Detector.detect(profile, NRW_RULESET);

        expect(result.findings).toHaveLength(1);
        expect(result.findings[0].severity).toBe(RiskSeverity.ORANGE);
    });

    it('should handle NRW 2026 with exactly 5 deficits (below threshold)', () => {
        const subjects = [
            deficitSubject('Math', { Q1_1: 3, Q1_2: 4, Q2_1: 3, Q2_2: 10 }),
            deficitSubject('Bio', { Q1_1: 3, Q1_2: 4, Q2_1: 10, Q2_2: 10 }),
        ];
        const profile = nrwProfile(subjects, 2026);
        const result = special2026Detector.detect(profile, NRW_RULESET);
        expect(result.findings).toHaveLength(0);
    });

    it('Bayern with mixed seminar + regular subjects', () => {
        const subjects = [
            seminarSubject('W-Sem', SubjectType.SEMINAR_W, { Q1_1: 6, Q1_2: 7, Q2_1: 6, Q2_2: 7 }),
            makeSubject({ name: 'Mathe', type: SubjectType.LK, semesterGrades: { Q1_1: 3, Q1_2: 3, Q2_1: 3, Q2_2: 3 } }),
            makeSubject({ name: 'Bio', type: SubjectType.GK, semesterGrades: { Q1_1: 12, Q1_2: 12, Q2_1: 12, Q2_2: 12 } }),
        ];
        const profile = bavariaProfile(subjects);
        const result = special2026Detector.detect(profile, BAVARIA_RULESET);

        // Only the seminar should produce a finding
        expect(result.findings).toHaveLength(1);
        expect(result.findings[0].message).toContain('W-Sem');
    });
});
