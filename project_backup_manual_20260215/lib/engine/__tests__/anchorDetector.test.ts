// ──────────────────────────────────────────────────────────────
// ARM – Anchor / Einbringungspflicht Detector Unit Tests
// ──────────────────────────────────────────────────────────────

import { anchorDetector, _internals } from '../detectors/anchorDetector';
import { RiskSeverity, TrapType } from '@/types/riskEngine';
import { FederalState, SubjectType, ExamType, FatalScope, SubjectCategory, ProfileType } from '@/types/userInput';
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

function nrwProfile(subjects: Subject[]): UserInputProfile {
    return { federalState: FederalState.NRW, graduationYear: 2026, subjects };
}

function bavariaProfile(subjects: Subject[]): UserInputProfile {
    return { federalState: FederalState.Bavaria, graduationYear: 2026, subjects };
}

function generalProfile(
    subjects: Subject[],
    configOverrides: Partial<GeneralRulesConfig> = {}
): UserInputProfile {
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
            ...configOverrides,
        },
    };
}

function getRuleset(profile: UserInputProfile) {
    switch (profile.federalState) {
        case FederalState.NRW: return NRW_RULESET;
        case FederalState.Bavaria: return BAVARIA_RULESET;
        case FederalState.General: return buildGeneralRuleset(profile.rulesConfig);
    }
}

// ═══════════════════════════════════════════════════════════
// Statutory Identification
// ═══════════════════════════════════════════════════════════

describe('Anchor Detector — Statutory Identification', () => {

    describe('NRW: Math, German, 1 Language, 1 Science', () => {
        it('should identify Mathematik as statutory', () => {
            const subjects = [makeSubject({ id: 'math', name: 'Mathematik' })];
            const ids = _internals.identifyStatutoryCourses(subjects, nrwProfile(subjects));
            expect(ids.has('math')).toBe(true);
        });

        it('should identify "Mathe" as statutory (variation)', () => {
            const subjects = [makeSubject({ id: 'math', name: 'Mathe LK' })];
            const ids = _internals.identifyStatutoryCourses(subjects, nrwProfile(subjects));
            expect(ids.has('math')).toBe(true);
        });

        it('should identify Deutsch as statutory', () => {
            const subjects = [makeSubject({ id: 'de', name: 'Deutsch' })];
            const ids = _internals.identifyStatutoryCourses(subjects, nrwProfile(subjects));
            expect(ids.has('de')).toBe(true);
        });

        it('should identify first foreign language as statutory', () => {
            const subjects = [
                makeSubject({ id: 'en', name: 'Englisch' }),
                makeSubject({ id: 'fr', name: 'Französisch' }),
            ];
            const ids = _internals.identifyStatutoryCourses(subjects, nrwProfile(subjects));
            expect(ids.has('en')).toBe(true);
            // Only the first match is taken
            expect(ids.has('fr')).toBe(false);
        });

        it('should identify first natural science as statutory', () => {
            const subjects = [
                makeSubject({ id: 'phys', name: 'Physik' }),
                makeSubject({ id: 'chem', name: 'Chemie' }),
            ];
            const ids = _internals.identifyStatutoryCourses(subjects, nrwProfile(subjects));
            expect(ids.has('phys')).toBe(true);
            expect(ids.has('chem')).toBe(false);
        });

        it('should identify all 4 anchor types in a full subject list', () => {
            const subjects = [
                makeSubject({ id: 'math', name: 'Mathematik' }),
                makeSubject({ id: 'de', name: 'Deutsch' }),
                makeSubject({ id: 'en', name: 'Englisch' }),
                makeSubject({ id: 'bio', name: 'Biologie' }),
                makeSubject({ id: 'kunst', name: 'Kunst' }),
                makeSubject({ id: 'sport', name: 'Sport' }),
            ];
            const ids = _internals.identifyStatutoryCourses(subjects, nrwProfile(subjects));
            expect(ids.size).toBe(4);
            expect(ids.has('math')).toBe(true);
            expect(ids.has('de')).toBe(true);
            expect(ids.has('en')).toBe(true);
            expect(ids.has('bio')).toBe(true);
            expect(ids.has('kunst')).toBe(false);
        });

        it('should NOT match unrelated subjects', () => {
            const subjects = [
                makeSubject({ id: 'kunst', name: 'Kunst' }),
                makeSubject({ id: 'sport', name: 'Sport' }),
                makeSubject({ id: 'reli', name: 'Religion' }),
            ];
            const ids = _internals.identifyStatutoryCourses(subjects, nrwProfile(subjects));
            expect(ids.size).toBe(0);
        });
    });

    describe('Bavaria: Math, German, all exam subjects', () => {
        it('should identify Math + German + exam subjects as statutory', () => {
            const subjects = [
                makeSubject({ id: 'math', name: 'Mathematik' }),
                makeSubject({ id: 'de', name: 'Deutsch' }),
                makeSubject({
                    id: 'geo', name: 'Geographie',
                    isExamSubject: true, examType: ExamType.Oral,
                }),
                makeSubject({ id: 'kunst', name: 'Kunst' }),
            ];
            const ids = _internals.identifyStatutoryCourses(subjects, bavariaProfile(subjects));
            expect(ids.has('math')).toBe(true);
            expect(ids.has('de')).toBe(true);
            expect(ids.has('geo')).toBe(true);
            expect(ids.has('kunst')).toBe(false);
        });
    });

    describe('General: User-defined customMandatorySubjects', () => {
        it('should match subjects by case-insensitive substring', () => {
            const subjects = [
                makeSubject({ id: 'math', name: 'Advanced Mathematics' }),
                makeSubject({ id: 'art', name: 'Art History' }),
            ];
            const profile = generalProfile(subjects, {
                customMandatorySubjects: ['mathematics'],
            });
            const ids = _internals.identifyStatutoryCourses(subjects, profile);
            expect(ids.has('math')).toBe(true);
            expect(ids.has('art')).toBe(false);
        });

        it('should handle empty customMandatorySubjects', () => {
            const subjects = [makeSubject({ id: 'x', name: 'Anything' })];
            const profile = generalProfile(subjects, {
                customMandatorySubjects: [],
            });
            const ids = _internals.identifyStatutoryCourses(subjects, profile);
            expect(ids.size).toBe(0);
        });
    });
});

// ═══════════════════════════════════════════════════════════
// Bucket Analysis
// ═══════════════════════════════════════════════════════════

describe('Anchor Detector — Bucket Analysis', () => {
    it('should separate anchor vs float subjects', () => {
        const subjects = [
            makeSubject({
                id: 'anchor',
                name: 'Mathematik',
                semesterGrades: { Q1_1: 5, Q1_2: 5, Q2_1: 5, Q2_2: 5 },
            }),
            makeSubject({
                id: 'float',
                name: 'Kunst',
                semesterGrades: { Q1_1: 12, Q1_2: 12, Q2_1: 12, Q2_2: 12 },
            }),
        ];
        const profile = nrwProfile(subjects);
        const statutory = _internals.identifyStatutoryCourses(subjects, profile);
        const analysis = _internals.analyzeBuckets(subjects, statutory);

        expect(analysis.anchorAvg).toBe(5);
        expect(analysis.floatAvg).toBe(12);
        expect(analysis.delta).toBe(7); // 12 - 5
    });

    it('should handle division by zero when no float grades exist', () => {
        const subjects = [
            makeSubject({
                id: 'anchor',
                name: 'Mathematik',
                semesterGrades: { Q1_1: 5, Q1_2: 5, Q2_1: 5, Q2_2: 5 },
            }),
        ];
        const profile = nrwProfile(subjects);
        const statutory = _internals.identifyStatutoryCourses(subjects, profile);
        const analysis = _internals.analyzeBuckets(subjects, statutory);

        expect(analysis.anchorAvg).toBe(5);
        expect(analysis.floatAvg).toBeNull();
        expect(analysis.delta).toBeNull();
    });

    it('should handle division by zero when no anchor grades exist', () => {
        const subjects = [
            makeSubject({
                id: 'float',
                name: 'Kunst',
                semesterGrades: { Q1_1: 12, Q1_2: 12, Q2_1: 12, Q2_2: 12 },
            }),
        ];
        const profile = nrwProfile(subjects);
        const statutory = _internals.identifyStatutoryCourses(subjects, profile);
        const analysis = _internals.analyzeBuckets(subjects, statutory);

        expect(analysis.anchorAvg).toBeNull();
        expect(analysis.floatAvg).toBe(12);
        expect(analysis.delta).toBeNull();
    });

    it('should skip subjects with all null grades', () => {
        const subjects = [
            makeSubject({
                id: 'future',
                name: 'Mathematik',
                semesterGrades: { Q1_1: null, Q1_2: null, Q2_1: null, Q2_2: null },
            }),
        ];
        const profile = nrwProfile(subjects);
        const statutory = _internals.identifyStatutoryCourses(subjects, profile);
        const analysis = _internals.analyzeBuckets(subjects, statutory);

        expect(analysis.anchorGrades).toHaveLength(0);
        expect(analysis.delta).toBeNull();
    });
});

// ═══════════════════════════════════════════════════════════
// Full Integration
// ═══════════════════════════════════════════════════════════

describe('Anchor Detector — Full Integration', () => {

    it('should flag ORANGE (DETECTED) when delta exceeds threshold', () => {
        const subjects = [
            // Anchor: Math avg = 4
            makeSubject({
                id: 'math', name: 'Mathematik',
                semesterGrades: { Q1_1: 3, Q1_2: 4, Q2_1: 4, Q2_2: 5 },
            }),
            // Anchor: Deutsch avg = 3
            makeSubject({
                id: 'de', name: 'Deutsch',
                semesterGrades: { Q1_1: 2, Q1_2: 3, Q2_1: 3, Q2_2: 4 },
            }),
            // Float: Kunst avg = 12
            makeSubject({
                id: 'kunst', name: 'Kunst',
                semesterGrades: { Q1_1: 11, Q1_2: 12, Q2_1: 12, Q2_2: 13 },
            }),
            // Float: Sport avg = 13
            makeSubject({
                id: 'sport', name: 'Sport',
                semesterGrades: { Q1_1: 12, Q1_2: 13, Q2_1: 13, Q2_2: 14 },
            }),
        ];
        const profile = nrwProfile(subjects);
        const result = anchorDetector.detect(profile, getRuleset(profile));

        const orange = result.findings.filter(f => f.severity === RiskSeverity.ORANGE);
        expect(orange).toHaveLength(1);
        expect(orange[0].message).toContain('Structural Drag Detected');
        expect(orange[0].i18nKey).toBe('report.anchor.detected');
    });

    it('should flag GREEN (INVERTED) when anchors outperform floats', () => {
        const subjects = [
            // Anchor: Math avg = 13
            makeSubject({
                id: 'math', name: 'Mathematik',
                semesterGrades: { Q1_1: 12, Q1_2: 13, Q2_1: 13, Q2_2: 14 },
            }),
            // Anchor: Deutsch avg = 12
            makeSubject({
                id: 'de', name: 'Deutsch',
                semesterGrades: { Q1_1: 11, Q1_2: 12, Q2_1: 12, Q2_2: 13 },
            }),
            // Float: Kunst avg = 8
            makeSubject({
                id: 'kunst', name: 'Kunst',
                semesterGrades: { Q1_1: 7, Q1_2: 8, Q2_1: 8, Q2_2: 9 },
            }),
        ];
        const profile = nrwProfile(subjects);
        const result = anchorDetector.detect(profile, getRuleset(profile));

        const green = result.findings.filter(f => f.severity === RiskSeverity.GREEN);
        expect(green).toHaveLength(1);
        expect(green[0].message).toContain('Strong Foundation');
        expect(green[0].i18nKey).toBe('report.anchor.inverted');
    });

    it('should produce no finding when delta is within threshold', () => {
        const subjects = [
            // Anchor: Math avg = 9
            makeSubject({
                id: 'math', name: 'Mathematik',
                semesterGrades: { Q1_1: 8, Q1_2: 9, Q2_1: 9, Q2_2: 10 },
            }),
            // Float: Kunst avg = 11 (delta = 2.0, under 3.0 threshold)
            makeSubject({
                id: 'kunst', name: 'Kunst',
                semesterGrades: { Q1_1: 10, Q1_2: 11, Q2_1: 11, Q2_2: 12 },
            }),
        ];
        const profile = nrwProfile(subjects);
        const result = anchorDetector.detect(profile, getRuleset(profile));

        expect(result.findings).toHaveLength(0);
    });

    it('should use custom anchorThreshold in General mode', () => {
        const subjects = [
            makeSubject({
                id: 'mandatory', name: 'Mandatory Course',
                semesterGrades: { Q1_1: 8, Q1_2: 8, Q2_1: 8, Q2_2: 8 },
            }),
            makeSubject({
                id: 'elective', name: 'Elective Course',
                semesterGrades: { Q1_1: 10, Q1_2: 10, Q2_1: 10, Q2_2: 10 },
            }),
        ];
        // Delta = 10 - 8 = 2.0. Threshold = 1.5 → should trigger
        const profile = generalProfile(subjects, {
            anchorThreshold: 1.5,
            customMandatorySubjects: ['mandatory'],
        });
        const result = anchorDetector.detect(profile, getRuleset(profile));

        const orange = result.findings.filter(f => f.severity === RiskSeverity.ORANGE);
        expect(orange).toHaveLength(1);
    });

    it('should annotate isKeystone correctly', () => {
        const subjects = [
            makeSubject({ id: 'math', name: 'Mathematik' }),
            makeSubject({ id: 'kunst', name: 'Kunst' }),
        ];
        const profile = nrwProfile(subjects);
        const result = anchorDetector.detect(profile, getRuleset(profile));

        const annotations = result.subjectAnnotations ?? [];
        expect(annotations.find(a => a.subjectId === 'math')?.isKeystone).toBe(true);
        expect(annotations.find(a => a.subjectId === 'kunst')?.isKeystone).toBe(false);
    });

    it('should produce no findings when not enough data', () => {
        const subjects = [
            makeSubject({
                id: 'math', name: 'Mathematik',
                semesterGrades: { Q1_1: null, Q1_2: null, Q2_1: null, Q2_2: null },
            }),
        ];
        const profile = nrwProfile(subjects);
        const result = anchorDetector.detect(profile, getRuleset(profile));

        expect(result.findings).toHaveLength(0);
    });

    it('should handle empty subjects array', () => {
        const profile = nrwProfile([]);
        const result = anchorDetector.detect(profile, getRuleset(profile));

        expect(result.findings).toHaveLength(0);
        expect(result.subjectAnnotations).toEqual([]);
    });

    it('should return correct trapType', () => {
        const result = anchorDetector.detect(nrwProfile([]), NRW_RULESET);
        expect(result.trapType).toBe(TrapType.Anchor);
    });
});
