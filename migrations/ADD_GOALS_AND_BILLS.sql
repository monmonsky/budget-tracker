-- ============================================================
-- ADD SAVINGS GOALS & BILL REMINDERS
-- ============================================================
-- Version: 2.2.0
-- Date: 2025-01-05
-- Description: Add savings goals tracking and bill reminders
-- ============================================================

-- ============================================================
-- 1. SAVINGS GOALS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS savings_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  goal_name TEXT NOT NULL,
  description TEXT,
  target_amount DECIMAL(15, 2) NOT NULL,
  current_amount DECIMAL(15, 2) DEFAULT 0,
  target_date DATE,
  category TEXT DEFAULT 'general',
  icon TEXT DEFAULT '🎯',
  color TEXT DEFAULT '#6366f1',
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_savings_goals_user ON savings_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_savings_goals_completed ON savings_goals(is_completed);

COMMENT ON TABLE savings_goals IS 'User savings goals and targets';
COMMENT ON COLUMN savings_goals.category IS 'Goal category: emergency_fund, vacation, house, car, education, wedding, retirement, general';
COMMENT ON COLUMN savings_goals.icon IS 'Emoji icon for the goal';
COMMENT ON COLUMN savings_goals.color IS 'Hex color for visual representation';

-- ============================================================
-- 2. BILL REMINDERS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS bill_reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  bill_name TEXT NOT NULL,
  description TEXT,
  amount DECIMAL(15, 2) NOT NULL,
  category TEXT NOT NULL,
  due_day INTEGER NOT NULL CHECK (due_day >= 1 AND due_day <= 31),
  frequency TEXT CHECK (frequency IN ('monthly', 'quarterly', 'yearly', 'one_time')) DEFAULT 'monthly',
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  reminder_days INTEGER DEFAULT 3,
  is_active BOOLEAN DEFAULT TRUE,
  is_auto_pay BOOLEAN DEFAULT FALSE,
  last_paid_date DATE,
  next_due_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_bill_reminders_user ON bill_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_bill_reminders_next_due ON bill_reminders(next_due_date);
CREATE INDEX IF NOT EXISTS idx_bill_reminders_active ON bill_reminders(is_active);

COMMENT ON TABLE bill_reminders IS 'Recurring bill reminders and payment tracking';
COMMENT ON COLUMN bill_reminders.due_day IS 'Day of month when bill is due (1-31)';
COMMENT ON COLUMN bill_reminders.reminder_days IS 'Days before due date to send reminder';
COMMENT ON COLUMN bill_reminders.is_auto_pay IS 'Whether bill is paid automatically';
COMMENT ON COLUMN bill_reminders.category IS 'Bill category: utilities, internet, phone, credit_card, loan, insurance, subscription, rent, other';

-- ============================================================
-- 3. BILL PAYMENT HISTORY TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS bill_payment_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bill_reminder_id UUID REFERENCES bill_reminders(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  payment_date DATE NOT NULL,
  amount_paid DECIMAL(15, 2) NOT NULL,
  transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  status TEXT CHECK (status IN ('paid', 'pending', 'overdue')) DEFAULT 'paid',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_bill_payment_history_bill ON bill_payment_history(bill_reminder_id);
CREATE INDEX IF NOT EXISTS idx_bill_payment_history_date ON bill_payment_history(payment_date DESC);

COMMENT ON TABLE bill_payment_history IS 'History of bill payments';

-- ============================================================
-- 4. RLS POLICIES
-- ============================================================

-- Savings Goals Policies
ALTER TABLE savings_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own savings goals"
  ON savings_goals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own savings goals"
  ON savings_goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own savings goals"
  ON savings_goals FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own savings goals"
  ON savings_goals FOR DELETE
  USING (auth.uid() = user_id);

-- Bill Reminders Policies
ALTER TABLE bill_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bill reminders"
  ON bill_reminders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bill reminders"
  ON bill_reminders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bill reminders"
  ON bill_reminders FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own bill reminders"
  ON bill_reminders FOR DELETE
  USING (auth.uid() = user_id);

-- Bill Payment History Policies
ALTER TABLE bill_payment_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bill payment history"
  ON bill_payment_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bill payment history"
  ON bill_payment_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 5. HELPER FUNCTIONS
-- ============================================================

-- Function to calculate next due date for bill
CREATE OR REPLACE FUNCTION calculate_next_bill_due_date(
  p_bill_id UUID
)
RETURNS DATE AS $$
DECLARE
  v_bill RECORD;
  v_next_due DATE;
  v_today DATE := CURRENT_DATE;
BEGIN
  SELECT due_day, frequency, last_paid_date
  INTO v_bill
  FROM bill_reminders
  WHERE id = p_bill_id;

  -- Calculate based on frequency
  IF v_bill.frequency = 'monthly' THEN
    -- Get next occurrence of due_day
    v_next_due := DATE_TRUNC('month', v_today) + (v_bill.due_day - 1) * INTERVAL '1 day';

    -- If due date already passed this month, move to next month
    IF v_next_due <= v_today THEN
      v_next_due := DATE_TRUNC('month', v_today + INTERVAL '1 month') + (v_bill.due_day - 1) * INTERVAL '1 day';
    END IF;

  ELSIF v_bill.frequency = 'quarterly' THEN
    v_next_due := v_today + INTERVAL '3 months';

  ELSIF v_bill.frequency = 'yearly' THEN
    v_next_due := v_today + INTERVAL '1 year';

  ELSIF v_bill.frequency = 'one_time' THEN
    v_next_due := NULL;
  END IF;

  RETURN v_next_due;
END;
$$ LANGUAGE plpgsql;

-- Function to get upcoming bills (next 7 days)
CREATE OR REPLACE FUNCTION get_upcoming_bills(p_days INTEGER DEFAULT 7)
RETURNS TABLE (
  id UUID,
  bill_name TEXT,
  amount DECIMAL(15, 2),
  category TEXT,
  next_due_date DATE,
  days_until_due INTEGER,
  is_overdue BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    br.id,
    br.bill_name,
    br.amount,
    br.category,
    br.next_due_date,
    (br.next_due_date - CURRENT_DATE) as days_until_due,
    (br.next_due_date < CURRENT_DATE) as is_overdue
  FROM bill_reminders br
  WHERE br.user_id = auth.uid()
    AND br.is_active = true
    AND br.next_due_date IS NOT NULL
    AND br.next_due_date <= CURRENT_DATE + p_days
  ORDER BY br.next_due_date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark bill as paid
CREATE OR REPLACE FUNCTION mark_bill_as_paid(
  p_bill_id UUID,
  p_payment_date DATE,
  p_amount_paid DECIMAL(15, 2),
  p_transaction_id UUID DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get user_id from bill
  SELECT user_id INTO v_user_id
  FROM bill_reminders
  WHERE id = p_bill_id AND user_id = auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Bill not found or access denied';
  END IF;

  -- Insert payment history
  INSERT INTO bill_payment_history (
    bill_reminder_id,
    user_id,
    payment_date,
    amount_paid,
    transaction_id,
    status
  ) VALUES (
    p_bill_id,
    v_user_id,
    p_payment_date,
    p_amount_paid,
    p_transaction_id,
    'paid'
  );

  -- Update last_paid_date and calculate next_due_date
  UPDATE bill_reminders
  SET
    last_paid_date = p_payment_date,
    next_due_date = calculate_next_bill_due_date(p_bill_id)
  WHERE id = p_bill_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 6. TRIGGERS
-- ============================================================

-- Auto-update updated_at timestamp
CREATE TRIGGER update_savings_goals_updated_at
  BEFORE UPDATE ON savings_goals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bill_reminders_updated_at
  BEFORE UPDATE ON bill_reminders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Auto-complete goal when target reached
CREATE OR REPLACE FUNCTION auto_complete_savings_goal()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.current_amount >= NEW.target_amount AND OLD.is_completed = FALSE THEN
    NEW.is_completed := TRUE;
    NEW.completed_at := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_complete_goal
  BEFORE UPDATE OF current_amount ON savings_goals
  FOR EACH ROW
  EXECUTE FUNCTION auto_complete_savings_goal();

-- ============================================================
-- SAMPLE DATA (commented out)
-- ============================================================

-- Sample Savings Goals
-- INSERT INTO savings_goals (user_id, goal_name, description, target_amount, current_amount, target_date, category, icon)
-- VALUES
--   (auth.uid(), 'Dana Darurat', 'Emergency fund 6 bulan expenses', 30000000, 5000000, '2025-12-31', 'emergency_fund', '🆘'),
--   (auth.uid(), 'Liburan Bali', 'Family vacation to Bali', 15000000, 2000000, '2025-06-01', 'vacation', '🏖️'),
--   (auth.uid(), 'DP Mobil', 'Down payment untuk mobil', 50000000, 10000000, '2026-01-01', 'car', '🚗');

-- Sample Bill Reminders
-- INSERT INTO bill_reminders (user_id, bill_name, description, amount, category, due_day, frequency, reminder_days, next_due_date)
-- VALUES
--   (auth.uid(), 'Listrik PLN', 'Tagihan listrik bulanan', 500000, 'utilities', 20, 'monthly', 3, '2025-01-20'),
--   (auth.uid(), 'Internet Indihome', 'Paket internet 100 Mbps', 400000, 'internet', 1, 'monthly', 3, '2025-02-01'),
--   (auth.uid(), 'Cicilan AC Flexy Cash', 'Cicilan AC di Jenius', 500000, 'loan', 15, 'monthly', 5, '2025-01-15'),
--   (auth.uid(), 'CC BCA', 'Credit card BCA', 2000000, 'credit_card', 25, 'monthly', 7, '2025-01-25');
