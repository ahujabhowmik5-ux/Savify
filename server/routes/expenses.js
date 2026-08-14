import { Router } from 'express';
import { verifyAuth } from '../middleware/auth.js';
import { supabaseAdmin } from '../supabaseClient.js';

const router = Router();

router.post('/', verifyAuth, async (req, res) => {
    try {
        const { amount, category, description } = req.body;

        if (!amount || !category) {
            return res.status(400).json({ error: 'Amount and category are required' });
        }

        const { data, error } = await supabaseAdmin.from('expenses').insert([{
            user_id: req.user.id,
            amount: parseFloat(amount),
            category,
            description: description || ''
        }]).select();

        if (error) throw error;
        res.json({ success: true, data });
    } catch (err) {
        console.error('Expense insert error:', err);
        res.status(500).json({ error: err.message });
    }
});

export default router;
