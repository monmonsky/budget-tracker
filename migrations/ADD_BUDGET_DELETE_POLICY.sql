-- Add DELETE policy for budgets table
-- Run this in Supabase SQL Editor

CREATE POLICY "Users can delete own budgets" ON budgets
  FOR DELETE USING (auth.uid() = user_id);
