-- ARM (Abitur Risk Monitor) - Initial Database Schema
-- Migration: 001_initial_schema.sql
-- Created: 2026-02-08

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES TABLE
-- ============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  federal_state TEXT NOT NULL CHECK (federal_state IN ('NRW', 'Bavaria', 'General')),
  graduation_year INTEGER NOT NULL CHECK (graduation_year >= 2024 AND graduation_year <= 2030),
  configuration_status INTEGER DEFAULT 0 CHECK (configuration_status BETWEEN 0 AND 100),
  locale TEXT DEFAULT 'de' CHECK (locale IN ('de', 'en')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies for profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================
-- SUBJECTS TABLE
-- ============================================
CREATE TABLE subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_name TEXT NOT NULL,
  subject_type TEXT NOT NULL CHECK (subject_type IN ('LK', 'GK', 'Seminar')),
  semester_1_points INTEGER CHECK (semester_1_points BETWEEN 0 AND 15),
  semester_2_points INTEGER CHECK (semester_2_points BETWEEN 0 AND 15),
  semester_3_points INTEGER CHECK (semester_3_points BETWEEN 0 AND 15),
  semester_4_points INTEGER CHECK (semester_4_points BETWEEN 0 AND 15),
  exam_points INTEGER CHECK (exam_points BETWEEN 0 AND 15),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, subject_name)
);

-- RLS Policies for subjects
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own subjects"
  ON subjects FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- RISK_CALCULATIONS TABLE
-- ============================================
CREATE TABLE risk_calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_points INTEGER,
  deficit_count INTEGER,
  risk_status TEXT CHECK (risk_status IN ('safe', 'warning', 'danger')),
  risk_details JSONB,
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  strategy_used TEXT NOT NULL
);

-- RLS Policies for risk_calculations
ALTER TABLE risk_calculations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own calculations"
  ON risk_calculations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own calculations"
  ON risk_calculations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- STATE_RULES TABLE (Reference Data)
-- ============================================
CREATE TABLE state_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  federal_state TEXT NOT NULL,
  graduation_year INTEGER NOT NULL,
  rule_key TEXT NOT NULL,
  rule_value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(federal_state, graduation_year, rule_key)
);

-- State rules are public (no RLS needed as they're reference data)
ALTER TABLE state_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view state rules"
  ON state_rules FOR SELECT
  TO authenticated
  USING (true);

-- ============================================
-- SEED DATA: State Rules
-- ============================================

-- General KMK Standard Rules
INSERT INTO state_rules (federal_state, graduation_year, rule_key, rule_value, description)
VALUES
  ('General', 2026, 'min_total_points', '"300"', 'KMK Standard: Minimum 300 points required'),
  ('General', 2026, 'max_deficits', '"7"', 'KMK Standard: Maximum 7 deficits allowed');

-- NRW 2026 Specific Rules
INSERT INTO state_rules (federal_state, graduation_year, rule_key, rule_value, description)
VALUES
  ('NRW', 2026, 'g8_transition', '{"enabled": true, "bonus_points": 10}', 'G8 Transition Bonus for Bündelungsgymnasium'),
  ('NRW', 2026, 'min_total_points', '"300"', 'Inherits KMK standard'),
  ('NRW', 2026, 'max_deficits', '"7"', 'Inherits KMK standard');

-- Bavaria 2026 Specific Rules
INSERT INTO state_rules (federal_state, graduation_year, rule_key, rule_value, description)
VALUES
  ('Bavaria', 2026, 'seminar_weight', '{"multiplier": 2}', 'Seminar courses count double in G9 LehrplanPLUS'),
  ('Bavaria', 2026, 'min_total_points', '"300"', 'Inherits KMK standard'),
  ('Bavaria', 2026, 'max_deficits', '"7"', 'Inherits KMK standard');

-- ============================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to subjects
CREATE TRIGGER update_subjects_updated_at
  BEFORE UPDATE ON subjects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX idx_subjects_user_id ON subjects(user_id);
CREATE INDEX idx_risk_calculations_user_id ON risk_calculations(user_id);
CREATE INDEX idx_state_rules_lookup ON state_rules(federal_state, graduation_year);
