// ──────────────────────────────────────────────────────────────
// ARM – State Ruleset Constants
// ──────────────────────────────────────────────────────────────

import type { StateRuleset } from '@/types/riskEngine';
import type { GeneralRulesConfig } from '@/types/userInput';

/**
 * NRW Abitur 2026 (G8 transition) ruleset.
 *
 * Sources: APO-GOSt NRW §§ 28-29.
 * - Block I: minimum 200 points from ≥27 qualifying courses
 * - Deficit threshold: < 5 points (i.e., 4 or below)
 * - Max 7 deficits total, max 3 in LK courses
 * - Block II (exams): minimum 100 points from 5 exam components
 *   (4 Abiturprüfungen × 5 for written, oral evaluated separately)
 */
export const NRW_RULESET: StateRuleset = {
    lkWeight: 2,
    gkWeight: 1,
    deficitThreshold: 5,
    maxDeficits: 7,
    maxLkDeficits: 3,
    minTotalPoints: 200,
    minExamPoints: 100,
    requiredLkCount: 2,
    requiredExamCount: 4,
};

/**
 * Bavaria Abitur 2026 (G9 LehrplanPLUS) ruleset.
 *
 * Sources: GSO Bayern §§ 44-50.
 * - 40 Halbjahresleistungen (HJL), min 200 points
 * - Deficit threshold: < 5 points
 * - Max 8 deficits total (of which max 3 in LK)
 * - 5 Abiturprüfungen: 3 written + 2 oral/colloquium
 * - Min exam block: 100 points
 */
export const BAVARIA_RULESET: StateRuleset = {
    lkWeight: 2,
    gkWeight: 1,
    deficitThreshold: 5,
    maxDeficits: 8,
    maxLkDeficits: 3,
    minTotalPoints: 200,
    minExamPoints: 100,
    requiredLkCount: 2,
    requiredExamCount: 5,
};

/**
 * Build a `StateRuleset` from user-supplied `GeneralRulesConfig`.
 *
 * General mode has no hardcoded LK/exam count requirements and
 * no separate exam-block minimum — everything is user-defined.
 */
export function buildGeneralRuleset(config: GeneralRulesConfig): StateRuleset {
    return {
        lkWeight: config.lkWeight,
        gkWeight: config.gkWeight,
        deficitThreshold: config.deficitThreshold,
        maxDeficits: config.maxDeficits,
        maxLkDeficits: config.maxDeficits, // No separate LK sub-limit in General
        minTotalPoints: config.minTotalPoints,
        minExamPoints: 0, // No separate exam block in General mode
        requiredLkCount: 0,
        requiredExamCount: 0,
    };
}
