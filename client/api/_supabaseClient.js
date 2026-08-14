import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

export const missingVars = [];
if (!supabaseUrl) missingVars.push('SUPABASE_URL');
if (!supabaseKey) missingVars.push('SUPABASE_SERVICE_KEY');

export let initError = null;
let adminClient = null;

try {
    if (supabaseUrl && supabaseKey) {
        adminClient = createClient(supabaseUrl, supabaseKey);
    }
} catch (e) {
    initError = e.message || String(e);
}

export const supabaseAdmin = adminClient;
