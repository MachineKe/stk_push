import express from 'express'
import transactionStatusStore from '../utils/transactionStore.js'

const callback = express.Router()

callback.post("/callback", (req, res) => {
    const result = req.body;
    console.log(result);

    // Update transaction status if callback is received here
    const stkCallback = result.Body?.stkCallback;
    let checkoutRequestId = stkCallback?.CheckoutRequestID;
    checkoutRequestId = checkoutRequestId ? checkoutRequestId.trim() : "";
    const resultCode = String(stkCallback?.ResultCode);
    const resultDesc = stkCallback?.ResultDesc;

    if (checkoutRequestId) {
        transactionStatusStore[checkoutRequestId] = {
            status: resultCode === "0" ? "success" : "failed",
            desc: resultDesc || "Transaction status updated from /callback"
        };
        console.log(`[CALLBACK ROUTE] Updated status for "${checkoutRequestId}":`, transactionStatusStore[checkoutRequestId]);
    }

    res.status(200).json({
        message: "Safaricom Callback Received Successfully",
        success: true
    });
});

export default callback