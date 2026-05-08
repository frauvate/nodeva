import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL = 'https://xrgbmbgurfuesvoapogj.supabase.co';
const SUPABASE_ANON_KEY =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhyZ2JtYmd1cmZ1ZXN2b2Fwb2dqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNDA2MjUsImV4cCI6MjA4ODYxNjYyNX0.JGmiADJjRX9oRxYIEBVSX5ovp5Qb-NOno9RSpwvIqGM';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});
