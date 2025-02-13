require("dotenv").config();
const express = require("express");
const axios = require("axios");
const crypto = require("crypto");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

// Load environment variables
const MERCHANT_ID = process.env.MERCHANT_ID;
const MD5_KEY = process.env.MD5_KEY;
const PAYMENT_CHANNEL = process.env.PAYMENT_CHANNEL;
const CALLBACK_URL = process.env.CALLBACK_URL;
const REDIRECT_URL = process.env.REDIRECT_URL;
const QUICKPAY_API_URL = process.env.QUICKPAY_API_URL;

// Function to generate a unique order number
function generateRandomOrderNumber() {
  return "ORD" + Date.now() + Math.floor(Math.random() * 10000);
}

// Function to generate an MD5 signature
function generateSignature(params, secretKey) {
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((acc, key) => {
      acc[key] = params[key];
      return acc;
    }, {});

  let queryString =
    new URLSearchParams(sortedParams).toString() + `&key=${secretKey}`;
  return crypto
    .createHash("md5")
    .update(queryString)
    .digest("hex")
    .toLowerCase();
}

// Route to initiate a payment request
app.post("/api/pay", async (req, res) => {
  try {
    const { amount, user } = req.body;
    if (!amount || !user) {
      return res.status(400).json({ error: "Amount and User are required" });
    }

    const orderNumber = generateRandomOrderNumber();
    const params = {
      mchid: MERCHANT_ID,
      am: amount,
      user: user,
      mchordernumber: orderNumber,
      callback_url: CALLBACK_URL,
      redirect_url: REDIRECT_URL,
      channel_code: PAYMENT_CHANNEL,
    };

    const signature = generateSignature(params, MD5_KEY);
    params.sign = signature;

    const requestUrl = `${QUICKPAY_API_URL}?${new URLSearchParams(
      params
    ).toString()}`;

    console.log(requestUrl);

    const response = await axios.get(requestUrl);

    console.log(response);

    if (response.data.code === 1) {
      return res.json({
        success: true,
        payment_link: response.data.payment_link,
      });
    } else {
      return res
        .status(400)
        .json({ error: "Payment request failed", details: response.data });
    }
  } catch (error) {
    console.error("Payment Request Error:", error.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// Route to handle payment callback
app.post("/api/callback", async (req, res) => {
  try {
    const callbackData = req.body;
    console.log("Callback Received:", callbackData);

    // Validate the callback signature
    const expectedSignature = generateSignature(callbackData, MD5_KEY);
    if (callbackData.sign !== expectedSignature) {
      return res.status(400).json({ error: "Invalid signature" });
    }

    if (callbackData.status === "2") {
      console.log("Payment Successful:", callbackData);
      res.send("success"); // QuickPay requires this response
    } else {
      console.log("Payment Failed or Pending:", callbackData);
      res.status(400).send("failure");
    }
  } catch (error) {
    console.error("Callback Error:", error.message);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/test", async (req, res) => {
  res.send("App Is Working");
});
// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
