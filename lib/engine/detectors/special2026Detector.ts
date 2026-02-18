// ──────────────────────────────────────────────────────────────
// ARM – Trap Detector: Special 2026 MVP Indicators (Module 8)
// ──────────────────────────────────────────────────────────────
//
// Handles transitional risks specific to the 2026 graduation
// cohort due to regulatory changes in Germany:
//
// 1. NRW (2026 only): The "Void Year." G8 ends, G9 begins.
//    Students who fail cannot repeat at their current school;
//    they must transfer to a "Bündelungsgymnasium."
//
// 2. BAVARIA: The G9 rollout places high weight on Seminars
//    (W-Seminar & P-Seminar). Deficits here are structurally
//    dangerous and underestimated by many students.
//
// 3. GENERAL: These transitional rules do not apply.
// ──────────────────────────────────────────────────────────────

import type {
    RiskFinding,
    StateRuleset,
    TrapDetector,
    TrapDetectorResult,
} from '@/types/riskEngine';
import { RiskSeverity, TrapType } from '@/types/riskEngine';
import type { UserInputProfile, Subject, SemesterGrades } from '@/types/userInput';
import { FederalState, SubjectType } from '@/types/userInput';

// ─── Constants ──────────────────────────────────────────────

/** The NRW "void year" — the only year where the Bündelungsgymnasium trap applies. */
const NRW_VOID_YEAR = 2026;

/** Deficit count at or above which the NRW repeat-risk warning triggers. */
const NRW_HIGH_DEFICIT_THRESHOLD = 6;

/** Seminar grade below which an optimization alert is emitted. */
const SEMINAR_OPTIMIZATION_THRESHOLD = 9;

/** Seminar grade below which a hard anchor (deficit) alert is emitted. */
const SEMINAR_DEFICIT_THRESHOLD = 5;

// ─── Semester Key Helpers ───────────────────────────────────

const SEMESTER_KEYS: (keyof SemesterGrades)[] = ['Q1_1', 'Q1_2', 'Q2_1', 'Q2_2'];

/**
 * Count the total number of deficit grades across all subjects.
 * A grade is a deficit when it is non-null and below the given threshold.
 */
function countDeficits(subjects: Subject[], threshold: number): number {
    let count = 0;
    for (const subject of subjects) {
        if (subject.isActive === false) continue;
        for (const key of SEMESTER_KEYS) {
            const grade = subject.semesterGrades[key];
            if (grade !== null && grade < threshold) {
                count++;
            }
        }
    }
    return count;
}

/**
 * Count the number of deficit grades in LK subjects only.
 * A grade is a deficit when it is non-null and below the given threshold.
 */
function countLkDeficits(subjects: Subject[], threshold: number): number {
    let count = 0;
    for (const subject of subjects) {
        if (subject.isActive === false) continue;
        if (subject.type !== SubjectType.LK) continue; // LK subjects only
        for (const key of SEMESTER_KEYS) {
            const grade = subject.semesterGrades[key];
            if (grade !== null && grade < threshold) {
                count++;
            }
        }
    }
    return count;
}

/**
 * Check whether a student is disqualified (any zero-point grade
 * in a mandatory / belegpflichtig subject, or deficit overflow).
 */
function isStudentDisqualified(
    subjects: Subject[],
    totalDeficits: number,
    maxDeficits: number
): boolean {
    // Deficit overflow
    if (totalDeficits > maxDeficits) return true;

    // Zero-point in mandatory/belegpflichtig subjects
    for (const subject of subjects) {
        if (subject.isActive === false) continue;
        if (!subject.isMandatory && !subject.isBelegpflichtig) continue;
        for (const key of SEMESTER_KEYS) {
            const grade = subject.semesterGrades[key];
            if (grade === 0) return true;
        }
    }

    return false;
}

/**
 * Compute the mean of a seminar subject's non-null semester grades.
 * Returns null if no grades are available.
 */
function seminarMean(subject: Subject): number | null {
    const grades: number[] = [];
    for (const key of SEMESTER_KEYS) {
        const g = subject.semesterGrades[key];
        if (g !== null) grades.push(g);
    }
    if (grades.length === 0) return null;
    return grades.reduce((sum, v) => sum + v, 0) / grades.length;
}

// ─── Finding Builders ───────────────────────────────────────

function nrwGapYearCriticalFinding(totalDeficits: number, lkDeficits: number): RiskFinding {
    return {
        severity: RiskSeverity.RED,
        trapType: TrapType.Special2026,
        i18nKey: 'report.special2026.nrw.gapYearCritical',
        message:
            `CRITICAL TRANSITION RISK: With ${totalDeficits} total deficits (${lkDeficits} in LK courses), ` +
            `you are in the danger zone for the 2026 "Gap Year" void. Repeating the year at ` +
            `this school is likely IMPOSSIBLE due to the G8/G9 transition. Failure may force ` +
            `a transfer to a centralized 'Bündelungsgymnasium' with limited capacity. Take ` +
            `immediate action to secure your grades.`,
        i18nParams: { totalDeficits, lkDeficits },
        affectedSubjectIds: [],
    };
}

function nrwCriticalTransitionFinding(): RiskFinding {
    return {
        severity: RiskSeverity.RED,
        trapType: TrapType.Special2026,
        i18nKey: 'report.special2026.nrw.criticalTransition',
        message:
            `Critical Transition: Since you must repeat, verify immediately if your ` +
            `school offers a 'G8-Repeater' class. If not, you must register at a ` +
            `Bündelungsgymnasium.`,
        affectedSubjectIds: [],
    };
}

function seminarOptimizationFinding(subject: Subject, avg: number): RiskFinding {
    return {
        severity: RiskSeverity.ORANGE,
        trapType: TrapType.Special2026,
        i18nKey: 'report.special2026.bavaria.seminarOptimization',
        message:
            `Optimization Alert: "${subject.name}" (avg ${avg.toFixed(1)} pts) — ` +
            `Seminar points are high-yield. Improving this adds more value than a ` +
            `standard Grundkurs.`,
        i18nParams: { subjectName: subject.name, average: Math.round(avg * 10) / 10 },
        affectedSubjectIds: [subject.id],
    };
}

function seminarHardAnchorFinding(subject: Subject, avg: number): RiskFinding {
    return {
        severity: RiskSeverity.RED,
        trapType: TrapType.Special2026,
        i18nKey: 'report.special2026.bavaria.seminarHardAnchor',
        message:
            `Hard Anchor Alert: "${subject.name}" (avg ${avg.toFixed(1)} pts) — ` +
            `A deficit in a Seminar is structurally dangerous in the new G9 system. ` +
            `Prioritize fixing this immediately.`,
        i18nParams: { subjectName: subject.name, average: Math.round(avg * 10) / 10 },
        affectedSubjectIds: [subject.id],
    };
}

// ─── Mode Handlers ──────────────────────────────────────────

/**
 * NRW Mode: The "Bündelungsgymnasium" Trap.
 *
 * Only fires for NRW + gradYear 2026. Checks deficit proximity
 * and disqualification status.
 */
function evaluateNRW(
    profile: UserInputProfile,
    ruleset: StateRuleset
): RiskFinding[] {
    if (profile.graduationYear !== NRW_VOID_YEAR) return [];

    const findings: RiskFinding[] = [];
    const activeSubjects = profile.subjects.filter((s) => s.isActive !== false);
    const totalDeficits = countDeficits(activeSubjects, ruleset.deficitThreshold);
    const lkDeficits = countLkDeficits(activeSubjects, ruleset.deficitThreshold);
    const disqualified = isStudentDisqualified(
        activeSubjects,
        totalDeficits,
        ruleset.maxDeficits
    );

    // CONDITION 1: Already disqualified → RED (check first, takes precedence)
    if (disqualified) {
        findings.push(nrwCriticalTransitionFinding());
    }
    // CONDITION 2: Gap Year Critical Zone → RED
    // Trigger: totalDeficits >= 6 OR lkDeficits >= 2
    else if (totalDeficits >= NRW_HIGH_DEFICIT_THRESHOLD || lkDeficits >= 2) {
        findings.push(nrwGapYearCriticalFinding(totalDeficits, lkDeficits));
    }

    return findings;
}

/**
 * Bavaria Mode: The "Seminar" Anchor.
 *
 * Fires for any Bavaria graduation year. Checks W-Seminar and
 * P-Seminar grades for optimization/deficit thresholds.
 */
function evaluateBavaria(profile: UserInputProfile): RiskFinding[] {
    const findings: RiskFinding[] = [];
    const activeSubjects = profile.subjects.filter((s) => s.isActive !== false);

    const seminars = activeSubjects.filter(
        (s) => s.type === SubjectType.SEMINAR_W || s.type === SubjectType.SEMINAR_P
    );

    for (const seminar of seminars) {
        const avg = seminarMean(seminar);
        if (avg === null) continue; // No grades yet

        // Hard anchor: deficit level (< 5) takes priority
        if (avg < SEMINAR_DEFICIT_THRESHOLD) {
            findings.push(seminarHardAnchorFinding(seminar, avg));
        }
        // Optimization: mediocre level (< 9)
        else if (avg < SEMINAR_OPTIMIZATION_THRESHOLD) {
            findings.push(seminarOptimizationFinding(seminar, avg));
        }
    }

    return findings;
}

// ─── Main Detector ──────────────────────────────────────────

function detect(
    profile: UserInputProfile,
    ruleset: StateRuleset
): TrapDetectorResult {
    let findings: RiskFinding[] = [];

    switch (profile.federalState) {
        case FederalState.NRW:
            findings = evaluateNRW(profile, ruleset);
            break;
        case FederalState.Bavaria:
            findings = evaluateBavaria(profile);
            break;
        case FederalState.General:
        default:
            // These transitional rules do not apply
            break;
    }

    return {
        trapType: TrapType.Special2026,
        findings,
        subjectAnnotations: [],
    };
}

// ─── Export ─────────────────────────────────────────────────

export const special2026Detector: TrapDetector = {
    trapType: TrapType.Special2026,
    detect,
};

/** Exposed for unit testing only. */
export const _internals = {
    countDeficits,
    countLkDeficits,
    isStudentDisqualified,
    seminarMean,
    evaluateNRW,
    evaluateBavaria,
    NRW_VOID_YEAR,
    NRW_HIGH_DEFICIT_THRESHOLD,
    SEMINAR_OPTIMIZATION_THRESHOLD,
    SEMINAR_DEFICIT_THRESHOLD,
};
