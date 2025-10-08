-- ============================================================
-- ADD DASHBOARD CUSTOMIZATION
-- ============================================================
-- Version: 2.4.0
-- Date: 2025-01-05
-- Description: Dashboard widget customization with drag & drop
-- ============================================================

-- ============================================================
-- 1. DASHBOARD LAYOUTS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS dashboard_layouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  widget_id TEXT NOT NULL,
  position_x INTEGER NOT NULL DEFAULT 0,
  position_y INTEGER NOT NULL DEFAULT 0,
  width INTEGER NOT NULL DEFAULT 1,
  height INTEGER NOT NULL DEFAULT 1,
  is_visible BOOLEAN DEFAULT TRUE,
  widget_config JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, widget_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_dashboard_layouts_user ON dashboard_layouts(user_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_layouts_visible ON dashboard_layouts(is_visible) WHERE is_visible = TRUE;

COMMENT ON TABLE dashboard_layouts IS 'User-customizable dashboard widget layouts';
COMMENT ON COLUMN dashboard_layouts.widget_id IS 'Unique identifier for widget type (e.g., "quick-stats", "health-score")';
COMMENT ON COLUMN dashboard_layouts.position_x IS 'Grid column position (0-based)';
COMMENT ON COLUMN dashboard_layouts.position_y IS 'Grid row position (0-based)';
COMMENT ON COLUMN dashboard_layouts.width IS 'Widget width in grid columns';
COMMENT ON COLUMN dashboard_layouts.height IS 'Widget height in grid rows';
COMMENT ON COLUMN dashboard_layouts.widget_config IS 'Widget-specific configuration (JSON)';

-- ============================================================
-- 2. RLS POLICIES
-- ============================================================

ALTER TABLE dashboard_layouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own dashboard layouts" ON dashboard_layouts;
CREATE POLICY "Users can view own dashboard layouts"
  ON dashboard_layouts FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own dashboard layouts" ON dashboard_layouts;
CREATE POLICY "Users can insert own dashboard layouts"
  ON dashboard_layouts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own dashboard layouts" ON dashboard_layouts;
CREATE POLICY "Users can update own dashboard layouts"
  ON dashboard_layouts FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own dashboard layouts" ON dashboard_layouts;
CREATE POLICY "Users can delete own dashboard layouts"
  ON dashboard_layouts FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- 3. TRIGGERS
-- ============================================================

DROP TRIGGER IF EXISTS update_dashboard_layouts_updated_at ON dashboard_layouts;
CREATE TRIGGER update_dashboard_layouts_updated_at
  BEFORE UPDATE ON dashboard_layouts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 4. DEFAULT WIDGET LAYOUTS
-- ============================================================

-- Function to initialize default dashboard layout for new users
CREATE OR REPLACE FUNCTION initialize_default_dashboard_layout(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Insert default widget layout (only if user has no layouts)
  INSERT INTO dashboard_layouts (user_id, widget_id, position_x, position_y, width, height, is_visible)
  SELECT p_user_id, widget_id, position_x, position_y, width, height, is_visible
  FROM (VALUES
    -- Row 1: Quick Stats (4 columns)
    ('quick-stats', 0, 0, 4, 2, TRUE),

    -- Row 2: Health Score + Credit Cards
    ('health-score', 0, 2, 2, 3, TRUE),
    ('credit-cards', 2, 2, 2, 3, TRUE),

    -- Row 3: Cash Flow Chart
    ('cash-flow-chart', 0, 5, 4, 2, TRUE),

    -- Row 4: Budget Progress + Upcoming Bills
    ('budget-progress', 0, 7, 2, 2, TRUE),
    ('upcoming-bills', 2, 7, 2, 2, TRUE),

    -- Row 5: Recent Transactions
    ('recent-transactions', 0, 9, 4, 2, TRUE),

    -- Row 6: Category Breakdown + Investment Summary
    ('category-breakdown', 0, 11, 2, 2, TRUE),
    ('investment-summary', 2, 11, 2, 2, TRUE)
  ) AS default_widgets(widget_id, position_x, position_y, width, height, is_visible)
  ON CONFLICT (user_id, widget_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION initialize_default_dashboard_layout IS 'Creates default dashboard layout for new users';
