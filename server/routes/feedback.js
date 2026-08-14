import { Router } from 'express';
import { verifyAuth } from '../middleware/auth.js';
import { supabaseAdmin } from '../supabaseClient.js';

const router = Router();

// POST /api/feedback — Submit feedback
router.post('/', verifyAuth, async (req, res) => {
    try {
        const { rating, mood, comment } = req.body;
        if (!rating) return res.status(400).json({ error: 'Rating is required' });

        const { error } = await supabaseAdmin.from('app_feedback').insert([{
            user_id: req.user.id,
            rating: parseInt(rating),
            mood: mood || 'Neutral',
            comment: comment || 'No comment'
        }]);
        if (error) throw error;
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/feedback/contact — Submit contact message
router.post('/contact', verifyAuth, async (req, res) => {
    try {
        const { message, mood } = req.body;
        if (!message) return res.status(400).json({ error: 'Message is required' });

        const { error } = await supabaseAdmin.from('contact_messages').insert([{
            user_id: req.user.id,
            message,
            mood: mood || 'Neutral'
        }]);
        if (error) throw error;
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
