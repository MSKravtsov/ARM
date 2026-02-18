// ──────────────────────────────────────────────────────────────
// ARM – Deficit Accumulation Detector Unit Tests
// ──────────────────────────────────────────────────────────────

import { deficitDetector, _internals } from '../detectors/deficitDetector';
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

function nrwProfile(subjects: Subject[], year = 2026): UserInputProfile {
    return { federalState: FederalState.NRW, graduationYear: year, subjects };
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

/** Creates N GK subjects each with one deficit grade (3 pts in Q1_1). */
function makeDeficitSubjects(count: number): Subject[] {
    return Array.from({ length: count }, (_, i) =>
        makeSubject({
            id: `deficit-${i}`,
            name: `Deficit Subject ${i}`,
            type: SubjectType.GK,
            semesterGrades: { Q1_1: 3, Q1_2: 8, Q2_1: 9, Q2_2: 10 },
        })
    );
}

/** Creates N LK subjects each with one deficit grade. */
function makeLkDeficitSubjects(count: number): Subject[] {
    return Array.from({ length: count }, (_, i) =>
        makeSubject({
            id: `lk-deficit-${i}`,
            name: `LK Deficit ${i}`,
            type: SubjectType.LK,
            isExamSubject: true,
            examType: ExamType.Written,
            semesterGrades: { Q1_1: 4, Q1_2: 8, Q2_1: 9, Q2_2: 10 },
        })
    );
}

// ═══════════════════════════════════════════════════════════
// STAGE 1: CURRENT COUNT
// ═══════════════════════════════════════════════════════════

describe('Deficit Detector — STAGE 1: Current Count', () => {
    it('should count grades below deficit threshold as deficits', () => {
        const subjects = [
            makeSubject({
                name: 'Math',
                semesterGrades: { Q1_1: 3, Q1_2: 4, Q2_1: 5, Q2_2: 10 },
            }),
        ];
        const counts = _internals.countCurrentDeficits(subjects, 5);
        // 3 and 4 are < 5 → 2 deficits
        expect(counts.totalCurrent).toBe(2);
    });

    it('should NOT count grade exactly at threshold as deficit', () => {
        const subjects = [
            makeSubject({
                semesterGrades: { Q1_1: 5, Q1_2: 5, Q2_1: 5, Q2_2: 5 },
            }),
        ];
        const counts = _internals.countCurrentDeficits(subjects, 5);
        expect(counts.totalCurrent).toBe(0);
    });

    it('should separately count LK deficits', () => {
        const subjects = [
            makeSubject({
                name: 'LK Subject',
                type: SubjectType.LK,
                semesterGrades: { Q1_1: 2, Q1_2: 3, Q2_1: 8, Q2_2: 10 },
            }),
            makeSubject({
                name: 'GK Subject',
                type: SubjectType.GK,
                semesterGrades: { Q1_1: 1, Q1_2: 9, Q2_1: 10, Q2_2: 10 },
            }),
        ];
        const counts = _internals.countCurrentDeficits(subjects, 5);
        expect(counts.totalCurrent).toBe(3); // 2 LK + 1 GK
        expect(counts.lkCurrent).toBe(2);    // Only LK deficits
    });

    it('should skip null (future) grades', () => {
        const subjects = [
            makeSubject({
                semesterGrades: { Q1_1: 3, Q1_2: 4, Q2_1: null, Q2_2: null },
            }),
        ];
        const counts = _internals.countCurrentDeficits(subjects, 5);
        expect(counts.totalCurrent).toBe(2); // Only counts existing grades
    });

    it('should track which subjects have deficits', () => {
        const subjects = [
            makeSubject({
                id: 'has-deficit',
                semesterGrades: { Q1_1: 3, Q1_2: 8, Q2_1: 9, Q2_2: 10 },
            }),
            makeSubject({
                id: 'no-deficit',
                semesterGrades: { Q1_1: 8, Q1_2: 9, Q2_1: 10, Q2_2: 11 },
            }),
        ];
        const counts = _internals.countCurrentDeficits(subjects, 5);
        expect(counts.deficitSubjectIds.has('has-deficit')).toBe(true);
        expect(counts.deficitSubjectIds.has('no-deficit')).toBe(false);
    });
});

// ═══════════════════════════════════════════════════════════
// STAGE 2: PREDICTIVE PROJECTION
// ═══════════════════════════════════════════════════════════

describe('Deficit Detector — STAGE 2: Predictive Projection', () => {
    it('should predict deficits for subjects with avg < 4.8 and null slots', () => {
        const subjects = [
            makeSubject({
                // avg = (3+4)/2 = 3.5 < 4.8 → 2 null slots = 2 predicted
                semesterGrades: { Q1_1: 3, Q1_2: 4, Q2_1: null, Q2_2: null },
            }),
        ];
        const counts = _internals.countCurrentDeficits(subjects, 5);
        const prediction = _internals.predictFutureDeficits(subjects, counts);

        expect(prediction.predictedDeficits).toBe(2);
        expect(prediction.projectedTotal).toBe(counts.totalCurrent + 2);
    });

    it('should NOT predict deficits for subjects with avg >= 4.8', () => {
        const subjects = [
            makeSubject({
                // avg = (5+5)/2 = 5.0 >= 4.8 → no prediction
                semesterGrades: { Q1_1: 5, Q1_2: 5, Q2_1: null, Q2_2: null },
            }),
        ];
        const counts = _internals.countCurrentDeficits(subjects, 5);
        const prediction = _internals.predictFutureDeficits(subjects, counts);

        expect(prediction.predictedDeficits).toBe(0);
    });

    it('should skip subjects with no null slots', () => {
        const subjects = [
            makeSubject({
                // avg = 3.0 < 4.8, but no null slots → no prediction
                semesterGrades: { Q1_1: 2, Q1_2: 3, Q2_1: 3, Q2_2: 4 },
            }),
        ];
        const counts = _internals.countCurrentDeficits(subjects, 5);
        const prediction = _internals.predictFutureDeficits(subjects, counts);

        expect(prediction.predictedDeficits).toBe(0);
    });

    it('should skip subjects with all null grades', () => {
        const subjects = [
            makeSubject({
                semesterGrades: { Q1_1: null, Q1_2: null, Q2_1: null, Q2_2: null },
            }),
        ];
        const counts = _internals.countCurrentDeficits(subjects, 5);
        const prediction = _internals.predictFutureDeficits(subjects, counts);

        expect(prediction.predictedDeficits).toBe(0);
    });

    it('should separately project LK predictions', () => {
        const subjects = [
            makeSubject({
                type: SubjectType.LK,
                semesterGrades: { Q1_1: 3, Q1_2: 4, Q2_1: null, Q2_2: null },
            }),
        ];
        const counts = _internals.countCurrentDeficits(subjects, 5);
        const prediction = _internals.predictFutureDeficits(subjects, counts);

        expect(prediction.projectedLk).toBe(counts.lkCurrent + 2);
    });
});

// ═══════════════════════════════════════════════════════════
// STAGE 3: RISK LEVEL ASSIGNMENT
// ═══════════════════════════════════════════════════════════

describe('Deficit Detector — STAGE 3: Full Integration', () => {

    // ── NRW ─────────────────────────────────────────────

    describe('NRW Mode (APO-GOSt)', () => {
        it('should flag RED (DISQUALIFIED) when total deficits exceed 7', () => {
            // 8 subjects each with 1 deficit = 8 total > 7
            const subjects = makeDeficitSubjects(8);
            const profile = nrwProfile(subjects);
            const result = deficitDetector.detect(profile, getRuleset(profile));

            const red = result.findings.filter(f => f.severity === RiskSeverity.RED);
            expect(red).toHaveLength(1);
            expect(red[0].message).toContain('Disqualified');
            expect(red[0].i18nParams?.current).toBe(8);
        });

        it('should flag RED when LK deficits exceed 3 (NRW sub-limit)', () => {
            // 4 LK subjects each with 1 deficit = 4 LK deficits > 3
            const subjects = makeLkDeficitSubjects(4);
            const profile = nrwProfile(subjects);
            const result = deficitDetector.detect(profile, getRuleset(profile));

            const red = result.findings.filter(f => f.severity === RiskSeverity.RED);
            expect(red).toHaveLength(1);
            expect(red[0].message).toContain('LK deficits');
            expect(red[0].i18nKey).toBe('report.deficit.lkDisqualified');
        });

        it('should NOT flag RED if 7 total but LK <= 3', () => {
            // 7 GK deficits, 0 LK = at limit, not over
            const subjects = makeDeficitSubjects(7);
            const profile = nrwProfile(subjects);
            const result = deficitDetector.detect(profile, getRuleset(profile));

            const red = result.findings.filter(f => f.severity === RiskSeverity.RED);
            expect(red).toHaveLength(0);
        });

        it('should emit NRW 2026 Bündelungsgymnasium warning when deficits >= 6', () => {
            const subjects = makeDeficitSubjects(6);
            const profile = nrwProfile(subjects, 2026);
            const result = deficitDetector.detect(profile, getRuleset(profile));

            const buendel = result.findings.filter(f =>
                f.i18nKey === 'report.deficit.buendelungsWarning'
            );
            expect(buendel).toHaveLength(1);
            expect(buendel[0].severity).toBe(RiskSeverity.ORANGE);
            expect(buendel[0].message).toContain('Bündelungsgymnasium');
        });

        it('should NOT emit Bündelungsgymnasium warning for non-2026 years', () => {
            const subjects = makeDeficitSubjects(6);
            // Use 2025 as a stand-in for a year that should work regardless
            const profile = nrwProfile(subjects, 2025 as any);
            const result = deficitDetector.detect(profile, getRuleset(profile));

            const buendel = result.findings.filter(f =>
                f.i18nKey === 'report.deficit.buendelungsWarning'
            );
            expect(buendel).toHaveLength(0);
        });

        it('should flag ORANGE CRITICAL when 1 deficit from limit', () => {
            // 6 deficits = maxDeficits(7) - 1
            const subjects = makeDeficitSubjects(6);
            // Use non-2026 year to avoid Bündelungsgymnasium conflict
            const profile = nrwProfile(subjects, 2025 as any);
            const result = deficitDetector.detect(profile, getRuleset(profile));

            const orange = result.findings.filter(f =>
                f.severity === RiskSeverity.ORANGE &&
                f.i18nKey === 'report.deficit.critical'
            );
            expect(orange).toHaveLength(1);
            expect(orange[0].message).toContain('remaining');
        });

        it('should flag LK approaching sub-limit when LK deficits >= maxLk - 1', () => {
            // 2 LK subjects with deficits = 2 LK deficits (maxLk=3, so 2 >= 3-1)
            const subjects = makeLkDeficitSubjects(2);
            const profile = nrwProfile(subjects, 2025 as any);
            const result = deficitDetector.detect(profile, getRuleset(profile));

            const lkWarning = result.findings.filter(f =>
                f.i18nKey === 'report.deficit.lkWarning'
            );
            expect(lkWarning).toHaveLength(1);
            expect(lkWarning[0].message).toContain('LK deficit alert');
        });
    });

    // ── BAVARIA ─────────────────────────────────────────

    describe('Bavaria Mode (GSO)', () => {
        it('should flag RED when total deficits exceed 8', () => {
            const subjects = makeDeficitSubjects(9);
            const profile = bavariaProfile(subjects);
            const result = deficitDetector.detect(profile, getRuleset(profile));

            const red = result.findings.filter(f => f.severity === RiskSeverity.RED);
            expect(red).toHaveLength(1);
            expect(red[0].message).toContain('9');
            expect(red[0].i18nParams?.max).toBe(8);
        });

        it('should flag ORANGE WARNING when 50% of quota used (4 of 8)', () => {
            const subjects = makeDeficitSubjects(4);
            const profile = bavariaProfile(subjects);
            const result = deficitDetector.detect(profile, getRuleset(profile));

            const warning = result.findings.filter(f =>
                f.i18nKey === 'report.deficit.warning'
            );
            expect(warning).toHaveLength(1);
            expect(warning[0].message).toContain('50%');
        });

        it('should return CLEAN (no findings) when few deficits', () => {
            const subjects = makeDeficitSubjects(2);
            const profile = bavariaProfile(subjects);
            const result = deficitDetector.detect(profile, getRuleset(profile));

            expect(result.findings).toHaveLength(0);
        });
    });

    // ── GENERAL ─────────────────────────────────────────

    describe('General Mode (User-Defined)', () => {
        it('should use custom maxDeficits from rulesConfig', () => {
            // Custom limit of 3, with 4 deficits → DISQUALIFIED
            const subjects = makeDeficitSubjects(4);
            const profile = generalProfile(subjects, { maxDeficits: 3 });
            const result = deficitDetector.detect(profile, getRuleset(profile));

            const red = result.findings.filter(f => f.severity === RiskSeverity.RED);
            expect(red).toHaveLength(1);
            expect(red[0].i18nParams?.max).toBe(3);
        });

        it('should flag WARNING at custom threshold', () => {
            // Custom limit of 6, 3 deficits = 50% → WARNING
            const subjects = makeDeficitSubjects(3);
            const profile = generalProfile(subjects, { maxDeficits: 6 });
            const result = deficitDetector.detect(profile, getRuleset(profile));

            const warning = result.findings.filter(f =>
                f.i18nKey === 'report.deficit.warning'
            );
            expect(warning).toHaveLength(1);
        });
    });

    // ── PROJECTION ──────────────────────────────────────

    describe('Predictive Projection', () => {
        it('should flag RED when projected total exceeds limit', () => {
            // 5 current deficits + danger-zone: Q1_1=4 adds 1 more current deficit
            // Total current = 6 (not over 7).
            // Danger-zone avg = (4)/1 = 4.0 < 4.8 → 3 null slots predicted
            // Projected = 6 + 3 = 9 > 7 → projected RED
            const subjects = [
                ...makeDeficitSubjects(5),
                makeSubject({
                    id: 'danger-zone',
                    name: 'Danger',
                    semesterGrades: { Q1_1: 4, Q1_2: null, Q2_1: null, Q2_2: null },
                }),
            ];
            const profile = nrwProfile(subjects, 2025 as any);
            const result = deficitDetector.detect(profile, getRuleset(profile));

            const projectedRed = result.findings.filter(f =>
                f.i18nKey === 'report.deficit.projectedExceed'
            );
            expect(projectedRed).toHaveLength(1);
            expect(projectedRed[0].severity).toBe(RiskSeverity.RED);
        });

        it('should NOT project when subjects have avg >= 4.8', () => {
            const subjects = [
                ...makeDeficitSubjects(6),
                makeSubject({
                    name: 'Safe',
                    semesterGrades: { Q1_1: 5, Q1_2: 6, Q2_1: null, Q2_2: null },
                }),
            ];
            // 6 deficits = CRITICAL (1 remaining), but no projection
            const profile = nrwProfile(subjects, 2025 as any);
            const result = deficitDetector.detect(profile, getRuleset(profile));

            const projected = result.findings.filter(f =>
                f.i18nKey === 'report.deficit.projectedExceed'
            );
            expect(projected).toHaveLength(0);
        });
    });
});

// ═══════════════════════════════════════════════════════════
// Edge Cases
// ═══════════════════════════════════════════════════════════

describe('Deficit Detector — Edge Cases', () => {
    it('should handle empty subjects array', () => {
        const profile = nrwProfile([]);
        const result = deficitDetector.detect(profile, getRuleset(profile));

        expect(result.findings).toHaveLength(0);
        expect(result.subjectAnnotations).toEqual([]);
    });

    it('should handle all null (future) grades', () => {
        const subjects = [
            makeSubject({
                semesterGrades: { Q1_1: null, Q1_2: null, Q2_1: null, Q2_2: null },
            }),
        ];
        const profile = nrwProfile(subjects);
        const result = deficitDetector.detect(profile, getRuleset(profile));

        expect(result.findings).toHaveLength(0);
    });

    it('should correctly annotate isDeficit on subjects', () => {
        const subjects = [
            makeSubject({
                id: 'has-deficit',
                semesterGrades: { Q1_1: 3, Q1_2: 8, Q2_1: 9, Q2_2: 10 },
            }),
            makeSubject({
                id: 'clean',
                semesterGrades: { Q1_1: 8, Q1_2: 9, Q2_1: 10, Q2_2: 11 },
            }),
        ];
        const profile = nrwProfile(subjects);
        const result = deficitDetector.detect(profile, getRuleset(profile));

        const annotations = result.subjectAnnotations ?? [];
        expect(annotations.find(a => a.subjectId === 'has-deficit')?.isDeficit).toBe(true);
        expect(annotations.find(a => a.subjectId === 'clean')?.isDeficit).toBe(false);
    });

    it('should return correct trapType', () => {
        const profile = nrwProfile([]);
        const result = deficitDetector.detect(profile, getRuleset(profile));
        expect(result.trapType).toBe(TrapType.Deficit);
    });

    it('should fail-fast on RED (no ORANGE findings after DISQUALIFIED)', () => {
        const subjects = makeDeficitSubjects(8);
        const profile = nrwProfile(subjects);
        const result = deficitDetector.detect(profile, getRuleset(profile));

        // Should only have RED, no ORANGE
        expect(result.findings.every(f => f.severity === RiskSeverity.RED)).toBe(true);
    });
});
