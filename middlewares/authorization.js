import express from "express";
import axios from "axios";
import dotenv from 'dotenv';

const app = express()
dotenv.config()

const url = 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
const auth = Buffer.from(`${process.env.CONSUMER_KEY}:${process.env.CONSUMER_SECRET}`).toString('base64')

export async function authToken(req, res,next){
    try {
      const result = await axios.get(url, {
        headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/json"
        }
      });
      console.log(result.data);
      req.token = result.data.access_token;
      next();
    } catch (error) {
      console.error('Error fetching token', error);
      res.status(500).json({
        message: "Failed to fetch OAuth token from Safaricom",
        error: error.response ? error.response.data : error.message,
        success: false
      });
    }
}