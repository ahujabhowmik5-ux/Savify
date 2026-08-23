import { supabaseAdmin } from '../_supabaseClient.js';
import { fulfilTransaction } from '../_fulfilment.js';
import { isSimulationMode } from '../_paymentMode.js';

/**
 * Settle a simulated payment.
 *
 * With no working gateway there is no way to exercise the half of the system
 * that matters most — seats being claimed, carts being marked paid, pools
 * completing. This drives the real fulfilment path from a fake confirmation,
 * so the flow stays tested and everything is proven the day the gateway
 * returns. It refuses to run unless PAYMENT_MODE=simulation, so it can never
 * mark a real order paid on a live deployment.
 *
 * Body: { order_id, outcome: 'success' | 'failure' }
 */
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    // Hard gate. Without this a request to this URL could mark a genuine
    // unpaid order as SUCCESS and hand out a seat nobody paid for.
    if (!isSimulationMode()) {
        return res.status(403).json({
            error: 'Simulated payments are disabled. Set PAYMENT_MODE=simulation to enable them.'
        });
    }

    const { order_id, outcome } = req.body || {};
    if (!order_id) return res.status(400).json({ error: 'order_id is required' });
    if (!['success', 'failure'].includes(outcome)) {
        return res.status(400).json({ error: "outcome must be 'success' or 'failure'" });
    }

    if (!supabaseAdmin) return res.status(500).json({ error: 'Database unavailable' });

    try {
        const { data: txn, error } = await supabaseAdmin
            .from('phonepe_transactions')
            .select('*')
            .eq('merchant_transaction_id', order_id)
            .maybeSingle();

        if (error) throw error;
        if (!txn) return res.status(404).json({ error: 'Transaction not found' });

        // Only simulated orders are settleable here, so a real Cashfree order
        // can never be flipped to paid through this route even by mistake.
        if (!String(txn.merchant_transaction_id).startsWith('sim_')) {
            return res.status(400).json({ error: 'Not a simulated order' });
        }

        if (txn.status === 'SUCCESS') {
            return res.json({ status: 'SUCCESS', already_settled: true, context_type: txn.context_type });
        }

        if (outcome === 'failure') {
            await supabaseAdmin
                .from('phonepe_transactions')
                .update({ status: 'FAILED' })
                .eq('merchant_transaction_id', order_id);
            return res.json({ status: 'FAILED', context_type: txn.context_type });
        }

        await supabaseAdmin
            .from('phonepe_transactions')
            .update({ status: 'SUCCESS', phonepe_transaction_id: `sim_${Date.now()}` })
            .eq('merchant_transaction_id', order_id);

        const result = await fulfilTransaction(txn, { source: 'Simulation' });

        return res.json({
            status: 'SUCCESS',
            context_type: txn.context_type,
            fulfilment: result
        });
    } catch (err) {
        console.error('Simulated payment settle failed:', err);
        return res.status(500).json({ error: err.message });
    }
}
