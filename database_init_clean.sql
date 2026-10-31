-- ==============================================================================
-- سكريبت إنشاء وتهيئة قاعدة البيانات الشامل (نظيف وبدون أي عمليات سابقة)
-- مشروع: مؤسسة العفيف والأحمدي لتوريد وتوزيع الخضروات والفواكه
-- التوافق: PostgreSQL / Supabase / Neon / Vercel Postgres
-- ==============================================================================

-- 1. تفعيل الإضافات اللازمة لإنشاء المعرّفات العشوائية
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. حذف الجداول القديمة إن وجدت (لإعادة البدء بنظافة تامة)
-- ==============================================================================
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS vouchers CASCADE;
DROP TABLE IF EXISTS daily_order_rows CASCADE;
DROP TABLE IF EXISTS daily_sheets CASCADE;
DROP TABLE IF EXISTS vegetable_items CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;
DROP TABLE IF EXISTS groceries CASCADE;
DROP TABLE IF EXISTS system_settings CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ==============================================================================
-- 3. إنشاء الجداول الأساسية (DDL)
-- ==============================================================================

-- جدول المستخدمين وحسابات الإدارة
CREATE TABLE users (
    id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name VARCHAR(150) NOT NULL,
    phone VARCHAR(30) UNIQUE NOT NULL,
    pin VARCHAR(50) NOT NULL, -- رقم الهاتف أو رمز الدخول المعتمد
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'owner', 'worker')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- جدول إعدادات النظام
CREATE TABLE system_settings (
    id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    description VARCHAR(255),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- جدول أصناف الخضروات والفواكه
CREATE TABLE vegetable_items (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    unit VARCHAR(50) NOT NULL, -- سلة، شوال، كرتون، كيلو...
    default_cost_price NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    default_sale_price NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    display_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- جدول الموردين
CREATE TABLE suppliers (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    phone VARCHAR(50),
    specialty VARCHAR(255),
    address VARCHAR(255),
    balance NUMERIC(14, 2) NOT NULL DEFAULT 0.00, -- الرصيد المالي الحالي
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- جدول البقالات والعملاء
CREATE TABLE groceries (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    short_code VARCHAR(10) NOT NULL, -- رمز البقالة المختصر (ص، ح، س...)
    owner_name VARCHAR(150),
    phone VARCHAR(50),
    address VARCHAR(255),
    balance NUMERIC(14, 2) NOT NULL DEFAULT 0.00, -- رصيد الحساب (المستحقات)
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- جدول شيتات / دفاتر العمليات اليومية
CREATE TABLE daily_sheets (
    id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    sheet_date DATE UNIQUE NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'completed', 'locked')),
    total_purchase_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    total_sales_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    net_profit NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    created_by VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- جدول سطور طلبيات وتوزيع البقالات اليومية
CREATE TABLE daily_order_rows (
    id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    sheet_id VARCHAR(50) NOT NULL REFERENCES daily_sheets(id) ON DELETE CASCADE,
    grocery_id VARCHAR(50) NOT NULL REFERENCES groceries(id) ON DELETE RESTRICT,
    item_id VARCHAR(50) NOT NULL REFERENCES vegetable_items(id) ON DELETE RESTRICT,
    quantity NUMERIC(10, 2) NOT NULL CHECK (quantity >= 0),
    unit_price NUMERIC(14, 2) NOT NULL CHECK (unit_price >= 0),
    total_price NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    morning_cost_price NUMERIC(14, 2) DEFAULT 0.00,
    notes VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- جدول سندات القبض والصرف
CREATE TABLE vouchers (
    id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    voucher_number VARCHAR(50) UNIQUE NOT NULL,
    voucher_type VARCHAR(20) NOT NULL CHECK (voucher_type IN ('receipt', 'payment')), -- receipt: قبض, payment: صرف
    entity_type VARCHAR(30) NOT NULL CHECK (entity_type IN ('grocery', 'supplier', 'expense', 'other')),
    entity_id VARCHAR(50),
    amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
    voucher_date DATE NOT NULL,
    description TEXT,
    payment_method VARCHAR(50) DEFAULT 'نقد',
    created_by VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- جدول سجل الرقابة والعمليات (Audit Logs)
CREATE TABLE audit_logs (
    id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    user_name VARCHAR(150),
    action VARCHAR(100) NOT NULL,
    details TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- فهارس لتحسين سرعة الاستعلامات والتقارير
CREATE INDEX idx_daily_sheets_date ON daily_sheets(sheet_date);
CREATE INDEX idx_daily_order_rows_sheet ON daily_order_rows(sheet_id);
CREATE INDEX idx_daily_order_rows_grocery ON daily_order_rows(grocery_id);
CREATE INDEX idx_daily_order_rows_item ON daily_order_rows(item_id);
CREATE INDEX idx_vouchers_date ON vouchers(voucher_date);
CREATE INDEX idx_vouchers_entity ON vouchers(entity_type, entity_id);

-- ==============================================================================
-- 4. إدراج البيانات الأولية النظيفة (SEED DATA)
-- لا يوجد أي عمليات بيع أو شراء أو سندات سابقة، والأرصدة تبدأ من 0.00
-- ==============================================================================

-- 4.1. حسابات مدراء المشروع الرسمية (كلمة المرور PIN = رقم الهاتف)
INSERT INTO users (id, name, phone, pin, role, is_active) VALUES
('usr_admin_younis', 'يونس العفيف (مدير النظام)', '772317950', '772317950', 'admin', TRUE),
('usr_admin_mohannad', 'مهند الأحمدي (مدير النظام)', '772178969', '772178969', 'admin', TRUE)
ON CONFLICT (id) DO UPDATE 
SET name = EXCLUDED.name, phone = EXCLUDED.phone, pin = EXCLUDED.pin, role = EXCLUDED.role;

-- 4.2. إعدادات النظام والهوية
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
('company_name', 'مؤسسة العفيف والأحمدي لتوريد وتوزيع الخضروات والفواكه', 'اسم المؤسسة الرسمي'),
('system_currency', 'ريال يمني', 'العملة الافتراضية'),
('phone_contact', '772317950 - 772178969', 'أرقام التواصل بالإدارة')
ON CONFLICT (setting_key) DO UPDATE 
SET setting_value = EXCLUDED.setting_value;

-- 4.3. قائمة أصناف الخضروات والوحدات والأسعار التقديرية
-- (no default items)

-- 4.4. قائمة الموردين المعتمدين (رصيد أولي 0.00)
-- (no default suppliers)

-- 4.5. قائمة البقالات المعتمدة (رصيد أولي 0.00)
INSERT INTO groceries (id, name, short_code, owner_name, phone, address, balance, is_active) VALUES
('g1', 'بقالة الصلاح النموذجية', 'ص', 'صلاح العماري', '773456789', 'شارع بغداد', 0.00, TRUE),
('g2', 'سوبرماركت الحرمين', 'ح', 'عبدالله الحرمي', '774567890', 'شارع حدة', 0.00, TRUE),
('g3', 'مجمع السعيد للتموينات', 'س', 'سعيد باوزير', '775678901', 'شارع النصر', 0.00, TRUE),
('g4', 'بقالة العاصمة الحديثة', 'ع', 'علي النهدي', '776789012', 'شارع تعز', 0.00, TRUE),
('g5', 'تموينات الكوثر المركزية', 'ك', 'كمال الصبري', '777890123', 'شارع الخمسين', 0.00, TRUE)
ON CONFLICT (id) DO UPDATE 
SET name = EXCLUDED.name, short_code = EXCLUDED.short_code, owner_name = EXCLUDED.owner_name, phone = EXCLUDED.phone, balance = 0.00;

-- ==============================================================================
-- تم بحمد الله إنشاء الهيكل وحقن البيانات النظيفة بنجاح.
-- الجداول جاهزة للربط الفوري مع Vercel / Supabase أو أي استضافة PostgreSQL.
-- ==============================================================================
