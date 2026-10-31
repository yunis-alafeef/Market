import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  'https://mcrgpwfgtsmduksolnba.supabase.co';

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_0oVk5dS3RJ1IR5T6ZzWviw_5EqjPcdJ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
