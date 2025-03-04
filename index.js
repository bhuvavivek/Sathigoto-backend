require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const { razorpay } = require("./config/razorpay");
const cors = require("cors");
const {
  validateWebhookSignature,
} = require("razorpay/dist/utils/razorpay-utils");
const app = express();
const PORT = process.env.Port || 3000;
const amount = process.env.AMOUNT;

app.use(cors()); // Allow CORS for all origins
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

// serve a static files
app.use(express.static(path.join(__dirname)));

app.get("/", async (req, res) => {
  res.send("Hello World");
});

app.post("/create-order", async (req, res) => {
  try {
    const options = {
      amount: amount * 100,
      currency: "INR",
      receipt: "RCP_ID_" + Date.now(),
    };

    const order = await razorpay.orders.create(options);
    res.status(200).json({
      order_id: order.id,
      amount: order.amount,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "internal server error",
    });
  }
});

// Route to handle payment verification
app.post("/verify-payment", (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
    req.body;

  const secret = razorpay.key_secret;
  const body = razorpay_order_id + "|" + razorpay_payment_id;

  try {
    const isValidSignature = validateWebhookSignature(
      body,
      razorpay_signature,
      secret
    );
    if (isValidSignature) {
      // do a task
      res.status(200).json({ status: "ok" });
      console.log("Payment verification successful");
    } else {
      res.status(400).json({ status: "verification_failed" });
      console.log("Payment verification failed");
    }
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ status: "error", message: "Error verifying payment" });
  }
});

app.listen(PORT, () => {
  console.log("server is running on port ", PORT);
});
