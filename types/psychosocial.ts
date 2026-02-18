// ──────────────────────────────────────────────────────────────
// ARM – Psychosocial & Stress Data Types
// ──────────────────────────────────────────────────────────────

export enum SleepDuration {
    LOW = 'LOW',       // < 5h
    MEDIUM = 'MEDIUM', // 5-7h
    HIGH = 'HIGH',     // > 7h
}

export enum EnergyLevel {
    LOW = 'LOW',
    GOOD = 'GOOD',
    HIGH = 'HIGH',
}

export enum PsychosocialRisk {
    LOW = 'LOW',
    MODERATE = 'MODERATE',
    HIGH = 'HIGH',
}

export interface PsychosocialData {
    /** Weekly extracurricular commitments (0-40 hours) */
    weeklyCommitments: number;
    /** Sleep duration category */
    sleepDuration: SleepDuration;
    /** Current energy level */
    energyLevel: EnergyLevel;
    /** Target GPA student is aiming for (1.0-4.0) */
    targetGPA: number;
    /** Subject causing the most anxiety (subject ID or null) */
    anxietySubjectId: string | null;
}

export interface PsychosocialRiskAssessment {
    overallRisk: PsychosocialRisk;
    /** Gap between target and projected GPA */
    gpaGap: number;
    /** True if showing burnout risk */
    hasBurnoutRisk: boolean;
    /** True if showing unrealistic expectations */
    hasUnrealisticExpectations: boolean;
}
