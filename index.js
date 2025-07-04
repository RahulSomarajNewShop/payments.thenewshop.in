require("dotenv").config();
const express = require("express");
const cors = require("cors");
const {
  PaymentHandler,
  APIException,
  validateHMAC_SHA256,
} = require("./PaymentHandler");
const crypto = require("crypto");
const path = require("path");
const { query } = require("./database");
const logger = require("./utils/logger");
const app = express();
const port = process.env.PORT || 5000;

// Test endpoint for generating test orders
app.get("/test/generateOrder", (req, res) => {
  const testAmounts = [1, 5, 10, 25, 50, 100, 500, 1000];
  const randomAmount =
    testAmounts[Math.floor(Math.random() * testAmounts.length)];
  const orderId = `test_order_${Date.now()}_${Math.random()
    .toString(36)
    .substr(2, 9)}`;
  const poId = `PO_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

  const testData = {
    order_id: orderId,
    po_id: poId,
    amount: randomAmount,
    customer_id: `test_customer_${Math.floor(Math.random() * 1000)}`,
    message: "Use these parameters to test payment flow",
  };

  logger.debug("Generated test order data", testData);
  res.json(testData);
});

// Test endpoint to view all orders
app.get("/test/orders", async (req, res) => {
  try {
    const orders = await query(
      "SELECT * FROM payment_orders ORDER BY created_at DESC"
    );
    const transactions = await query(
      "SELECT * FROM payment_transactions ORDER BY created_at DESC"
    );
    const refunds = await query(
      "SELECT * FROM refunds ORDER BY created_at DESC"
    );

    const result = {
      orders: orders.rows,
      transactions: transactions.rows,
      refunds: refunds.rows,
    };

    logger.debug("Retrieved test data", {
      orderCount: orders.rows.length,
      transactionCount: transactions.rows.length,
      refundCount: refunds.rows.length,
    });
    res.json(result);
  } catch (error) {
    logger.error("Error fetching test data", error);
    res.status(500).json({ error: "Failed to fetch test data" });
  }
});

app.use(cors());

// Middleware to parse URL-encoded bodies (e.g., form submissions)
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

// Serve Swagger documentation
app.get("/swagger.json", (_, res) => {
  res.sendFile(path.join(__dirname, "swagger.json"));
});

app.get("/docs", (_, res) => {
  res.sendFile(path.join(__dirname, "public", "swagger.html"));
});

app.get("/", (_, res) =>
  res.sendFile(path.join(__dirname, "public", "initiatePaymentDataForm.html"))
);

// Middleware to parse JSON bodies
app.use(express.json());

app.post("/initiatePayment", async (req, res) => {
  logger.payment("Payment initiation request", req.body);
  const orderId = req.body.order_id ?? req.body.orderId;
  const poId = req.body.poId; // Purchase Order ID
  const amount = req.body.amount || 1 + crypto.randomInt(100);
  const customerId = req.body.customerId;
  const returnUrl = `https://uatpayments.thenewshop.in/handlePaymentResponse`;
  logger.debug("Return URL", { returnUrl });
  const paymentHandler = PaymentHandler.getInstance();

  // Insert orderId, poId, and amount into the database
  try {
    await query(
      `INSERT INTO payment_orders (order_id, amount, customer_id, return_url) VALUES ($1, $2, $3, $4)`,
      [orderId, amount, customerId, returnUrl]
    );
    logger.db(
      `Order ${orderId} with amount ${amount} stored in database successfully`
    );
  } catch (dbError) {
    logger.error("Failed to insert order into database", dbError);
    return res
      .status(500)
      .json({ success: false, message: "Failed to create order in database" });
  }

  try {
    const orderSessionResp = await paymentHandler.orderSession({
      order_id: orderId,
      amount,
      currency: "INR",
      return_url: returnUrl, // this is can i route this to the handlePaymentResponse
      // [MERCHANT_TODO]:- please handle customer_id, it's an optional field but we suggest to use it.
      customer_id: customerId,
      // please note you don't have to give payment_page_client_id here, it's mandatory but
      // PaymentHandler will read it from config.json file
      payment_page_client_id: paymentHandler.getPaymentPageClientId(),
    });
    logger.payment("Order session response", orderSessionResp);

    // Update the order with complete session details
    await query(
      `UPDATE payment_orders SET 
       status = $1, 
       payment_page_client_id = $2,
       session_data = $3,
       session_id = $4,
       payment_links = $5,
       order_expiry = $6,
       sdk_payload = $7,
       updated_at = CURRENT_TIMESTAMP
       WHERE order_id = $8`,
      [
        orderSessionResp.status,
        paymentHandler.getPaymentPageClientId(),
        JSON.stringify(orderSessionResp),
        orderSessionResp.id,
        JSON.stringify(orderSessionResp.payment_links),
        orderSessionResp.order_expiry,
        JSON.stringify(orderSessionResp.sdk_payload),
        orderId,
      ]
    );
    logger.db(`Order ${orderId} session data saved successfully`);

    return res.send({ orderSessionResp });
    // return res.redirect(orderSessionResp.payment_links.web);
  } catch (error) {
    logger.error("Payment initiation error", error);
    // [MERCHANT_TODO]:- please handle errors
    if (error instanceof APIException) {
      return res.send("PaymentHandler threw some error");
    }
    // [MERCHANT_TODO]:- please handle errors
    return res.send("Something went wrong");
  }
}); ///send back the hdfc pay link

app.post("/handlePaymentResponse", async (req, res) => {
  /// this should be the return url
  logger.payment("Payment Response received", req.body);
  const FRONTEND_BASE =
    process.env.FRONTEND_BASE_URL || "https://uatb2b.thenewshop.in";
  const orderId = req.body.order_id || req.body.orderId;
  const paymentHandler = PaymentHandler.getInstance();

  if (orderId === undefined) {
    logger.error("Order ID is missing in payment response");
    return res.status(400).send("Order ID is missing");
  }

  try {
    // Step 1: Validate HMAC signature first
    logger.debug("Validating HMAC signature...");
    if (
      validateHMAC_SHA256(req.body, paymentHandler.getResponseKey()) === false
    ) {
      logger.error("HMAC signature validation failed for order", { orderId });
      return res.status(400).send("Signature verification failed");
    }
    logger.debug("HMAC signature validation successful");

    // Step 2: Get order status from payment gateway
    logger.debug("Fetching order status from payment gateway...");
    const orderStatusResp = await paymentHandler.orderStatus(orderId);
    logger.payment("Order status response", orderStatusResp);

    // Step 3: Validate order exists in database and amount matches
    logger.debug("Validating order in database...");
    const dbOrder = await query(
      "SELECT * FROM payment_orders WHERE order_id = $1",
      [orderId]
    );

    if (dbOrder.rows.length === 0) {
      logger.error("Order not found in database", { orderId });
      return res.status(404).send("Order not found in database");
    }

    const storedOrder = dbOrder.rows[0];
    const responseAmount = parseFloat(
      req.body.amount || orderStatusResp.amount
    );
    const storedAmount = parseFloat(storedOrder.amount);

    if (responseAmount !== storedAmount) {
      logger.error("Amount mismatch for order", {
        orderId,
        storedAmount,
        responseAmount,
      });
      return res.status(400).send("Amount mismatch detected");
    }

    logger.debug("Database validation successful - amount matches");

    // Step 4: Update order status in database
    const orderStatus = orderStatusResp.status;
    await query("UPDATE payment_orders SET status = $1 WHERE order_id = $2", [
      orderStatus,
      orderId,
    ]);
    logger.db(`Order ${orderId} status updated to ${orderStatus}`);

    // Step 5: Store transaction details
    await query(
      `INSERT INTO payment_transactions (order_id, transaction_id, amount, status, response_data) 
       VALUES ($1, $2, $3, $4, $5)`,
      [
        orderId,
        req.body.transaction_id || orderStatusResp.transaction_id,
        responseAmount,
        orderStatus,
        JSON.stringify({ ...req.body, ...orderStatusResp }),
      ]
    );
    logger.db("Transaction details stored in database");

    // Step 6: Determine response message
    let message = "";
    switch (orderStatus) {
      case "CHARGED":
        message = "order payment done successfully";
        break;
      case "PENDING":
      case "PENDING_VBV":
        message = "order payment pending";
        break;
      case "AUTHORIZATION_FAILED":
        message = "order payment authorization failed";
        break;
      case "AUTHENTICATION_FAILED":
        message = "order payment authentication failed";
        break;
      default:
        message = "order status " + orderStatus;
        break;
    }

    logger.info(
      `Payment processing completed for order ${orderId}: ${message}`
    );

    // Step 7: Redirect to frontend with status
    const passed = orderStatus === "CHARGED";
    const redirectUrl = new URL("/orders", FRONTEND_BASE);

    // pass whatever you need via query-string (or hash)
    redirectUrl.searchParams.set("orderId", orderId);
    redirectUrl.searchParams.set("status", passed ? "success" : "failed");
    redirectUrl.searchParams.set("message", message);

    return res.redirect(303, redirectUrl.toString());
  } catch (error) {
    logger.error("Error in handlePaymentResponse", error);
    // [MERCHANT_TODO]:- please handle errors
    if (error instanceof APIException) {
      return res.status(500).send("PaymentHandler threw some error");
    }
    // [MERCHANT_TODO]:- please handle errors
    return res.status(500).send("Something went wrong");
  }
}); //

// Status API endpoint for dual inquiry (Mandatory)
app.get("/orderStatus/:orderId", async (req, res) => {
  const orderId = req.params.orderId;
  const paymentHandler = PaymentHandler.getInstance();

  try {
    logger.debug(`Status inquiry for order: ${orderId}`);

    // Step 1: Check database first
    const dbOrder = await query(
      "SELECT * FROM payment_orders WHERE order_id = $1",
      [orderId]
    );

    if (dbOrder.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Order not found in database",
      });
    }

    const storedOrder = dbOrder.rows[0];

    // Step 2: Get latest status from payment gateway
    const orderStatusResp = await paymentHandler.orderStatus(orderId);
    logger.payment("Payment gateway status response", orderStatusResp);

    // Step 3: Update database with latest status
    await query("UPDATE payment_orders SET status = $1 WHERE order_id = $2", [
      orderStatusResp.status,
      orderId,
    ]);

    // Step 4: Get transaction details
    const transactionDetails = await query(
      "SELECT * FROM payment_transactions WHERE order_id = $1 ORDER BY created_at DESC LIMIT 1",
      [orderId]
    );

    const response = {
      success: true,
      order_id: orderId,
      amount: storedOrder.amount,
      status: orderStatusResp.status,
      database_status: storedOrder.status,
      gateway_status: orderStatusResp.status,
      transaction_details: transactionDetails.rows[0] || null,
      gateway_response: orderStatusResp,
      last_updated: new Date().toISOString(),
    };

    logger.debug(`Status inquiry completed for order ${orderId}`);
    return res.json(response);
  } catch (error) {
    logger.error("Error in orderStatus API", error);
    if (error instanceof APIException) {
      return res.status(500).json({
        success: false,
        message: "Payment gateway error",
        error: error.message,
      });
    }
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

app.post("/initiateRefund", async (req, res) => {
  const paymentHandler = PaymentHandler.getInstance();

  try {
    logger.debug("Refund initiation request", req.body);

    // Validate order exists in database
    const dbOrder = await query(
      "SELECT * FROM payment_orders WHERE order_id = $1",
      [req.body.order_id]
    );

    if (dbOrder.rows.length === 0) {
      logger.error("Order not found for refund", {
        orderId: req.body.order_id,
      });
      return res.status(404).json({
        success: false,
        message: "Order not found in database",
      });
    }

    const refundResp = await paymentHandler.refund({
      order_id: req.body.order_id,
      amount: req.body.amount,
      unique_request_id: req.body.unique_request_id || `refund_${Date.now()}`,
    });

    logger.payment("Refund response", refundResp);

    // Store refund details in database
    await query(
      `INSERT INTO refunds (order_id, refund_id, amount, status, unique_request_id) 
       VALUES ($1, $2, $3, $4, $5)`,
      [
        req.body.order_id,
        refundResp.refund_id,
        req.body.amount,
        refundResp.status,
        req.body.unique_request_id || `refund_${Date.now()}`,
      ]
    );

    logger.db("Refund details stored in database");

    const html = makeOrderStatusResponse(
      "Merchant Refund Page",
      `Refund status:- ${refundResp.status}`,
      req,
      refundResp
    );
    res.set("Content-Type", "text/html");
    return res.send(html);
  } catch (error) {
    logger.error("Refund initiation error", error);
    // [MERCHANT_TODO]:- please handle errors
    if (error instanceof APIException) {
      return res.send("PaymentHandler threw some error");
    }
    // [MERCHANT_TODO]:- please handle errors
    return res.send("Something went wrong");
  }
});

// [MERCHAT_TODO]:- Please modify this as per your requirements
const makeOrderStatusResponse = (title, message, req, response) => {
  let inputParamsTableRows = "";
  for (const [key, value] of Object.entries(req.body)) {
    const pvalue = value !== null ? JSON.stringify(value) : "";
    inputParamsTableRows += `<tr><td>${key}</td><td>${pvalue}</td></tr>`;
  }

  let orderTableRows = "";
  for (const [key, value] of Object.entries(response)) {
    const pvalue = value !== null ? JSON.stringify(value) : "";
    orderTableRows += `<tr><td>${key}</td><td>${pvalue}</td></tr>`;
  }

  return `
        <html>
        <head>
            <title>${title}</title>
        </head>
        <body>
            <h1>${message}</h1>

            <center>
                <font size="4" color="blue"><b>Return url request body params</b></font>
                <table border="1">
                    ${inputParamsTableRows}
                </table>
            </center>

            <center>
                <font size="4" color="blue"><b>Response received from order status payment server call</b></font>
                <table border="1">
                    ${orderTableRows}
                </table>
            </center>
        </body>
        </html>
    `;
};

app.listen(port, () => {
  logger.info(`Server is running on http://localhost:${port}`);
  logger.info(`API Documentation available at http://localhost:${port}/docs`);
  logger.info(`Current log level: ${process.env.LOG_LEVEL || "INFO"}`);
});
