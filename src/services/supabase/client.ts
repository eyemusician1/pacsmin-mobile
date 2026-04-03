import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {createClient} from '@supabase/supabase-js';

// Replace these with your project values from Supabase -> Project Settings -> API
const SUPABASE_URL = 'https://ljgeeobucxiwcneddsxu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqZ2Vlb2J1Y3hpd2NuZWRkc3h1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxNjY1MDksImV4cCI6MjA5MDc0MjUwOX0.jOLbE5XAjlqAmTkTmGBlxvQdC-KoMod2APOxOUGbo4Y';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
