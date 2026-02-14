// ──────────────────────────────────────────────────────────────
// ARM – Trap Detector: Exam Dead-End / Volatility Index (Module 5)
// ──────────────────────────────────────────────────────────────
//
// Exam subjects are *immutable* — once chosen they CANNOT be
// dropped or replaced. A student who picks a volatile subject
// as an exam choice may face wildly unpredictable results.
//
// This detector computes the Standard Deviation (σ) of each
// exam subject's semester grades and classifies the risk:
//   • STABLE:   σ ≤ 1.5  → consistent, reliable performance
//   • VARIABLE: σ ≤ 3.5  → some fluctuation, monitor closely
//   • VOLATILE: σ > 3.5  → high-risk, unpredictable grades
//
// It also checks for:
//   • Downward trends (Q2 < Q1 AND Q3 < Q2) — negative momentum
//   • Consistently low mean (< 5 pts) — performance risk
//   • Safe Bets mode — when no exam subjects are chosen, we
//     analyze ALL active courses and suggest the least volatile
// ──────────────────────────────────────────────────────────────

import type {
    RiskFinding,
    StateRuleset,
    SubjectRiskAnnotation,
    TrapDetector,
    TrapDetectorResult,
} from '@/types/riskEngine';
import { RiskSeverity, TrapType } from '@/types/riskEngine';
import type { Subject, UserInputProfile } from '@/types/userInput';
import { FederalState } from '@/types/userInput';

// ─── Thresholds ─────────────────────────────────────────────

/** Hardcoded SD tier thresholds (NRW, Bavaria, and default). */
const SD_STABLE_CEIL = 1.5;
const SD_VARIABLE_CEIL = 3.5;
/** Mean threshold below which "performance risk" is flagged. */
const PERFORMANCE_RISK_MEAN = 5;
/** Minimum number of data points required for SD to be meaningful. */
const MIN_GRADES_FOR_SD = 2;
/** Number of top safe-bet suggestions to emit. */
const SAFE_BET_LIMIT = 3;

// ─── Risk Tier Enum ─────────────────────────────────────────

type VolatilityTier = 'STABLE' | 'VARIABLE' | 'VOLATILE';

// ─── Internal Helpers ───────────────────────────────────────

/** Grade values extracted from a subject (null → skipped). */
type GradeArray = (number | null)[];

/**
 * Extract semester grades from a subject as an ordered array
 * [Q1_1, Q1_2, Q2_1, Q2_2].
 */
function extractGrades(subject: Subject): GradeArray {
    const g = subject.semesterGrades;
    return [g.Q1_1, g.Q1_2, g.Q2_1, g.Q2_2];
}

/**
 * Filter to only non-null grades. Returns empty array when
 * there's insufficient data.
 */
function filterNonNull(grades: GradeArray): number[] {
    return grades.filter((g): g is number => g !== null);
}

/**
 * Compute the arithmetic mean of an array of numbers.
 * Returns 0 for an empty array (guard: should not be called with empty).
 */
function mean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Compute the population standard deviation of an array.
 * Population SD is used (not sample) because we have *all* the
 * semester grades, not a sample from a larger set.
 *
 * Returns 0 for arrays with fewer than MIN_GRADES_FOR_SD values.
 */
function standardDeviation(values: number[]): number {
    if (values.length < MIN_GRADES_FOR_SD) return 0;
    const avg = mean(values);
    const variance =
        values.reduce((sum, v) => sum + (v - avg) ** 2, 0) / values.length;
    return Math.sqrt(variance);
}

/**
 * Classify a standard deviation value into a risk tier.
 *
 * In General mode, the `volatilityThreshold` from rulesConfig replaces
 * the default SD_VARIABLE_CEIL for the VOLATILE boundary.
 */
function classifyTier(
    sd: number,
    volatileCeil: number = SD_VARIABLE_CEIL
): VolatilityTier {
    if (sd <= SD_STABLE_CEIL) return 'STABLE';
    if (sd <= volatileCeil) return 'VARIABLE';
    return 'VOLATILE';
}

/**
 * Check for a strictly downward trend across consecutive semesters.
 *
 * Returns true if we have ≥ 3 non-null grades AND each subsequent
 * grade is strictly lower than the previous one. (Q2 < Q1 AND Q3 < Q2).
 */
function hasDownwardTrend(grades: GradeArray): boolean {
    const nonNull = filterNonNull(grades);
    if (nonNull.length < 3) return false;
    for (let i = 1; i < nonNull.length; i++) {
        if (nonNull[i] >= nonNull[i - 1]) return false;
    }
    return true;
}

/**
 * Result of analyzing a single subject's volatility.
 */
interface SubjectAnalysis {
    subjectId: string;
    subjectName: string;
    grades: number[];
    mean: number;
    sd: number;
    tier: VolatilityTier;
    isDownwardTrend: boolean;
    insufficientData: boolean;
    isExamSubject: boolean;
}

/**
 * STEP 1 + 2: Analyze a single subject.
 */
function analyzeSubject(
    subject: Subject,
    volatileCeil: number
): SubjectAnalysis {
    const rawGrades = extractGrades(subject);
    const grades = filterNonNull(rawGrades);
    const insufficient = grades.length < MIN_GRADES_FOR_SD;
    const sd = standardDeviation(grades);
    const avg = mean(grades);
    const tier = insufficient ? 'STABLE' : classifyTier(sd, volatileCeil);

    return {
        subjectId: subject.id,
        subjectName: subject.name,
        grades,
        mean: avg,
        sd,
        tier,
        isDownwardTrend: hasDownwardTrend(rawGrades),
        insufficientData: insufficient,
        isExamSubject: subject.isExamSubject,
    };
}

// ─── Finding Builders ───────────────────────────────────────

function insufficientDataFinding(a: SubjectAnalysis): RiskFinding {
    return {
        severity: RiskSeverity.ORANGE,
        trapType: TrapType.Volatility,
        i18nKey: 'report.volatility.insufficientData',
        message: `"${a.subjectName}" has only ${a.grades.length} grade(s) – not enough data to assess volatility. At least ${MIN_GRADES_FOR_SD} grades are needed.`,
        affectedSubjectIds: [a.subjectId],
    };
}

function volatileFinding(a: SubjectAnalysis): RiskFinding {
    return {
        severity: RiskSeverity.RED,
        trapType: TrapType.Volatility,
        i18nKey: 'report.volatility.volatile',
        message: `Exam subject "${a.subjectName}" is VOLATILE (σ = ${a.sd.toFixed(2)}, mean = ${a.mean.toFixed(1)}). Grades swing wildly between semesters — high risk of an unpredictable exam result.`,
        affectedSubjectIds: [a.subjectId],
    };
}

function variableFinding(a: SubjectAnalysis): RiskFinding {
    return {
        severity: RiskSeverity.ORANGE,
        trapType: TrapType.Volatility,
        i18nKey: 'report.volatility.variable',
        message: `Exam subject "${a.subjectName}" shows VARIABLE performance (σ = ${a.sd.toFixed(2)}, mean = ${a.mean.toFixed(1)}). Monitor closely for further fluctuation.`,
        affectedSubjectIds: [a.subjectId],
    };
}

function downwardTrendFinding(a: SubjectAnalysis): RiskFinding {
    return {
        severity: RiskSeverity.ORANGE,
        trapType: TrapType.Volatility,
        i18nKey: 'report.volatility.downwardTrend',
        message: `Exam subject "${a.subjectName}" has a NEGATIVE MOMENTUM — grades are strictly declining across semesters (${a.grades.join(' → ')}).`,
        affectedSubjectIds: [a.subjectId],
    };
}

function performanceRiskFinding(a: SubjectAnalysis): RiskFinding {
    return {
        severity: RiskSeverity.ORANGE,
        trapType: TrapType.Volatility,
        i18nKey: 'report.volatility.performanceRisk',
        message: `Exam subject "${a.subjectName}" has a consistently LOW mean (${a.mean.toFixed(1)} pts). Even with low volatility, the baseline performance is concerning.`,
        affectedSubjectIds: [a.subjectId],
    };
}

function safeBetFinding(analysis: SubjectAnalysis): RiskFinding {
    return {
        severity: RiskSeverity.GREEN,
        trapType: TrapType.Volatility,
        i18nKey: 'report.volatility.safeBet',
        message: `"${analysis.subjectName}" is a SAFE BET for exam selection (σ = ${analysis.sd.toFixed(2)}, mean = ${analysis.mean.toFixed(1)}). Consistent, reliable performance.`,
        affectedSubjectIds: [analysis.subjectId],
    };
}

function allClearFinding(): RiskFinding {
    return {
        severity: RiskSeverity.GREEN,
        trapType: TrapType.Volatility,
        i18nKey: 'report.volatility.allClear',
        message:
            'All exam subjects show stable or acceptable performance. No volatility concerns detected.',
        affectedSubjectIds: [],
    };
}

// ─── Main Detector ──────────────────────────────────────────

/**
 * Determine the volatility ceiling threshold for VOLATILE classification.
 *
 * - NRW / Bavaria: hardcoded SD_VARIABLE_CEIL (3.5)
 * - General: uses `volatilityThreshold` from rulesConfig if available
 */
function getVolatileCeil(profile: UserInputProfile): number {
    if (
        profile.federalState === FederalState.General &&
        profile.rulesConfig?.volatilityThreshold !== undefined
    ) {
        return profile.rulesConfig.volatilityThreshold;
    }
    return SD_VARIABLE_CEIL;
}

function detect(
    profile: UserInputProfile,
    _ruleset: StateRuleset
): TrapDetectorResult {
    const findings: RiskFinding[] = [];
    const annotations: Partial<SubjectRiskAnnotation>[] = [];
    const volatileCeil = getVolatileCeil(profile);

    // ── Filter exam subjects ────────────────────────────────
    const activeSubjects = profile.subjects.filter((s) => s.isActive !== false);
    const examSubjects = activeSubjects.filter((s) => s.isExamSubject);

    // ── Safe Bets mode: no exam subjects chosen ─────────────
    if (examSubjects.length === 0) {
        // Analyze ALL active subjects and suggest the least volatile
        const analyses = activeSubjects.map((s) =>
            analyzeSubject(s, volatileCeil)
        );
        const validAnalyses = analyses.filter((a) => !a.insufficientData);

        // Sort by SD ascending (most stable first)
        validAnalyses.sort((a, b) => a.sd - b.sd);

        const safeBets = validAnalyses.slice(0, SAFE_BET_LIMIT);
        for (const bet of safeBets) {
            if (bet.tier === 'STABLE') {
                findings.push(safeBetFinding(bet));
            }
        }

        // If no findings were emitted at all, emit a generic yellow
        if (findings.length === 0) {
            findings.push({
                severity: RiskSeverity.ORANGE,
                trapType: TrapType.Volatility,
                i18nKey: 'report.volatility.noExamSubjects',
                message:
                    'No exam subjects have been selected yet. Select your exam subjects for a volatility analysis.',
                affectedSubjectIds: [],
            });
        }

        return { trapType: TrapType.Volatility, findings, subjectAnnotations: annotations };
    }

    // ── Analyze each exam subject ───────────────────────────
    let hasVolatilityIssues = false;

    for (const subject of examSubjects) {
        const analysis = analyzeSubject(subject, volatileCeil);

        // STEP 1: Insufficient data check
        if (analysis.insufficientData) {
            findings.push(insufficientDataFinding(analysis));
            continue;
        }

        // STEP 3: Risk classification
        if (analysis.tier === 'VOLATILE') {
            findings.push(volatileFinding(analysis));
            hasVolatilityIssues = true;
        } else if (analysis.tier === 'VARIABLE') {
            findings.push(variableFinding(analysis));
            hasVolatilityIssues = true;
        }

        // STEP 4: Downward trend check
        if (analysis.isDownwardTrend) {
            findings.push(downwardTrendFinding(analysis));
            hasVolatilityIssues = true;
        }

        // Performance risk: consistently low mean regardless of SD
        if (
            analysis.mean < PERFORMANCE_RISK_MEAN &&
            analysis.tier !== 'VOLATILE'
        ) {
            findings.push(performanceRiskFinding(analysis));
            hasVolatilityIssues = true;
        }

        // ── Annotations ─────────────────────────────────────
        annotations.push({
            subjectId: analysis.subjectId,
            subjectName: analysis.subjectName,
            trend: analysis.isDownwardTrend
                ? 'declining'
                : analysis.grades.length >= 2 &&
                    analysis.grades[analysis.grades.length - 1] >
                    analysis.grades[0]
                    ? 'improving'
                    : 'stable',
        });
    }

    // ── All-clear ───────────────────────────────────────────
    if (!hasVolatilityIssues && findings.length === 0) {
        findings.push(allClearFinding());
    }

    return {
        trapType: TrapType.Volatility,
        findings,
        subjectAnnotations: annotations,
    };
}

// ─── Export ─────────────────────────────────────────────────

export const volatilityDetector: TrapDetector = {
    trapType: TrapType.Volatility,
    detect,
};

/** Exposed for unit testing only. */
export const _internals = {
    extractGrades,
    filterNonNull,
    mean,
    standardDeviation,
    classifyTier,
    hasDownwardTrend,
    analyzeSubject,
    getVolatileCeil,
};
