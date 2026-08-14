import { Router } from 'express';
import { verifyAuth } from '../middleware/auth.js';
import { supabaseAdmin } from '../supabaseClient.js';

const router = Router();

router.put('/edit', verifyAuth, async (req, res) => {
    try {
        const { fields, details } = req.body;
        if (!fields || !details) return res.status(400).json({ error: 'Fields and details are required' });

        const { error } = await supabaseAdmin.from('user_applications').update({
            edit_req_status: false,
            edit_req_field: fields,
            edit_req_value: details
        }).eq('user_id', req.user.id);

        if (error) throw error;
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
