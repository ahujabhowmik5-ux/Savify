import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.VITE_SUPABASE_URL || 'https://zipowqnjznngzyxdtxwm.supabase.co',
    process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InppcG93cW5qem5uZ3p5eGR0eHdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2NzEyNTQsImV4cCI6MjA4MzI0NzI1NH0.6OKydmyzpbtyWG7GzTSnXwudwBABsFVWiNfX4G7II3g'
);

const newPools = [
    // Netflix
    { name: 'Netflix Standard', pool_mode: 'headcount', split_price: 250 },
    { name: 'Netflix Premium', pool_mode: 'headcount', split_price: 162 },
    { name: 'Netflix Mobile', pool_mode: 'headcount', split_price: 75 },
    { name: 'Netflix Basic', pool_mode: 'headcount', split_price: 100 },
    // Spotify
    { name: 'Spotify Standard', pool_mode: 'headcount', split_price: 70 },
    { name: 'Spotify Platinum', pool_mode: 'headcount', split_price: 100 },
    { name: 'Spotify Student', pool_mode: 'headcount', split_price: 35 },
    // Jio Hotstar
    { name: 'Jio Hotstar Mobile 1 Month', pool_mode: 'headcount', split_price: 40 },
    { name: 'Jio Hotstar Mobile 3 Month', pool_mode: 'headcount', split_price: 75 },
    { name: 'Jio Hotstar Mobile 1 Year', pool_mode: 'headcount', split_price: 250 },
    { name: 'Jio Hotstar Super 1 Month', pool_mode: 'headcount', split_price: 75 },
    { name: 'Jio Hotstar Super 3 Month', pool_mode: 'headcount', split_price: 175 },
    { name: 'Jio Hotstar Super 1 Year', pool_mode: 'headcount', split_price: 550 },
    { name: 'Jio Hotstar Premium 1 Month', pool_mode: 'headcount', split_price: 75 },
    { name: 'Jio Hotstar Premium 3 Month', pool_mode: 'headcount', split_price: 175 },
    { name: 'Jio Hotstar Premium 1 Year', pool_mode: 'headcount', split_price: 550 },
    // Chat GPT
    { name: 'ChatGPT Individual GO', pool_mode: 'headcount', split_price: 133 },
    { name: 'ChatGPT Individual PLUS', pool_mode: 'headcount', split_price: 666 },
    { name: 'ChatGPT Individual PRO', pool_mode: 'headcount', split_price: 3566 },
    { name: 'ChatGPT Business', pool_mode: 'headcount', split_price: 600 },
    // Gemini
    { name: 'Google AI Plus', pool_mode: 'headcount', split_price: 133 },
    { name: 'Google AI Pro', pool_mode: 'headcount', split_price: 650 },
    { name: 'Google AI Ultra 5x', pool_mode: 'headcount', split_price: 2166 },
    { name: 'Google AI Ultra 20x', pool_mode: 'headcount', split_price: 6500 },
];

async function run() {
    console.log('Seeding new pool types...');
    for (const pool of newPools) {
        // Upsert by name (assuming name is unique, or just checking if exists)
        const { data: existing } = await supabase.from('pool_types').select('id').eq('name', pool.name);
        
        if (existing && existing.length > 0) {
            console.log(`Updating ${pool.name}...`);
            const { error: updateErr } = await supabase.from('pool_types').update({
                pool_mode: pool.pool_mode,
                split_price: pool.split_price
            }).eq('name', pool.name);
            if (updateErr) console.error(`Error updating ${pool.name}:`, updateErr);
        } else {
            console.log(`Inserting ${pool.name}...`);
            const { error: insertErr } = await supabase.from('pool_types').insert([{
                name: pool.name,
                emoji: '🍿',
                pool_mode: pool.pool_mode,
                split_price: pool.split_price
            }]);
            if (insertErr) console.error(`Error inserting ${pool.name}:`, insertErr);
        }
    }
    
    // Call generate_daily_pool_slots to immediately create slots for new pool types
    console.log('Generating slots...');
    await supabase.rpc('generate_daily_pool_slots');
    
    console.log('Done!');
}
run();
