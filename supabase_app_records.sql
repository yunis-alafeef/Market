-- شغّل في Supabase SQL Editor: جدول السجلات (صف لكل صنف/مورد/بقالة/كشف/سند) - ثابتة ولا تُستبدل
CREATE TABLE IF NOT EXISTS app_records (
  seq BIGINT GENERATED ALWAYS AS IDENTITY,
  collection TEXT NOT NULL,
  id TEXT NOT NULL,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (collection, id)
);
CREATE INDEX IF NOT EXISTS idx_app_records_seq ON app_records(seq);
ALTER TABLE app_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "app_records_all" ON app_records;
CREATE POLICY "app_records_all" ON app_records FOR ALL TO anon USING (true) WITH CHECK (true);
