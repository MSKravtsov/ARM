/**
 * ARM - Grade Calculation Utilities
 *
 * Converts German Abitur points (0-15 scale) to final grades (1.0-6.0 scale)
 * and provides helper functions for GPA calculations.
 */

import type { Subject, SemesterGrades } from '@/types/userInput';

/**
 * German Abitur Points to Grade Conversion Table
 * Points (0-15) → Grade (1.0-6.0)
 */
const POINTS_TO_GRADE: Record<number, number> = {
    15: 0.7,  // sehr gut
    14: 1.0,
    13: 1.3,
    12: 1.7,
    11: 2.0,  // gut
    10: 2.3,
    9: 2.7,
    8: 3.0,   // befriedigend
    7: 3.3,
    6: 3.7,
    5: 4.0,   // ausreichend
    4: 4.3,
    3: 4.7,
    2: 5.0,   // mangelhaft
    1: 5.3,
    0: 5.7,   // ungenügend
};

/**
 * Grade brackets for visualization
 * Used to show progress to next grade level
 */
export const GRADE_BRACKETS = [
    { grade: 1.0, minPoints: 14, label: 'sehr gut' },
    { grade: 2.0, minPoints: 11, label: 'gut' },
    { grade: 3.0, minPoints: 8, label: 'befriedigend' },
    { grade: 4.0, minPoints: 5, label: 'ausreichend' },
    { grade: 5.0, minPoints: 2, label: 'mangelhaft' },
    { grade: 6.0, minPoints: 0, label: 'ungenügend' },
];

/**
 * Convert Abitur points (0-15) to German grade (1.0-6.0)
 */
export function pointsToGrade(points: number): number {
    const rounded = Math.round(points);
    const clamped = Math.max(0, Math.min(15, rounded));
    return POINTS_TO_GRADE[clamped] ?? 5.7;
}

/**
 * Calculate average points from a subject's semester grades
 */
export function calculateSubjectAverage(subject: Subject): number {
    // Safety check: ensure semesterGrades object exists
    if (!subject || !subject.semesterGrades) return 0;

    const semesterKeys: (keyof SemesterGrades)[] = ['Q1_1', 'Q1_2', 'Q2_1', 'Q2_2'];
    const grades = semesterKeys
        .map(key => subject.semesterGrades[key])
        .filter((g): g is number => typeof g === 'number');

    if (grades.length === 0) return 0;
    return grades.reduce((sum, g) => sum + g, 0) / grades.length;
}

/**
 * Calculate overall average points from all graded subjects
 */
export function calculateOverallAverage(subjects: Subject[]): number {
    const averages = subjects
        .map(calculateSubjectAverage)
        .filter(avg => avg > 0);

    if (averages.length === 0) return 0;
    return averages.reduce((sum, avg) => sum + avg, 0) / averages.length;
}

/**
 * Calculate predicted German grade (Abitur Note) from subjects
 * Returns both the grade and the average points
 */
export function calculatePredictedGrade(subjects: Subject[]): {
    grade: number;
    averagePoints: number;
    nextGradeBracket?: { grade: number; pointsNeeded: number; label: string };
} {
    const averagePoints = calculateOverallAverage(subjects);
    const grade = pointsToGrade(averagePoints);

    // Find next better grade bracket
    const currentBracket = GRADE_BRACKETS.find(b => grade >= b.grade);
    const nextBracketIndex = currentBracket ? GRADE_BRACKETS.indexOf(currentBracket) - 1 : -1;
    const nextBracket = nextBracketIndex >= 0 ? GRADE_BRACKETS[nextBracketIndex] : undefined;

    const nextGradeBracket = nextBracket ? {
        grade: nextBracket.grade,
        pointsNeeded: nextBracket.minPoints - averagePoints,
        label: nextBracket.label,
    } : undefined;

    return { grade, averagePoints, nextGradeBracket };
}

/**
 * Calculate progress percentage within current grade bracket
 * Used for the progress ring visualization
 */
export function calculateGradeProgress(averagePoints: number): number {
    const currentBracket = GRADE_BRACKETS.find(b => averagePoints >= b.minPoints);
    if (!currentBracket) return 0;

    const bracketIndex = GRADE_BRACKETS.indexOf(currentBracket);
    const nextBracket = bracketIndex > 0 ? GRADE_BRACKETS[bracketIndex - 1] : null;

    if (!nextBracket) {
        // At highest bracket, show 100% if >= 14 points
        return averagePoints >= 14 ? 100 : ((averagePoints - currentBracket.minPoints) / (15 - currentBracket.minPoints)) * 100;
    }

    const range = nextBracket.minPoints - currentBracket.minPoints;
    const progress = averagePoints - currentBracket.minPoints;
    return Math.min((progress / range) * 100, 100);
}
