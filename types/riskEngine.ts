// ──────────────────────────────────────────────────────────────
// ARM – Risk Engine Type Definitions
// ──────────────────────────────────────────────────────────────

import type { Subject, UserInputProfile } from './userInput';

// ─── Severity Levels ────────────────────────────────────────

/** Risk severity — drives UI hierarchy (RED blocks ORANGE/GREEN). */
export enum RiskSeverity {
    /** Hard stop — legal disqualification. */
    RED = 'RED',
    /** Structural weakness — needs attention. */
    ORANGE = 'ORANGE',
    /** Safe / optimization opportunity. */
    GREEN = 'GREEN',
}

// ─── Trap Types ─────────────────────────────────────────────

/** The 8 core detector modules (including Module 7: Psychosocial). */
export enum TrapType {
    ZeroPoint = 'ZeroPoint',
    Deficit = 'Deficit',
    Anchor = 'Anchor',
    PointsProjection = 'PointsProjection',
    ExamRisk = 'ExamRisk',
    Volatility = 'Volatility',
    ProfileViolation = 'ProfileViolation',
    Special2026 = 'Special2026',
    Psychosocial = 'Psychosocial',
}

// ─── Risk Findings ──────────────────────────────────────────

/** A single detected risk issue. */
export interface RiskFinding {
    /** Severity level of this finding. */
    severity: RiskSeverity;
    /** Which detector produced this finding. */
    trapType: TrapType;
    /** Human-readable summary (English fallback). */
    message: string;
    /** i18n key for the dashboard (e.g., "report.zeroPoint.found"). */
    i18nKey: string;
    /** i18n interpolation values (e.g., { count: 2, subjectName: "Math" }). */
    i18nParams?: Record<string, string | number>;
    /** IDs of subjects affected by this finding. */
    affectedSubjectIds: string[];
}

// ─── Per-Subject Annotations ────────────────────────────────

/** Annotations computed for each subject by the engine. */
export interface SubjectRiskAnnotation {
    subjectId: string;
    subjectName: string;
    /** True if this subject is a "keystone" — legally required, cannot be dropped. */
    isKeystone: boolean;
    /** True if any semester has 0 points. */
    hasZeroPoint: boolean;
    /** True if any contributing semester is below the deficit threshold. */
    isDeficit: boolean;
    /** Weighted points this subject contributes to the total. */
    contributedPoints: number;
    /** Grade trend across semesters: "improving", "declining", or "stable". */
    trend: 'improving' | 'declining' | 'stable';

    // ── Psychosocial Risk Indicators (Module 7) ──
    /** Risk multiplier from psychosocial analysis (1.0 = no change, >1.0 = increased urgency). */
    riskMultiplier?: number;
    /** True if good grades but low confidence (hidden volatility/burnout risk). */
    isFragile?: boolean;
    /** True if borderline grade with anxiety (collapse predictor). */
    isUnstable?: boolean;
    /** True if structural barriers detected (health issues, external pressure). */
    hasStructuralBarriers?: boolean;
    /** Dominant stress factor type for this subject. */
    dominantStressType?: 'METHODOLOGICAL' | 'PSYCHOLOGICAL' | 'STRUCTURAL';
}

// ─── Detector Interface ─────────────────────────────────────

/** Result returned by a single Trap Detector module. */
export interface TrapDetectorResult {
    trapType: TrapType;
    findings: RiskFinding[];
    /** Per-subject annotations produced by this detector (partial — merged later). */
    subjectAnnotations?: Partial<SubjectRiskAnnotation>[];
}

/** Contract that every Trap Detector module must implement. */
export interface TrapDetector {
    readonly trapType: TrapType;
    detect(profile: UserInputProfile, ruleset: StateRuleset): TrapDetectorResult;
}

// ─── State Ruleset ──────────────────────────────────────────

/**
 * Resolved rule constants for a given federal state.
 *
 * - NRW / Bavaria: populated from hardcoded constants.
 * - General: populated from `UserInputProfile.rulesConfig`.
 */
export interface StateRuleset {
    /** Multiplier for LK (Leistungskurs) subjects. */
    lkWeight: number;
    /** Multiplier for GK (Grundkurs) subjects. */
    gkWeight: number;
    /** Score at or below which a semester grade is a "deficit". */
    deficitThreshold: number;
    /** Maximum allowed deficit courses before disqualification. */
    maxDeficits: number;
    /** Maximum allowed LK deficit courses (stricter sub-limit). */
    maxLkDeficits: number;
    /** Minimum total points required to pass the Abitur. */
    minTotalPoints: number;
    /** Minimum total exam-block points (0 = no separate exam block). */
    minExamPoints: number;
    /** Required number of LK subjects. */
    requiredLkCount: number;
    /** Required number of exam subjects. */
    requiredExamCount: number;
}

// ─── Aggregated Risk Report ─────────────────────────────────

/** The final output of the Risk Engine — consumed by the dashboard. */
export interface RiskReport {
    /** The federal state that was used for evaluation. */
    federalState: UserInputProfile['federalState'];
    /** The resolved ruleset applied. */
    ruleset: StateRuleset;

    /** All findings across all detectors, sorted by severity (RED first). */
    findings: RiskFinding[];
    /** Per-subject merged annotations. Keyed by subject ID. */
    subjectAnnotations: Map<string, SubjectRiskAnnotation>;

    /** Overall severity — the highest severity found across all findings. */
    overallSeverity: RiskSeverity;

    /** Summary statistics. */
    stats: {
        totalProjectedPoints: number;
        totalDeficits: number;
        totalZeroPoints: number;
        keystoneCount: number;
        redFindingsCount: number;
        orangeFindingsCount: number;
        greenFindingsCount: number;
    };
}
