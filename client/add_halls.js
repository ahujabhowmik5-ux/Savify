import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://zipowqnjznngzyxdtxwm.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InppcG93cW5qem5uZ3p5eGR0eHdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2NzEyNTQsImV4cCI6MjA4MzI0NzI1NH0.6OKydmyzpbtyWG7GzTSnXwudwBABsFVWiNfX4G7II3g';

const supabase = createClient(supabaseUrl, supabaseKey);

// Official Hall List — IIT Kharagpur
const GIRLS_HALLS = [
    "MT (Mother Teresa Hall)",
    "RLB (Rani Laxmibai Hall)",
    "SN / IG (Sarojini Naidu / Indira Gandhi Hall)",
    "SAM (Sir Ashutosh Mukherjee Hall)",
    "SNVH (Sister Nivedita Hall)"
];

const BOYS_HALLS = [
    "Azad (Azad Hall)",
    "BCR (B C Roy Hall)",
    "BRA (B R Ambedkar Hall)",
    "HBH (Homi Bhabha Hall)",
    "JCB (J C Bose Hall)",
    "LLR (Lala Lajpat Rai Hall)",
    "LBS (Lalbahadur Sastry Hall)",
    "MMM (Madan Mohan Malviya Hall)",
    "MS (Megnad Saha Hall)",
    "Nehru (Nehru Hall)",
    "Patel (Patel Hall)",
    "RK (Radha Krishnan Hall)",
    "RP (Rajendra Prasad Hall)",
    "VS (Vidyasagar Hall)",
    "GH (Gokhale Hall)",
    "VGH (Visveswaraya Guest House)"
];

const ALL_HALLS = [...GIRLS_HALLS, ...BOYS_HALLS];

async function addHalls() {
    // Get IIT Kharagpur ID
    const { data: college } = await supabase.from('new_colleges').select('id').ilike('name', 'IIT Kharagpur').single();
    if (!college) {
        console.log("IIT Kharagpur not found in new_colleges");
        return;
    }

    const collegeId = college.id;
    console.log("Found college ID:", collegeId);

    // Delete old halls that are not in the new list
    const { data: existingHalls } = await supabase.from('new_halls').select('id, name').eq('college_id', collegeId);
    if (existingHalls) {
        for (const hall of existingHalls) {
            if (!ALL_HALLS.includes(hall.name)) {
                console.log(`Deleting old hall: ${hall.name}`);
                await supabase.from('new_halls').delete().eq('id', hall.id);
            }
        }
    }

    // Insert new halls
    for (const hallName of ALL_HALLS) {
        const { data: existing } = await supabase.from('new_halls').select('id').eq('college_id', collegeId).eq('name', hallName).single();
        if (existing) {
            console.log(`Skipping ${hallName} (already exists)`);
            continue;
        }

        const { error } = await supabase.from('new_halls').insert({
            college_id: collegeId,
            name: hallName
        });

        if (error) {
            console.error(`Error inserting ${hallName}:`, error.message);
        } else {
            console.log(`Inserted ${hallName}`);
        }
    }
}

addHalls();
