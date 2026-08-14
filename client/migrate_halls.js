import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://zipowqnjznngzyxdtxwm.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InppcG93cW5qem5uZ3p5eGR0eHdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2NzEyNTQsImV4cCI6MjA4MzI0NzI1NH0.6OKydmyzpbtyWG7GzTSnXwudwBABsFVWiNfX4G7II3g';

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrateHalls() {
    const { data: halls } = await supabase.from('new_halls').select('id, name');
    const { data: profiles } = await supabase.from('user_profiles').select('id, hall_id');
    
    console.log("Halls from DB:");
    console.log(halls.map(h => h.name));
    
    // Find the canonical new halls (the ones with parentheses, or the new hardcoded ones)
    const getNewHallId = (oldName) => {
        const cleanOldName = oldName.replace(' Hall', '').trim();
        // E.g. 'LBS' -> 'LBS (Lalbahadur Sastry Hall)'
        
        for (const hall of halls) {
            // If the hall name includes the short name (e.g. LBS)
            if (hall.name.startsWith(cleanOldName + ' (') || hall.name === oldName) {
                return hall.id;
            }
            if (cleanOldName === 'SNVH' && hall.name.startsWith('SN ')) return hall.id;
            if (cleanOldName === 'Gokhale' && hall.name.startsWith('Gokhale')) return hall.id;
        }
        return null;
    };

    let updatedCount = 0;

    for (const p of profiles) {
        if (!p.hall_id) continue;
        const currentHall = halls.find(h => h.id === p.hall_id);
        if (!currentHall) continue;

        if (currentHall.name.includes('(')) continue;

        const cleanOldName = currentHall.name.replace(' Hall', '').trim();
        let newHallId = null;

        for (const hall of halls) {
            // Only look for the NEW canonical halls (must have a parenthesis, except for Gokhale/Sister Nivedita)
            if (hall.id === currentHall.id) continue;
            
            if (hall.name.startsWith(cleanOldName + ' (')) {
                newHallId = hall.id;
                break;
            }
            if (cleanOldName === 'SNVH' && hall.name === 'SN (Sister Nivedita Hall)') { newHallId = hall.id; break; }
            if (cleanOldName === 'Gokhale' && hall.name === 'Gokhale (Gokhale Hall)') { newHallId = hall.id; break; }
        }

        if (newHallId && newHallId !== p.hall_id) {
            console.log(`Migrating user ${p.id} from '${currentHall.name}' to new hall ID ${newHallId}`);
            await supabase.from('user_profiles').update({ hall_id: newHallId }).eq('id', p.id);
            await supabase.from('user_applications').update({ hall: newHallId }).eq('user_id', p.id);
            updatedCount++;
        } else {
            console.log(`Failed to match: ${currentHall.name} (Clean: ${cleanOldName})`);
        }
    }

    console.log(`Migrated ${updatedCount} users to the new standardized halls.`);
}

migrateHalls();
