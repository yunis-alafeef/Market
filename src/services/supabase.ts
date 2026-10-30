import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  'https://hgbnevobfjxggkpzjicv.supabase.co';

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_DesBAjmOQwAYOtcKggQwFQ__vkAjme5';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
