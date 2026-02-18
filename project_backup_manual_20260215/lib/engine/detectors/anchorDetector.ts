// ──────────────────────────────────────────────────────────────
// ARM – Trap Detector: GPA Anchor / Einbringungspflicht (Module 3)
// ──────────────────────────────────────────────────────────────
//
// In the German Abitur, certain "Core Subjects" MUST be counted
// into the final GPA (Einbringungspflicht). This creates an
// "Anchor Effect" — mandatory low grades drag down the overall
// score, preventing the student from benefiting from strong
// elective performance.
//
// Algorithm:
//   STEP 1: Identify statutory (anchor) subjects per state law
//   STEP 2: Segment courses into Anchor vs Float buckets
//   STEP 3: Compute averages for each bucket
//   STEP 4: Calculate delta (Float avg − Anchor avg)
//   STEP 5: Assess risk based on the delta
//
// State-specific anchor identification:
//   NRW:     Math, German, 1 Foreign Language, 1 Natural Science
//   Bavaria: Math, German, plus 3rd/4th/5th exam subjects
//   General: User-defined via customMandatorySubjects
// ──────────────────────────────────────────────────────────────

import type {
    TrapDetector,
    TrapDetectorResult,
    StateRuleset,
    RiskFinding,
    SubjectRiskAnnotation,
} from '@/types/riskEngine';
import { TrapType, RiskSeverity } from '@/types/riskEngine';
import type {
    UserInputProfile,
    Subject,
    SemesterGrades,
} from '@/types/userInput';
import { FederalState } from '@/types/userInput';

// ─── Constants ──────────────────────────────────────────────

const SEMESTER_KEYS: (keyof SemesterGrades)[] = ['Q1_1', 'Q1_2', 'Q2_1', 'Q2_2'];

/** Default anchor threshold for NRW / Bavaria (point gap). */
const DEFAULT_ANCHOR_THRESHOLD = 3.0;

// ─── Subject Name Matching Patterns ─────────────────────────
//
// German subject names can vary across schools and states.
// We use case-insensitive regex patterns to handle variations:
//   "Mathematik" / "Mathe" / "Math"
//   "Deutsch"
//   "Englisch" / "Französisch" / "Latein" / "Spanisch" etc.
//   "Physik" / "Chemie" / "Biologie" / "Informatik"
// ──────────────────────────────────────────────────────────────

/** Matches Math subject names. */
const MATH_PATTERN = /^math/i;

/** Matches German (Deutsch) subject names. */
const GERMAN_PATTERN = /^deutsch/i;

/** Matches common foreign language subject names. */
const FOREIGN_LANGUAGE_PATTERN =
    /^(englisch|franz[öo]sisch|latein|spanisch|italienisch|russisch|chinesisch|japanisch|t[üu]rkisch|niederl[äa]ndisch|portugiesisch|polnisch|hebr[äa]isch|altgriechisch|neugriechisch)/i;

/** Matches natural science subject names. */
const NATURAL_SCIENCE_PATTERN =
    /^(physik|chemie|biologie|bio|informatik)/i;

// ─── Statutory Identification ───────────────────────────────

/**
 * Identifies which subjects are "statutory" (legally required to
 * be counted) for each federal state mode.
 *
 * Returns a Set of subject IDs that are anchor courses.
 */
export function identifyStatutoryCourses(
    subjects: Subject[],
    profile: UserInputProfile
): Set<string> {
    const statutory = new Set<string>();

    switch (profile.federalState) {
        // ──────────────────────────────────────────────────
        // NRW (APO-GOSt): Math, German, 1 Foreign Language,
        // 1 Natural Science — all taken through Q2.
        // ──────────────────────────────────────────────────
        case FederalState.NRW: {
            // Always mandatory: Math + German
            for (const s of subjects) {
                if (MATH_PATTERN.test(s.name) || GERMAN_PATTERN.test(s.name)) {
                    statutory.add(s.id);
                }
            }
            // First matching foreign language
            const firstLang = subjects.find((s) =>
                FOREIGN_LANGUAGE_PATTERN.test(s.name)
            );
            if (firstLang) statutory.add(firstLang.id);

            // First matching natural science
            const firstScience = subjects.find((s) =>
                NATURAL_SCIENCE_PATTERN.test(s.name)
            );
            if (firstScience) statutory.add(firstScience.id);
            break;
        }

        // ──────────────────────────────────────────────────
        // BAVARIA (GSO): Math, German, plus 3rd/4th/5th exam
        // subjects (all exam subjects beyond the 2 LKs).
        // ──────────────────────────────────────────────────
        case FederalState.Bavaria: {
            for (const s of subjects) {
                // Math + German always mandatory
                if (MATH_PATTERN.test(s.name) || GERMAN_PATTERN.test(s.name)) {
                    statutory.add(s.id);
                }
                // All exam subjects are anchor courses in Bavaria
                if (s.isExamSubject) {
                    statutory.add(s.id);
                }
            }
            break;
        }

        // ──────────────────────────────────────────────────
        // GENERAL: User-defined customMandatorySubjects.
        // Case-insensitive substring matching.
        // ──────────────────────────────────────────────────
        case FederalState.General: {
            const mandatoryNames = profile.rulesConfig.customMandatorySubjects;
            if (!mandatoryNames || mandatoryNames.length === 0) break;

            const lowerNames = mandatoryNames.map((n) => n.toLowerCase());

            for (const s of subjects) {
                const subjectLower = s.name.toLowerCase();
                if (lowerNames.some((mn) => subjectLower.includes(mn))) {
                    statutory.add(s.id);
                }
            }
            break;
        }
    }

    return statutory;
}

// ─── Grade Helpers ──────────────────────────────────────────

/** Collects all existing (non-null) grades for a subject. */
function collectExistingGrades(subject: Subject): number[] {
    const grades: number[] = [];
    for (const key of SEMESTER_KEYS) {
        const g = subject.semesterGrades[key];
        if (g !== null && g !== undefined) {
            grades.push(g);
        }
    }
    return grades;
}

/** Computes mean from a flat number array, or null if empty. */
function mean(values: number[]): number | null {
    if (values.length === 0) return null;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
}

// ─── Core Algorithm ─────────────────────────────────────────

interface BucketAnalysis {
    anchorGrades: number[];
    floatGrades: number[];
    anchorAvg: number | null;
    floatAvg: number | null;
    delta: number | null;
    anchorSubjectIds: string[];
    floatSubjectIds: string[];
}

function analyzeBuckets(
    subjects: Subject[],
    statutoryIds: Set<string>
): BucketAnalysis {
    const anchorGrades: number[] = [];
    const floatGrades: number[] = [];
    const anchorSubjectIds: string[] = [];
    const floatSubjectIds: string[] = [];

    for (const subject of subjects) {
        const grades = collectExistingGrades(subject);
        if (grades.length === 0) continue;

        if (statutoryIds.has(subject.id)) {
            anchorGrades.push(...grades);
            anchorSubjectIds.push(subject.id);
        } else {
            floatGrades.push(...grades);
            floatSubjectIds.push(subject.id);
        }
    }

    const anchorAvg = mean(anchorGrades);
    const floatAvg = mean(floatGrades);

    // Delta = Float avg − Anchor avg (positive = anchors dragging down)
    const delta =
        anchorAvg !== null && floatAvg !== null
            ? Math.round((floatAvg - anchorAvg) * 100) / 100
            : null;

    return {
        anchorGrades,
        floatGrades,
        anchorAvg,
        floatAvg,
        delta,
        anchorSubjectIds,
        floatSubjectIds,
    };
}

// ─── Risk Assessment ────────────────────────────────────────

function getAnchorThreshold(profile: UserInputProfile): number {
    if (profile.federalState === FederalState.General) {
        return profile.rulesConfig.anchorThreshold ?? DEFAULT_ANCHOR_THRESHOLD;
    }
    return DEFAULT_ANCHOR_THRESHOLD;
}

function buildFindings(
    profile: UserInputProfile,
    analysis: BucketAnalysis
): RiskFinding[] {
    const findings: RiskFinding[] = [];

    if (analysis.delta === null) {
        // Not enough data to compute delta
        return findings;
    }

    const threshold = getAnchorThreshold(profile);
    const anchorAvgRounded = Math.round((analysis.anchorAvg ?? 0) * 100) / 100;
    const floatAvgRounded = Math.round((analysis.floatAvg ?? 0) * 100) / 100;
    const allAffected = [
        ...analysis.anchorSubjectIds,
        ...analysis.floatSubjectIds,
    ];

    // ── DETECTED: Electives significantly outperform mandatory ──
    if (analysis.delta > threshold) {
        findings.push({
            severity: RiskSeverity.ORANGE,
            trapType: TrapType.Anchor,
            message:
                `Structural Drag Detected. Your electives average ${floatAvgRounded} pts, ` +
                `but mandatory subjects average ${anchorAvgRounded} pts. ` +
                `This "Anchor" (${analysis.delta} pt gap) is lowering your final GPA prediction.`,
            i18nKey: 'report.anchor.detected',
            i18nParams: {
                floatAvg: floatAvgRounded,
                anchorAvg: anchorAvgRounded,
                delta: analysis.delta,
                threshold,
            },
            affectedSubjectIds: analysis.anchorSubjectIds,
        });
    }
    // ── INVERTED: Mandatory subjects boost GPA ──
    else if (analysis.delta < 0) {
        findings.push({
            severity: RiskSeverity.GREEN,
            trapType: TrapType.Anchor,
            message:
                `Strong Foundation. Your mandatory core subjects average ${anchorAvgRounded} pts, ` +
                `which is actually boosting your GPA compared to electives (${floatAvgRounded} pts).`,
            i18nKey: 'report.anchor.inverted',
            i18nParams: {
                floatAvg: floatAvgRounded,
                anchorAvg: anchorAvgRounded,
                delta: Math.abs(analysis.delta),
            },
            affectedSubjectIds: allAffected,
        });
    }

    return findings;
}

// ─── Annotation Builder ─────────────────────────────────────

function buildAnnotations(
    subjects: Subject[],
    statutoryIds: Set<string>
): Partial<SubjectRiskAnnotation>[] {
    return subjects.map((subject) => ({
        subjectId: subject.id,
        subjectName: subject.name,
        isKeystone: statutoryIds.has(subject.id),
    }));
}

// ─── Exported Detector ──────────────────────────────────────

export const anchorDetector: TrapDetector = {
    trapType: TrapType.Anchor,

    detect(profile: UserInputProfile, _ruleset: StateRuleset): TrapDetectorResult {
        // STEP 1: Identify statutory courses
        const statutoryIds = identifyStatutoryCourses(profile.subjects, profile);

        // STEP 2-3: Segment into buckets and compute averages
        const analysis = analyzeBuckets(profile.subjects, statutoryIds);

        // STEP 4-5: Assess risk based on delta
        const findings = buildFindings(profile, analysis);

        return {
            trapType: TrapType.Anchor,
            findings,
            subjectAnnotations: buildAnnotations(profile.subjects, statutoryIds),
        };
    },
};

// ─── Exported Internals (for unit testing) ──────────────────

export const _internals = {
    identifyStatutoryCourses,
    analyzeBuckets,
    collectExistingGrades,
    mean,
    DEFAULT_ANCHOR_THRESHOLD,
    MATH_PATTERN,
    GERMAN_PATTERN,
    FOREIGN_LANGUAGE_PATTERN,
    NATURAL_SCIENCE_PATTERN,
};
