import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
// Both spellings exist across this codebase and its deployments; accept
// either so a correct key set under the other name is not ignored.
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

export const missingVars = [];
if (!supabaseUrl) missingVars.push('SUPABASE_URL');
if (!supabaseKey) missingVars.push('SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_KEY)');

export let initError = null;

let adminClient = null;
try {
    if (supabaseUrl && supabaseKey) {
        adminClient = createClient(supabaseUrl, supabaseKey);
    }
} catch (e) {
    initError = e.message || String(e);
    console.error("Failed to initialize Supabase Admin:", e);
}

export const supabaseAdmin = adminClient;
