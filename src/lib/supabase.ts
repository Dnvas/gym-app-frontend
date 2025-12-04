import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://lokhheiqwsnsiqnylzji.supabase.co'
const supabasePublishableKey = 'sb_publishable_4ygXSi4SVrRpse4p3zr0iQ_eXI-QYoC'

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})