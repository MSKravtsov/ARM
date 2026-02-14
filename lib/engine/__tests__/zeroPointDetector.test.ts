// ──────────────────────────────────────────────────────────────
// ARM – Zero-Point Detector Unit Tests
// ──────────────────────────────────────────────────────────────

import { zeroPointDetector } from '../detectors/zeroPointDetector';
import { RiskSeverity, TrapType } from '@/types/riskEngine';
import { FederalState, SubjectType, ExamType, FatalScope, SubjectCategory, ProfileType } from '@/types/userInput';
import type { UserInputProfile, Subject, SemesterGrades, GeneralRulesConfig } from '@/types/userInput';
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
// PASS 1: DETECTION — RED / FATAL
// ═══════════════════════════════════════════════════════════

describe('Zero-Point Detector — PASS 1: Detection (RED)', () => {

    // ── NRW ─────────────────────────────────────────────

    describe('NRW Mode (APO-GOSt §28: Belegpflicht)', () => {
        it('should flag RED when a Belegpflichtig course has 0 points', () => {
            const subjects = [
                makeSubject({
                    name: 'Deutsch',
                    isBelegpflichtig: true,
                    semesterGrades: { Q1_1: 0, Q1_2: 8, Q2_1: 7, Q2_2: 9 },
                }),
            ];
            const profile = nrwProfile(subjects);
            const result = zeroPointDetector.detect(profile, getRuleset(profile));

            expect(result.findings).toHaveLength(1);
            expect(result.findings[0].severity).toBe(RiskSeverity.RED);
            expect(result.findings[0].message).toContain('Deutsch');
            expect(result.findings[0].message).toContain('Q1.1');
        });

        it('should NOT flag RED when a non-Belegpflichtig course has 0 points', () => {
            const subjects = [
                makeSubject({
                    name: 'Kunst',
                    isBelegpflichtig: false,
                    semesterGrades: { Q1_1: 0, Q1_2: 5, Q2_1: 6, Q2_2: 4 },
                }),
            ];
            const profile = nrwProfile(subjects);
            const result = zeroPointDetector.detect(profile, getRuleset(profile));

            // No RED findings (the 0 is in a non-Belegpflichtig course)
            const redFindings = result.findings.filter(f => f.severity === RiskSeverity.RED);
            expect(redFindings).toHaveLength(0);
        });

        it('should fail-fast on the FIRST fatal hit', () => {
            const subjects = [
                makeSubject({
                    id: 's1',
                    name: 'Mathematik',
                    isBelegpflichtig: true,
                    semesterGrades: { Q1_1: 0, Q1_2: 0, Q2_1: 5, Q2_2: 5 },
                }),
                makeSubject({
                    id: 's2',
                    name: 'Deutsch',
                    isBelegpflichtig: true,
                    semesterGrades: { Q1_1: 0, Q1_2: 8, Q2_1: 7, Q2_2: 9 },
                }),
            ];
            const profile = nrwProfile(subjects);
            const result = zeroPointDetector.detect(profile, getRuleset(profile));

            // Fail-fast: only the first RED finding is emitted
            expect(result.findings).toHaveLength(1);
            expect(result.findings[0].severity).toBe(RiskSeverity.RED);
            expect(result.findings[0].affectedSubjectIds).toContain('s1');
        });

        it('should emit ORANGE for non-Belegpflichtig 0 if average < 3', () => {
            // A non-Belegpflichtig course with a 0 and avg < 3
            const subjects = [
                makeSubject({
                    name: 'Sport',
                    isBelegpflichtig: false,
                    semesterGrades: { Q1_1: 0, Q1_2: 2, Q2_1: 1, Q2_2: 3 },
                }),
            ];
            const profile = nrwProfile(subjects);
            const result = zeroPointDetector.detect(profile, getRuleset(profile));

            // No RED (not Belegpflichtig), but ORANGE from danger zone check
            const red = result.findings.filter(f => f.severity === RiskSeverity.RED);
            const orange = result.findings.filter(f => f.severity === RiskSeverity.ORANGE);
            expect(red).toHaveLength(0);
            expect(orange.length).toBeGreaterThanOrEqual(1);
            expect(orange[0].message).toContain('Sport');
        });
    });

    // ── BAVARIA ─────────────────────────────────────────

    describe('Bavaria Mode (GSO §44-50: MVP safety)', () => {
        it('should flag RED for ANY course with 0 points (MVP safety)', () => {
            const subjects = [
                makeSubject({
                    name: 'Physik',
                    isMandatory: false,  // even non-mandatory
                    semesterGrades: { Q1_1: 7, Q1_2: 0, Q2_1: 8, Q2_2: 6 },
                }),
            ];
            const profile = bavariaProfile(subjects);
            const result = zeroPointDetector.detect(profile, getRuleset(profile));

            expect(result.findings).toHaveLength(1);
            expect(result.findings[0].severity).toBe(RiskSeverity.RED);
            expect(result.findings[0].message).toContain('Physik');
            expect(result.findings[0].message).toContain('Q1.2');
        });

        it('should flag RED for mandatory course with 0 points', () => {
            const subjects = [
                makeSubject({
                    name: 'Mathematik',
                    isMandatory: true,
                    semesterGrades: { Q1_1: 3, Q1_2: 5, Q2_1: 0, Q2_2: 4 },
                }),
            ];
            const profile = bavariaProfile(subjects);
            const result = zeroPointDetector.detect(profile, getRuleset(profile));

            expect(result.findings).toHaveLength(1);
            expect(result.findings[0].severity).toBe(RiskSeverity.RED);
        });
    });

    // ── GENERAL ─────────────────────────────────────────

    describe('General Mode (User-Defined)', () => {
        it('should NOT flag RED when zeroIsFatal is false', () => {
            const subjects = [
                makeSubject({
                    name: 'Art',
                    isMandatory: true,
                    semesterGrades: { Q1_1: 0, Q1_2: 5, Q2_1: 6, Q2_2: 4 },
                }),
            ];
            const profile = generalProfile(subjects, {
                zeroIsFatal: false,
                fatalScope: FatalScope.ALL_COURSES,
            });
            const result = zeroPointDetector.detect(profile, getRuleset(profile));

            const redFindings = result.findings.filter(f => f.severity === RiskSeverity.RED);
            expect(redFindings).toHaveLength(0);
        });

        it('should flag RED when zeroIsFatal=true and fatalScope=ALL_COURSES', () => {
            const subjects = [
                makeSubject({
                    name: 'CS',
                    isMandatory: false,
                    semesterGrades: { Q1_1: 0, Q1_2: 10, Q2_1: 8, Q2_2: 9 },
                }),
            ];
            const profile = generalProfile(subjects, {
                zeroIsFatal: true,
                fatalScope: FatalScope.ALL_COURSES,
            });
            const result = zeroPointDetector.detect(profile, getRuleset(profile));

            expect(result.findings).toHaveLength(1);
            expect(result.findings[0].severity).toBe(RiskSeverity.RED);
        });

        it('should flag RED only for mandatory courses when fatalScope=MANDATORY_ONLY', () => {
            const subjects = [
                makeSubject({
                    id: 'mandatory-subj',
                    name: 'Mandatory Course',
                    isMandatory: true,
                    semesterGrades: { Q1_1: 0, Q1_2: 10, Q2_1: 8, Q2_2: 9 },
                }),
                makeSubject({
                    id: 'elective-subj',
                    name: 'Elective Course',
                    isMandatory: false,
                    semesterGrades: { Q1_1: 0, Q1_2: 10, Q2_1: 8, Q2_2: 9 },
                }),
            ];
            const profile = generalProfile(subjects, {
                zeroIsFatal: true,
                fatalScope: FatalScope.MANDATORY_ONLY,
            });
            const result = zeroPointDetector.detect(profile, getRuleset(profile));

            // Only the mandatory subject should trigger RED
            expect(result.findings).toHaveLength(1);
            expect(result.findings[0].severity).toBe(RiskSeverity.RED);
            expect(result.findings[0].affectedSubjectIds).toContain('mandatory-subj');
        });

        it('should NOT flag RED when fatalScope=NONE regardless of zeroIsFatal', () => {
            const subjects = [
                makeSubject({
                    name: 'Anything',
                    isMandatory: true,
                    semesterGrades: { Q1_1: 0, Q1_2: 0, Q2_1: 0, Q2_2: 0 },
                }),
            ];
            const profile = generalProfile(subjects, {
                zeroIsFatal: true,
                fatalScope: FatalScope.NONE,
            });
            const result = zeroPointDetector.detect(profile, getRuleset(profile));

            const redFindings = result.findings.filter(f => f.severity === RiskSeverity.RED);
            expect(redFindings).toHaveLength(0);
        });
    });
});

// ═══════════════════════════════════════════════════════════
// PASS 2: PREDICTION — ORANGE / DANGER ZONES
// ═══════════════════════════════════════════════════════════

describe('Zero-Point Detector — PASS 2: Prediction (ORANGE)', () => {
    it('should flag ORANGE when average grade is below 3.0', () => {
        const subjects = [
            makeSubject({
                name: 'Philosophy',
                semesterGrades: { Q1_1: 2, Q1_2: 1, Q2_1: 3, Q2_2: 2 },
            }),
        ];
        // Use NRW with non-Belegpflichtig so no RED fires
        const profile = nrwProfile(subjects);
        const result = zeroPointDetector.detect(profile, getRuleset(profile));

        expect(result.findings).toHaveLength(1);
        expect(result.findings[0].severity).toBe(RiskSeverity.ORANGE);
        expect(result.findings[0].message).toContain('Philosophy');
        expect(result.findings[0].message).toContain('critical');
    });

    it('should NOT flag ORANGE when average grade is exactly 3.0', () => {
        const subjects = [
            makeSubject({
                name: 'Music',
                semesterGrades: { Q1_1: 2, Q1_2: 4, Q2_1: 3, Q2_2: 3 },
            }),
        ];
        const profile = nrwProfile(subjects);
        const result = zeroPointDetector.detect(profile, getRuleset(profile));

        expect(result.findings).toHaveLength(0);
    });

    it('should NOT flag ORANGE when average is above 3.0', () => {
        const subjects = [
            makeSubject({
                name: 'Geography',
                semesterGrades: { Q1_1: 5, Q1_2: 6, Q2_1: 4, Q2_2: 7 },
            }),
        ];
        const profile = nrwProfile(subjects);
        const result = zeroPointDetector.detect(profile, getRuleset(profile));

        expect(result.findings).toHaveLength(0);
    });

    it('should skip PASS 2 entirely when PASS 1 finds a RED', () => {
        const subjects = [
            // This one triggers RED (Belegpflichtig with 0)
            makeSubject({
                id: 'fatal',
                name: 'Deutsch',
                isBelegpflichtig: true,
                semesterGrades: { Q1_1: 0, Q1_2: 8, Q2_1: 7, Q2_2: 9 },
            }),
            // This one would trigger ORANGE (avg < 3) if PASS 2 ran
            makeSubject({
                id: 'danger',
                name: 'Erdkunde',
                semesterGrades: { Q1_1: 1, Q1_2: 2, Q2_1: 1, Q2_2: 2 },
            }),
        ];
        const profile = nrwProfile(subjects);
        const result = zeroPointDetector.detect(profile, getRuleset(profile));

        // Should only have the RED finding, no ORANGE
        expect(result.findings).toHaveLength(1);
        expect(result.findings[0].severity).toBe(RiskSeverity.RED);
    });

    it('should flag ORANGE for multiple danger-zone subjects', () => {
        const subjects = [
            makeSubject({
                name: 'Subject A',
                semesterGrades: { Q1_1: 1, Q1_2: 2, Q2_1: 2, Q2_2: 1 },
            }),
            makeSubject({
                name: 'Subject B',
                semesterGrades: { Q1_1: 2, Q1_2: 2, Q2_1: 1, Q2_2: 1 },
            }),
        ];
        const profile = nrwProfile(subjects);
        const result = zeroPointDetector.detect(profile, getRuleset(profile));

        expect(result.findings).toHaveLength(2);
        expect(result.findings.every(f => f.severity === RiskSeverity.ORANGE)).toBe(true);
    });
});

// ═══════════════════════════════════════════════════════════
// Edge Cases
// ═══════════════════════════════════════════════════════════

describe('Zero-Point Detector — Edge Cases', () => {
    it('should handle empty subjects array gracefully', () => {
        const profile = nrwProfile([]);
        const result = zeroPointDetector.detect(profile, getRuleset(profile));

        expect(result.findings).toHaveLength(0);
        expect(result.subjectAnnotations).toEqual([]);
    });

    it('should skip null (future) semester grades', () => {
        const subjects = [
            makeSubject({
                name: 'Future Subject',
                isBelegpflichtig: true,
                semesterGrades: { Q1_1: 8, Q1_2: 7, Q2_1: null, Q2_2: null },
            }),
        ];
        const profile = nrwProfile(subjects);
        const result = zeroPointDetector.detect(profile, getRuleset(profile));

        expect(result.findings).toHaveLength(0);
    });

    it('should correctly annotate hasZeroPoint on subjects', () => {
        const subjects = [
            makeSubject({
                id: 'has-zero',
                name: 'Has Zero',
                semesterGrades: { Q1_1: 0, Q1_2: 5, Q2_1: 6, Q2_2: 7 },
            }),
            makeSubject({
                id: 'no-zero',
                name: 'No Zero',
                semesterGrades: { Q1_1: 5, Q1_2: 6, Q2_1: 7, Q2_2: 8 },
            }),
        ];
        // Use NRW + non-Belegpflichtig so no RED fires
        const profile = nrwProfile(subjects);
        const result = zeroPointDetector.detect(profile, getRuleset(profile));

        const annotations = result.subjectAnnotations ?? [];
        const zeroAnnotation = annotations.find(a => a.subjectId === 'has-zero');
        const cleanAnnotation = annotations.find(a => a.subjectId === 'no-zero');

        expect(zeroAnnotation?.hasZeroPoint).toBe(true);
        expect(cleanAnnotation?.hasZeroPoint).toBe(false);
    });

    it('should handle all semesters being null (no data yet)', () => {
        const subjects = [
            makeSubject({
                name: 'Empty',
                isBelegpflichtig: true,
                semesterGrades: { Q1_1: null, Q1_2: null, Q2_1: null, Q2_2: null },
            }),
        ];
        const profile = nrwProfile(subjects);
        const result = zeroPointDetector.detect(profile, getRuleset(profile));

        expect(result.findings).toHaveLength(0);
    });

    it('should return correct trapType in result', () => {
        const profile = nrwProfile([]);
        const result = zeroPointDetector.detect(profile, getRuleset(profile));

        expect(result.trapType).toBe(TrapType.ZeroPoint);
    });

    it('should include i18n keys and params in findings', () => {
        const subjects = [
            makeSubject({
                name: 'Chemie',
                isBelegpflichtig: true,
                semesterGrades: { Q1_1: 5, Q1_2: 0, Q2_1: 8, Q2_2: 7 },
            }),
        ];
        const profile = nrwProfile(subjects);
        const result = zeroPointDetector.detect(profile, getRuleset(profile));

        expect(result.findings).toHaveLength(1);
        expect(result.findings[0].i18nKey).toBe('report.zeroPoint.detail');
        expect(result.findings[0].i18nParams?.subjectName).toBe('Chemie');
        expect(result.findings[0].i18nParams?.semester).toBe('Q1.2');
    });
});
