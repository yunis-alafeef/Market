-- شغّل في Supabase SQL Editor: مخزن البيانات المشترك بين كل الأجهزة
CREATE TABLE IF NOT EXISTS app_kv (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE app_kv ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "app_kv_all" ON app_kv;
CREATE POLICY "app_kv_all" ON app_kv FOR ALL TO anon USING (true) WITH CHECK (true);
