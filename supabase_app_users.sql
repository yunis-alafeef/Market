-- شغّل هذا في Supabase SQL Editor (جدول المستخدمين السحابي)
CREATE TABLE IF NOT EXISTS app_users (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "app_users_all" ON app_users;
CREATE POLICY "app_users_all" ON app_users FOR ALL TO anon USING (true) WITH CHECK (true);
