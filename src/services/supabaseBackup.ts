import { supabase } from './supabase';
import { DailySheet, Grocery, Supplier, Voucher } from '../types';

export interface BackupResult {
  success: boolean;
  message: string;
  error?: string;
  timestamp: string;
}

export const SupabaseBackupService = {
  /**
   * Automatically backup the settled daily sheet and all current balances/ledgers to Supabase
   */
  async backupSettledDay(
    sheet: DailySheet,
    allGroceries: Grocery[],
    allSuppliers: Supplier[],
    allVouchers: Voucher[]
  ): Promise<BackupResult> {
    const timestamp = new Date().toLocaleTimeString('ar-SA');
    try {
      // 1. Upsert the daily sheet to Supabase
      const sheetPayload = {
        id: sheet.id,
        date: sheet.date,
        day_name: sheet.dayName,
        status: 'settled',
        total_cost: Math.round((Number(sheet.totalCost) || 0) * 100) / 100,
        total_sale: Math.round((Number(sheet.totalSale) || 0) * 100) / 100,
        total_profit: Math.round((Number(sheet.totalProfit) || 0) * 100) / 100,
        rows: sheet.rows,
        night_orders_saved: true,
        morning_sort_generated: true,
        created_at: sheet.createdAt || new Date().toISOString(),
      };

      const { error: sheetErr } = await supabase.from('daily_sheets').upsert(sheetPayload);
      if (sheetErr) {
        console.warn('Supabase daily_sheets backup error:', sheetErr);
        return {
          success: false,
          message: `تعذر حفظ الكشف في السحابة: ${sheetErr.message}`,
          error: sheetErr.message,
          timestamp,
        };
      }

      // 2. Upsert Groceries balances
      if (allGroceries && allGroceries.length > 0) {
        const groceryPayload = allGroceries.map((g) => ({
          id: g.id,
          code: g.code,
          name: g.name,
          phone: g.phone || '',
          owner_name: g.ownerName || '',
          balance: Math.round((Number(g.balance) || 0) * 100) / 100,
          credit_limit: g.creditLimit || 500000,
          active: g.active ?? true,
        }));
        const { error: gErr } = await supabase.from('groceries').upsert(groceryPayload);
        if (gErr) console.warn('Supabase groceries sync notice:', gErr.message);
      }

      // 3. Upsert Suppliers balances
      if (allSuppliers && allSuppliers.length > 0) {
        const supplierPayload = allSuppliers.map((s) => ({
          id: s.id,
          name: s.name,
          phone: s.phone || '',
          specialty: s.specialty || '',
          balance: Math.round((Number(s.balance) || 0) * 100) / 100,
          active: s.active ?? true,
        }));
        const { error: sErr } = await supabase.from('suppliers').upsert(supplierPayload);
        if (sErr) console.warn('Supabase suppliers sync notice:', sErr.message);
      }

      // 4. Upsert Vouchers
      if (allVouchers && allVouchers.length > 0) {
        const voucherPayload = allVouchers.map((v) => ({
          id: v.id,
          voucher_number: v.voucherNumber,
          type: v.type,
          date: v.date,
          party_type: v.partyType,
          party_id: v.partyId,
          party_name: v.partyName,
          amount: Math.round((Number(v.amount) || 0) * 100) / 100,
          payment_method: v.paymentMethod,
          notes: v.notes || '',
          created_by: v.createdBy || 'النظام',
          created_at: v.createdAt || new Date().toISOString(),
        }));
        const { error: vErr } = await supabase.from('vouchers').upsert(voucherPayload);
        if (vErr) console.warn('Supabase vouchers sync notice:', vErr.message);
      }

      return {
        success: true,
        message: `تم النسخ الاحتياطي السحابي لكشف (${sheet.dayName} ${sheet.date}) وكافة الأرصدة والحسابات إلى Supabase بنجاح ☁️`,
        timestamp,
      };
    } catch (err: any) {
      console.error('Supabase backup unexpected error:', err);
      return {
        success: false,
        message: err.message || 'فشل الاتصال بخادم النسخ الاحتياطي',
        error: String(err),
        timestamp,
      };
    }
  },

  /**
   * Full manual backup of all sheets and master records
   */
  async fullBackup(
    allSheets: DailySheet[],
    allGroceries: Grocery[],
    allSuppliers: Supplier[],
    allVouchers: Voucher[]
  ): Promise<BackupResult> {
    const timestamp = new Date().toLocaleTimeString('ar-SA');
    try {
      const settledSheets = allSheets.filter((s) => s.status === 'settled');
      for (const sheet of settledSheets) {
        await supabase.from('daily_sheets').upsert({
          id: sheet.id,
          date: sheet.date,
          day_name: sheet.dayName,
          status: sheet.status,
          total_cost: Math.round((Number(sheet.totalCost) || 0) * 100) / 100,
          total_sale: Math.round((Number(sheet.totalSale) || 0) * 100) / 100,
          total_profit: Math.round((Number(sheet.totalProfit) || 0) * 100) / 100,
          rows: sheet.rows,
          night_orders_saved: true,
          morning_sort_generated: true,
          created_at: sheet.createdAt || new Date().toISOString(),
        });
      }

      if (allGroceries.length > 0) {
        await supabase.from('groceries').upsert(
          allGroceries.map((g) => ({
            id: g.id,
            code: g.code,
            name: g.name,
            phone: g.phone || '',
            owner_name: g.ownerName || '',
            balance: Math.round((Number(g.balance) || 0) * 100) / 100,
            credit_limit: g.creditLimit || 500000,
            active: g.active ?? true,
          }))
        );
      }

      if (allSuppliers.length > 0) {
        await supabase.from('suppliers').upsert(
          allSuppliers.map((s) => ({
            id: s.id,
            name: s.name,
            phone: s.phone || '',
            specialty: s.specialty || '',
            balance: Math.round((Number(s.balance) || 0) * 100) / 100,
            active: s.active ?? true,
          }))
        );
      }

      if (allVouchers.length > 0) {
        await supabase.from('vouchers').upsert(
          allVouchers.map((v) => ({
            id: v.id,
            voucher_number: v.voucherNumber,
            type: v.type,
            date: v.date,
            party_type: v.partyType,
            party_id: v.partyId,
            party_name: v.partyName,
            amount: Math.round((Number(v.amount) || 0) * 100) / 100,
            payment_method: v.paymentMethod,
            notes: v.notes || '',
            created_by: v.createdBy || 'النظام',
            created_at: v.createdAt || new Date().toISOString(),
          }))
        );
      }

      return {
        success: true,
        message: `تم إجراء نسخة احتياطية شاملة لجميع الكشوفات (${settledSheets.length}) والبقالات والموردين والسندات في Supabase بنجاح ☁️`,
        timestamp,
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'خطأ أثناء النسخ الاحتياطي',
        error: String(err),
        timestamp,
      };
    }
  },
};
