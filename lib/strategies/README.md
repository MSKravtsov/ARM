# Calculation Strategy Pattern Implementation

This directory contains the Strategy Pattern implementation for state-specific Abitur calculation rules.

## Strategies

- **GeneralStrategy**: KMK standard rules (300 points minimum, max 7 deficits)
- **NRW2026Strategy**: NRW-specific rules for G8 transition
- **Bavaria2026Strategy**: Bavaria G9 LehrplanPLUS with seminar weighting

## Usage

```typescript
import { CalculationEngine } from '@/lib/calculationEngine';

const engine = new CalculationEngine('NRW', 2026);
const result = engine.calculate(gradeData);
```

Implementation files will be created in Phase 4.
