ALTER TABLE public.workers
  ADD COLUMN IF NOT EXISTS pay_cycle text,
  ADD COLUMN IF NOT EXISTS pay_day integer,
  ADD COLUMN IF NOT EXISTS daily_rate numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS monthly_salary numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_advance_outstanding numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS joined_date date,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS aadhaar text,
  ADD COLUMN IF NOT EXISTS bank_account text,
  ADD COLUMN IF NOT EXISTS upi_id text,
  ADD COLUMN IF NOT EXISTS emergency_contact text,
  ADD COLUMN IF NOT EXISTS notes text;