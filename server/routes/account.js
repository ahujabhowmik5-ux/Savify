import { Router } from 'express';
import { verifyAuth } from '../middleware/auth.js';
import { supabaseAdmin } from '../index.js';

const router = Router();

/**
 * POST /api/account/delete
 * Permanently deletes all user data and the auth account.
 * Required by Google Play Store policy.
 */
router.post('/delete', verifyAuth, async (req, res) => {
    const userId = req.user.id;

    try {
        console.log(`🗑️ Account deletion requested for user: ${userId}`);

        // 1. Delete all user expenses
        const { error: expErr } = await supabaseAdmin
            .from('expenses')
            .delete()
            .eq('user_id', userId);
        if (expErr) console.error('Expense delete error:', expErr.message);

        // 2. Delete all team expenses created by user
        const { error: teamExpErr } = await supabaseAdmin
            .from('project_expenses')
            .delete()
            .eq('user_id', userId);
        if (teamExpErr) console.error('Team expense delete error:', teamExpErr.message);

        // 3. Delete all team memberships
        const { error: memberErr } = await supabaseAdmin
            .from('project_members')
            .delete()
            .eq('user_id', userId);
        if (memberErr) console.error('Team member delete error:', memberErr.message);

        // 4. Delete feedback
        const { error: fbErr } = await supabaseAdmin
            .from('app_feedback')
            .delete()
            .eq('user_id', userId);
        if (fbErr) console.error('Feedback delete error:', fbErr.message);

        // 5. Delete contact messages
        const { error: contactErr } = await supabaseAdmin
            .from('contact_messages')
            .delete()
            .eq('user_id', userId);
        if (contactErr) console.error('Contact delete error:', contactErr.message);

        // 6. Delete user application / profile
        const { error: appErr } = await supabaseAdmin
            .from('user_applications')
            .delete()
            .eq('user_id', userId);
        if (appErr) console.error('Profile delete error:', appErr.message);

        // 7. Delete the auth user from Supabase Auth
        const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
        if (authErr) {
            console.error('Auth user delete error:', authErr.message);
            throw authErr;
        }

        console.log(`✅ Account fully deleted for user: ${userId}`);
        res.json({ success: true, message: 'Account permanently deleted.' });
    } catch (err) {
        console.error('❌ Account deletion failed:', err);
        res.status(500).json({ error: err.message || 'Account deletion failed' });
    }
});

export default router;
