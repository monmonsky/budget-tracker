-- ============================================================
-- ADD BUDGET TEMPLATES & FINANCIAL HEALTH SCORE
-- ============================================================
-- Version: 2.3.0
-- Date: 2025-01-05
-- Description: Budget templates and financial health tracking
-- ============================================================

-- ============================================================
-- 1. BUDGET TEMPLATES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS budget_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_name TEXT NOT NULL,
  description TEXT,
  template_type TEXT CHECK (template_type IN ('50_30_20', 'zero_based', 'envelope', 'custom')) NOT NULL,
  is_system_template BOOLEAN DEFAULT FALSE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_budget_templates_user ON budget_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_budget_templates_type ON budget_templates(template_type);

COMMENT ON TABLE budget_templates IS 'Budget templates (50/30/20, Zero-Based, etc)';
COMMENT ON COLUMN budget_templates.is_system_template IS 'System templates are available to all users';

-- ============================================================
-- 2. BUDGET TEMPLATE ITEMS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS budget_template_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID REFERENCES budget_templates(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL,
  percentage DECIMAL(5, 2),
  suggested_amount DECIMAL(15, 2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_budget_template_items_template ON budget_template_items(template_id);

COMMENT ON TABLE budget_template_items IS 'Items within a budget template';
COMMENT ON COLUMN budget_template_items.percentage IS 'Percentage of income allocated (for percentage-based templates)';

-- ============================================================
-- 3. FINANCIAL HEALTH SCORES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS financial_health_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  month DATE NOT NULL,
  total_score INTEGER CHECK (total_score >= 0 AND total_score <= 100),

  -- Component scores (each 0-100)
  savings_rate_score INTEGER,
  debt_ratio_score INTEGER,
  emergency_fund_score INTEGER,
  budget_adherence_score INTEGER,
  net_worth_growth_score INTEGER,

  -- Raw metrics
  savings_rate DECIMAL(5, 2),
  debt_to_income_ratio DECIMAL(5, 2),
  emergency_fund_months DECIMAL(5, 2),
  budget_adherence DECIMAL(5, 2),
  net_worth_growth DECIMAL(5, 2),

  -- Recommendations
  recommendations JSONB,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, month)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_financial_health_scores_user ON financial_health_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_financial_health_scores_month ON financial_health_scores(month DESC);

COMMENT ON TABLE financial_health_scores IS 'Monthly financial health score tracking';
COMMENT ON COLUMN financial_health_scores.total_score IS 'Overall financial health score (0-100)';
COMMENT ON COLUMN financial_health_scores.recommendations IS 'JSON array of improvement recommendations';

-- ============================================================
-- 4. RLS POLICIES
-- ============================================================

-- Budget Templates Policies
ALTER TABLE budget_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view system templates and own templates" ON budget_templates;
CREATE POLICY "Users can view system templates and own templates"
  ON budget_templates FOR SELECT
  USING (is_system_template = TRUE OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own templates" ON budget_templates;
CREATE POLICY "Users can insert own templates"
  ON budget_templates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own templates" ON budget_templates;
CREATE POLICY "Users can update own templates"
  ON budget_templates FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own templates" ON budget_templates;
CREATE POLICY "Users can delete own templates"
  ON budget_templates FOR DELETE
  USING (auth.uid() = user_id);

-- Budget Template Items Policies
ALTER TABLE budget_template_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view template items" ON budget_template_items;
CREATE POLICY "Users can view template items"
  ON budget_template_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM budget_templates bt
      WHERE bt.id = budget_template_items.template_id
        AND (bt.is_system_template = TRUE OR bt.user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert template items" ON budget_template_items;
CREATE POLICY "Users can insert template items"
  ON budget_template_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM budget_templates bt
      WHERE bt.id = budget_template_items.template_id
        AND bt.user_id = auth.uid()
    )
  );

-- Financial Health Scores Policies
ALTER TABLE financial_health_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own health scores" ON financial_health_scores;
CREATE POLICY "Users can view own health scores"
  ON financial_health_scores FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own health scores" ON financial_health_scores;
CREATE POLICY "Users can insert own health scores"
  ON financial_health_scores FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own health scores" ON financial_health_scores;
CREATE POLICY "Users can update own health scores"
  ON financial_health_scores FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================
-- 5. HELPER FUNCTIONS
-- ============================================================

-- Function to calculate financial health score
CREATE OR REPLACE FUNCTION calculate_financial_health_score(p_user_id UUID, p_month DATE)
RETURNS TABLE (
  total_score INTEGER,
  savings_rate_score INTEGER,
  debt_ratio_score INTEGER,
  emergency_fund_score INTEGER,
  budget_adherence_score INTEGER,
  net_worth_growth_score INTEGER,
  recommendations JSONB
) AS $$
DECLARE
  v_monthly_income DECIMAL(15, 2);
  v_monthly_expenses DECIMAL(15, 2);
  v_savings_rate DECIMAL(5, 2);
  v_total_debt DECIMAL(15, 2);
  v_debt_ratio DECIMAL(5, 2);
  v_emergency_fund DECIMAL(15, 2);
  v_emergency_months DECIMAL(5, 2);
  v_budget_adherence DECIMAL(5, 2);

  v_savings_score INTEGER := 0;
  v_debt_score INTEGER := 0;
  v_emergency_score INTEGER := 0;
  v_budget_score INTEGER := 0;
  v_networth_score INTEGER := 70; -- Default

  v_total INTEGER := 0;
  v_recs JSONB := '[]'::JSONB;
BEGIN
  -- Get monthly income
  SELECT COALESCE(SUM(amount), 0)
  INTO v_monthly_income
  FROM transactions
  WHERE user_id = p_user_id
    AND type = 'income'
    AND DATE_TRUNC('month', date) = DATE_TRUNC('month', p_month);

  -- Get monthly expenses
  SELECT COALESCE(SUM(amount), 0)
  INTO v_monthly_expenses
  FROM transactions
  WHERE user_id = p_user_id
    AND type = 'expense'
    AND DATE_TRUNC('month', date) = DATE_TRUNC('month', p_month);

  -- Calculate savings rate
  IF v_monthly_income > 0 THEN
    v_savings_rate := ((v_monthly_income - v_monthly_expenses) / v_monthly_income) * 100;
  ELSE
    v_savings_rate := 0;
  END IF;

  -- Savings Rate Score (0-100)
  -- 0-10% = 20, 10-20% = 50, 20-30% = 75, 30%+ = 100
  IF v_savings_rate >= 30 THEN
    v_savings_score := 100;
  ELSIF v_savings_rate >= 20 THEN
    v_savings_score := 75;
  ELSIF v_savings_rate >= 10 THEN
    v_savings_score := 50;
  ELSIF v_savings_rate > 0 THEN
    v_savings_score := 20;
  ELSE
    v_savings_score := 0;
    v_recs := v_recs || '{"type": "savings", "message": "Increase your savings rate to at least 20%"}'::JSONB;
  END IF;

  -- Get total debt (credit cards + loans)
  SELECT COALESCE(SUM(ABS(balance)), 0)
  INTO v_total_debt
  FROM accounts
  WHERE user_id = p_user_id
    AND account_type IN ('debt', 'credit_card')
    AND balance < 0;

  -- Calculate debt to income ratio
  IF v_monthly_income > 0 THEN
    v_debt_ratio := (v_total_debt / (v_monthly_income * 12)) * 100;
  ELSE
    v_debt_ratio := 0;
  END IF;

  -- Debt Ratio Score (0-100)
  -- 0-10% = 100, 10-20% = 80, 20-30% = 60, 30-40% = 40, 40%+ = 20
  IF v_debt_ratio <= 10 THEN
    v_debt_score := 100;
  ELSIF v_debt_ratio <= 20 THEN
    v_debt_score := 80;
  ELSIF v_debt_ratio <= 30 THEN
    v_debt_score := 60;
    v_recs := v_recs || '{"type": "debt", "message": "Work on reducing debt to below 20% of annual income"}'::JSONB;
  ELSIF v_debt_ratio <= 40 THEN
    v_debt_score := 40;
    v_recs := v_recs || '{"type": "debt", "message": "High debt level - prioritize debt reduction"}'::JSONB;
  ELSE
    v_debt_score := 20;
    v_recs := v_recs || '{"type": "debt", "message": "Critical debt level - create debt payoff plan immediately"}'::JSONB;
  END IF;

  -- Get emergency fund (cash + savings accounts)
  SELECT COALESCE(SUM(balance), 0)
  INTO v_emergency_fund
  FROM accounts
  WHERE user_id = p_user_id
    AND account_type IN ('checking', 'savings')
    AND is_active = TRUE;

  -- Calculate emergency fund in months
  IF v_monthly_expenses > 0 THEN
    v_emergency_months := v_emergency_fund / v_monthly_expenses;
  ELSE
    v_emergency_months := 0;
  END IF;

  -- Emergency Fund Score (0-100)
  -- 0-1 month = 20, 1-3 = 40, 3-6 = 70, 6+ = 100
  IF v_emergency_months >= 6 THEN
    v_emergency_score := 100;
  ELSIF v_emergency_months >= 3 THEN
    v_emergency_score := 70;
  ELSIF v_emergency_months >= 1 THEN
    v_emergency_score := 40;
    v_recs := v_recs || '{"type": "emergency", "message": "Build emergency fund to 6 months expenses"}'::JSONB;
  ELSE
    v_emergency_score := 20;
    v_recs := v_recs || '{"type": "emergency", "message": "Priority: Build emergency fund to at least 3 months expenses"}'::JSONB;
  END IF;

  -- Budget Adherence Score (check against budgets)
  -- Simple version: if expenses <= budgets = 100
  v_budget_score := 75; -- Default placeholder

  -- Calculate total score (weighted average)
  v_total := (
    (v_savings_score * 25) +
    (v_debt_score * 25) +
    (v_emergency_score * 30) +
    (v_budget_score * 10) +
    (v_networth_score * 10)
  ) / 100;

  -- Return results
  RETURN QUERY SELECT
    v_total,
    v_savings_score,
    v_debt_score,
    v_emergency_score,
    v_budget_score,
    v_networth_score,
    v_recs;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to apply budget template
CREATE OR REPLACE FUNCTION apply_budget_template(
  p_template_id UUID,
  p_month TEXT,
  p_total_income DECIMAL(15, 2)
)
RETURNS JSON AS $$
DECLARE
  v_template_item RECORD;
  v_amount DECIMAL(15, 2);
  v_category_id UUID;
  v_start_date DATE;
  v_end_date DATE;
  v_budgets_created INTEGER := 0;
  v_budgets_updated INTEGER := 0;
BEGIN
  -- Calculate start and end dates from month string (format: YYYY-MM)
  v_start_date := (p_month || '-01')::DATE;
  v_end_date := (DATE_TRUNC('month', v_start_date) + INTERVAL '1 month - 1 day')::DATE;

  -- Loop through template items
  FOR v_template_item IN
    SELECT * FROM budget_template_items WHERE template_id = p_template_id
  LOOP
    -- Find category by name (case-insensitive, expense type only)
    SELECT id INTO v_category_id
    FROM categories
    WHERE LOWER(name) = LOWER(v_template_item.category)
      AND type = 'expense'
    LIMIT 1;

    -- If category doesn't exist, create it (categories are global, not per-user)
    IF v_category_id IS NULL THEN
      INSERT INTO categories (name, type, icon, color)
      VALUES (v_template_item.category, 'expense', '📦', '#6366f1')
      RETURNING id INTO v_category_id;
    END IF;

    -- Calculate amount based on percentage or use suggested amount
    IF v_template_item.percentage IS NOT NULL THEN
      v_amount := (p_total_income * v_template_item.percentage / 100);
    ELSE
      v_amount := v_template_item.suggested_amount;
    END IF;

    -- Check if budget already exists for this category and month
    UPDATE budgets
    SET amount = v_amount, end_date = v_end_date, updated_at = NOW()
    WHERE user_id = auth.uid()
      AND category_id = v_category_id
      AND start_date = v_start_date;

    -- If no rows updated, insert new budget
    IF NOT FOUND THEN
      INSERT INTO budgets (user_id, category_id, amount, period, start_date, end_date)
      VALUES (auth.uid(), v_category_id, v_amount, 'monthly', v_start_date, v_end_date);
      v_budgets_created := v_budgets_created + 1;
    ELSE
      v_budgets_updated := v_budgets_updated + 1;
    END IF;
  END LOOP;

  -- Return success with counts
  RETURN json_build_object(
    'success', true,
    'budgets_created', v_budgets_created,
    'budgets_updated', v_budgets_updated,
    'message', 'Budget template applied successfully'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 6. SYSTEM TEMPLATES
-- ============================================================

-- Insert 50/30/20 Rule Template
INSERT INTO budget_templates (id, template_name, description, template_type, is_system_template)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  '50/30/20 Rule',
  'Allocate 50% to needs, 30% to wants, and 20% to savings/debt',
  '50_30_20',
  TRUE
) ON CONFLICT DO NOTHING;

INSERT INTO budget_template_items (template_id, category, percentage, notes)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Housing', 25, 'Rent, mortgage, utilities'),
  ('11111111-1111-1111-1111-111111111111', 'Food', 15, 'Groceries and essentials'),
  ('11111111-1111-1111-1111-111111111111', 'Transportation', 10, 'Car, gas, public transport'),
  ('11111111-1111-1111-1111-111111111111', 'Entertainment', 15, 'Fun, dining out'),
  ('11111111-1111-1111-1111-111111111111', 'Shopping', 10, 'Clothes, gadgets'),
  ('11111111-1111-1111-1111-111111111111', 'Personal', 5, 'Personal care, hobbies'),
  ('11111111-1111-1111-1111-111111111111', 'Savings', 15, 'Emergency fund, investments'),
  ('11111111-1111-1111-1111-111111111111', 'Debt Payment', 5, 'Loans, credit cards')
ON CONFLICT DO NOTHING;

-- Insert Zero-Based Budget Template
INSERT INTO budget_templates (id, template_name, description, template_type, is_system_template)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  'Zero-Based Budget',
  'Every dollar has a job - allocate all income to specific categories',
  'zero_based',
  TRUE
) ON CONFLICT DO NOTHING;

INSERT INTO budget_template_items (template_id, category, percentage, notes)
VALUES
  ('22222222-2222-2222-2222-222222222222', 'Housing', 30, 'Rent/mortgage + utilities'),
  ('22222222-2222-2222-2222-222222222222', 'Food', 12, 'Groceries'),
  ('22222222-2222-2222-2222-222222222222', 'Transportation', 10, 'Car, fuel, maintenance'),
  ('22222222-2222-2222-2222-222222222222', 'Insurance', 8, 'Health, life, car'),
  ('22222222-2222-2222-2222-222222222222', 'Debt Payment', 10, 'Credit cards, loans'),
  ('22222222-2222-2222-2222-222222222222', 'Savings', 10, 'Emergency fund'),
  ('22222222-2222-2222-2222-222222222222', 'Entertainment', 8, 'Dining, movies, hobbies'),
  ('22222222-2222-2222-2222-222222222222', 'Personal', 5, 'Clothes, haircut, gym'),
  ('22222222-2222-2222-2222-222222222222', 'Miscellaneous', 7, 'Buffer for unexpected')
ON CONFLICT DO NOTHING;
