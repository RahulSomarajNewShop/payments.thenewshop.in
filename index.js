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
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());

// Middleware to parse URL-encoded bodies (e.g., form submissions)
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.get("/", (_, res) =>
  res.sendFile(path.join(__dirname, "public", "initiatePaymentDataForm.html"))
);

// Middleware to parse JSON bodies
app.use(express.json());

app.post("/initiatePayment", async (req, res) => {
  console.log(req.body);
  const orderId = req.body.order_id;

  // const orderId = `order_${Date.now()}`;
  // const amount = req.body.amount;
  const amount = 1 + crypto.randomInt(100);
  // const returnUrl = req.body.returnUrl;
  const customerId = req.body.customerId;
  const returnUrl = `https://uatpayments.thenewshop.in/handlePaymentResponse`;
  console.log(returnUrl);
  const paymentHandler = PaymentHandler.getInstance();

  // Insert orderId and amount into the database
  // try {
  //   await query("INSERT INTO orders (order_id, amount) VALUES ($1, $2)", [
  //     orderId,
  //     amount,
  //   ]);
  // } catch (dbError) {
  //   console.error("Failed to insert order into database:", dbError);
  //   return res
  //     .status(500)
  //     .json({ success: false, message: "Failed to create order in database" });
  // }

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
    console.log(orderSessionResp);
    return res.send({ orderSessionResp });
    // return res.redirect(orderSessionResp.payment_links.web);
  } catch (error) {
    console.log(error);
    // [MERCHANT_TODO]:- please handle errors
    if (error instanceof APIException) {
      return res.send("PaymentHandler threw some error");
    }
    // [MERCHANT_TODO]:- please handle errors
    return res.send("Something went wrong");
  }
});

app.post("/handlePaymentResponse", async (req, res) => {
  /// this should be the return url
  console.log(req.body);
  console.log("req.body");
  console.log("req.body");
  console.log("req.body");
  console.log("req.body");
  console.log("req.body");
  const FRONTEND_BASE =
    process.env.FRONTEND_BASE_URL || "https://uatb2b.thenewshop.in";
  const orderId = req.body.order_id || req.body.orderId;
  const paymentHandler = PaymentHandler.getInstance();

  if (orderId === undefined) {
    return res.send("Something went wrong");
  }

  try {
    const orderStatusResp = await paymentHandler.orderStatus(orderId);
    // validate the order here amount and request params
    if (
      validateHMAC_SHA256(req.body, paymentHandler.getResponseKey()) === false
    ) {
      // [MERCHANT_TODO]:- validation failed, it's critical error
      return res.send("Signature verification failed");
    }

    const orderStatus = orderStatusResp.status;
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

    // const html = makeOrderStatusResponse(
    //   "Merchant Payment Response Page",
    //   message,
    //   req,
    //   orderStatusResp
    // );
    // res.set("Content-Type", "text/html");
    // return res.send(html);
    // 303 See Other after a GET is fine too
    return res.redirect(303, redirectUrl.toString());
  } catch (error) {
    console.error(error);
    // [MERCHANT_TODO]:- please handle errors
    if (error instanceof APIException) {
      return res.send("PaymentHandler threw some error");
    }
    // [MERCHANT_TODO]:- please handle errors
    return res.send("Something went wrong");
  }
});

app.post("/initiateRefund", async (req, res) => {
  const paymentHandler = PaymentHandler.getInstance();

  try {
    const refundResp = await paymentHandler.refund({
      order_id: req.body.order_id,
      amount: req.body.amount,
      unique_request_id: req.body.unique_request_id || `refund_${Date.now()}`,
    });
    const html = makeOrderStatusResponse(
      "Merchant Refund Page",
      `Refund status:- ${refundResp.status}`,
      req,
      refundResp
    );
    res.set("Content-Type", "text/html");
    return res.send(html);
  } catch (error) {
    console.error(error);
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
  console.log(`Server is running on http://localhost:${port}`);
});
