// ──────────────────────────────────────────────────────────────
// ARM – User Input Data Model (Pure TypeScript – no Zod runtime)
// ──────────────────────────────────────────────────────────────

// ─── Enums ───────────────────────────────────────────────────

/** Federal-state discriminator – controls validation strategy. */
export enum FederalState {
    NRW = 'NRW',
    Bavaria = 'Bavaria',
    General = 'General',
}

/** Subject weighting classification. */
export enum SubjectType {
    /** Leistungskurs – high weight */
    LK = 'LK',
    /** Grundkurs – standard weight */
    GK = 'GK',
    /** Bavaria G9: Wissenschaftliches Seminar (W-Seminar) */
    SEMINAR_W = 'SEMINAR_W',
    /** Bavaria G9: Projekt-Seminar (P-Seminar) */
    SEMINAR_P = 'SEMINAR_P',
}

/** Type of final Abitur examination. */
export enum ExamType {
    Written = 'Written',
    Oral = 'Oral',
    Colloquium = 'Colloquium',
    None = 'None',
}

/** Scope of zero-point fatality in General mode. */
export enum FatalScope {
    /** Any 0-point grade is fatal. */
    ALL_COURSES = 'ALL_COURSES',
    /** 0-point is fatal only in mandatory subjects. */
    MANDATORY_ONLY = 'MANDATORY_ONLY',
    /** 0-point is never fatal (treated as standard deficit). */
    NONE = 'NONE',
}

/**
 * Content-area classification for profile/focus validation.
 * Distinct from `SubjectType` (LK/GK) which tracks weighting.
 */
export enum SubjectCategory {
    LANGUAGE = 'LANGUAGE',
    SCIENCE = 'SCIENCE',
    SOCIAL = 'SOCIAL',
    ART = 'ART',
    SPORT = 'SPORT',
}

/** Academic profile / Schwerpunkt selection. */
export enum ProfileType {
    LINGUISTIC = 'LINGUISTIC',
    SCIENTIFIC = 'SCIENTIFIC',
    ARTISTIC = 'ARTISTIC',
    SOCIAL = 'SOCIAL',
}

// ─── Predefined Stress-Factor Tags ──────────────────────────

export const STRESS_FACTOR_OPTIONS = [
    'Time Management',
    'Anxiety',
    'Lack of Motivation',
    'Difficulty Understanding Material',
    'External Pressure',
    'Health Issues',
    'Perfectionism',
    'Procrastination',
] as const;

export type StressFactor = (typeof STRESS_FACTOR_OPTIONS)[number];

// ─── Semester Grades ────────────────────────────────────────

/** Qualifying-semester scores. `null` = not yet taken / unknown. */
export interface SemesterGrades {
    Q1_1: number | null;
    Q1_2: number | null;
    Q2_1: number | null;
    Q2_2: number | null;
}

// ─── Subject ────────────────────────────────────────────────

export interface Subject {
    // ── Core Metadata ──
    id: string;
    name: string;
    type: SubjectType;
    isMandatory: boolean;
    /**
     * NRW-specific: Is attendance in this course legally required
     * (Belegpflicht), even if the grade is not counted for GPA?
     *
     * APO-GOSt §28: A course with 0 points where Belegpflicht
     * applies is considered "not taken" — automatic disqualification.
     *
     * Defaults to `false` for non-NRW profiles.
     */
    isBelegpflichtig: boolean;

    // ── Content Area ──
    /** Discipline area for profile/focus validation. */
    subjectCategory: SubjectCategory;
    /** Whether the student is currently continuing this course. */
    isActive: boolean;

    // ── Examination Flags ──
    isExamSubject: boolean;
    /**
     * Must be `ExamType.None` when `isExamSubject` is `false`.
     */
    examType: ExamType;

    // ── Performance Data (Grades) ──
    /** Scores 0-15 per qualifying semester, or null. */
    semesterGrades: SemesterGrades;
    /** Predicted / actual final-exam grade (0-15), or null. */
    finalExamGrade: number | null;

    // ── Psychosocial Data ──
    /** Student confidence level, integer 1-10. */
    confidence: number;
    /** Tags selected from `STRESS_FACTOR_OPTIONS`. */
    stressFactors: StressFactor[];
}

// ─── Rules Configuration (General Mode Only) ────────────────

export interface GeneralRulesConfig {
    /** Multiplier for LK courses (e.g. 2.0). */
    lkWeight: number;
    /** Multiplier for GK courses (e.g. 1.0). */
    gkWeight: number;
    /** Score below which a grade is a deficit (e.g. 5). */
    deficitThreshold: number;
    /** Maximum allowed deficit courses (e.g. 8). */
    maxDeficits: number;
    /** Minimum total points required to pass (e.g. 300). */
    minTotalPoints: number;
    /**
     * Whether 0 points constitutes an immediate fatal error.
     * When `false`, 0-point grades are treated as standard deficits.
     */
    zeroIsFatal: boolean;
    /** Controls which courses are affected by the zero-point rule. */
    fatalScope: FatalScope;
    /**
     * Point gap between elective avg and mandatory avg required to
     * trigger the "Anchor Effect" alert. Default: 3.0.
     */
    anchorThreshold: number;
    /**
     * Subject names that are treated as statutory / mandatory for
     * Einbringungspflicht purposes in General mode. Subjects whose
     * names match (case-insensitive) are flagged as anchor courses.
     */
    customMandatorySubjects: string[];
    /** Academic profile / focus selection. */
    profileType: ProfileType;
    /** Minimum required active foreign languages. Default: 1. */
    minLanguages: number;
    /** Minimum required active natural sciences. Default: 1. */
    minSciences: number;
    /**
     * Standard-deviation threshold above which an exam subject is
     * flagged as "Volatile" (RED) in General mode. Default: 4.0.
     * NRW / Bavaria use hardcoded tiers instead.
     */
    volatilityThreshold: number;
}

// ─── Discriminated-Union Profiles ───────────────────────────

interface BaseProfile {
    graduationYear: number;
    subjects: Subject[];
}

export interface NRWProfile extends BaseProfile {
    federalState: FederalState.NRW;
    rulesConfig?: undefined;
}

export interface BavariaProfile extends BaseProfile {
    federalState: FederalState.Bavaria;
    rulesConfig?: undefined;
}

export interface GeneralProfile extends BaseProfile {
    federalState: FederalState.General;
    rulesConfig: GeneralRulesConfig;
}

/**
 * Top-level user-input object.
 *
 * Discriminated on `federalState`:
 * - **NRW / Bavaria** → `rulesConfig` absent; system uses hardcoded constants.
 * - **General**       → `rulesConfig` required; user-supplied custom rules.
 */
export type UserInputProfile = NRWProfile | BavariaProfile | GeneralProfile;
