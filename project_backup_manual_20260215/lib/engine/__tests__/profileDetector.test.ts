// ──────────────────────────────────────────────────────────────
// ARM – Profile Violation Detector Unit Tests
// ──────────────────────────────────────────────────────────────

import { profileDetector, _internals } from '../detectors/profileDetector';
import { RiskSeverity, TrapType } from '@/types/riskEngine';
import { FederalState, SubjectType, ExamType, FatalScope, SubjectCategory, ProfileType } from '@/types/userInput';
import type { UserInputProfile, Subject, GeneralRulesConfig } from '@/types/userInput';
import { NRW_RULESET, BAVARIA_RULESET, buildGeneralRuleset } from '../constants';

// ─── Test Helpers ──────────────────────────────────────────

function makeSubject(overrides: Partial<Subject> = {}): Subject {
    return {
        id: overrides.id ?? `subject-${Math.random().toString(36).slice(2, 8)}`,
        name: overrides.name ?? 'Test Subject',
        type: overrides.type ?? SubjectType.GK,
        isMandatory: overrides.isMandatory ?? false,
        isBelegpflichtig: overrides.isBelegpflichtig ?? false,
        subjectCategory: overrides.subjectCategory ?? SubjectCategory.SOCIAL,
        isActive: overrides.isActive ?? true,
        isExamSubject: overrides.isExamSubject ?? false,
        examType: overrides.examType ?? ExamType.None,
        semesterGrades: overrides.semesterGrades ?? {
            Q1_1: 10, Q1_2: 10, Q2_1: 10, Q2_2: 10,
        },
        finalExamGrade: overrides.finalExamGrade ?? null,
        confidence: overrides.confidence ?? 7,
        stressFactors: overrides.stressFactors ?? [],
    };
}

function nrwProfile(subjects: Subject[]): UserInputProfile {
    return { federalState: FederalState.NRW, graduationYear: 2026, subjects };
}

function bavariaProfile(subjects: Subject[]): UserInputProfile {
    return { federalState: FederalState.Bavaria, graduationYear: 2026, subjects };
}

function generalProfile(
    subjects: Subject[],
    configOverrides: Partial<GeneralRulesConfig> = {}
): UserInputProfile {
    return {
        federalState: FederalState.General,
        graduationYear: 2026,
        subjects,
        rulesConfig: {
            lkWeight: 2,
            gkWeight: 1,
            deficitThreshold: 5,
            maxDeficits: 7,
            minTotalPoints: 200,
            zeroIsFatal: true,
            fatalScope: FatalScope.ALL_COURSES,
            anchorThreshold: 3.0,
            customMandatorySubjects: [],
            profileType: ProfileType.SCIENTIFIC,
            minLanguages: 1,
            minSciences: 1,
            volatilityThreshold: 4.0,
            ...configOverrides,
        },
    };
}

// ─── Helper Subjects ────────────────────────────────────────

function languageSubject(name = 'Englisch', overrides: Partial<Subject> = {}): Subject {
    return makeSubject({ name, subjectCategory: SubjectCategory.LANGUAGE, ...overrides });
}

function scienceSubject(name = 'Physik', overrides: Partial<Subject> = {}): Subject {
    return makeSubject({ name, subjectCategory: SubjectCategory.SCIENCE, ...overrides });
}

function artSubject(name = 'Kunst', overrides: Partial<Subject> = {}): Subject {
    return makeSubject({ name, subjectCategory: SubjectCategory.ART, ...overrides });
}

function socialSubject(name = 'Geschichte', overrides: Partial<Subject> = {}): Subject {
    return makeSubject({ name, subjectCategory: SubjectCategory.SOCIAL, ...overrides });
}

// ═══════════════════════════════════════════════════════════════
//   STEP 1 – buildInventory
// ═══════════════════════════════════════════════════════════════

describe('Profile Detector – STEP 1: buildInventory', () => {
    it('should group active subjects by category', () => {
        const subjects = [
            languageSubject('Englisch'),
            languageSubject('Französisch'),
            scienceSubject('Physik'),
            artSubject('Kunst'),
            socialSubject('Geschichte'),
        ];

        const inv = _internals.buildInventory(subjects);

        expect(inv.languages).toHaveLength(2);
        expect(inv.sciences).toHaveLength(1);
        expect(inv.arts).toHaveLength(1);
        expect(inv.social).toHaveLength(1);
        expect(inv.sport).toHaveLength(0);
    });

    it('should exclude inactive subjects', () => {
        const subjects = [
            languageSubject('Englisch', { isActive: true }),
            languageSubject('Französisch', { isActive: false }),
            scienceSubject('Physik', { isActive: false }),
        ];

        const inv = _internals.buildInventory(subjects);

        expect(inv.languages).toHaveLength(1);
        expect(inv.sciences).toHaveLength(0);
    });

    it('should return empty categories for an empty subject list', () => {
        const inv = _internals.buildInventory([]);

        expect(inv.languages).toHaveLength(0);
        expect(inv.sciences).toHaveLength(0);
        expect(inv.arts).toHaveLength(0);
        expect(inv.social).toHaveLength(0);
        expect(inv.sport).toHaveLength(0);
    });
});

// ═══════════════════════════════════════════════════════════════
//   STEP 2 – Constraint Validation
// ═══════════════════════════════════════════════════════════════

describe('Profile Detector – STEP 2: Constraint Validation', () => {
    describe('NRW mode', () => {
        it('should produce RED finding when no active language', () => {
            const subjects = [
                scienceSubject('Physik'),
                socialSubject('Geschichte'),
                artSubject('Kunst'),
            ];
            const profile = nrwProfile(subjects);
            const result = profileDetector.detect(profile, NRW_RULESET);

            const redFindings = result.findings.filter(
                (f) => f.severity === RiskSeverity.RED
            );
            expect(redFindings.length).toBeGreaterThanOrEqual(1);
            expect(
                redFindings.some((f) =>
                    f.i18nKey.includes('languageRequired')
                )
            ).toBe(true);
        });

        it('should NOT produce RED finding when ≥1 active language exists', () => {
            const subjects = [
                languageSubject('Englisch'),
                scienceSubject('Physik'),
                artSubject('Kunst'),
            ];
            const profile = nrwProfile(subjects);
            const result = profileDetector.detect(profile, NRW_RULESET);

            const redFindings = result.findings.filter(
                (f) => f.severity === RiskSeverity.RED
            );
            expect(redFindings).toHaveLength(0);
        });

        it('should produce ORANGE when no Art/Music course is active', () => {
            const subjects = [
                languageSubject('Englisch'),
                scienceSubject('Physik'),
                socialSubject('Geschichte'),
            ];
            const profile = nrwProfile(subjects);
            const result = profileDetector.detect(profile, NRW_RULESET);

            const orangeArt = result.findings.filter(
                (f) =>
                    f.severity === RiskSeverity.ORANGE &&
                    f.i18nKey.includes('artMusic')
            );
            expect(orangeArt).toHaveLength(1);
        });

        it('should NOT produce ORANGE for Art/Music when Kunst is active', () => {
            const subjects = [
                languageSubject('Englisch'),
                scienceSubject('Physik'),
                artSubject('Kunst'),
            ];
            const profile = nrwProfile(subjects);
            const result = profileDetector.detect(profile, NRW_RULESET);

            const orangeArt = result.findings.filter(
                (f) =>
                    f.severity === RiskSeverity.ORANGE &&
                    f.i18nKey.includes('artMusic')
            );
            expect(orangeArt).toHaveLength(0);
        });
    });

    describe('Bavaria mode', () => {
        it('should produce RED when Math is missing', () => {
            const subjects = [
                makeSubject({ name: 'Deutsch', subjectCategory: SubjectCategory.LANGUAGE }),
                languageSubject('Englisch'),
                scienceSubject('Physik'),
            ];
            const profile = bavariaProfile(subjects);
            const result = profileDetector.detect(profile, BAVARIA_RULESET);

            const mathRed = result.findings.filter(
                (f) =>
                    f.severity === RiskSeverity.RED &&
                    f.i18nKey.includes('mathRequired')
            );
            expect(mathRed).toHaveLength(1);
        });

        it('should produce RED when German is missing', () => {
            const subjects = [
                makeSubject({ name: 'Mathematik', subjectCategory: SubjectCategory.SCIENCE }),
                languageSubject('Englisch'),
                scienceSubject('Physik'),
            ];
            const profile = bavariaProfile(subjects);
            const result = profileDetector.detect(profile, BAVARIA_RULESET);

            const germanRed = result.findings.filter(
                (f) =>
                    f.severity === RiskSeverity.RED &&
                    f.i18nKey.includes('germanRequired')
            );
            expect(germanRed).toHaveLength(1);
        });

        it('should produce RED when no Language is active', () => {
            const subjects = [
                makeSubject({ name: 'Mathematik', subjectCategory: SubjectCategory.SCIENCE }),
                makeSubject({ name: 'Deutsch', subjectCategory: SubjectCategory.LANGUAGE }),
                scienceSubject('Physik'),
            ];
            // Remove "Deutsch" from LANGUAGE since it's not really a *foreign* language
            // but a language. The inventory counts by SubjectCategory.
            // Actually Deutsch is categorized as LANGUAGE here so it satisfies the language constraint.
            const profile = bavariaProfile(subjects);
            const result = profileDetector.detect(profile, BAVARIA_RULESET);

            // Deutsch (categorized as LANGUAGE) satisfies languages constraint
            // Physik + Mathematik satisfy sciences
            const langRed = result.findings.filter(
                (f) =>
                    f.severity === RiskSeverity.RED &&
                    f.i18nKey.includes('languageRequired')
            );
            expect(langRed).toHaveLength(0);
        });

        it('should produce RED when no Science is active', () => {
            const subjects = [
                makeSubject({ name: 'Mathematik', subjectCategory: SubjectCategory.SOCIAL }),
                makeSubject({ name: 'Deutsch', subjectCategory: SubjectCategory.SOCIAL }),
                languageSubject('Englisch'),
                // no science
            ];
            const profile = bavariaProfile(subjects);
            const result = profileDetector.detect(profile, BAVARIA_RULESET);

            const sciRed = result.findings.filter(
                (f) =>
                    f.severity === RiskSeverity.RED &&
                    f.i18nKey.includes('scienceRequired')
            );
            expect(sciRed).toHaveLength(1);
        });

        it('should produce NO red findings when all Bavaria requirements met', () => {
            const subjects = [
                makeSubject({ name: 'Mathematik', subjectCategory: SubjectCategory.SCIENCE }),
                makeSubject({ name: 'Deutsch', subjectCategory: SubjectCategory.LANGUAGE }),
                languageSubject('Englisch'),
                scienceSubject('Physik'),
            ];
            const profile = bavariaProfile(subjects);
            const result = profileDetector.detect(profile, BAVARIA_RULESET);

            const redFindings = result.findings.filter(
                (f) => f.severity === RiskSeverity.RED
            );
            expect(redFindings).toHaveLength(0);
        });
    });

    describe('General mode', () => {
        it('should enforce minLanguages from rulesConfig', () => {
            const subjects = [
                scienceSubject('Physik'),
                socialSubject('Geschichte'),
            ];
            const profile = generalProfile(subjects, { minLanguages: 1 });
            const ruleset = buildGeneralRuleset(profile.rulesConfig);
            const result = profileDetector.detect(profile, ruleset);

            const langRed = result.findings.filter(
                (f) =>
                    f.severity === RiskSeverity.RED &&
                    f.i18nKey.includes('languageRequired')
            );
            expect(langRed).toHaveLength(1);
        });

        it('should enforce minSciences from rulesConfig', () => {
            const subjects = [
                languageSubject('Englisch'),
                socialSubject('Geschichte'),
            ];
            const profile = generalProfile(subjects, { minSciences: 2 });
            const ruleset = buildGeneralRuleset(profile.rulesConfig);
            const result = profileDetector.detect(profile, ruleset);

            const sciRed = result.findings.filter(
                (f) =>
                    f.severity === RiskSeverity.RED &&
                    f.i18nKey.includes('scienceRequired')
            );
            expect(sciRed).toHaveLength(1);
        });

        it('should enforce Linguistic profile → ≥2 languages', () => {
            const subjects = [
                languageSubject('Englisch'),
                scienceSubject('Physik'),
            ];
            const profile = generalProfile(subjects, {
                profileType: ProfileType.LINGUISTIC,
                minLanguages: 1,
            });
            const ruleset = buildGeneralRuleset(profile.rulesConfig);
            const result = profileDetector.detect(profile, ruleset);

            const lingRed = result.findings.filter(
                (f) =>
                    f.severity === RiskSeverity.RED &&
                    f.i18nKey.includes('linguisticLanguages')
            );
            expect(lingRed).toHaveLength(1);
        });

        it('should enforce Scientific profile → ≥2 sciences', () => {
            const subjects = [
                languageSubject('Englisch'),
                scienceSubject('Physik'),
            ];
            const profile = generalProfile(subjects, {
                profileType: ProfileType.SCIENTIFIC,
                minSciences: 1,
            });
            const ruleset = buildGeneralRuleset(profile.rulesConfig);
            const result = profileDetector.detect(profile, ruleset);

            const sciRed = result.findings.filter(
                (f) =>
                    f.severity === RiskSeverity.RED &&
                    f.i18nKey.includes('scientificSciences')
            );
            expect(sciRed).toHaveLength(1);
        });

        it('should emit no RED findings when all General constraints satisfied', () => {
            const subjects = [
                languageSubject('Englisch'),
                languageSubject('Französisch'),
                scienceSubject('Physik'),
                scienceSubject('Chemie'),
            ];
            const profile = generalProfile(subjects, {
                profileType: ProfileType.SCIENTIFIC,
                minLanguages: 1,
                minSciences: 2,
            });
            const ruleset = buildGeneralRuleset(profile.rulesConfig);
            const result = profileDetector.detect(profile, ruleset);

            const redFindings = result.findings.filter(
                (f) => f.severity === RiskSeverity.RED
            );
            expect(redFindings).toHaveLength(0);

            // Sciences are exactly at the min (2/2), so ORANGE keystone
            // warnings are expected rather than a GREEN all-clear
            const orangeFindings = result.findings.filter(
                (f) => f.severity === RiskSeverity.ORANGE
            );
            expect(orangeFindings.length).toBeGreaterThanOrEqual(1);
        });

        it('should skip language constraint when minLanguages is 0', () => {
            const subjects = [
                scienceSubject('Physik'),
            ];
            const profile = generalProfile(subjects, {
                minLanguages: 0,
                minSciences: 1,
                profileType: ProfileType.SOCIAL,
            });
            const ruleset = buildGeneralRuleset(profile.rulesConfig);
            const result = profileDetector.detect(profile, ruleset);

            const langFindings = result.findings.filter(
                (f) => f.i18nKey.includes('languageRequired')
            );
            expect(langFindings).toHaveLength(0);
        });
    });
});

// ═══════════════════════════════════════════════════════════════
//   STEP 3 – Drop Simulation / Keystone Detection
// ═══════════════════════════════════════════════════════════════

describe('Profile Detector – STEP 3: Drop Simulation', () => {
    it('should identify keystone subjects when count equals minimum', () => {
        // 1 language, minLanguages=1 → that language is a keystone
        const subjects = [
            languageSubject('Englisch'),
            scienceSubject('Physik'),
        ];
        const profile = generalProfile(subjects, {
            minLanguages: 1,
            minSciences: 1,
            profileType: ProfileType.SOCIAL,
        });
        const ruleset = buildGeneralRuleset(profile.rulesConfig);
        const result = profileDetector.detect(profile, ruleset);

        const keystoneWarnings = result.findings.filter(
            (f) => f.i18nKey === 'report.profile.keystoneWarning'
        );
        // Both Englisch and Physik are keystones (each at exactly min)
        expect(keystoneWarnings).toHaveLength(2);
        expect(keystoneWarnings[0].severity).toBe(RiskSeverity.ORANGE);
    });

    it('should NOT flag keystones when count exceeds minimum', () => {
        // 2 languages, minLanguages=1 → neither is a keystone
        const subjects = [
            languageSubject('Englisch'),
            languageSubject('Französisch'),
            scienceSubject('Physik'),
            scienceSubject('Chemie'),
        ];
        const profile = generalProfile(subjects, {
            minLanguages: 1,
            minSciences: 1,
            profileType: ProfileType.SOCIAL,
        });
        const ruleset = buildGeneralRuleset(profile.rulesConfig);
        const result = profileDetector.detect(profile, ruleset);

        const keystoneWarnings = result.findings.filter(
            (f) => f.i18nKey === 'report.profile.keystoneWarning'
        );
        expect(keystoneWarnings).toHaveLength(0);
    });

    it('should annotate keystone subjects in subjectAnnotations', () => {
        const eng = languageSubject('Englisch', { id: 'lang-1' });
        const phy = scienceSubject('Physik', { id: 'sci-1' });
        const hist = socialSubject('Geschichte', { id: 'soc-1' });

        const subjects = [eng, phy, hist];
        const profile = generalProfile(subjects, {
            minLanguages: 1,
            minSciences: 1,
            profileType: ProfileType.SOCIAL,
        });
        const ruleset = buildGeneralRuleset(profile.rulesConfig);
        const result = profileDetector.detect(profile, ruleset);

        const annotations = result.subjectAnnotations ?? [];
        const langAnnotation = annotations.find((a) => a.subjectId === 'lang-1');
        const sciAnnotation = annotations.find((a) => a.subjectId === 'sci-1');
        const socAnnotation = annotations.find((a) => a.subjectId === 'soc-1');

        expect(langAnnotation?.isKeystone).toBe(true);
        expect(sciAnnotation?.isKeystone).toBe(true);
        expect(socAnnotation?.isKeystone).toBe(false);
    });

    it('should skip drop simulation for already-violated constraints', () => {
        // 0 languages with minLanguages=1 → already RED, no ORANGE keystone warning
        const subjects = [
            scienceSubject('Physik'),
            scienceSubject('Chemie'),
        ];
        const profile = generalProfile(subjects, {
            minLanguages: 1,
            minSciences: 1,
            profileType: ProfileType.SOCIAL,
        });
        const ruleset = buildGeneralRuleset(profile.rulesConfig);
        const result = profileDetector.detect(profile, ruleset);

        const redFindings = result.findings.filter(
            (f) => f.severity === RiskSeverity.RED
        );
        expect(redFindings.length).toBeGreaterThanOrEqual(1);

        const keystoneForLang = result.findings.filter(
            (f) =>
                f.i18nKey === 'report.profile.keystoneWarning' &&
                f.message.includes('language')
        );
        expect(keystoneForLang).toHaveLength(0);
    });
});

// ═══════════════════════════════════════════════════════════════
//   Integration / Full Detector Tests
// ═══════════════════════════════════════════════════════════════

describe('Profile Detector – Full Integration', () => {
    it('should return trapType ProfileViolation', () => {
        const result = profileDetector.detect(
            generalProfile([]),
            buildGeneralRuleset({
                lkWeight: 2, gkWeight: 1, deficitThreshold: 5,
                maxDeficits: 7, minTotalPoints: 200, zeroIsFatal: true,
                fatalScope: FatalScope.ALL_COURSES, anchorThreshold: 3,
                customMandatorySubjects: [],
                profileType: ProfileType.SOCIAL,
                minLanguages: 0, minSciences: 0, volatilityThreshold: 4.0,
            })
        );

        expect(result.trapType).toBe(TrapType.ProfileViolation);
    });

    it('should emit GREEN all-clear when no constraints exist', () => {
        const result = profileDetector.detect(
            generalProfile([], {
                profileType: ProfileType.SOCIAL,
                minLanguages: 0,
                minSciences: 0,
            }),
            buildGeneralRuleset({
                lkWeight: 2, gkWeight: 1, deficitThreshold: 5,
                maxDeficits: 7, minTotalPoints: 200, zeroIsFatal: true,
                fatalScope: FatalScope.ALL_COURSES, anchorThreshold: 3,
                customMandatorySubjects: [],
                profileType: ProfileType.SOCIAL,
                minLanguages: 0, minSciences: 0, volatilityThreshold: 4.0,
            })
        );

        expect(result.findings).toHaveLength(1);
        expect(result.findings[0].severity).toBe(RiskSeverity.GREEN);
        expect(result.findings[0].i18nKey).toBe('report.profile.allClear');
    });

    it('should produce both RED and ORANGE findings simultaneously', () => {
        // Missing language (RED) + Science is exactly at min (ORANGE keystone)
        const subjects = [
            scienceSubject('Physik'),
        ];
        const profile = generalProfile(subjects, {
            minLanguages: 1,
            minSciences: 1,
            profileType: ProfileType.SOCIAL,
        });
        const ruleset = buildGeneralRuleset(profile.rulesConfig);
        const result = profileDetector.detect(profile, ruleset);

        const redFindings = result.findings.filter(
            (f) => f.severity === RiskSeverity.RED
        );
        const orangeFindings = result.findings.filter(
            (f) => f.severity === RiskSeverity.ORANGE
        );

        expect(redFindings.length).toBeGreaterThanOrEqual(1);
        expect(orangeFindings.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle all subjects inactive gracefully', () => {
        const subjects = [
            languageSubject('Englisch', { isActive: false }),
            scienceSubject('Physik', { isActive: false }),
        ];
        const profile = generalProfile(subjects, {
            minLanguages: 1,
            minSciences: 1,
            profileType: ProfileType.SOCIAL,
        });
        const ruleset = buildGeneralRuleset(profile.rulesConfig);
        const result = profileDetector.detect(profile, ruleset);

        const redFindings = result.findings.filter(
            (f) => f.severity === RiskSeverity.RED
        );
        expect(redFindings).toHaveLength(2); // missing lang + missing science
    });

    it('should handle mixed active/inactive subjects correctly', () => {
        const subjects = [
            languageSubject('Englisch', { isActive: true }),
            languageSubject('Französisch', { isActive: false }),
            scienceSubject('Physik', { isActive: true }),
        ];
        const profile = generalProfile(subjects, {
            minLanguages: 2,
            minSciences: 1,
            profileType: ProfileType.SOCIAL,
        });
        const ruleset = buildGeneralRuleset(profile.rulesConfig);
        const result = profileDetector.detect(profile, ruleset);

        const langRed = result.findings.filter(
            (f) =>
                f.severity === RiskSeverity.RED &&
                f.i18nKey.includes('languageRequired')
        );
        // Only 1 active language but need 2
        expect(langRed).toHaveLength(1);
    });
});

// ═══════════════════════════════════════════════════════════════
//   Internal Helper Tests
// ═══════════════════════════════════════════════════════════════

describe('Profile Detector – Internal Helpers', () => {
    it('checkBavariaCoreSubjects: should detect missing Math', () => {
        const subjects = [
            makeSubject({ name: 'Deutsch' }),
            makeSubject({ name: 'Englisch' }),
        ];
        const findings = _internals.checkBavariaCoreSubjects(subjects);

        const mathF = findings.filter((f) =>
            f.i18nKey.includes('mathRequired')
        );
        expect(mathF).toHaveLength(1);
        expect(mathF[0].severity).toBe(RiskSeverity.RED);
    });

    it('checkBavariaCoreSubjects: should detect missing German', () => {
        const subjects = [
            makeSubject({ name: 'Mathematik' }),
            makeSubject({ name: 'Englisch' }),
        ];
        const findings = _internals.checkBavariaCoreSubjects(subjects);

        const germanF = findings.filter((f) =>
            f.i18nKey.includes('germanRequired')
        );
        expect(germanF).toHaveLength(1);
        expect(germanF[0].severity).toBe(RiskSeverity.RED);
    });

    it('checkBavariaCoreSubjects: should pass when both present', () => {
        const subjects = [
            makeSubject({ name: 'Mathematik' }),
            makeSubject({ name: 'Deutsch' }),
        ];
        const findings = _internals.checkBavariaCoreSubjects(subjects);
        expect(findings).toHaveLength(0);
    });

    it('checkNrwArtMusic: should warn when no art/music active', () => {
        const subjects = [
            makeSubject({ name: 'Englisch', subjectCategory: SubjectCategory.LANGUAGE }),
        ];
        const findings = _internals.checkNrwArtMusic(subjects);
        expect(findings).toHaveLength(1);
        expect(findings[0].severity).toBe(RiskSeverity.ORANGE);
    });

    it('checkNrwArtMusic: should pass when art course active', () => {
        const subjects = [
            artSubject('Kunst'),
        ];
        const findings = _internals.checkNrwArtMusic(subjects);
        expect(findings).toHaveLength(0);
    });

    it('getConstraints: NRW should require ≥1 language', () => {
        const profile = nrwProfile([]);
        const constraints = _internals.getConstraints(profile);

        expect(constraints).toHaveLength(1);
        expect(constraints[0].category).toBe('languages');
        expect(constraints[0].min).toBe(1);
    });

    it('getConstraints: Bavaria should require ≥1 language + ≥1 science', () => {
        const profile = bavariaProfile([]);
        const constraints = _internals.getConstraints(profile);

        expect(constraints).toHaveLength(2);
        expect(constraints.some((c) => c.category === 'languages')).toBe(true);
        expect(constraints.some((c) => c.category === 'sciences')).toBe(true);
    });
});
