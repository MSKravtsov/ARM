/**
 * Module 7: Psychosocial & Confidence Analysis
 *
 * Analyzes "soft inputs" (confidence and stress factors) to detect hidden risks
 * that may not be visible in grades alone.
 */

export type RiskType =
    | 'HIDDEN_VOLATILITY'   // Good grades but low confidence (Fragility Index)
    | 'CRITICAL_STABILITY'  // Borderline grades with anxiety (Collapse Predictor)
    | 'NONE';               // No psychosocial risk detected

export type StressFactorType = 'METHODOLOGICAL' | 'PSYCHOLOGICAL' | 'STRUCTURAL';

export interface StressFactorClassification {
    type: StressFactorType;
    factors: string[];
    advice: string;
}

export interface PsychosocialRiskResult {
    riskType: RiskType;
    severity: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
    message: string;
    riskMultiplier: number; // 1.0 = no change, >1.0 = increase visual urgency
    stressClassification: StressFactorClassification[];

    // Specific flags
    isFragile: boolean;      // Good grade but low confidence
    isUnstable: boolean;     // Borderline grade with anxiety
    hasStructuralBarriers: boolean; // External constraints
}

/**
 * Classifies stress factors into actionable categories
 */
function classifyStressFactors(stressFactors: string[]): StressFactorClassification[] {
    const classifications: StressFactorClassification[] = [];

    // Type A: Methodological (Actionable with study plans/tutoring)
    const methodological = [
        'Time Management',
        'Procrastination',
        'Difficulty Understanding',
        'Study Habits',
        'Organization'
    ];
    const methodFactors = stressFactors.filter(f =>
        methodological.some(m => f.toLowerCase().includes(m.toLowerCase()))
    );
    if (methodFactors.length > 0) {
        classifications.push({
            type: 'METHODOLOGICAL',
            factors: methodFactors,
            advice: 'Actionable: Focus on study plans, time management tools, or tutoring support.'
        });
    }

    // Type B: Psychological (Requires counseling/stress reduction)
    const psychological = [
        'Anxiety',
        'Perfectionism',
        'Lack of Motivation',
        'Stress',
        'Exam Anxiety',
        'Fear',
        'Depression'
    ];
    const psychFactors = stressFactors.filter(f =>
        psychological.some(p => f.toLowerCase().includes(p.toLowerCase()))
    );
    if (psychFactors.length > 0) {
        classifications.push({
            type: 'PSYCHOLOGICAL',
            factors: psychFactors,
            advice: 'Support Required: Consider counseling, stress-reduction techniques, or mental health support.'
        });
    }

    // Type C: Structural (External hard constraints)
    const structural = [
        'Health Issues',
        'External Pressure',
        'Family Issues',
        'Financial Problems',
        'Work'
    ];
    const structFactors = stressFactors.filter(f =>
        structural.some(s => f.toLowerCase().includes(s.toLowerCase()))
    );
    if (structFactors.length > 0) {
        classifications.push({
            type: 'STRUCTURAL',
            factors: structFactors,
            advice: 'Strategic: These are external hard constraints. Consult a coordinator or counselor for accommodation options.'
        });
    }

    return classifications;
}

/**
 * Calculates a risk multiplier based on psychosocial factors
 * Returns a float where:
 * - 1.0 = No change
 * - 1.2-1.5 = Moderate increase in visual urgency
 * - 1.5-2.0 = High increase (escalate warning colors)
 */
export function calculateRiskMultiplier(
    grade: number,
    confidence: number,
    stressFactors: string[]
): number {
    let multiplier = 1.0;

    // Base multiplier on confidence gap
    const confidenceGap = Math.max(0, 10 - confidence);
    multiplier += (confidenceGap / 20); // Up to +0.5 for very low confidence

    // Increase for stress factors
    const stressCount = stressFactors.length;
    if (stressCount >= 3) {
        multiplier += 0.3; // Multiple stressors compound risk
    } else if (stressCount >= 1) {
        multiplier += 0.15;
    }

    // Critical scenarios
    const hasAnxiety = stressFactors.some(f =>
        f.toLowerCase().includes('anxiety') || f.toLowerCase().includes('stress')
    );
    const hasHealth = stressFactors.some(f =>
        f.toLowerCase().includes('health')
    );

    // Fragility Index: Good grade but low confidence
    if (grade > 10 && confidence < 4) {
        multiplier += 0.4; // Hidden volatility
    }

    // Collapse Predictor: Borderline grade with anxiety
    if (grade <= 6 && (hasAnxiety || hasHealth)) {
        multiplier += 0.6; // Critical stability risk
    }

    // Borderline with any stress
    if (grade <= 5 && stressCount > 0) {
        multiplier += 0.3;
    }

    // Cap at 2.0 to prevent extreme values
    return Math.min(multiplier, 2.0);
}

/**
 * Main evaluation function for psychosocial risk analysis
 */
export function evaluatePsychosocialRisk(
    grade: number,
    confidence: number,
    stressFactors: string[]
): PsychosocialRiskResult {
    const stressClassification = classifyStressFactors(stressFactors);
    const riskMultiplier = calculateRiskMultiplier(grade, confidence, stressFactors);

    // Check for anxiety or health issues
    const hasAnxiety = stressFactors.some(f =>
        f.toLowerCase().includes('anxiety') || f.toLowerCase().includes('stress')
    );
    const hasHealth = stressFactors.some(f =>
        f.toLowerCase().includes('health')
    );

    // SCENARIO 1: Fragility Index (Good grades but low confidence)
    if (grade > 10 && confidence < 4) {
        return {
            riskType: 'HIDDEN_VOLATILITY',
            severity: 'HIGH',
            message: 'You are performing well, but your low confidence suggests high stress. This is a burnout risk before the final exams.',
            riskMultiplier,
            stressClassification,
            isFragile: true,
            isUnstable: false,
            hasStructuralBarriers: stressClassification.some(c => c.type === 'STRUCTURAL')
        };
    }

    // SCENARIO 2: Collapse Predictor (Borderline grades with anxiety)
    if (grade <= 6 && (hasAnxiety || hasHealth)) {
        return {
            riskType: 'CRITICAL_STABILITY',
            severity: 'CRITICAL',
            message: 'Your grade is borderline, and reported anxiety makes this a dangerous "Wackelkandidat" for the final exams.',
            riskMultiplier,
            stressClassification,
            isFragile: false,
            isUnstable: true,
            hasStructuralBarriers: stressClassification.some(c => c.type === 'STRUCTURAL')
        };
    }

    // SCENARIO 3: Moderate risk (Low confidence OR stress factors present)
    if (confidence < 5 || stressFactors.length >= 2) {
        const severity: 'LOW' | 'MODERATE' | 'HIGH' =
            stressFactors.length >= 3 ? 'HIGH' :
            confidence < 3 ? 'HIGH' : 'MODERATE';

        return {
            riskType: 'NONE',
            severity,
            message: stressFactors.length >= 2
                ? 'Multiple stress factors detected. Consider addressing these to improve stability.'
                : 'Low confidence may impact performance. Focus on building self-assurance.',
            riskMultiplier,
            stressClassification,
            isFragile: grade >= 8 && confidence < 5,
            isUnstable: grade <= 7 && stressFactors.length > 0,
            hasStructuralBarriers: stressClassification.some(c => c.type === 'STRUCTURAL')
        };
    }

    // SCENARIO 4: Low risk (Good confidence, minimal stress)
    return {
        riskType: 'NONE',
        severity: 'LOW',
        message: 'No significant psychosocial risk detected. Keep up the good work!',
        riskMultiplier: 1.0,
        stressClassification,
        isFragile: false,
        isUnstable: false,
        hasStructuralBarriers: false
    };
}

/**
 * Batch analysis for multiple subjects
 */
export function analyzePsychosocialRisks(
    subjects: Array<{
        id: string;
        name: string;
        grade: number;
        confidence: number;
        stressFactors: string[];
    }>
): Record<string, PsychosocialRiskResult> {
    const results: Record<string, PsychosocialRiskResult> = {};

    for (const subject of subjects) {
        results[subject.id] = evaluatePsychosocialRisk(
            subject.grade,
            subject.confidence,
            subject.stressFactors
        );
    }

    return results;
}

/**
 * Get overall psychosocial risk summary
 */
export interface PsychosocialSummary {
    totalSubjects: number;
    fragileSubjects: number;
    unstableSubjects: number;
    criticalSubjects: number;
    averageRiskMultiplier: number;
    dominantStressType: StressFactorType | null;
}

export function getPsychosocialSummary(
    results: Record<string, PsychosocialRiskResult>
): PsychosocialSummary {
    const values = Object.values(results);

    const fragileSubjects = values.filter(r => r.isFragile).length;
    const unstableSubjects = values.filter(r => r.isUnstable).length;
    const criticalSubjects = values.filter(r => r.severity === 'CRITICAL').length;

    const avgMultiplier = values.length > 0
        ? values.reduce((sum, r) => sum + r.riskMultiplier, 0) / values.length
        : 1.0;

    // Count stress factor types across all subjects
    const stressTypeCounts: Record<StressFactorType, number> = {
        METHODOLOGICAL: 0,
        PSYCHOLOGICAL: 0,
        STRUCTURAL: 0
    };

    values.forEach(result => {
        result.stressClassification.forEach(classification => {
            stressTypeCounts[classification.type]++;
        });
    });

    // Find dominant stress type
    let dominantStressType: StressFactorType | null = null;
    let maxCount = 0;
    for (const [type, count] of Object.entries(stressTypeCounts)) {
        if (count > maxCount) {
            maxCount = count;
            dominantStressType = type as StressFactorType;
        }
    }

    return {
        totalSubjects: values.length,
        fragileSubjects,
        unstableSubjects,
        criticalSubjects,
        averageRiskMultiplier: avgMultiplier,
        dominantStressType: maxCount > 0 ? dominantStressType : null
    };
}
