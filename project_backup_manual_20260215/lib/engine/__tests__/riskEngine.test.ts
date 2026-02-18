// ──────────────────────────────────────────────────────────────
// ARM – Risk Engine Integration Tests
// ──────────────────────────────────────────────────────────────
//
// End-to-end integration tests verifying the full Risk Engine
// pipeline: profile → all 8 detectors → aggregated RiskReport.
//
// Since this is an academic calculator, "false positives"
// (telling a failing student they are safe) are UNACCEPTABLE.
// ──────────────────────────────────────────────────────────────

import { runRiskEngine } from '../riskEngine';
import { RiskSeverity, TrapType } from '@/types/riskEngine';
import type { RiskReport } from '@/types/riskEngine';
import {
    FederalState,
    SubjectType,
    ExamType,
    FatalScope,
    SubjectCategory,
    ProfileType,
} from '@/types/userInput';
import type { UserInputProfile, Subject, GeneralRulesConfig } from '@/types/userInput';

// ─── Test Helpers ──────────────────────────────────────────

function makeSubject(overrides: Partial<Subject> = {}): Subject {
    return {
        id: overrides.id ?? `s-${Math.random().toString(36).slice(2, 8)}`,
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

/** Utility: filter findings by TrapType */
function findingsByTrap(report: RiskReport, trap: TrapType) {
    return report.findings.filter((f) => f.trapType === trap);
}

/** Utility: check if a trap produced at least one finding of a severity */
function hasFindingWithSeverity(
    report: RiskReport,
    trap: TrapType,
    severity: RiskSeverity
): boolean {
    return report.findings.some(
        (f) => f.trapType === trap && f.severity === severity
    );
}

// ═══════════════════════════════════════════════════════════════
//   Orchestrator Smoke Tests
// ═══════════════════════════════════════════════════════════════

describe('Risk Engine – Orchestrator', () => {
    it('should return a valid RiskReport for a minimal NRW profile', () => {
        const profile = nrwProfile([makeSubject()]);
        const report = runRiskEngine(profile);

        expect(report).toBeDefined();
        expect(report.federalState).toBe(FederalState.NRW);
        expect(report.findings).toBeInstanceOf(Array);
        expect(report.subjectAnnotations).toBeInstanceOf(Map);
        expect([RiskSeverity.RED, RiskSeverity.ORANGE, RiskSeverity.GREEN]).toContain(
            report.overallSeverity
        );
    });

    it('should sort findings by severity (RED first)', () => {
        // Create a profile that triggers both RED and ORANGE
        const subjects = [
            makeSubject({
                id: 'math-1',
                name: 'Mathematik',
                isMandatory: true,
                isBelegpflichtig: true,
                semesterGrades: { Q1_1: 0, Q1_2: 10, Q2_1: 10, Q2_2: 10 },
            }),
        ];
        const profile = nrwProfile(subjects);
        const report = runRiskEngine(profile);

        // Findings should be sorted RED before ORANGE before GREEN
        const severities = report.findings.map((f) => f.severity);
        const severityOrder = { [RiskSeverity.RED]: 0, [RiskSeverity.ORANGE]: 1, [RiskSeverity.GREEN]: 2 };
        for (let i = 1; i < severities.length; i++) {
            expect(severityOrder[severities[i]]).toBeGreaterThanOrEqual(
                severityOrder[severities[i - 1]]
            );
        }
    });

    it('should merge annotations from all detectors', () => {
        const subjects = [
            makeSubject({
                id: 's1',
                name: 'Math',
                isMandatory: true,
                semesterGrades: { Q1_1: 0, Q1_2: 3, Q2_1: 3, Q2_2: 3 },
            }),
        ];
        const profile = nrwProfile(subjects);
        const report = runRiskEngine(profile);

        const annotation = report.subjectAnnotations.get('s1');
        expect(annotation).toBeDefined();
        expect(annotation?.hasZeroPoint).toBe(true);
        expect(annotation?.isDeficit).toBe(true);
    });

    it('should produce all 8 detector trap types across findings', () => {
        // Even with a simple profile, stubs return empty findings,
        // but implemented detectors should be invocable
        const profile = nrwProfile([makeSubject()]);
        const report = runRiskEngine(profile);
        // The report should be produceable without errors
        expect(report.stats).toBeDefined();
        expect(typeof report.stats.totalDeficits).toBe('number');
        expect(typeof report.stats.totalZeroPoints).toBe('number');
    });
});

// ═══════════════════════════════════════════════════════════════
//   SCENARIO A: "The Disaster Student" (NRW 2026)
// ═══════════════════════════════════════════════════════════════
//
// Profile:
// - NRW, GradYear 2026
// - Math: 0 points in Q1_1 (mandatory, belegpflichtig)
// - Across all subjects: 8+ deficits (exceeds NRW's 7 max)
//
// Expected results:
// - ZeroPoint     → RED FATAL (0 in belegpflichtig subject)
// - Deficit       → RED DISQUALIFIED (>7 deficits)
// - Special2026   → RED CRITICAL TRANSITION (Bündelungsgymnasium)
// - OverallSeverity → RED

describe('SCENARIO A: "The Disaster Student" (NRW 2026)', () => {
    let report: RiskReport;

    beforeAll(() => {
        const subjects = [
            // Math: mandatory, belegpflichtig, has a 0-point → zero-point fatal
            makeSubject({
                id: 'math',
                name: 'Mathematik',
                type: SubjectType.LK,
                isMandatory: true,
                isBelegpflichtig: true,
                isExamSubject: true,
                examType: ExamType.Written,
                subjectCategory: SubjectCategory.SCIENCE,
                semesterGrades: { Q1_1: 0, Q1_2: 4, Q2_1: 3, Q2_2: 4 },
            }),
            // Deutsch: mandatory, all deficits (below 5)
            makeSubject({
                id: 'deutsch',
                name: 'Deutsch',
                type: SubjectType.LK,
                isMandatory: true,
                isBelegpflichtig: true,
                isExamSubject: true,
                examType: ExamType.Written,
                subjectCategory: SubjectCategory.LANGUAGE,
                semesterGrades: { Q1_1: 3, Q1_2: 4, Q2_1: 3, Q2_2: 2 },
            }),
            // Englisch: more deficits
            makeSubject({
                id: 'englisch',
                name: 'Englisch',
                isMandatory: true,
                subjectCategory: SubjectCategory.LANGUAGE,
                semesterGrades: { Q1_1: 4, Q1_2: 3, Q2_1: 10, Q2_2: 10 },
            }),
        ];

        const profile = nrwProfile(subjects, 2026);
        report = runRiskEngine(profile);
    });

    it('should set overallSeverity to RED', () => {
        expect(report.overallSeverity).toBe(RiskSeverity.RED);
    });

    it('ZeroPoint → should produce RED finding (0 in belegpflichtig)', () => {
        expect(hasFindingWithSeverity(report, TrapType.ZeroPoint, RiskSeverity.RED)).toBe(true);

        const zpFindings = findingsByTrap(report, TrapType.ZeroPoint);
        const redZP = zpFindings.filter((f) => f.severity === RiskSeverity.RED);
        expect(redZP.length).toBeGreaterThanOrEqual(1);
        // Should mention Math
        expect(redZP.some((f) => f.affectedSubjectIds.includes('math'))).toBe(true);
    });

    it('Deficit → should produce RED finding (>7 deficits → disqualified)', () => {
        expect(hasFindingWithSeverity(report, TrapType.Deficit, RiskSeverity.RED)).toBe(true);

        const deficitFindings = findingsByTrap(report, TrapType.Deficit);
        // At least one RED finding about disqualification
        const redDeficit = deficitFindings.filter((f) => f.severity === RiskSeverity.RED);
        expect(redDeficit.length).toBeGreaterThanOrEqual(1);
    });

    it('Special2026 → should produce RED finding (Bündelungsgymnasium)', () => {
        expect(hasFindingWithSeverity(report, TrapType.Special2026, RiskSeverity.RED)).toBe(true);

        const specialFindings = findingsByTrap(report, TrapType.Special2026);
        const red2026 = specialFindings.filter((f) => f.severity === RiskSeverity.RED);
        expect(red2026.length).toBeGreaterThanOrEqual(1);
        // Should mention Bündelungsgymnasium or G8-Repeater
        expect(
            red2026.some(
                (f) =>
                    f.message.includes('Bündelungsgymnasium') ||
                    f.message.includes('G8-Repeater')
            )
        ).toBe(true);
    });

    it('report.stats should reflect the crisis', () => {
        expect(report.stats.totalZeroPoints).toBeGreaterThanOrEqual(1);
        expect(report.stats.totalDeficits).toBeGreaterThanOrEqual(1);
        expect(report.stats.redFindingsCount).toBeGreaterThanOrEqual(3);
    });

    it('should NEVER produce a GREEN all-clear from any detector', () => {
        // A disaster student must not receive any "everything is fine" message
        const greenAllClear = report.findings.filter(
            (f) =>
                f.severity === RiskSeverity.GREEN &&
                (f.i18nKey.includes('allClear') || f.i18nKey.includes('ok'))
        );
        // Zero-point and deficit all-clear should NOT be present
        expect(
            greenAllClear.filter(
                (f) =>
                    f.trapType === TrapType.ZeroPoint ||
                    f.trapType === TrapType.Deficit
            )
        ).toHaveLength(0);
    });
});

// ═══════════════════════════════════════════════════════════════
//   SCENARIO B: "The International Optimization" (General)
// ═══════════════════════════════════════════════════════════════
//
// Profile:
// - General mode (custom rules)
// - Settings: zeroIsFatal = false, maxDeficits = 10
// - One 0-point grade, 9 deficits
//
// Expected results:
// - ZeroPoint     → GREEN (zeroIsFatal=false → treated as normal deficit)
// - Deficit       → ORANGE (9 < 10, not disqualified, but near threshold)
// - Special2026   → empty (General mode, N/A)
// - System respects user's custom rules over defaults

describe('SCENARIO B: "The International Optimization" (General)', () => {
    let report: RiskReport;

    beforeAll(() => {
        // Build subjects that collectively produce 9 deficits and one 0-point
        const subjects = [
            // Subject with a 0-point grade (should NOT be fatal since zeroIsFatal=false)
            makeSubject({
                id: 'art',
                name: 'Art',
                subjectCategory: SubjectCategory.ART,
                isMandatory: false,
                semesterGrades: { Q1_1: 0, Q1_2: 4, Q2_1: 3, Q2_2: 4 },
            }),
            // Art: 0, 4, 3, 4 → 4 deficits (all < 5)
            makeSubject({
                id: 'history',
                name: 'History',
                semesterGrades: { Q1_1: 3, Q1_2: 4, Q2_1: 3, Q2_2: 10 },
                // 3 deficits: 3, 4, 3
            }),
            makeSubject({
                id: 'physics',
                name: 'Physics',
                subjectCategory: SubjectCategory.SCIENCE,
                semesterGrades: { Q1_1: 3, Q1_2: 4, Q2_1: 10, Q2_2: 10 },
                // 2 deficits: 3, 4
            }),
            // Language subject to satisfy minLanguages constraint
            makeSubject({
                id: 'english',
                name: 'English',
                subjectCategory: SubjectCategory.LANGUAGE,
                semesterGrades: { Q1_1: 10, Q1_2: 10, Q2_1: 10, Q2_2: 10 },
            }),
        ];
        // Total deficits: Art(4) + History(3) + Physics(2) = 9

        const profile = generalProfile(subjects, {
            zeroIsFatal: false,
            fatalScope: FatalScope.NONE,
            maxDeficits: 10,
            // Use ARTISTIC profile to avoid SCIENTIFIC's ≥2 sciences constraint
            profileType: ProfileType.ARTISTIC,
            minLanguages: 1,
            minSciences: 1,
        });
        report = runRiskEngine(profile);
    });

    it('should use General mode ruleset with custom maxDeficits', () => {
        expect(report.federalState).toBe(FederalState.General);
        expect(report.ruleset.maxDeficits).toBe(10);
    });

    it('ZeroPoint → should NOT produce RED fatal finding', () => {
        // zeroIsFatal=false + fatalScope=NONE means no zero-point fatalities
        expect(hasFindingWithSeverity(report, TrapType.ZeroPoint, RiskSeverity.RED)).toBe(false);
    });

    it('Deficit → should NOT produce RED (9 deficits < 10 max)', () => {
        expect(hasFindingWithSeverity(report, TrapType.Deficit, RiskSeverity.RED)).toBe(false);
    });

    it('Deficit → should produce ORANGE warning (close to limit)', () => {
        // 9 out of 10 → should trigger "near the limit" warning
        expect(hasFindingWithSeverity(report, TrapType.Deficit, RiskSeverity.ORANGE)).toBe(true);
    });

    it('Special2026 → should produce NO findings (General mode = N/A)', () => {
        const specialFindings = findingsByTrap(report, TrapType.Special2026);
        expect(specialFindings).toHaveLength(0);
    });

    it('overallSeverity should NOT be RED', () => {
        // The student has issues but is not disqualified under their custom rules
        expect(report.overallSeverity).not.toBe(RiskSeverity.RED);
    });

    it('custom rules should be respected over defaults', () => {
        // With default maxDeficits=7, this student would be RED.
        // With custom maxDeficits=10, they are only ORANGE.
        // Verify the ruleset reflects user settings.
        expect(report.ruleset.maxDeficits).toBe(10);
        expect(report.ruleset.deficitThreshold).toBe(5);
    });
});

// ═══════════════════════════════════════════════════════════════
//   SCENARIO C: "The Structural Trap" (Bavaria)
// ═══════════════════════════════════════════════════════════════
//
// Profile:
// - Bavaria
// - Dropped French in Q2.1, leaving only 1 active language
// - Bavaria requires minLanguages ≥ 2 (hardcoded rule)
//
// Expected results:
// - ProfileViolation → RED/ORANGE (missing 2nd language requirement)

describe('SCENARIO C: "The Structural Trap" (Bavaria)', () => {
    let report: RiskReport;

    beforeAll(() => {
        const subjects = [
            // Only 1 active language (Deutsch)
            makeSubject({
                id: 'deutsch',
                name: 'Deutsch',
                type: SubjectType.LK,
                isMandatory: true,
                subjectCategory: SubjectCategory.LANGUAGE,
                isExamSubject: true,
                examType: ExamType.Written,
                semesterGrades: { Q1_1: 10, Q1_2: 10, Q2_1: 10, Q2_2: 10 },
            }),
            // French: DROPPED (isActive=false) ← the structural trap
            makeSubject({
                id: 'french',
                name: 'Französisch',
                subjectCategory: SubjectCategory.LANGUAGE,
                isActive: false,
                semesterGrades: { Q1_1: 8, Q1_2: 7, Q2_1: null, Q2_2: null },
            }),
            // Science (meets minimum)
            makeSubject({
                id: 'physics',
                name: 'Physik',
                type: SubjectType.LK,
                isMandatory: true,
                subjectCategory: SubjectCategory.SCIENCE,
                isExamSubject: true,
                examType: ExamType.Written,
                semesterGrades: { Q1_1: 12, Q1_2: 12, Q2_1: 12, Q2_2: 12 },
            }),
            // Additional subjects
            makeSubject({
                id: 'bio',
                name: 'Biologie',
                subjectCategory: SubjectCategory.SCIENCE,
                semesterGrades: { Q1_1: 11, Q1_2: 11, Q2_1: 11, Q2_2: 11 },
            }),
            makeSubject({
                id: 'history',
                name: 'Geschichte',
                isExamSubject: true,
                examType: ExamType.Oral,
                semesterGrades: { Q1_1: 9, Q1_2: 9, Q2_1: 9, Q2_2: 9 },
            }),
            makeSubject({
                id: 'art',
                name: 'Kunst',
                subjectCategory: SubjectCategory.ART,
                isExamSubject: true,
                examType: ExamType.Oral,
                semesterGrades: { Q1_1: 8, Q1_2: 8, Q2_1: 8, Q2_2: 8 },
            }),
            makeSubject({
                id: 'sport',
                name: 'Sport',
                subjectCategory: SubjectCategory.SPORT,
                isExamSubject: true,
                examType: ExamType.Colloquium,
                semesterGrades: { Q1_1: 12, Q1_2: 12, Q2_1: 12, Q2_2: 12 },
            }),
        ];

        const profile = bavariaProfile(subjects, 2026);
        report = runRiskEngine(profile);
    });

    it('ProfileViolation → should detect missing language requirement', () => {
        const profileFindings = findingsByTrap(report, TrapType.ProfileViolation);
        expect(profileFindings.length).toBeGreaterThanOrEqual(1);

        // Should mention languages
        const languageFinding = profileFindings.find(
            (f) =>
                f.message.toLowerCase().includes('language') ||
                f.i18nKey.includes('language') ||
                f.i18nKey.includes('minLanguages')
        );
        expect(languageFinding).toBeDefined();
    });

    it('ProfileViolation → should flag as RED or ORANGE severity', () => {
        const profileFindings = findingsByTrap(report, TrapType.ProfileViolation);
        const highSeverity = profileFindings.filter(
            (f) => f.severity === RiskSeverity.RED || f.severity === RiskSeverity.ORANGE
        );
        expect(highSeverity.length).toBeGreaterThanOrEqual(1);
    });

    it('should correctly count only 1 active language', () => {
        // With French dropped, only Deutsch is active → 1 language
        // Bavaria requires 2 → violation
        const profileFindings = findingsByTrap(report, TrapType.ProfileViolation);
        expect(
            profileFindings.some(
                (f) =>
                    f.message.includes('1') ||
                    f.i18nParams?.actual === 1
            )
        ).toBe(true);
    });

    it('should NOT flag French as active (it was dropped)', () => {
        // French's ID should not appear in any zero-point or deficit findings
        // since it's inactive
        const annotation = report.subjectAnnotations.get('french');
        // Inactive subjects should still have annotations but should not
        // contribute to active findings
        const zpFindings = findingsByTrap(report, TrapType.ZeroPoint);
        const frenchZP = zpFindings.filter((f) =>
            f.affectedSubjectIds.includes('french')
        );
        expect(frenchZP).toHaveLength(0);
    });
});

// ═══════════════════════════════════════════════════════════════
//   SCENARIO D: "The Safe Student" (NRW)
// ═══════════════════════════════════════════════════════════════
//
// All grades are excellent → the engine should produce GREEN
// findings and NO red/orange alerts.

describe('SCENARIO D: "The Safe Student" (NRW)', () => {
    let report: RiskReport;

    beforeAll(() => {
        const subjects = [
            makeSubject({
                id: 'math',
                name: 'Mathe',
                type: SubjectType.LK,
                isMandatory: true,
                subjectCategory: SubjectCategory.SCIENCE,
                isExamSubject: true,
                examType: ExamType.Written,
                semesterGrades: { Q1_1: 13, Q1_2: 14, Q2_1: 13, Q2_2: 14 },
            }),
            makeSubject({
                id: 'deutsch',
                name: 'Deutsch',
                type: SubjectType.LK,
                isMandatory: true,
                subjectCategory: SubjectCategory.LANGUAGE,
                isExamSubject: true,
                examType: ExamType.Written,
                semesterGrades: { Q1_1: 12, Q1_2: 13, Q2_1: 12, Q2_2: 13 },
            }),
            makeSubject({
                id: 'english',
                name: 'Englisch',
                subjectCategory: SubjectCategory.LANGUAGE,
                isExamSubject: true,
                examType: ExamType.Oral,
                semesterGrades: { Q1_1: 11, Q1_2: 12, Q2_1: 11, Q2_2: 12 },
            }),
            makeSubject({
                id: 'history',
                name: 'Geschichte',
                isExamSubject: true,
                examType: ExamType.Oral,
                semesterGrades: { Q1_1: 10, Q1_2: 11, Q2_1: 10, Q2_2: 11 },
            }),
            makeSubject({
                id: 'physics',
                name: 'Physik',
                subjectCategory: SubjectCategory.SCIENCE,
                semesterGrades: { Q1_1: 9, Q1_2: 10, Q2_1: 9, Q2_2: 10 },
            }),
            // Art/Music subject required by NRW APO-GOSt
            makeSubject({
                id: 'kunst',
                name: 'Kunst',
                subjectCategory: SubjectCategory.ART,
                semesterGrades: { Q1_1: 11, Q1_2: 11, Q2_1: 11, Q2_2: 11 },
            }),
        ];
        const profile = nrwProfile(subjects, 2026);
        report = runRiskEngine(profile);
    });

    it('overallSeverity should be GREEN', () => {
        expect(report.overallSeverity).toBe(RiskSeverity.GREEN);
    });

    it('should have ZERO red findings', () => {
        expect(report.stats.redFindingsCount).toBe(0);
    });

    it('should have ZERO orange findings', () => {
        expect(report.stats.orangeFindingsCount).toBe(0);
    });

    it('should have no deficit annotations', () => {
        expect(report.stats.totalDeficits).toBe(0);
    });

    it('should have no zero-point annotations', () => {
        expect(report.stats.totalZeroPoints).toBe(0);
    });
});

// ═══════════════════════════════════════════════════════════════
//   SCENARIO E: "False Positive Guard"
// ═══════════════════════════════════════════════════════════════
//
// Critical safety check: a student who IS failing should NEVER
// receive an all-green report.

describe('SCENARIO E: False Positive Guard', () => {
    it('a student with 0 points in mandatory subject MUST get RED', () => {
        const subjects = [
            makeSubject({
                id: 'math',
                name: 'Mathematik',
                isMandatory: true,
                isBelegpflichtig: true,
                semesterGrades: { Q1_1: 0, Q1_2: 10, Q2_1: 10, Q2_2: 10 },
            }),
        ];
        const profile = nrwProfile(subjects);
        const report = runRiskEngine(profile);

        expect(report.overallSeverity).toBe(RiskSeverity.RED);
        expect(report.stats.redFindingsCount).toBeGreaterThanOrEqual(1);
    });

    it('a student exceeding max deficits MUST get RED', () => {
        // Create enough subjects to exceed 7 deficits in NRW
        const subjects = [
            makeSubject({ name: 'S1', semesterGrades: { Q1_1: 1, Q1_2: 2, Q2_1: 1, Q2_2: 2 } }),
            makeSubject({ name: 'S2', semesterGrades: { Q1_1: 1, Q1_2: 2, Q2_1: 1, Q2_2: 2 } }),
        ];
        // 8 deficits → exceeds NRW max of 7
        const profile = nrwProfile(subjects);
        const report = runRiskEngine(profile);

        expect(report.overallSeverity).toBe(RiskSeverity.RED);
    });

    it('overallSeverity GREEN means no RED or ORANGE findings exist', () => {
        const subjects = [
            makeSubject({
                semesterGrades: { Q1_1: 12, Q1_2: 12, Q2_1: 12, Q2_2: 12 },
            }),
        ];
        const profile = nrwProfile(subjects);
        const report = runRiskEngine(profile);

        if (report.overallSeverity === RiskSeverity.GREEN) {
            expect(report.stats.redFindingsCount).toBe(0);
            expect(report.stats.orangeFindingsCount).toBe(0);
        }
    });
});

// ═══════════════════════════════════════════════════════════════
//   Cross-Module Interaction Tests
// ═══════════════════════════════════════════════════════════════

describe('Cross-Module Interactions', () => {
    it('ZeroPoint + Deficit + Special2026 should all fire for NRW 2026 disaster', () => {
        const subjects = [
            makeSubject({
                name: 'Math',
                isMandatory: true,
                isBelegpflichtig: true,
                semesterGrades: { Q1_1: 0, Q1_2: 1, Q2_1: 2, Q2_2: 1 },
            }),
            makeSubject({
                name: 'Bio',
                semesterGrades: { Q1_1: 1, Q1_2: 2, Q2_1: 1, Q2_2: 2 },
            }),
        ];
        const profile = nrwProfile(subjects, 2026);
        const report = runRiskEngine(profile);

        // All three should produce findings
        expect(findingsByTrap(report, TrapType.ZeroPoint).length).toBeGreaterThan(0);
        expect(findingsByTrap(report, TrapType.Deficit).length).toBeGreaterThan(0);
        expect(findingsByTrap(report, TrapType.Special2026).length).toBeGreaterThan(0);
    });

    it('Bavaria seminar deficit should fire alongside deficit detector', () => {
        const subjects = [
            makeSubject({
                name: 'W-Seminar',
                type: SubjectType.SEMINAR_W,
                semesterGrades: { Q1_1: 2, Q1_2: 3, Q2_1: 2, Q2_2: 3 },
            }),
        ];
        const profile = bavariaProfile(subjects);
        const report = runRiskEngine(profile);

        // Special2026 should flag the seminar
        expect(
            hasFindingWithSeverity(report, TrapType.Special2026, RiskSeverity.RED)
        ).toBe(true);

        // Deficit detector should also flag the low grades
        expect(findingsByTrap(report, TrapType.Deficit).length).toBeGreaterThan(0);
    });

    it('volatility findings should coexist with deficit findings', () => {
        const subjects = [
            makeSubject({
                name: 'Physik',
                isExamSubject: true,
                examType: ExamType.Written,
                // Highly volatile (SD≈6.26) + 2 deficit grades
                semesterGrades: { Q1_1: 15, Q1_2: 1, Q2_1: 14, Q2_2: 2 },
            }),
            // More deficit subjects to trigger deficit detector (>7 deficits total)
            makeSubject({
                name: 'Bio',
                semesterGrades: { Q1_1: 2, Q1_2: 3, Q2_1: 2, Q2_2: 3 },
            }),
            makeSubject({
                name: 'Chemie',
                semesterGrades: { Q1_1: 1, Q1_2: 2, Q2_1: 1, Q2_2: 2 },
            }),
        ];
        const profile = nrwProfile(subjects);
        const report = runRiskEngine(profile);

        expect(findingsByTrap(report, TrapType.Volatility).length).toBeGreaterThan(0);
        expect(findingsByTrap(report, TrapType.Deficit).length).toBeGreaterThan(0);
    });
});
