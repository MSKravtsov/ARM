# ARM - Complete Calculation Logic Reference

**Generated:** 2026-02-16
**Test Coverage:** 229 tests (all passing)
**Purpose:** Complete reference for all risk calculations and indicators

---

## Table of Contents

1. [Ruleset Constants](#ruleset-constants)
2. [Core Point Calculations](#core-point-calculations)
3. [Module 1: Zero-Point Detection](#module-1-zero-point-detection)
4. [Module 2: Deficit Detection](#module-2-deficit-detection)
5. [Module 3: Anchor/Keystone Detection](#module-3-anchor-keystone-detection)
6. [Module 4: Profile Violation Detection](#module-4-profile-violation-detection)
7. [Module 5: Points Projection](#module-5-points-projection)
8. [Module 6: Exam Risk](#module-6-exam-risk)
9. [Module 7: Volatility Detection](#module-7-volatility-detection)
10. [Module 8: Special 2026 Rules](#module-8-special-2026-rules)
11. [Module 9: Psychosocial Risk Analysis](#module-9-psychosocial-risk-analysis)
12. [Overall Risk Aggregation](#overall-risk-aggregation)

---

## Ruleset Constants

### NRW (Nordrhein-Westfalen) - APO-GOSt 2026

```
Source: APO-GOSt NRW §§ 28-29
lkWeight: 2              // LK courses count double
gkWeight: 1              // GK courses count normal
deficitThreshold: 5      // Grades < 5 points are deficits
maxDeficits: 7           // Maximum 7 deficits allowed total
maxLkDeficits: 3         // Maximum 3 deficits in LK courses
minTotalPoints: 200      // Minimum points in Block I
minExamPoints: 100       // Minimum points in Block II (exams)
requiredLkCount: 2       // Must have exactly 2 LK subjects
requiredExamCount: 4     // Must have exactly 4 exam subjects
```

### Bavaria - GSO 2026

```
Source: GSO Bayern §§ 44-50
lkWeight: 2
gkWeight: 1
deficitThreshold: 5
maxDeficits: 8           // Bavaria allows 8 total deficits
maxLkDeficits: 3
minTotalPoints: 200
minExamPoints: 100
requiredLkCount: 2
requiredExamCount: 5     // Bavaria requires 5 exam subjects
```

### General Mode

```
User-configurable ruleset
All parameters defined by user in rulesConfig
No hardcoded LK/exam count requirements
No separate exam block minimum
```

---

## Core Point Calculations

### Subject Point Contribution

**Formula:**
```
contributedPoints = sum of (semesterGrades × weight) + examGrade
where weight = lkWeight if LK course, gkWeight if GK course
```

**Example (NRW LK Math):**
```
Semester grades: [12, 11, 10, 13]
Weight: 2 (LK)
Exam grade: 14

Calculation:
  Semester contribution: (12 + 11 + 10 + 13) × 2 = 92 points
  Exam contribution: 14 points
  Total: 92 + 14 = 106 points
```

### Total Points Calculation

**Formula:**
```
totalProjectedPoints = sum of all subjects' contributedPoints
```

**Deficit Counting:**
```
A grade is a deficit if: grade < deficitThreshold (typically < 5 points)
```

---

## Module 1: Zero-Point Detection

**Purpose:** Detect automatic disqualifications from 0-point semesters

### Detection Logic

```javascript
For each subject:
  For each semester grade:
    if (grade === 0) {
      → RED finding: "Zero-point semester detected"
      → Mark subject with hasZeroPoint flag
      → Automatic disqualification
    }
```

### Severity Rules

```
0 points in ANY semester → RED (automatic fail)
```

### Key Outputs

- `hasZeroPoint: boolean` - Subject annotation
- `totalZeroPoints: number` - Count across all subjects

---

## Module 2: Deficit Detection

**Purpose:** Track deficits and detect when limits are exceeded

### Deficit Classification

```javascript
For each subject:
  For each semester grade:
    if (grade > 0 && grade < deficitThreshold) {
      count as deficit
      if (subject is LK) {
        count as LK deficit
      }
    }
```

### Detection Rules

**RED Findings (Disqualification):**
```
1. totalDeficits > maxDeficits
   → "Deficit limit exceeded"

2. lkDeficits > maxLkDeficits
   → "LK deficit limit exceeded"
```

**ORANGE Findings (Warning):**
```
1. totalDeficits === maxDeficits - 1
   → "One deficit away from limit"

2. lkDeficits === maxLkDeficits - 1
   → "One LK deficit away from limit"
```

### Special Rules

**Bündelungsverbot (NRW/Bavaria):**
```
if (subject has 2+ consecutive deficits in same subject) {
  → ORANGE: "Bündelungswarning"
  // Multiple deficits clustered in one subject is risky
}
```

### Key Outputs

- `isDeficit: boolean` - Subject annotation
- `totalDeficits: number` - Overall count
- `projectedDeficits: number` - Including predicted future deficits

---

## Module 3: Anchor/Keystone Detection

**Purpose:** Identify mandatory subjects with weak performance

### Detection Logic

```javascript
For each subject where mandatory === true (Einbringungspflicht):

  averageGrade = sum(semesterGrades) / semesterGrades.length

  if (averageGrade < 7) {
    → ORANGE: "Keystone subject at risk"
    // Subject is required but performing poorly
  }
```

### Weak Performance Thresholds

```
averageGrade < 7 points → Weak performance
averageGrade < 5 points → Critical performance
```

### Inverted Pattern Detection

```javascript
if (mandatory subject has declining trend) {
  if (latest grade < earliest grade - 3) {
    → ORANGE: "Inverted performance pattern"
    // Started strong but declining
  }
}
```

### Key Outputs

- `isKeystone: boolean` - Subject annotation
- Weak keystone findings

---

## Module 4: Profile Violation Detection

**Purpose:** Ensure academic profile structure meets requirements

### STEP 1: Inventory Check

```javascript
Categorize active subjects into:
  - languages: []
  - sciences: []
  - arts: []
  - social: []
  - sport: []
```

### STEP 2: Constraint Validation

**NRW Constraints:**
```
1. minLanguages ≥ 1
   → RED if violated: "At least 1 foreign language required"
```

**Bavaria Constraints:**
```
1. minLanguages ≥ 1
   → RED if violated: "At least 1 continuous foreign language"

2. minSciences ≥ 1
   → RED if violated: "At least 1 continuous natural science"

3. Must have Math (detected by name pattern)
   → RED if violated: "Mathematics required"

4. Must have German (detected by name pattern)
   → RED if violated: "German (Deutsch) required"
```

**General Mode Constraints:**
```
User-configured via:
  - minLanguages
  - minSciences
  - profileType (LINGUISTIC requires ≥2 languages)
  - profileType (SCIENTIFIC requires ≥2 sciences)
```

### STEP 3: Drop Simulation (Keystone Detection)

```javascript
For each constraint:
  if (actual count === minimum required) {
    // Dropping ANY subject would violate constraint
    → All subjects in that category are keystones
    → ORANGE: "Keystone subject - dropping would violate rules"
  }
```

**Example:**
```
Constraint: minLanguages = 1
Active languages: [English]
Result: English is a keystone (can't be dropped)
```

### Special Checks

**NRW Art/Music:**
```
if (no art or music course active) {
  → ORANGE: "NRW requires at least one art/music course in Q-phase"
}
```

### Key Outputs

- Profile violation findings
- `isKeystone: boolean` flags for subjects at risk

---

## Module 5: Points Projection

**Purpose:** Predict if minimum point threshold will be met

### Projection Algorithm

```javascript
currentPoints = sum of all contributedPoints so far

projectedFinalPoints = currentPoints + estimatedRemainingPoints

if (projectedFinalPoints < minTotalPoints) {
  gap = minTotalPoints - projectedFinalPoints
  → RED: "Projected points below minimum"
}
```

### Estimation Method

```javascript
For incomplete semesters:
  Use average of existing grades as projection

For exam subjects:
  Use confidence-adjusted predictions
```

### Severity Rules

```
Projected < minTotalPoints → RED
Projected within 10% of min → ORANGE (warning zone)
```

---

## Module 6: Exam Risk

**Purpose:** Validate exam block will meet minimum requirements

### Exam Block Calculation

```javascript
examBlockPoints = sum of (examGrades for all exam subjects)

if (examBlockPoints < minExamPoints) {
  → RED: "Exam block points insufficient"
}
```

### NRW/Bavaria Requirements

```
NRW: 4 exam subjects, minimum 100 points total
Bavaria: 5 exam subjects (3 written + 2 oral/colloquium), minimum 100 points
```

### Special Cases

```
If exam subject has no examGrade yet:
  Use confidence-weighted projection based on semester average

Low confidence subjects (< 4/10):
  Apply penalty to projection
```

### Bavaria 13.2 (Q2_2) Special Projection Logic

**Semester 13.2 Grade Calculation Rules:**

```javascript
For Bavaria in final semester (Q2_2):

CORE SUBJECTS (Math, German, LK subjects):
  ✓ Keep standard projection: Written Exam + Oral components

BASIC COURSES (GK / Grundkurse):
  ✗ DISABLE Written Exam projection
  ✓ Calculate grade based ONLY on "Small Proofs of Performance"
    (oral presentations, small tests, assignments)
  ✗ No Schulaufgaben (written major exams) in GK during 13.2

Implementation:
  if (state === Bavaria && semester === Q2_2 && subjectType === GK) {
    // Use only oral/assignment average, NO written exam component
  }
```

**Rationale:**
Bavaria's G9 system does not require written major exams (Schulaufgaben) for basic courses in the final semester. Only core subjects (Math, German, LK) maintain full written exam requirements.

---

## Module 7: Volatility Detection

**Purpose:** Identify grade instability and declining trends

### Volatility Calculation

```javascript
For each subject with ≥3 semester grades:

  standardDeviation = sqrt(variance(grades))
  mean = average(grades)

  volatilityCoefficient = standardDeviation / mean

  if (volatilityCoefficient > 0.35) {
    → ORANGE: "High volatility - inconsistent performance"
  }
```

### Trend Detection

**Downward Trend:**
```javascript
recentAverage = average(last 2 grades)
earlyAverage = average(first 2 grades)

trendSlope = (recentAverage - earlyAverage) / numberOfSemesters

if (trendSlope < -1.0) {
  → ORANGE: "Declining grade trend detected"
}
```

**Critical Decline:**
```javascript
if (latest grade < earliest grade - 4) {
  → RED: "Critical performance drop"
}
```

### Stability Metrics

```
Coefficient of Variation (CV):
  CV < 0.15 → Stable performance
  0.15 ≤ CV < 0.25 → Variable performance
  0.25 ≤ CV < 0.35 → Volatile performance
  CV ≥ 0.35 → High risk
```

### Key Outputs

- `trend: 'stable' | 'improving' | 'declining'` - Subject annotation
- Volatility findings

---

## Module 8: Special 2026 Rules

**Purpose:** Apply transition-year specific rules

### NRW G8 Transition (2026) - "Gap Year" Void

**Critical Gap Year Warning (UPDATED):**
```javascript
Trigger Conditions (evaluated with OR logic):
  - totalDeficits >= 6, OR
  - lkDeficits >= 2

if (state === NRW && year === 2026 && (totalDeficits >= 6 || lkDeficits >= 2)) {
  → RED: "CRITICAL TRANSITION RISK - Gap Year Void"

  Message:
  "With {totalDeficits} total deficits ({lkDeficits} in LK courses),
   you are in the danger zone for the 2026 'Gap Year' void.
   Repeating the year at this school is likely IMPOSSIBLE due to
   the G8/G9 transition. Failure may force a transfer to a
   centralized 'Bündelungsgymnasium' with limited capacity.
   Take immediate action to secure your grades."
}
```

**Why This Matters:**
- **2026 is unique**: No regular G9 graduating class
- **Repeating is nearly impossible**: Schools won't offer G8 repeat classes
- **Bündelungsgymnasium**: Centralized schools with limited capacity
- **Lower threshold**: Triggers earlier (6 deficits vs. 7) to give warning
- **LK deficit check**: 2+ LK deficits alone trigger critical warning
- **Escalated to RED**: Changed from ORANGE to emphasize urgency

**Already Disqualified:**
```javascript
if (totalDeficits > maxDeficits || hasZeroPointInMandatory) {
  → RED: "Critical - immediate disqualification"
  // Must verify school offers G8-Repeater class
}
```

### Bavaria Seminar Course Rules (2026)

**Seminar Optimization:**
```javascript
if (subject.name.match(/seminar/i)) {
  if (average grade < 9) {
    → ORANGE: "Seminar course below optimization threshold"
    // Seminar courses are strategic in Bavaria
  }
}
```

**Hard Anchor:**
```javascript
if (seminar is mandatory && average < 7) {
  → RED: "Mandatory seminar at risk"
}
```

---

## Module 9: Psychosocial Risk Analysis

**Purpose:** Analyze confidence and stress factors for hidden risks

### Risk Multiplier Calculation

```javascript
function calculateRiskMultiplier(grade, confidence, stressFactors):

  multiplier = 1.0

  // Confidence gap penalty
  confidenceGap = max(0, 10 - confidence)
  multiplier += confidenceGap / 20  // Up to +0.5

  // Stress factor impact
  stressCount = stressFactors.length
  if (stressCount >= 3):
    multiplier += 0.3  // Multiple stressors compound
  else if (stressCount >= 1):
    multiplier += 0.15

  // Fragility Index: Good grades + Low confidence
  if (grade > 10 && confidence < 4):
    multiplier += 0.4  // Hidden volatility

  // Collapse Predictor: Borderline + Anxiety
  hasAnxiety = stressFactors includes 'anxiety' or 'stress'
  hasHealth = stressFactors includes 'health'
  if (grade <= 6 && (hasAnxiety || hasHealth)):
    multiplier += 0.6  // Critical stability risk

  // Borderline with stress
  if (grade <= 5 && stressCount > 0):
    multiplier += 0.3

  return min(multiplier, 2.0)  // Cap at 2.0
```

### Risk Scenarios

**Scenario 1: Fragility Index (Hidden Volatility)**
```
Condition: grade > 10 AND confidence < 4
Result: HIGH severity
Message: "Performing well but low confidence suggests burnout risk"
Flag: isFragile = true
```

**Scenario 2: Collapse Predictor (Critical Stability)**
```
Condition: grade ≤ 6 AND (anxiety OR health issues)
Result: CRITICAL severity
Message: "Borderline grade with anxiety - dangerous 'Wackelkandidat'"
Flag: isUnstable = true
```

**Scenario 3: Moderate Risk**
```
Condition: confidence < 5 OR stressFactors.length ≥ 2
Result: MODERATE to HIGH severity
```

**Scenario 4: Low Risk**
```
Condition: confidence ≥ 5 AND stressFactors.length < 2
Result: LOW severity
```

### Stress Factor Classification

**Type A: Methodological (Actionable)**
```
Factors: Time Management, Procrastination, Study Habits, Organization
Advice: "Focus on study plans, time management, tutoring support"
```

**Type B: Psychological (Support Required)**
```
Factors: Anxiety, Perfectionism, Stress, Exam Anxiety, Fear, Depression
Advice: "Consider counseling, stress-reduction, mental health support"
```

**Type C: Structural (External Constraints)**
```
Factors: Health Issues, External Pressure, Family Issues, Financial Problems, Work
Advice: "Consult coordinator for accommodation options"
```

### Summary Statistics

```javascript
fragileSubjects = count where isFragile === true
unstableSubjects = count where isUnstable === true
criticalSubjects = count where severity === 'CRITICAL'
averageRiskMultiplier = mean of all riskMultipliers
```

---

## Overall Risk Aggregation

### Severity Determination

**Priority Order:**
```
1. RED > ORANGE > GREEN
   (Most severe finding determines overall severity)
```

**Aggregation Logic:**
```javascript
function highestSeverity(findings):
  if (any finding is RED):
    return RED
  else if (any finding is ORANGE):
    return ORANGE
  else:
    return GREEN
```

### Summary Statistics

```javascript
stats = {
  totalProjectedPoints: sum of all contributedPoints,
  totalDeficits: count of subjects with isDeficit,
  totalZeroPoints: count of subjects with hasZeroPoint,
  keystoneCount: count of subjects with isKeystone,
  redFindingsCount: count of RED findings,
  orangeFindingsCount: count of ORANGE findings,
  greenFindingsCount: count of GREEN findings
}
```

### Finding Prioritization

**Display Order:**
```
1. RED findings (Hard Stops - Legal Disqualifications)
   - Zero points
   - Deficit limits exceeded
   - Profile violations
   - Point thresholds not met

2. ORANGE findings (Structural Risks)
   - Near deficit limits
   - Keystone subjects at risk
   - Declining trends
   - Volatility warnings

3. GREEN findings (Optimizations)
   - Profile structure intact
   - Stable performance
   - Optimization opportunities
```

---

## Formula Quick Reference

### Point Contribution
```
contributedPoints = Σ(semesterGrades × weight) + examGrade
```

### Volatility Coefficient
```
CV = σ / μ
where σ = standard deviation, μ = mean
```

### Trend Slope
```
slope = (recent_avg - early_avg) / n_semesters
```

### Deficit Detection
```
isDeficit = (grade > 0) AND (grade < deficitThreshold)
```

### Risk Multiplier
```
multiplier = 1.0
  + (10 - confidence) / 20
  + stressPenalty
  + scenarioPenalty
cap at 2.0
```

---

## Validation Thresholds Summary

| Metric | RED Threshold | ORANGE Threshold | Notes |
|--------|---------------|------------------|-------|
| Zero Points | Any 0 grade | N/A | Automatic fail |
| Total Deficits (NRW) | > 7 | ≥ 6 | One away = warning |
| LK Deficits (NRW) | > 3 | ≥ 2 | One away = warning |
| Total Points (NRW) | < 200 | 200-220 | 10% buffer |
| Exam Points | < 100 | 100-110 | 10% buffer |
| Volatility CV | N/A | > 0.35 | High inconsistency |
| Trend Slope | < -2.0 | < -1.0 | Points per semester |
| Confidence (with high grade) | N/A | < 4 | Fragility risk |
| Confidence (with low grade) | < 3 | < 5 | Collapse risk |

---

## Test Coverage

**Total Tests:** 229 (all passing)

**Coverage by Module:**
- Zero Point Detector: 15 tests
- Deficit Detector: 28 tests
- Anchor Detector: 18 tests
- Profile Detector: 42 tests
- Volatility Detector: 24 tests
- Special 2026 Detector: 12 tests
- Risk Engine Integration: 16 tests
- Schema Validation: 74 tests

**Key Test Scenarios:**
- Edge cases (exact threshold values)
- Multiple simultaneous violations
- State-specific rules (NRW vs Bavaria)
- General mode customization
- Trend detection accuracy
- Psychosocial risk scenarios

---

## Notes for Verification

1. **All formulas** have been tested with edge cases
2. **Thresholds** are based on official APO-GOSt and GSO regulations
3. **Psychosocial multipliers** are calibrated for realistic risk amplification
4. **Deficit counting** properly handles 0-point vs. below-threshold cases
5. **Profile detection** correctly implements drop simulation for keystone identification
6. **Trend analysis** requires minimum 3 data points for reliability

---

**End of Calculation Logic Reference**
