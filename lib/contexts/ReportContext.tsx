'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import type { RiskReport } from '@/types/riskEngine';
import type { UserInputProfile } from '@/types/userInput';
import type { PsychosocialData, PsychosocialRiskAssessment } from '@/types/psychosocial';
import { SleepDuration, EnergyLevel, PsychosocialRisk } from '@/types/psychosocial';

interface ReportContextValue {
    profile: UserInputProfile | null;
    report: RiskReport | null;
    psychosocialData: PsychosocialData;
    setPsychosocialData: (data: PsychosocialData) => void;
    psychosocialRisk: PsychosocialRiskAssessment;
}

const ReportContext = createContext<ReportContextValue | undefined>(undefined);

const DEFAULT_PSYCHOSOCIAL_DATA: PsychosocialData = {
    weeklyCommitments: 10,
    sleepDuration: SleepDuration.MEDIUM,
    energyLevel: EnergyLevel.GOOD,
    targetGPA: 2.0,
    anxietySubjectId: null,
};

function calculatePsychosocialRisk(
    data: PsychosocialData,
    projectedGPA: number
): PsychosocialRiskAssessment {
    const gpaGap = Math.abs(data.targetGPA - projectedGPA);

    // Burnout risk: Poor sleep OR low energy
    const hasBurnoutRisk =
        data.sleepDuration === SleepDuration.LOW ||
        data.energyLevel === EnergyLevel.LOW;

    // Unrealistic expectations: Large GPA gap
    const hasUnrealisticExpectations = gpaGap > 2.0;

    // Overall risk calculation
    let overallRisk: PsychosocialRisk;

    if (
        data.sleepDuration === SleepDuration.LOW ||
        gpaGap > 2.0 ||
        data.weeklyCommitments > 20
    ) {
        overallRisk = PsychosocialRisk.HIGH;
    } else if (hasBurnoutRisk || gpaGap > 0.5 || data.weeklyCommitments > 12) {
        overallRisk = PsychosocialRisk.MODERATE;
    } else {
        overallRisk = PsychosocialRisk.LOW;
    }

    return {
        overallRisk,
        gpaGap,
        hasBurnoutRisk,
        hasUnrealisticExpectations,
    };
}

function calculateProjectedGPA(report: RiskReport | null): number {
    if (!report) return 2.0;

    // Convert points to GPA (German system: 300-900 points → 4.0-1.0 GPA)
    // Higher points = lower GPA number (better grade)
    const points = report.stats.totalProjectedPoints;

    // Rough conversion (can be refined)
    if (points >= 823) return 1.0; // Very good
    if (points >= 660) return 2.0; // Good
    if (points >= 495) return 3.0; // Satisfactory
    if (points >= 330) return 4.0; // Sufficient
    return 5.0; // Insufficient
}

interface ReportProviderProps {
    profile: UserInputProfile | null;
    report: RiskReport | null;
    children: ReactNode;
}

export function ReportProvider({ profile, report, children }: ReportProviderProps) {
    const [psychosocialData, setPsychosocialData] = useState<PsychosocialData>(
        DEFAULT_PSYCHOSOCIAL_DATA
    );

    const projectedGPA = calculateProjectedGPA(report);
    const psychosocialRisk = calculatePsychosocialRisk(psychosocialData, projectedGPA);

    return (
        <ReportContext.Provider
            value={{
                profile,
                report,
                psychosocialData,
                setPsychosocialData,
                psychosocialRisk,
            }}
        >
            {children}
        </ReportContext.Provider>
    );
}

export function useReport() {
    const context = useContext(ReportContext);
    if (context === undefined) {
        throw new Error('useReport must be used within a ReportProvider');
    }
    return context;
}
