import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function backfill() {
    if (!supabaseAdmin) {
        console.error("Supabase Admin client not initialized.");
        return;
    }

    console.log("Starting backfill for recent Quick Commerce activities...");
    
    // Fetch carts from the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const { data: carts, error: cartError } = await supabaseAdmin
        .from('group_carts')
        .select('*')
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: true });
        
    if (cartError) {
        console.error("Error fetching carts:", cartError);
        return;
    }
    
    console.log(`Found ${carts.length} recent carts.`);
    
    let createdCount = 0;
    let joinedCount = 0;
    
    for (const cart of carts) {
        // Skip non-quick commerce platforms
        if (!['blinkit', 'zepto', 'swiggy_instamart', 'amazon_fresh'].includes(cart.platform)) {
            continue;
        }

        // 1. Backfill CREATE_POOL for creator
        const { data: existingCreate } = await supabaseAdmin
            .from('drops_activity_logs')
            .select('id')
            .eq('user_id', cart.creator_id)
            .eq('action_type', 'CREATE_POOL')
            .eq('created_at', cart.created_at);
            
        if (!existingCreate || existingCreate.length === 0) {
            await supabaseAdmin.from('drops_activity_logs').insert({
                user_id: cart.creator_id,
                action_type: 'CREATE_POOL',
                description: `You created a new ${cart.pool_name}`,
                latitude: cart.latitude,
                longitude: cart.longitude,
                created_at: cart.created_at
            });
            createdCount++;
        }
        
        // 2. Backfill JOIN_POOL for items
        const { data: items } = await supabaseAdmin
            .from('cart_items')
            .select('*')
            .eq('cart_id', cart.id);
            
        if (items) {
            // Group by user
            const users = new Set(items.map(i => i.user_id));
            for (const uid of users) {
                // Don't log JOIN for creator (they created it)
                if (uid === cart.creator_id) continue;
                
                // Get earliest item for this user in this cart
                const userItems = items.filter(i => i.user_id === uid).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
                if (userItems.length > 0) {
                    const firstItem = userItems[0];
                    const { data: existingJoin } = await supabaseAdmin
                        .from('drops_activity_logs')
                        .select('id')
                        .eq('user_id', uid)
                        .eq('action_type', 'JOIN_POOL')
                        .eq('created_at', firstItem.created_at);
                        
                    if (!existingJoin || existingJoin.length === 0) {
                        await supabaseAdmin.from('drops_activity_logs').insert({
                            user_id: uid,
                            action_type: 'JOIN_POOL',
                            description: `You joined a ${cart.pool_name}`,
                            latitude: cart.latitude, // best guess
                            longitude: cart.longitude,
                            created_at: firstItem.created_at
                        });
                        joinedCount++;
                    }
                }
            }
        }
    }
    
    console.log(`Backfill complete! Added ${createdCount} CREATE_POOL logs and ${joinedCount} JOIN_POOL logs.`);
}

backfill();
