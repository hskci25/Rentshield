import { supabase } from '../lib/supabase';

export interface ProfileRecord {
  mobile_number: string;
  full_name: string;
  current_employer: string;
  occupation: string;
  created_at?: string;
  updated_at?: string;
}

export async function fetchProfileByMobile(
  mobileNumber: string,
): Promise<ProfileRecord | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('mobile_number, full_name, current_employer, occupation, created_at, updated_at')
    .eq('mobile_number', mobileNumber)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function upsertProfile(
  profile: Pick<
    ProfileRecord,
    'mobile_number' | 'full_name' | 'current_employer' | 'occupation'
  >,
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .upsert(profile, { onConflict: 'mobile_number' });

  if (error) {
    throw new Error(error.message);
  }
}
