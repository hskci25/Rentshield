import { createClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../config/constants';

if (
  SUPABASE_URL.includes('YOUR_PROJECT_ID') ||
  SUPABASE_ANON_KEY.includes('YOUR_SUPABASE_ANON_KEY')
) {
  console.warn(
    'Supabase constants not set. Update SUPABASE_URL and SUPABASE_ANON_KEY in src/config/constants.ts',
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
