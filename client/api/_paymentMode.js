/**
 * Which payment backend this deployment uses.
 *
 * 'simulation' replaces the gateway with an in-app success/failure prompt that
 * still drives the real fulfilment path. It exists so the pool flow stays
 * testable while the Cashfree account is restricted, and must never be left on
 * for real users — nothing is charged in this mode.
 */
export function isSimulationMode() {
    return String(process.env.PAYMENT_MODE || '').trim().toLowerCase() === 'simulation';
}
