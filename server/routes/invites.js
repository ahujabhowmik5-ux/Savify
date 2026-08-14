import { Router } from 'express';
import { verifyAuth } from '../middleware/auth.js';
import { supabaseAdmin } from '../supabaseClient.js';

const router = Router();

router.post('/', verifyAuth, async (req, res) => {
    try {
        const { inviterName, inviterEmail, friendEmail, type } = req.body;
        if (!friendEmail) return res.status(400).json({ error: 'Friend email is required' });

        // Proxy to Supabase Edge Function
        const { data, error } = await supabaseAdmin.functions.invoke('invite-friend', {
            body: { inviterName, inviterEmail, friendEmail, type }
        });

        if (error) throw error;
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
