// ──────────────────────────────────────────────────────────────
// ARM – Trap Detector: Exam Risk Detection
// ──────────────────────────────────────────────────────────────
//
// Analyzes exam-specific risks: missing exam subjects, exam
// block point shortfalls, and exam-type distribution issues.
//
// Implementation awaiting Module 5 specification.
// ──────────────────────────────────────────────────────────────

import type { TrapDetector, TrapDetectorResult, StateRuleset } from '@/types/riskEngine';
import { TrapType } from '@/types/riskEngine';
import type { UserInputProfile } from '@/types/userInput';

export const examRiskDetector: TrapDetector = {
    trapType: TrapType.ExamRisk,

    detect(profile: UserInputProfile, ruleset: StateRuleset): TrapDetectorResult {
        // TODO: Implement — awaiting detailed specification
        return {
            trapType: TrapType.ExamRisk,
            findings: [],
            subjectAnnotations: [],
        };
    },
};
