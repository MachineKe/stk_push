import express from "express";
import dotenv from 'dotenv';
import axios from "axios";
import {authToken} from "../middlewares/authorization.js";
import {getTimestamp} from "../utils/timestamp.js";
import {initNgrok} from "../middlewares/ngrokUrl.js";
dotenv.config()

const router = express.Router();

// In-memory transaction status store
import transactionStatusStore from "../utils/transactionStore.js";

// Payment initiation route
router.post("/lipaNaMpesa", authToken, initNgrok, async (req, res) => {
    try {
        // GET customer phone number
        const number = req.body.phoneNumber.replace(/^0/, '');
        const phoneNumber = `254${number}`;
        // GET timestamp
        const timestamp = getTimestamp();
        // get password
        const password = Buffer.from(`${process.env.BusinessShortCode}${process.env.MPESA_PASSKEY}${timestamp}`).toString('base64');

        // get callback url
        const callbackUrl = req.domain;
        // Post Url
        const url = "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest";

        // access token
        const token = req.token;

        // stk push payload
        const body = {
            "BusinessShortCode": process.env.BusinessShortCode,
            "Password": password,
            "Timestamp": timestamp,
            "TransactionType": "CustomerPayBillOnline",
            "Amount": "1",
            "PartyA": phoneNumber,
            "PartyB": process.env.BusinessShortCode,
            "PhoneNumber": phoneNumber,
            "CallBackURL": `${callbackUrl}/callback`,
            "AccountReference": "Felas Spa",
            "TransactionDesc": "Customer Service Payment"
        };

        const result = await axios.post(url, body, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        const stkResponse = result.data;

        // Store transaction as pending
        if (stkResponse.CheckoutRequestID) {
            transactionStatusStore[stkResponse.CheckoutRequestID] = {
                status: "pending",
                desc: "Waiting for user action"
            };
            console.log(`[INIT] Set status for "${stkResponse.CheckoutRequestID}" to pending`);
        }

        // Render processing view with CheckoutRequestID
        res.render('processing', {
            checkoutRequestId: stkResponse.CheckoutRequestID
        });

    } catch (error) {
        console.error('STK Push Error', error);
        res.status(500).render('failed', {
            type: 'failed',
            heading: 'Transaction Failed',
            desc: 'An error occurred while initiating payment. Please try again.'
        });
    }
});

// Transaction status endpoint for polling
router.get("/transaction-status/:id", (req, res) => {
    const id = req.params.id ? req.params.id.trim() : "";
    const status = transactionStatusStore[id];
    // Log ID details for debugging
    console.log(`[STATUS POLL] (PID: ${process.pid}) ID: "${id}" | Length: ${id.length} | Hex: ${Buffer.from(id).toString('hex')} | Status:`, status);
    if (status) {
        res.json(status);
    } else {
        res.status(404).json({ status: "unknown", desc: "Transaction not found" });
    }
});

// Callback route to update transaction status
router.post("/mpesa/callback", (req, res) => {
    const callbackData = req.body;

    // Map of ResultCodes to user-friendly messages
    const resultCodeMessages = {
        0: "Transaction Successful",
        1032: "Request Cancelled by user",
        2001: "Wrong PIN entered. Please try again.",
        1: "Insufficient funds",
        1037: "No response from user",
        // Add more mappings as needed
    };

    console.log(`[CALLBACK RECEIVED] (PID: ${process.pid}) Data:`, JSON.stringify(callbackData, null, 2));

    try {
        const stkCallback = callbackData.Body?.stkCallback;
        let checkoutRequestId = stkCallback?.CheckoutRequestID;
        // Normalize the ID
        checkoutRequestId = checkoutRequestId ? checkoutRequestId.trim() : "";
        // Always treat resultCode as string for comparison and mapping
        const resultCode = String(stkCallback?.ResultCode);
        const resultDesc = stkCallback?.ResultDesc;

        // Log all keys for debugging
        console.log(`[CALLBACK] (PID: ${process.pid}) All transactionStatusStore keys:`, Object.keys(transactionStatusStore));
        console.log(`[CALLBACK] (PID: ${process.pid}) CheckoutRequestID received: "${checkoutRequestId}"`);

        // Always set status for received checkoutRequestId
        if (checkoutRequestId) {
            console.log(`[CALLBACK] (PID: ${process.pid}) Previous status for "${checkoutRequestId}":`, transactionStatusStore[checkoutRequestId]);
            if (resultCode === "0") {
                transactionStatusStore[checkoutRequestId] = {
                    status: "success",
                    desc: resultCodeMessages["0"]
                };
            } else {
                transactionStatusStore[checkoutRequestId] = {
                    status: "failed",
                    desc: resultCodeMessages[resultCode] || resultDesc || "Transaction Failed"
                };
            }
            // Log ID details for debugging
            console.log(`[CALLBACK] (PID: ${process.pid}) Updated status for "${checkoutRequestId}" | Length: ${checkoutRequestId.length} | Hex: ${Buffer.from(checkoutRequestId).toString('hex')}:`, transactionStatusStore[checkoutRequestId]);
            console.log(`[CALLBACK] (PID: ${process.pid}) Full transactionStatusStore:`, JSON.stringify(transactionStatusStore, null, 2));
        } else {
            console.warn(`[CALLBACK] (PID: ${process.pid}) No CheckoutRequestID found in callback`);
        }
    } catch (err) {
        console.error("Error updating transaction status from callback", err);
    }
    res.status(200).json({ message: "Callback received" });
});

export default router

