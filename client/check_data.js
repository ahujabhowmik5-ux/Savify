import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://zipowqnjznngzyxdtxwm.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InppcG93cW5qem5uZ3p5eGR0eHdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2NzEyNTQsImV4cCI6MjA4MzI0NzI1NH0.6OKydmyzpbtyWG7GzTSnXwudwBABsFVWiNfX4G7II3g';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
    const { data: profiles } = await supabase.from('user_profiles').select('id, username, full_name, hall_id, college_id');
    const { data: halls } = await supabase.from('new_halls').select('id, name');
    const { data: swipes } = await supabase.from('roommate_swipes').select('*');

    console.log("=== USERS ===");
    if (profiles) {
        profiles.forEach(p => {
            const hall = halls?.find(h => h.id === p.hall_id);
            console.log(`User: ${p.username} (${p.full_name}) | Hall: ${hall ? hall.name : 'null'} (${p.hall_id})`);
        });
    }

    console.log("\n=== SWIPES ===");
    if (swipes) {
        console.log(`Total swipes: ${swipes.length}`);
    }
}

checkData();
