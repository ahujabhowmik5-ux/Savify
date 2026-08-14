import { useState } from 'react';
import { supabase } from '../../config/supabase';

export default function DeleteAccountModal({ isOpen, onClose, user, onDeleted }) {
    const [confirmText, setConfirmText] = useState('');
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState('');
    const [progress, setProgress] = useState('');

    const isConfirmed = confirmText.trim().toUpperCase() === 'DELETE';

    const handleDelete = async () => {
        if (!isConfirmed || deleting || !user) return;
        setDeleting(true);
        setError('');

        const userId = user.id;

        try {
            setProgress('Wiping all data...');
            // Call the SECURITY DEFINER function to bypass RLS and delete all user records
            const { error: rpcError } = await supabase.rpc('delete_user_account');
            if (rpcError) {
                console.error('RPC delete error:', rpcError);
                throw new Error(rpcError.message || 'Failed to delete data. Please ensure the SQL function is created in Supabase.');
            }

            // 7. Try server-side auth deletion (best effort, non-blocking)
            setProgress('Finalizing...');
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.access_token) {
                    await fetch('https://savify.in/api/account/delete', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${session.access_token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ confirm: true })
                    }).catch(() => {}); // Ignore server errors — data is already deleted
                }
            } catch (_) {
                // Auth deletion failed — not critical, user data is already wiped
            }

            setProgress('Done!');

            // Success — sign out and redirect
            onDeleted();
        } catch (err) {
            console.error('Delete account error:', err);
            setError(err.message || 'Something went wrong. Please try again.');
            setDeleting(false);
            setProgress('');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay open" onClick={(e) => e.target === e.currentTarget && !deleting && onClose()}>
            <div className="modal delete-account-modal">
                {/* Warning Icon */}
                <div className="delete-modal-icon">
                    <i className="fas fa-exclamation-triangle"></i>
                </div>

                <h2 className="delete-modal-title">Delete Account</h2>

                <div className="delete-modal-warning">
                    <p>
                        <strong>This action is permanent and cannot be undone.</strong>
                    </p>
                    <p>Deleting your account will remove:</p>
                    <ul className="delete-data-list">
                        <li><i className="fas fa-receipt"></i> All your expenses & history</li>
                        <li><i className="fas fa-users"></i> Team memberships & data</li>
                        <li><i className="fas fa-user"></i> Your profile & score</li>
                        <li><i className="fas fa-trophy"></i> Achievements & rank</li>
                        <li><i className="fas fa-key"></i> Your login credentials</li>
                    </ul>
                </div>

                <div className="delete-confirm-section">
                    <label htmlFor="deleteConfirmInput">
                        Type <strong>DELETE</strong> to confirm:
                    </label>
                    <input
                        id="deleteConfirmInput"
                        type="text"
                        className="delete-confirm-input"
                        placeholder="Type DELETE here"
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value)}
                        disabled={deleting}
                        autoComplete="off"
                    />
                </div>

                {progress && deleting && (
                    <div className="delete-progress-msg">
                        <i className="fas fa-spinner fa-spin"></i> {progress}
                    </div>
                )}

                {error && (
                    <div className="delete-error-msg">
                        <i className="fas fa-times-circle"></i> {error}
                    </div>
                )}

                <div className="modal-btns">
                    <button
                        className="modal-btn btn-cancel"
                        onClick={onClose}
                        disabled={deleting}
                    >
                        Cancel
                    </button>
                    <button
                        className="modal-btn btn-delete-danger"
                        onClick={handleDelete}
                        disabled={!isConfirmed || deleting}
                    >
                        {deleting ? (
                            <><i className="fas fa-spinner fa-spin"></i> Deleting...</>
                        ) : (
                            <><i className="fas fa-trash-alt"></i> Delete Forever</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
