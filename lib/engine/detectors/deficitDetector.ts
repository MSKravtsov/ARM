// ──────────────────────────────────────────────────────────────
// ARM – Trap Detector: Deficit Accumulation (Module 2)
// ──────────────────────────────────────────────────────────────
//
// In the German Abitur, grades ≤04 points are called "Deficits"
// (Unterkurse). Each state imposes a strict quota — exceeding
// it results in automatic disqualification.
//
// Three-stage algorithm:
//   STAGE 1 (RED): Count existing deficits, check against limits.
//                  NRW has a split check: LK sub-limit + total.
//   STAGE 2:       Predict future deficits from null grade slots
//                  using the subject's current average.
//   STAGE 3:       Assign risk level based on projected totals
//                  vs. the state's quota.
//
// Special rules:
//   NRW 2026: Bündelungsgymnasium warning — if deficit count
//   hits 6+ in the G8/G9 transition year, repeating is high-risk.
// ──────────────────────────────────────────────────────────────

import type {
    TrapDetector,
    TrapDetectorResult,
    StateRuleset,
    RiskFinding,
    SubjectRiskAnnotation,
} from '@/types/riskEngine';
import { TrapType, RiskSeverity } from '@/types/riskEngine';
import type {
    UserInputProfile,
    Subject,
    SemesterGrades,
} from '@/types/userInput';
import { FederalState, SubjectType } from '@/types/userInput';

// ─── Semester Key Helpers ───────────────────────────────────

const SEMESTER_KEYS: (keyof SemesterGrades)[] = ['Q1_1', 'Q1_2', 'Q2_1', 'Q2_2'];

// ─── Internal Types ─────────────────────────────────────────

interface DeficitCounts {
    /** Total deficits from existing (non-null) grades. */
    totalCurrent: number;
    /** LK-only deficits from existing grades (NRW split logic). */
    lkCurrent: number;
    /** Subject IDs that have at least one deficit semester. */
    deficitSubjectIds: Set<string>;
}

interface PredictionResult {
    /** Number of predicted future deficits (from null slots with avg < 4.8). */
    predictedDeficits: number;
    /** Projected total = current + predicted. */
    projectedTotal: number;
    /** Projected LK total (NRW only). */
    projectedLk: number;
}

// ─── STAGE 1: Count Current Deficits ────────────────────────

/**
 * STAGE 1 — iterate all existing (non-null) grades, count those
 * below the deficit threshold (< 5 points).
 *
 * For NRW: separately tracks LK deficits for the sub-limit.
 */
function countCurrentDeficits(
    subjects: Subject[],
    deficitThreshold: number
): DeficitCounts {
    let totalCurrent = 0;
    let lkCurrent = 0;
    const deficitSubjectIds = new Set<string>();

    for (const subject of subjects) {
        for (const key of SEMESTER_KEYS) {
            const grade = subject.semesterGrades[key];

            // Skip future / unknown semesters
            if (grade === null || grade === undefined) continue;

            // APO-GOSt / GSO: deficit = grade < deficitThreshold (typically 5)
            if (grade < deficitThreshold) {
                totalCurrent++;
                deficitSubjectIds.add(subject.id);

                if (subject.type === SubjectType.LK) {
                    lkCurrent++;
                }
            }
        }
    }

    return { totalCurrent, lkCurrent, deficitSubjectIds };
}

// ─── STAGE 2: Predictive Projection ────────────────────────

/**
 * Prediction threshold: if a subject's current average is below
 * this value, each future (null) semester is treated as a
 * "predicted deficit" (ghost deficit).
 */
const PREDICTION_THRESHOLD = 4.8;

/**
 * STAGE 2 — for each future (null) grade slot, examine the
 * subject's existing average. If avg < 4.8, that null slot
 * is treated as a predicted deficit.
 */
function predictFutureDeficits(
    subjects: Subject[],
    currentCounts: DeficitCounts
): PredictionResult {
    let predictedDeficits = 0;
    let predictedLk = 0;

    for (const subject of subjects) {
        // Compute average from existing grades
        const existingGrades: number[] = [];
        let nullSlots = 0;

        for (const key of SEMESTER_KEYS) {
            const grade = subject.semesterGrades[key];
            if (grade === null || grade === undefined) {
                nullSlots++;
            } else {
                existingGrades.push(grade);
            }
        }

        // Skip subjects with no existing grades or no future slots
        if (existingGrades.length === 0 || nullSlots === 0) continue;

        const avg = existingGrades.reduce((sum, g) => sum + g, 0) / existingGrades.length;

        if (avg < PREDICTION_THRESHOLD) {
            // Each null slot is a predicted deficit
            predictedDeficits += nullSlots;

            if (subject.type === SubjectType.LK) {
                predictedLk += nullSlots;
            }
        }
    }

    return {
        predictedDeficits,
        projectedTotal: currentCounts.totalCurrent + predictedDeficits,
        projectedLk: currentCounts.lkCurrent + predictedLk,
    };
}

// ─── STAGE 3: Risk Level Assignment ─────────────────────────

/**
 * Determines risk level and generates findings based on deficit
 * counts vs. the state's quota.
 */
function assignRiskLevel(
    profile: UserInputProfile,
    ruleset: StateRuleset,
    counts: DeficitCounts,
    prediction: PredictionResult
): RiskFinding[] {
    const findings: RiskFinding[] = [];

    const maxTotal = ruleset.maxDeficits;
    const maxLk = ruleset.maxLkDeficits;
    const remaining = maxTotal - counts.totalCurrent;
    const affectedIds = Array.from(counts.deficitSubjectIds);

    // ── DISQUALIFIED: Total exceeds limit ──
    if (counts.totalCurrent > maxTotal) {
        findings.push({
            severity: RiskSeverity.RED,
            trapType: TrapType.Deficit,
            message: `Disqualified: ${counts.totalCurrent} deficits detected, maximum allowed is ${maxTotal}.`,
            i18nKey: 'report.deficit.disqualified',
            i18nParams: {
                current: counts.totalCurrent,
                max: maxTotal,
            },
            affectedSubjectIds: affectedIds,
        });
        return findings; // Fail fast
    }

    // ── DISQUALIFIED: NRW LK sub-limit exceeded ──
    // APO-GOSt §29: Max 3 deficits in Leistungskurse
    if (
        profile.federalState === FederalState.NRW &&
        counts.lkCurrent > maxLk
    ) {
        findings.push({
            severity: RiskSeverity.RED,
            trapType: TrapType.Deficit,
            message: `Disqualified: ${counts.lkCurrent} LK deficits detected (APO-GOSt limit: ${maxLk}).`,
            i18nKey: 'report.deficit.lkDisqualified',
            i18nParams: {
                lkCurrent: counts.lkCurrent,
                maxLk,
            },
            affectedSubjectIds: affectedIds,
        });
        return findings; // Fail fast
    }

    // ── NRW 2026 Special: Bündelungsgymnasium Warning ──
    // G8/G9 transition year — repeating is high risk
    if (
        profile.federalState === FederalState.NRW &&
        profile.graduationYear === 2026 &&
        counts.totalCurrent >= 6
    ) {
        findings.push({
            severity: RiskSeverity.ORANGE,
            trapType: TrapType.Deficit,
            message: `Bündelungsgymnasium Warning: ${counts.totalCurrent} deficits in G8/G9 transition year 2026. Repeating the year carries high risk.`,
            i18nKey: 'report.deficit.buendelungsWarning',
            i18nParams: {
                current: counts.totalCurrent,
            },
            affectedSubjectIds: affectedIds,
        });
    }

    // ── HIGH: Projected total exceeds limit ──
    if (prediction.projectedTotal > maxTotal) {
        findings.push({
            severity: RiskSeverity.RED,
            trapType: TrapType.Deficit,
            message: `On track to exceed deficit quota: projected ${prediction.projectedTotal} deficits (limit: ${maxTotal}).`,
            i18nKey: 'report.deficit.projectedExceed',
            i18nParams: {
                projected: prediction.projectedTotal,
                max: maxTotal,
            },
            affectedSubjectIds: affectedIds,
        });
        return findings;
    }

    // ── NRW: Projected LK exceeds sub-limit ──
    if (
        profile.federalState === FederalState.NRW &&
        prediction.projectedLk > maxLk
    ) {
        findings.push({
            severity: RiskSeverity.RED,
            trapType: TrapType.Deficit,
            message: `On track to exceed LK deficit quota: projected ${prediction.projectedLk} LK deficits (limit: ${maxLk}).`,
            i18nKey: 'report.deficit.projectedLkExceed',
            i18nParams: {
                projectedLk: prediction.projectedLk,
                maxLk,
            },
            affectedSubjectIds: affectedIds,
        });
        return findings;
    }

    // ── CRITICAL: Only 1 deficit "life" remaining ──
    if (counts.totalCurrent >= maxTotal - 1) {
        findings.push({
            severity: RiskSeverity.ORANGE,
            trapType: TrapType.Deficit,
            message: `Critical: only ${remaining} deficit${remaining === 1 ? '' : 's'} remaining before disqualification.`,
            i18nKey: 'report.deficit.critical',
            i18nParams: {
                remaining,
                current: counts.totalCurrent,
                max: maxTotal,
            },
            affectedSubjectIds: affectedIds,
        });
    }
    // ── WARNING: 50% of quota consumed ──
    else if (counts.totalCurrent >= Math.floor(maxTotal / 2)) {
        findings.push({
            severity: RiskSeverity.ORANGE,
            trapType: TrapType.Deficit,
            message: `Warning: ${counts.totalCurrent} of ${maxTotal} deficit quota used (${Math.round((counts.totalCurrent / maxTotal) * 100)}%).`,
            i18nKey: 'report.deficit.warning',
            i18nParams: {
                current: counts.totalCurrent,
                max: maxTotal,
                percent: Math.round((counts.totalCurrent / maxTotal) * 100),
            },
            affectedSubjectIds: affectedIds,
        });
    }

    // NRW-specific: LK approaching sub-limit
    if (
        profile.federalState === FederalState.NRW &&
        counts.lkCurrent >= maxLk - 1 &&
        counts.lkCurrent > 0
    ) {
        const lkRemaining = maxLk - counts.lkCurrent;
        findings.push({
            severity: RiskSeverity.ORANGE,
            trapType: TrapType.Deficit,
            message: `LK deficit alert: ${counts.lkCurrent} of ${maxLk} LK deficits used. Only ${lkRemaining} remaining.`,
            i18nKey: 'report.deficit.lkWarning',
            i18nParams: {
                lkCurrent: counts.lkCurrent,
                maxLk,
                lkRemaining,
            },
            affectedSubjectIds: affectedIds,
        });
    }

    return findings;
}

// ─── Annotation Builder ─────────────────────────────────────

function buildAnnotations(
    subjects: Subject[],
    deficitSubjectIds: Set<string>
): Partial<SubjectRiskAnnotation>[] {
    return subjects.map((subject) => ({
        subjectId: subject.id,
        subjectName: subject.name,
        isDeficit: deficitSubjectIds.has(subject.id),
    }));
}

// ─── Exported Detector ──────────────────────────────────────

export const deficitDetector: TrapDetector = {
    trapType: TrapType.Deficit,

    detect(profile: UserInputProfile, ruleset: StateRuleset): TrapDetectorResult {
        // STAGE 1: Count current deficits
        const counts = countCurrentDeficits(profile.subjects, ruleset.deficitThreshold);

        // STAGE 2: Predict future deficits
        const prediction = predictFutureDeficits(profile.subjects, counts);

        // STAGE 3: Assign risk level
        const findings = assignRiskLevel(profile, ruleset, counts, prediction);

        return {
            trapType: TrapType.Deficit,
            findings,
            subjectAnnotations: buildAnnotations(profile.subjects, counts.deficitSubjectIds),
        };
    },
};

// ─── Exported Internals (for unit testing) ──────────────────

export const _internals = {
    countCurrentDeficits,
    predictFutureDeficits,
    PREDICTION_THRESHOLD,
};
