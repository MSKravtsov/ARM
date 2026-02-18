// ──────────────────────────────────────────────────────────────
// ARM – Trap Detector: Exam Risk Detection
// ──────────────────────────────────────────────────────────────
//
// Analyzes exam-specific risks: missing exam subjects, exam
// block point shortfalls, and exam-type distribution issues.
//
// ═══════════════════════════════════════════════════════════════
// BAVARIA 13.2 (Q2_2) SPECIAL PROJECTION LOGIC
// ═══════════════════════════════════════════════════════════════
//
// For Bavaria in the final semester (13.2 / Q2_2):
//
// CORE SUBJECTS (Math, German, LK subjects):
//   ✓ Keep standard projection: Written Exam + Oral components
//
// BASIC COURSES (GK / Grundkurse):
//   ✗ DISABLE Written Exam projection
//   ✓ Calculate grade based ONLY on "Small Proofs of Performance"
//     (oral presentations, small tests, assignments)
//   ✗ No Schulaufgaben (written major exams) in GK during 13.2
//
// Implementation: When projecting exam grades for Bavaria:
//   if (state === Bavaria && semester === Q2_2 && subjectType === GK) {
//     // Use only oral/assignment average, NO written exam component
//   }
//
// ═══════════════════════════════════════════════════════════════
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
