import { StandardCheckoutPayRequest } from '@phonepe-pg/pg-sdk-node';

try {
    const builder = StandardCheckoutPayRequest.builder()
        .merchantOrderId("TXN_123")
        .amount(100)
        .redirectUrl("http://localhost")
        .callbackUrl("http://localhost/callback")
        .build();
    console.log("Success");
} catch(e) {
    console.error("Crash:", e.message);
}
