/**
 * Module 7: Psychosocial & Confidence Risk Detector
 *
 * Analyzes "soft inputs" (confidence and stress factors) to detect hidden risks
 * that may not be visible in grades alone. Integrates the psychosocial risk module
 * into the ARM Risk Engine architecture.
 */

import type { UserInputProfile, Subject } from '@/types/userInput';
import type {
    TrapDetector,
    TrapDetectorResult,
    StateRuleset,
    RiskFinding,
    SubjectRiskAnnotation,
} from '@/types/riskEngine';
import { TrapType, RiskSeverity } from '@/types/riskEngine';
import {
    evaluatePsychosocialRisk,
    type PsychosocialRiskResult,
    type StressFactorType,
} from '@/lib/risk-modules/psychosocialRisk';

/**
 * Calculate average grade for a subject across all semesters
 */
function calculateAverageGrade(subject: Subject): number {
    const grades = [
        subject.semesterGrades.Q1_1,
        subject.semesterGrades.Q1_2,
        subject.semesterGrades.Q2_1,
        subject.semesterGrades.Q2_2,
    ].filter((g): g is number => g !== null);

    if (grades.length === 0) {
        // If no semester grades, use final exam grade or default to 0
        return subject.finalExamGrade ?? 0;
    }

    return grades.reduce((sum, g) => sum + g, 0) / grades.length;
}

/**
 * Psychosocial Risk Detector
 *
 * Evaluates each subject for:
 * 1. Fragility Index (good grades + low confidence)
 * 2. Collapse Predictor (borderline grades + anxiety)
 * 3. Stress factor classification (methodological/psychological/structural)
 */
export const psychosocialDetector: TrapDetector = {
    trapType: TrapType.Psychosocial,

    detect(profile: UserInputProfile, ruleset: StateRuleset): TrapDetectorResult {
        const findings: RiskFinding[] = [];
        const subjectAnnotations: Partial<SubjectRiskAnnotation>[] = [];

        // Track overall psychosocial summary
        let totalFragile = 0;
        let totalUnstable = 0;
        let totalCritical = 0;
        const affectedSubjectIds: string[] = [];

        // Analyze each subject
        for (const subject of profile.subjects) {
            const avgGrade = calculateAverageGrade(subject);

            // Run psychosocial risk evaluation
            const psyRisk: PsychosocialRiskResult = evaluatePsychosocialRisk(
                avgGrade,
                subject.confidence,
                subject.stressFactors
            );

            // Determine dominant stress type
            let dominantStressType: StressFactorType | undefined;
            if (psyRisk.stressClassification.length > 0) {
                // Find the stress type with most factors
                const typeCounts = psyRisk.stressClassification.reduce((acc, cls) => {
                    acc[cls.type] = (acc[cls.type] || 0) + cls.factors.length;
                    return acc;
                }, {} as Record<StressFactorType, number>);

                dominantStressType = Object.entries(typeCounts).reduce((max, [type, count]) =>
                    count > (typeCounts[max as StressFactorType] || 0) ? type as StressFactorType : max,
                    'METHODOLOGICAL' as StressFactorType
                );
            }

            // Create subject annotation
            subjectAnnotations.push({
                subjectId: subject.id,
                riskMultiplier: psyRisk.riskMultiplier,
                isFragile: psyRisk.isFragile,
                isUnstable: psyRisk.isUnstable,
                hasStructuralBarriers: psyRisk.hasStructuralBarriers,
                dominantStressType,
            });

            // Track subjects with significant psychosocial risk
            if (psyRisk.isFragile) {
                totalFragile++;
                affectedSubjectIds.push(subject.id);
            }

            if (psyRisk.isUnstable) {
                totalUnstable++;
                if (!affectedSubjectIds.includes(subject.id)) {
                    affectedSubjectIds.push(subject.id);
                }
            }

            if (psyRisk.severity === 'CRITICAL') {
                totalCritical++;
            }

            // Generate individual subject findings for critical/high severity cases
            if (psyRisk.riskType === 'HIDDEN_VOLATILITY') {
                findings.push({
                    severity: RiskSeverity.ORANGE,
                    trapType: TrapType.Psychosocial,
                    message: `${subject.name}: ${psyRisk.message}`,
                    i18nKey: 'report.psychosocial.fragility',
                    i18nParams: {
                        subjectName: subject.name,
                        grade: avgGrade.toFixed(1),
                        confidence: subject.confidence,
                    },
                    affectedSubjectIds: [subject.id],
                });
            } else if (psyRisk.riskType === 'CRITICAL_STABILITY') {
                findings.push({
                    severity: RiskSeverity.ORANGE,
                    trapType: TrapType.Psychosocial,
                    message: `${subject.name}: ${psyRisk.message}`,
                    i18nKey: 'report.psychosocial.collapse',
                    i18nParams: {
                        subjectName: subject.name,
                        grade: avgGrade.toFixed(1),
                    },
                    affectedSubjectIds: [subject.id],
                });
            }
        }

        // Generate summary finding if multiple subjects are affected
        if (totalFragile >= 2) {
            findings.push({
                severity: RiskSeverity.ORANGE,
                trapType: TrapType.Psychosocial,
                message: `${totalFragile} subjects show fragility (good grades but low confidence). High burnout risk detected.`,
                i18nKey: 'report.psychosocial.multipleFragile',
                i18nParams: { count: totalFragile },
                affectedSubjectIds,
            });
        }

        if (totalUnstable >= 2) {
            findings.push({
                severity: RiskSeverity.ORANGE,
                trapType: TrapType.Psychosocial,
                message: `${totalUnstable} subjects are unstable (borderline grades with anxiety). Critical stability risk.`,
                i18nKey: 'report.psychosocial.multipleUnstable',
                i18nParams: { count: totalUnstable },
                affectedSubjectIds,
            });
        }

        if (totalCritical >= 1) {
            findings.push({
                severity: RiskSeverity.ORANGE,
                trapType: TrapType.Psychosocial,
                message: `${totalCritical} subject(s) at critical psychosocial risk. Immediate intervention recommended.`,
                i18nKey: 'report.psychosocial.criticalRisk',
                i18nParams: { count: totalCritical },
                affectedSubjectIds,
            });
        }

        // If no significant risks detected, add a green finding
        if (findings.length === 0) {
            findings.push({
                severity: RiskSeverity.GREEN,
                trapType: TrapType.Psychosocial,
                message: 'No significant psychosocial risks detected. Confidence and stress levels appear manageable.',
                i18nKey: 'report.psychosocial.healthy',
                i18nParams: {},
                affectedSubjectIds: [],
            });
        }

        return {
            trapType: TrapType.Psychosocial,
            findings,
            subjectAnnotations,
        };
    },
};
