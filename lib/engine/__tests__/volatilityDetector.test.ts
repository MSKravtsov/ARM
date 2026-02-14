// ──────────────────────────────────────────────────────────────
// ARM – Volatility Detector Unit Tests
// ──────────────────────────────────────────────────────────────

import { volatilityDetector, _internals } from '../detectors/volatilityDetector';
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

/** Shorthand to create an exam subject with specific grades. */
function examSubject(
    name: string,
    grades: { Q1_1: number | null; Q1_2: number | null; Q2_1: number | null; Q2_2: number | null },
    overrides: Partial<Subject> = {}
): Subject {
    return makeSubject({
        name,
        isExamSubject: true,
        semesterGrades: grades,
        ...overrides,
    });
}

// ═══════════════════════════════════════════════════════════════
//   STEP 1 + 2 – Internal Helpers: extractGrades, mean, SD
// ═══════════════════════════════════════════════════════════════

describe('Volatility Detector – Internal Helpers', () => {
    it('extractGrades should return ordered array', () => {
        const subject = makeSubject({
            semesterGrades: { Q1_1: 10, Q1_2: 8, Q2_1: 6, Q2_2: 4 },
        });
        expect(_internals.extractGrades(subject)).toEqual([10, 8, 6, 4]);
    });

    it('extractGrades should preserve null values', () => {
        const subject = makeSubject({
            semesterGrades: { Q1_1: 10, Q1_2: null, Q2_1: 6, Q2_2: null },
        });
        expect(_internals.extractGrades(subject)).toEqual([10, null, 6, null]);
    });

    it('filterNonNull should remove nulls', () => {
        expect(_internals.filterNonNull([10, null, 6, null])).toEqual([10, 6]);
    });

    it('filterNonNull should return empty for all nulls', () => {
        expect(_internals.filterNonNull([null, null, null, null])).toEqual([]);
    });

    it('mean should compute average', () => {
        expect(_internals.mean([10, 8, 6, 4])).toBe(7);
    });

    it('mean should return 0 for empty array', () => {
        expect(_internals.mean([])).toBe(0);
    });

    it('standardDeviation should compute population SD', () => {
        // Values: [10, 8, 6, 4], mean=7, deviations: [3,1,-1,-3]
        // variance = (9+1+1+9)/4 = 5, SD = √5 ≈ 2.236
        const sd = _internals.standardDeviation([10, 8, 6, 4]);
        expect(sd).toBeCloseTo(2.236, 2);
    });

    it('standardDeviation should return 0 for identical values', () => {
        expect(_internals.standardDeviation([10, 10, 10, 10])).toBe(0);
    });

    it('standardDeviation should return 0 for single value', () => {
        expect(_internals.standardDeviation([10])).toBe(0);
    });

    it('standardDeviation should return 0 for empty array', () => {
        expect(_internals.standardDeviation([])).toBe(0);
    });

    it('classifyTier: STABLE when SD ≤ 1.5', () => {
        expect(_internals.classifyTier(0)).toBe('STABLE');
        expect(_internals.classifyTier(1.0)).toBe('STABLE');
        expect(_internals.classifyTier(1.5)).toBe('STABLE');
    });

    it('classifyTier: VARIABLE when 1.5 < SD ≤ 3.5', () => {
        expect(_internals.classifyTier(1.6)).toBe('VARIABLE');
        expect(_internals.classifyTier(2.5)).toBe('VARIABLE');
        expect(_internals.classifyTier(3.5)).toBe('VARIABLE');
    });

    it('classifyTier: VOLATILE when SD > 3.5', () => {
        expect(_internals.classifyTier(3.6)).toBe('VOLATILE');
        expect(_internals.classifyTier(5.0)).toBe('VOLATILE');
    });

    it('classifyTier: respects custom volatile ceiling', () => {
        // With volatileCeil = 2.0 → SD=2.5 should be VOLATILE
        expect(_internals.classifyTier(2.5, 2.0)).toBe('VOLATILE');
        // With volatileCeil = 5.0 → SD=4.0 should be VARIABLE
        expect(_internals.classifyTier(4.0, 5.0)).toBe('VARIABLE');
    });

    it('hasDownwardTrend: true for strictly decreasing ≥3 values', () => {
        expect(_internals.hasDownwardTrend([10, 8, 6])).toBe(true);
        expect(_internals.hasDownwardTrend([10, 8, 6, 4])).toBe(true);
    });

    it('hasDownwardTrend: false for non-decreasing grades', () => {
        expect(_internals.hasDownwardTrend([10, 8, 8, 4])).toBe(false);
        expect(_internals.hasDownwardTrend([4, 8, 6, 10])).toBe(false);
    });

    it('hasDownwardTrend: false for fewer than 3 non-null values', () => {
        expect(_internals.hasDownwardTrend([10, 8])).toBe(false);
        expect(_internals.hasDownwardTrend([10, null, null, null])).toBe(false);
    });

    it('hasDownwardTrend: skips nulls and uses remaining values', () => {
        // [10, null, 8, 6] → non-null [10, 8, 6] → true
        expect(_internals.hasDownwardTrend([10, null, 8, 6])).toBe(true);
    });
});

// ═══════════════════════════════════════════════════════════════
//   analyzeSubject
// ═══════════════════════════════════════════════════════════════

describe('Volatility Detector – analyzeSubject', () => {
    it('should flag insufficient data with fewer than 2 grades', () => {
        const subject = makeSubject({
            semesterGrades: { Q1_1: 10, Q1_2: null, Q2_1: null, Q2_2: null },
        });
        const result = _internals.analyzeSubject(subject, 3.5);
        expect(result.insufficientData).toBe(true);
        expect(result.tier).toBe('STABLE'); // defaults to STABLE when insufficient
        expect(result.sd).toBe(0);
    });

    it('should compute SD and classify correctly with full grades', () => {
        const subject = makeSubject({
            semesterGrades: { Q1_1: 12, Q1_2: 8, Q2_1: 14, Q2_2: 6 },
        });
        const result = _internals.analyzeSubject(subject, 3.5);
        expect(result.insufficientData).toBe(false);
        expect(result.mean).toBe(10);
        // SD of [12,8,14,6] = sqrt(((4+4+16+16)/4)) = sqrt(10) ≈ 3.16
        expect(result.sd).toBeCloseTo(3.162, 2);
        expect(result.tier).toBe('VARIABLE');
    });

    it('should detect downward trend', () => {
        const subject = makeSubject({
            semesterGrades: { Q1_1: 12, Q1_2: 10, Q2_1: 8, Q2_2: 6 },
        });
        const result = _internals.analyzeSubject(subject, 3.5);
        expect(result.isDownwardTrend).toBe(true);
    });

    it('should NOT detect downward trend for improving grades', () => {
        const subject = makeSubject({
            semesterGrades: { Q1_1: 6, Q1_2: 8, Q2_1: 10, Q2_2: 12 },
        });
        const result = _internals.analyzeSubject(subject, 3.5);
        expect(result.isDownwardTrend).toBe(false);
    });
});

// ═══════════════════════════════════════════════════════════════
//   STEP 3 – Risk Classification (Full Detector)
// ═══════════════════════════════════════════════════════════════

describe('Volatility Detector – STEP 3: Risk Classification', () => {
    it('should return TrapType.Volatility', () => {
        const subjects = [
            examSubject('Mathe', { Q1_1: 10, Q1_2: 10, Q2_1: 10, Q2_2: 10 }),
        ];
        const profile = nrwProfile(subjects);
        const result = volatilityDetector.detect(profile, NRW_RULESET);
        expect(result.trapType).toBe(TrapType.Volatility);
    });

    it('should flag VOLATILE exam subject as RED', () => {
        // Grades with very high SD: [15, 2, 14, 1] → mean ≈ 8, SD ≈ 6.26
        const subjects = [
            examSubject('Kunst', { Q1_1: 15, Q1_2: 2, Q2_1: 14, Q2_2: 1 }),
        ];
        const profile = nrwProfile(subjects);
        const result = volatilityDetector.detect(profile, NRW_RULESET);

        const redFindings = result.findings.filter(f => f.severity === RiskSeverity.RED);
        expect(redFindings).toHaveLength(1);
        expect(redFindings[0].i18nKey).toBe('report.volatility.volatile');
        expect(redFindings[0].affectedSubjectIds).toContain(subjects[0].id);
    });

    it('should flag VARIABLE exam subject as ORANGE', () => {
        // SD between 1.5 and 3.5: [12, 8, 14, 6] → SD ≈ 3.16
        const subjects = [
            examSubject('Physik', { Q1_1: 12, Q1_2: 8, Q2_1: 14, Q2_2: 6 }),
        ];
        const profile = nrwProfile(subjects);
        const result = volatilityDetector.detect(profile, NRW_RULESET);

        const orangeVariable = result.findings.filter(
            f => f.severity === RiskSeverity.ORANGE && f.i18nKey === 'report.volatility.variable'
        );
        expect(orangeVariable).toHaveLength(1);
    });

    it('should emit GREEN all-clear for STABLE exam subjects', () => {
        // All same grades → SD = 0 → STABLE
        const subjects = [
            examSubject('Mathe', { Q1_1: 10, Q1_2: 10, Q2_1: 10, Q2_2: 10 }),
            examSubject('Deutsch', { Q1_1: 9, Q1_2: 9, Q2_1: 9, Q2_2: 9 }),
        ];
        const profile = nrwProfile(subjects);
        const result = volatilityDetector.detect(profile, NRW_RULESET);

        expect(result.findings).toHaveLength(1);
        expect(result.findings[0].severity).toBe(RiskSeverity.GREEN);
        expect(result.findings[0].i18nKey).toBe('report.volatility.allClear');
    });

    it('should handle insufficient data gracefully', () => {
        const subjects = [
            examSubject('Bio', { Q1_1: 10, Q1_2: null, Q2_1: null, Q2_2: null }),
        ];
        const profile = nrwProfile(subjects);
        const result = volatilityDetector.detect(profile, NRW_RULESET);

        const insufficientFindings = result.findings.filter(
            f => f.i18nKey === 'report.volatility.insufficientData'
        );
        expect(insufficientFindings).toHaveLength(1);
        expect(insufficientFindings[0].severity).toBe(RiskSeverity.ORANGE);
    });
});

// ═══════════════════════════════════════════════════════════════
//   STEP 4 – Downward Trend Detection
// ═══════════════════════════════════════════════════════════════

describe('Volatility Detector – STEP 4: Downward Trend', () => {
    it('should flag strictly declining grades as NEGATIVE MOMENTUM', () => {
        // Grades: 12 → 10 → 8 → 6 (strictly declining)
        const subjects = [
            examSubject('Geschichte', { Q1_1: 12, Q1_2: 10, Q2_1: 8, Q2_2: 6 }),
        ];
        const profile = nrwProfile(subjects);
        const result = volatilityDetector.detect(profile, NRW_RULESET);

        const trendFindings = result.findings.filter(
            f => f.i18nKey === 'report.volatility.downwardTrend'
        );
        expect(trendFindings).toHaveLength(1);
        expect(trendFindings[0].severity).toBe(RiskSeverity.ORANGE);
    });

    it('should NOT flag non-declining grades as downward trend', () => {
        // Grades: 6 → 8 → 10 → 12 (improving)
        const subjects = [
            examSubject('Geschichte', { Q1_1: 6, Q1_2: 8, Q2_1: 10, Q2_2: 12 }),
        ];
        const profile = nrwProfile(subjects);
        const result = volatilityDetector.detect(profile, NRW_RULESET);

        const trendFindings = result.findings.filter(
            f => f.i18nKey === 'report.volatility.downwardTrend'
        );
        expect(trendFindings).toHaveLength(0);
    });

    it('should NOT flag flat grades as downward trend', () => {
        const subjects = [
            examSubject('Geschichte', { Q1_1: 8, Q1_2: 8, Q2_1: 8, Q2_2: 8 }),
        ];
        const profile = nrwProfile(subjects);
        const result = volatilityDetector.detect(profile, NRW_RULESET);

        const trendFindings = result.findings.filter(
            f => f.i18nKey === 'report.volatility.downwardTrend'
        );
        expect(trendFindings).toHaveLength(0);
    });
});

// ═══════════════════════════════════════════════════════════════
//   Performance Risk (low mean, low SD)
// ═══════════════════════════════════════════════════════════════

describe('Volatility Detector – Performance Risk', () => {
    it('should flag consistently low mean as ORANGE', () => {
        // Mean = 3.5 (below 5), but SD is low → performance risk
        const subjects = [
            examSubject('Sport', { Q1_1: 3, Q1_2: 4, Q2_1: 3, Q2_2: 4 }),
        ];
        const profile = nrwProfile(subjects);
        const result = volatilityDetector.detect(profile, NRW_RULESET);

        const perfRisk = result.findings.filter(
            f => f.i18nKey === 'report.volatility.performanceRisk'
        );
        expect(perfRisk).toHaveLength(1);
        expect(perfRisk[0].severity).toBe(RiskSeverity.ORANGE);
    });

    it('should NOT flag performance risk when mean ≥ 5', () => {
        const subjects = [
            examSubject('Sport', { Q1_1: 5, Q1_2: 5, Q2_1: 5, Q2_2: 5 }),
        ];
        const profile = nrwProfile(subjects);
        const result = volatilityDetector.detect(profile, NRW_RULESET);

        const perfRisk = result.findings.filter(
            f => f.i18nKey === 'report.volatility.performanceRisk'
        );
        expect(perfRisk).toHaveLength(0);
    });

    it('should NOT flag performance risk when tier is VOLATILE', () => {
        // Even with low mean, if tier=VOLATILE the volatile finding takes priority
        const subjects = [
            examSubject('Sport', { Q1_1: 0, Q1_2: 15, Q2_1: 0, Q2_2: 15 }),
        ];
        const profile = nrwProfile(subjects);
        const result = volatilityDetector.detect(profile, NRW_RULESET);

        const perfRisk = result.findings.filter(
            f => f.i18nKey === 'report.volatility.performanceRisk'
        );
        expect(perfRisk).toHaveLength(0);

        // But it should have volatile finding
        const volFinding = result.findings.filter(
            f => f.i18nKey === 'report.volatility.volatile'
        );
        expect(volFinding).toHaveLength(1);
    });
});

// ═══════════════════════════════════════════════════════════════
//   Safe Bets Mode (no exam subjects selected)
// ═══════════════════════════════════════════════════════════════

describe('Volatility Detector – Safe Bets Mode', () => {
    it('should suggest stable subjects as safe bets when no exam subjects', () => {
        const subjects = [
            makeSubject({ name: 'Mathe', semesterGrades: { Q1_1: 10, Q1_2: 10, Q2_1: 10, Q2_2: 10 } }),
            makeSubject({ name: 'Physik', semesterGrades: { Q1_1: 10, Q1_2: 10, Q2_1: 10, Q2_2: 10 } }),
            makeSubject({ name: 'Kunst', semesterGrades: { Q1_1: 15, Q1_2: 2, Q2_1: 14, Q2_2: 1 } }),
        ];
        const profile = nrwProfile(subjects);
        const result = volatilityDetector.detect(profile, NRW_RULESET);

        const safeBets = result.findings.filter(
            f => f.i18nKey === 'report.volatility.safeBet'
        );
        // Mathe and Physik should be suggested (SD=0, STABLE)
        expect(safeBets).toHaveLength(2);
        expect(safeBets[0].severity).toBe(RiskSeverity.GREEN);
    });

    it('should emit noExamSubjects when no stable subjects available', () => {
        // All subjects are volatile → no safe bets to suggest
        const subjects = [
            makeSubject({ name: 'Kunst', semesterGrades: { Q1_1: 15, Q1_2: 2, Q2_1: 14, Q2_2: 1 } }),
        ];
        const profile = nrwProfile(subjects);
        const result = volatilityDetector.detect(profile, NRW_RULESET);

        const noExam = result.findings.filter(
            f => f.i18nKey === 'report.volatility.noExamSubjects'
        );
        expect(noExam).toHaveLength(1);
    });

    it('should emit noExamSubjects when no active subjects at all', () => {
        const profile = nrwProfile([]);
        const result = volatilityDetector.detect(profile, NRW_RULESET);

        expect(result.findings).toHaveLength(1);
        expect(result.findings[0].i18nKey).toBe('report.volatility.noExamSubjects');
    });

    it('should limit safe bet suggestions to 3', () => {
        const subjects = Array.from({ length: 5 }, (_, i) =>
            makeSubject({
                name: `Subject${i}`,
                semesterGrades: { Q1_1: 10, Q1_2: 10, Q2_1: 10, Q2_2: 10 },
            })
        );
        const profile = nrwProfile(subjects);
        const result = volatilityDetector.detect(profile, NRW_RULESET);

        const safeBets = result.findings.filter(
            f => f.i18nKey === 'report.volatility.safeBet'
        );
        expect(safeBets).toHaveLength(3);
    });
});

// ═══════════════════════════════════════════════════════════════
//   General Mode – Custom volatilityThreshold
// ═══════════════════════════════════════════════════════════════

describe('Volatility Detector – General Mode (custom threshold)', () => {
    it('should use rulesConfig.volatilityThreshold for General mode', () => {
        const profile = generalProfile([], { volatilityThreshold: 2.0 });
        const ceil = _internals.getVolatileCeil(profile);
        expect(ceil).toBe(2.0);
    });

    it('should use default SD_VARIABLE_CEIL for NRW', () => {
        const profile = nrwProfile([]);
        const ceil = _internals.getVolatileCeil(profile);
        expect(ceil).toBe(3.5);
    });

    it('should use default SD_VARIABLE_CEIL for Bavaria', () => {
        const profile = bavariaProfile([]);
        const ceil = _internals.getVolatileCeil(profile);
        expect(ceil).toBe(3.5);
    });

    it('should flag VOLATILE with lower custom threshold in General mode', () => {
        // SD ≈ 2.87 → VARIABLE with default 3.5 threshold,
        // but VOLATILE with custom 2.0 threshold
        const subjects = [
            examSubject('Mathe', { Q1_1: 13, Q1_2: 7, Q2_1: 13, Q2_2: 7 }),
        ];
        const profile = generalProfile(subjects, { volatilityThreshold: 2.0 });
        const ruleset = buildGeneralRuleset(profile.rulesConfig);
        const result = volatilityDetector.detect(profile, ruleset);

        const volFindings = result.findings.filter(
            f => f.i18nKey === 'report.volatility.volatile'
        );
        expect(volFindings).toHaveLength(1);
    });

    it('should NOT flag VOLATILE with higher custom threshold', () => {
        // SD ≈ 2.87 → VARIABLE with default, still VARIABLE with 5.0 threshold
        const subjects = [
            examSubject('Mathe', { Q1_1: 13, Q1_2: 7, Q2_1: 13, Q2_2: 7 }),
        ];
        const profile = generalProfile(subjects, { volatilityThreshold: 5.0 });
        const ruleset = buildGeneralRuleset(profile.rulesConfig);
        const result = volatilityDetector.detect(profile, ruleset);

        const volFindings = result.findings.filter(
            f => f.i18nKey === 'report.volatility.volatile'
        );
        expect(volFindings).toHaveLength(0);
    });
});

// ═══════════════════════════════════════════════════════════════
//   Subject Annotations
// ═══════════════════════════════════════════════════════════════

describe('Volatility Detector – Subject Annotations', () => {
    it('should annotate declining trend for declining grades', () => {
        const subjects = [
            examSubject('Geschichte', { Q1_1: 12, Q1_2: 10, Q2_1: 8, Q2_2: 6 }, { id: 'hist-1' }),
        ];
        const profile = nrwProfile(subjects);
        const result = volatilityDetector.detect(profile, NRW_RULESET);

        const annotations = result.subjectAnnotations ?? [];
        const histAnnotation = annotations.find(a => a.subjectId === 'hist-1');
        expect(histAnnotation?.trend).toBe('declining');
    });

    it('should annotate improving trend for improving grades', () => {
        const subjects = [
            examSubject('Physik', { Q1_1: 6, Q1_2: 8, Q2_1: 10, Q2_2: 12 }, { id: 'phys-1' }),
        ];
        const profile = nrwProfile(subjects);
        const result = volatilityDetector.detect(profile, NRW_RULESET);

        const annotations = result.subjectAnnotations ?? [];
        const physAnnotation = annotations.find(a => a.subjectId === 'phys-1');
        expect(physAnnotation?.trend).toBe('improving');
    });

    it('should annotate stable trend for flat grades', () => {
        const subjects = [
            examSubject('Mathe', { Q1_1: 10, Q1_2: 10, Q2_1: 10, Q2_2: 10 }, { id: 'math-1' }),
        ];
        const profile = nrwProfile(subjects);
        const result = volatilityDetector.detect(profile, NRW_RULESET);

        const annotations = result.subjectAnnotations ?? [];
        const mathAnnotation = annotations.find(a => a.subjectId === 'math-1');
        expect(mathAnnotation?.trend).toBe('stable');
    });

    it('should NOT produce annotations for insufficient data subjects', () => {
        const subjects = [
            examSubject('Bio', { Q1_1: 10, Q1_2: null, Q2_1: null, Q2_2: null }, { id: 'bio-1' }),
        ];
        const profile = nrwProfile(subjects);
        const result = volatilityDetector.detect(profile, NRW_RULESET);

        // Insufficient data subjects get a continue in the loop, skipping annotations
        const annotations = result.subjectAnnotations ?? [];
        expect(annotations.find(a => a.subjectId === 'bio-1')).toBeUndefined();
    });
});

// ═══════════════════════════════════════════════════════════════
//   Integration / Edge Cases
// ═══════════════════════════════════════════════════════════════

describe('Volatility Detector – Integration', () => {
    it('should handle mixed exam subjects correctly', () => {
        const subjects = [
            // STABLE (SD=0)
            examSubject('Mathe', { Q1_1: 10, Q1_2: 10, Q2_1: 10, Q2_2: 10 }),
            // VOLATILE (SD ≈ 6.26)
            examSubject('Kunst', { Q1_1: 15, Q1_2: 2, Q2_1: 14, Q2_2: 1 }),
            // VARIABLE + downward (SD ≈ 2.24)
            examSubject('Bio', { Q1_1: 12, Q1_2: 10, Q2_1: 8, Q2_2: 6 }),
        ];
        const profile = nrwProfile(subjects);
        const result = volatilityDetector.detect(profile, NRW_RULESET);

        // Should have volatile, variable, and downward trend findings
        expect(result.findings.some(f => f.i18nKey === 'report.volatility.volatile')).toBe(true);
        expect(result.findings.some(f => f.i18nKey === 'report.volatility.variable')).toBe(true);
        expect(result.findings.some(f => f.i18nKey === 'report.volatility.downwardTrend')).toBe(true);
        // Should NOT have all-clear since there are issues
        expect(result.findings.some(f => f.i18nKey === 'report.volatility.allClear')).toBe(false);
    });

    it('should ignore inactive subjects', () => {
        const subjects = [
            // Exam but inactive → should be skipped
            examSubject('Kunst', { Q1_1: 15, Q1_2: 2, Q2_1: 14, Q2_2: 1 }, { isActive: false }),
            // Exam and active → should be analyzed
            examSubject('Mathe', { Q1_1: 10, Q1_2: 10, Q2_1: 10, Q2_2: 10 }),
        ];
        const profile = nrwProfile(subjects);
        const result = volatilityDetector.detect(profile, NRW_RULESET);

        // Only Mathe should be analyzed → all clear
        expect(result.findings).toHaveLength(1);
        expect(result.findings[0].i18nKey).toBe('report.volatility.allClear');
    });

    it('should handle exam subjects with only 2 grades', () => {
        const subjects = [
            examSubject('Chemie', { Q1_1: 10, Q1_2: 5, Q2_1: null, Q2_2: null }),
        ];
        const profile = nrwProfile(subjects);
        const result = volatilityDetector.detect(profile, NRW_RULESET);

        // 2 grades is enough for SD computation → should not be insufficient
        const insufficient = result.findings.filter(
            f => f.i18nKey === 'report.volatility.insufficientData'
        );
        expect(insufficient).toHaveLength(0);
    });

    it('should handle all-null grades as insufficient data', () => {
        const subjects = [
            examSubject('Chemie', { Q1_1: null, Q1_2: null, Q2_1: null, Q2_2: null }),
        ];
        const profile = nrwProfile(subjects);
        const result = volatilityDetector.detect(profile, NRW_RULESET);

        const insufficient = result.findings.filter(
            f => f.i18nKey === 'report.volatility.insufficientData'
        );
        expect(insufficient).toHaveLength(1);
    });

    it('should work with Bavaria state', () => {
        const subjects = [
            examSubject('Mathe', { Q1_1: 10, Q1_2: 10, Q2_1: 10, Q2_2: 10 }),
        ];
        const profile = bavariaProfile(subjects);
        const result = volatilityDetector.detect(profile, BAVARIA_RULESET);

        expect(result.trapType).toBe(TrapType.Volatility);
        expect(result.findings).toHaveLength(1);
        expect(result.findings[0].severity).toBe(RiskSeverity.GREEN);
    });

    it('should produce both downward trend AND performance risk for low declining grades', () => {
        // Mean = 3.5 (below 5) AND strictly declining
        const subjects = [
            examSubject('Sport', { Q1_1: 5, Q1_2: 4, Q2_1: 3, Q2_2: 2 }),
        ];
        const profile = nrwProfile(subjects);
        const result = volatilityDetector.detect(profile, NRW_RULESET);

        expect(result.findings.some(f => f.i18nKey === 'report.volatility.downwardTrend')).toBe(true);
        expect(result.findings.some(f => f.i18nKey === 'report.volatility.performanceRisk')).toBe(true);
    });
});
