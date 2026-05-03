
ALTER TABLE public.mo_stage_runs
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'in_progress',
  ADD COLUMN IF NOT EXISTS shot_count int,
  ADD COLUMN IF NOT EXISTS cavity_count int,
  ADD COLUMN IF NOT EXISTS cavity_weight_g numeric(10,3),
  ADD COLUMN IF NOT EXISTS runner_weight_g numeric(10,3),
  ADD COLUMN IF NOT EXISTS item_weight_g numeric(10,4),
  ADD COLUMN IF NOT EXISTS actual_weight_g numeric(10,4),
  ADD COLUMN IF NOT EXISTS qty_rejected numeric(14,3) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS hours_worked numeric(8,3);

CREATE INDEX IF NOT EXISTS idx_msr_status ON public.mo_stage_runs(status);
CREATE INDEX IF NOT EXISTS idx_msr_worker_started ON public.mo_stage_runs(worker_id, started_at);

ALTER TABLE public.moulds
  ADD COLUMN IF NOT EXISTS current_machine_id uuid REFERENCES public.machines(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS current_status text NOT NULL DEFAULT 'available';
