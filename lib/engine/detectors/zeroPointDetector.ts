// ──────────────────────────────────────────────────────────────
// ARM – Trap Detector: Zero-Point Detection (Module 1)
// ──────────────────────────────────────────────────────────────
//
// The most critical "Hard Stop" in the system.
//
// Two-pass algorithm:
//   PASS 1 (RED): Detect existing 0-point grades that legally
//                 disqualify the student. Fail-fast on first hit.
//   PASS 2 (ORANGE): Predict "danger zones" — subjects where the
//                    average grade is < 3 pts, signaling high risk
//                    of a future 0-point semester.
//
// Logic is mode-aware: NRW, Bavaria, and General each have
// distinct rules for when 0 points constitutes a fatal error.
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
import { FederalState, FatalScope } from '@/types/userInput';

// ─── Semester Key Helpers ───────────────────────────────────

/** Human-readable semester labels, in chronological order. */
const SEMESTER_KEYS: (keyof SemesterGrades)[] = ['Q1_1', 'Q1_2', 'Q2_1', 'Q2_2'];

const SEMESTER_LABELS: Record<keyof SemesterGrades, string> = {
    Q1_1: 'Q1.1',
    Q1_2: 'Q1.2',
    Q2_1: 'Q2.1',
    Q2_2: 'Q2.2',
};

// ─── Fatality Check per Mode ────────────────────────────────

/**
 * Determines whether a 0-point grade in the given subject is
 * fatal (= legal disqualification) for the given federal state.
 *
 * Returns `true` if the 0 should be treated as a RED / FATAL error.
 */
function isZeroFatal(
    subject: Subject,
    profile: UserInputProfile
): boolean {
    switch (profile.federalState) {
        // ──────────────────────────────────────────────────
        // NRW (APO-GOSt §28)
        // A course with 0 points is legally considered "not taken."
        // FATAL if the course has Belegpflicht (attendance obligation).
        // ──────────────────────────────────────────────────
        case FederalState.NRW:
            return subject.isBelegpflichtig;

        // ──────────────────────────────────────────────────
        // BAVARIA (GSO §44-50)
        // A semester with 0 points is not credited.
        // FATAL if the course is mandatory (Pflichtfach).
        // For non-mandatory electives: technically could be
        // dropped, but for MVP safety we treat ALL 0s as FATAL.
        // ──────────────────────────────────────────────────
        case FederalState.Bavaria:
            // MVP safety: any 0 in Bavaria is treated as fatal.
            // TODO (v2): downgrade non-mandatory elective 0s to WARNING.
            return true;

        // ──────────────────────────────────────────────────
        // GENERAL (User-Defined)
        // Respects `generalSettings.zeroIsFatal` and `fatalScope`.
        // ──────────────────────────────────────────────────
        case FederalState.General: {
            const { zeroIsFatal, fatalScope } = profile.rulesConfig;

            if (!zeroIsFatal) return false;

            switch (fatalScope) {
                case FatalScope.ALL_COURSES:
                    return true;
                case FatalScope.MANDATORY_ONLY:
                    return subject.isMandatory;
                case FatalScope.NONE:
                    return false;
            }
        }
    }
}

// ─── PASS 1: Detection (RED) ────────────────────────────────

interface ZeroPointHit {
    subject: Subject;
    semesterKey: keyof SemesterGrades;
    semesterLabel: string;
}

/**
 * PASS 1 — scan all existing (non-null) grades for 0-point values.
 * Applies state-specific fatality logic.
 *
 * Returns on first fatal hit (fail-fast) for efficiency, but also
 * collects all hits for complete annotation.
 */
function detectZeroPoints(
    profile: UserInputProfile
): { fatalHits: ZeroPointHit[]; allHits: ZeroPointHit[] } {
    const fatalHits: ZeroPointHit[] = [];
    const allHits: ZeroPointHit[] = [];

    for (const subject of profile.subjects) {
        for (const key of SEMESTER_KEYS) {
            const grade = subject.semesterGrades[key];

            // Skip future / unknown semesters (null)
            if (grade === null || grade === undefined) continue;

            if (grade === 0) {
                const hit: ZeroPointHit = {
                    subject,
                    semesterKey: key,
                    semesterLabel: SEMESTER_LABELS[key],
                };

                allHits.push(hit);

                if (isZeroFatal(subject, profile)) {
                    fatalHits.push(hit);
                }
            }
        }
    }

    return { fatalHits, allHits };
}

// ─── PASS 2: Prediction (ORANGE) ────────────────────────────

interface DangerZone {
    subject: Subject;
    average: number;
}

/**
 * PASS 2 — identify subjects where the average of existing grades
 * is below 3.0 points — these are "danger zones" where a single
 * bad exam could result in a 0-point semester.
 */
function detectDangerZones(profile: UserInputProfile): DangerZone[] {
    const zones: DangerZone[] = [];

    for (const subject of profile.subjects) {
        const existingGrades: number[] = [];

        for (const key of SEMESTER_KEYS) {
            const grade = subject.semesterGrades[key];
            if (grade !== null && grade !== undefined) {
                existingGrades.push(grade);
            }
        }

        // Need at least 1 existing grade to compute an average
        if (existingGrades.length === 0) continue;

        const avg = existingGrades.reduce((sum, g) => sum + g, 0) / existingGrades.length;

        if (avg < 3.0) {
            zones.push({ subject, average: Math.round(avg * 100) / 100 });
        }
    }

    return zones;
}

// ─── Finding Builders ───────────────────────────────────────

function buildFatalFinding(hit: ZeroPointHit): RiskFinding {
    return {
        severity: RiskSeverity.RED,
        trapType: TrapType.ZeroPoint,
        message: `Disqualification Risk: 0 points in ${hit.subject.name} (Semester ${hit.semesterLabel}).`,
        i18nKey: 'report.zeroPoint.detail',
        i18nParams: {
            subjectName: hit.subject.name,
            semester: hit.semesterLabel,
        },
        affectedSubjectIds: [hit.subject.id],
    };
}

function buildWarningFinding(zone: DangerZone): RiskFinding {
    return {
        severity: RiskSeverity.ORANGE,
        trapType: TrapType.ZeroPoint,
        message: `High Risk in ${zone.subject.name}. Current average is critical (${zone.average} pts). A failed exam could result in 0 points.`,
        i18nKey: 'report.zeroPoint.found',
        i18nParams: {
            subjectName: zone.subject.name,
            average: zone.average,
        },
        affectedSubjectIds: [zone.subject.id],
    };
}

// ─── Annotation Builder ─────────────────────────────────────

function buildAnnotations(
    profile: UserInputProfile,
    allHits: ZeroPointHit[]
): Partial<SubjectRiskAnnotation>[] {
    const hitSubjectIds = new Set(allHits.map((h) => h.subject.id));

    return profile.subjects.map((subject) => ({
        subjectId: subject.id,
        subjectName: subject.name,
        hasZeroPoint: hitSubjectIds.has(subject.id),
    }));
}

// ─── Exported Detector ──────────────────────────────────────

export const zeroPointDetector: TrapDetector = {
    trapType: TrapType.ZeroPoint,

    detect(profile: UserInputProfile, _ruleset: StateRuleset): TrapDetectorResult {
        const findings: RiskFinding[] = [];

        // ── PASS 1: Detection (RED — fail fast) ──
        const { fatalHits, allHits } = detectZeroPoints(profile);

        if (fatalHits.length > 0) {
            // Fail Fast: emit RED for the FIRST fatal hit only
            findings.push(buildFatalFinding(fatalHits[0]));

            return {
                trapType: TrapType.ZeroPoint,
                findings,
                subjectAnnotations: buildAnnotations(profile, allHits),
            };
        }

        // ── PASS 2: Prediction (ORANGE — danger zones) ──
        const dangerZones = detectDangerZones(profile);

        for (const zone of dangerZones) {
            findings.push(buildWarningFinding(zone));
        }

        return {
            trapType: TrapType.ZeroPoint,
            findings,
            subjectAnnotations: buildAnnotations(profile, allHits),
        };
    },
};
