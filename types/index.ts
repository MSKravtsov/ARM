// Grade data types for subject input
export interface GradeData {
    subjectName: string;
    subjectType: 'LK' | 'GK' | 'Seminar';
    semesterPoints: [number, number, number, number];
    examPoints: number;
}

// Risk calculation result
export interface RiskResult {
    totalPoints: number;
    deficitCount: number;
    riskStatus: 'safe' | 'warning' | 'danger';
    details: Record<string, any>; // State-specific metadata
}

// Calculation strategy interface
export interface CalculationStrategy {
    calculate(grades: GradeData[]): RiskResult;
    validateInput(grades: GradeData[]): boolean;
}

// User profile from database
export interface UserProfile {
    id: string;
    federal_state: 'NRW' | 'Bavaria' | 'General';
    graduation_year: number;
    configuration_status: number;
    locale: 'de' | 'en';
    created_at: string;
    updated_at: string;
}

// Subject from database
export interface Subject {
    id: string;
    user_id: string;
    subject_name: string;
    subject_type: 'LK' | 'GK' | 'Seminar';
    semester_1_points: number | null;
    semester_2_points: number | null;
    semester_3_points: number | null;
    semester_4_points: number | null;
    exam_points: number | null;
    created_at: string;
    updated_at: string;
}

// Risk calculation record from database
export interface RiskCalculation {
    id: string;
    user_id: string;
    total_points: number;
    deficit_count: number;
    risk_status: 'safe' | 'warning' | 'danger';
    risk_details: Record<string, any>;
    calculated_at: string;
    strategy_used: string;
}

// User Input Data Model (discriminated union, enums, subject types)
export * from './userInput';

// Risk Engine (detectors, report, severity levels)
export * from './riskEngine';
