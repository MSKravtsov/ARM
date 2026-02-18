// ──────────────────────────────────────────────────────────────
// ARM – Risk Engine Orchestrator
// ──────────────────────────────────────────────────────────────

import type { UserInputProfile } from '@/types/userInput';
import { FederalState } from '@/types/userInput';
import type {
    RiskReport,
    StateRuleset,
    TrapDetector,
    TrapDetectorResult,
    SubjectRiskAnnotation,
    RiskFinding,
} from '@/types/riskEngine';
import { RiskSeverity } from '@/types/riskEngine';
import { NRW_RULESET, BAVARIA_RULESET, buildGeneralRuleset } from './constants';

// ─── Detector Imports ────────────────────────────────────────
import { zeroPointDetector } from './detectors/zeroPointDetector';
import { deficitDetector } from './detectors/deficitDetector';
import { anchorDetector } from './detectors/anchorDetector';
import { pointsProjectionDetector } from './detectors/pointsProjectionDetector';
import { examRiskDetector } from './detectors/examRiskDetector';
import { volatilityDetector } from './detectors/volatilityDetector';
import { profileDetector } from './detectors/profileDetector';
import { special2026Detector } from './detectors/special2026Detector';
import { psychosocialDetector } from './detectors/psychosocialDetector';

// ─── Severity Ordering ──────────────────────────────────────

const SEVERITY_ORDER: Record<RiskSeverity, number> = {
    [RiskSeverity.RED]: 0,
    [RiskSeverity.ORANGE]: 1,
    [RiskSeverity.GREEN]: 2,
};

function compareSeverity(a: RiskSeverity, b: RiskSeverity): number {
    return SEVERITY_ORDER[a] - SEVERITY_ORDER[b];
}

function highestSeverity(findings: RiskFinding[]): RiskSeverity {
    if (findings.length === 0) return RiskSeverity.GREEN;
    return findings.reduce<RiskSeverity>(
        (worst, f) =>
            compareSeverity(f.severity, worst) < 0 ? f.severity : worst,
        RiskSeverity.GREEN
    );
}

// ─── Ruleset Resolution ─────────────────────────────────────

function resolveRuleset(profile: UserInputProfile): StateRuleset {
    switch (profile.federalState) {
        case FederalState.NRW:
            return NRW_RULESET;
        case FederalState.Bavaria:
            return BAVARIA_RULESET;
        case FederalState.General:
            return buildGeneralRuleset(profile.rulesConfig);
    }
}

// ─── Annotation Merging ─────────────────────────────────────

function mergeAnnotations(
    profile: UserInputProfile,
    detectorResults: TrapDetectorResult[]
): Map<string, SubjectRiskAnnotation> {
    const merged = new Map<string, SubjectRiskAnnotation>();

    // Initialize with defaults for every subject
    for (const subject of profile.subjects) {
        merged.set(subject.id, {
            subjectId: subject.id,
            subjectName: subject.name,
            isKeystone: false,
            hasZeroPoint: false,
            isDeficit: false,
            contributedPoints: 0,
            trend: 'stable',
        });
    }

    // Overlay detector annotations
    for (const result of detectorResults) {
        if (!result.subjectAnnotations) continue;
        for (const annotation of result.subjectAnnotations) {
            if (!annotation.subjectId) continue;
            const existing = merged.get(annotation.subjectId);
            if (!existing) continue;

            merged.set(annotation.subjectId, {
                ...existing,
                // Boolean flags: OR-merge (true wins)
                isKeystone: existing.isKeystone || (annotation.isKeystone ?? false),
                hasZeroPoint: existing.hasZeroPoint || (annotation.hasZeroPoint ?? false),
                isDeficit: existing.isDeficit || (annotation.isDeficit ?? false),
                // Numeric: overwrite if detector provided a value
                contributedPoints: annotation.contributedPoints ?? existing.contributedPoints,
                // Trend: last-writer-wins (volatility detector overwrites)
                trend: annotation.trend ?? existing.trend,
            });
        }
    }

    return merged;
}

// ─── Main Engine ────────────────────────────────────────────

/** All registered detectors (9 modules including Module 7: Psychosocial). */
const ALL_DETECTORS: TrapDetector[] = [
    zeroPointDetector,
    deficitDetector,
    anchorDetector,
    pointsProjectionDetector,
    examRiskDetector,
    volatilityDetector,
    profileDetector,
    special2026Detector,
    psychosocialDetector,
];

/**
 * Run the full Risk Engine against a validated `UserInputProfile`.
 *
 * 1. Resolve the ruleset (NRW / Bavaria / General).
 * 2. Execute all 6 Trap Detectors.
 * 3. Merge findings and annotations into a `RiskReport`.
 */
export function runRiskEngine(profile: UserInputProfile): RiskReport {
    const ruleset = resolveRuleset(profile);

    // Run every detector
    const detectorResults: TrapDetectorResult[] = ALL_DETECTORS.map((detector) =>
        detector.detect(profile, ruleset)
    );

    // Flatten and sort findings by severity
    const findings: RiskFinding[] = detectorResults
        .flatMap((r) => r.findings)
        .sort((a, b) => compareSeverity(a.severity, b.severity));

    // Merge per-subject annotations
    const subjectAnnotations = mergeAnnotations(profile, detectorResults);

    // Compute summary stats
    const redFindings = findings.filter((f) => f.severity === RiskSeverity.RED);
    const orangeFindings = findings.filter((f) => f.severity === RiskSeverity.ORANGE);
    const greenFindings = findings.filter((f) => f.severity === RiskSeverity.GREEN);

    const annotations = Array.from(subjectAnnotations.values());

    return {
        federalState: profile.federalState,
        ruleset,
        findings,
        subjectAnnotations,
        overallSeverity: highestSeverity(findings),
        stats: {
            totalProjectedPoints: annotations.reduce(
                (sum, a) => sum + a.contributedPoints,
                0
            ),
            totalDeficits: annotations.filter((a) => a.isDeficit).length,
            totalZeroPoints: annotations.filter((a) => a.hasZeroPoint).length,
            keystoneCount: annotations.filter((a) => a.isKeystone).length,
            redFindingsCount: redFindings.length,
            orangeFindingsCount: orangeFindings.length,
            greenFindingsCount: greenFindings.length,
        },
    };
}
