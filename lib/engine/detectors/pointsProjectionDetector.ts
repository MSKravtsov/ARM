// ──────────────────────────────────────────────────────────────
// ARM – Trap Detector: Points Projection
// ──────────────────────────────────────────────────────────────
//
// Projects the student's total qualifying points and compares
// against the minimum threshold. Falling short is a RED finding.
//
// Implementation awaiting Module 4 specification.
// ──────────────────────────────────────────────────────────────

import type { TrapDetector, TrapDetectorResult, StateRuleset } from '@/types/riskEngine';
import { TrapType } from '@/types/riskEngine';
import type { UserInputProfile } from '@/types/userInput';

export const pointsProjectionDetector: TrapDetector = {
    trapType: TrapType.PointsProjection,

    detect(profile: UserInputProfile, ruleset: StateRuleset): TrapDetectorResult {
        // TODO: Implement — awaiting detailed specification
        return {
            trapType: TrapType.PointsProjection,
            findings: [],
            subjectAnnotations: [],
        };
    },
};
