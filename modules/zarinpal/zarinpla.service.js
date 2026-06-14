const { default: axios } = require("axios");
const createHttpError = require("http-errors");

async function zarinalRequest(amount, user, description = "خرید محصول") {
  const result = await axios
    .post(
      process.env.ZARINPAL_REQUEST_URL,
      {
        merchant_id: process.env.ZARINPAL_MERCHANT_ID,
        callback_url: process.env.ZARINPAL_CALLBACK_URL,
        amount,
        description,
        metaData: {
          mobile: user?.mobile,
          email: "",
        },
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    )
    .catch((error) => {
      console.log(error);
      return error;
    });
  if (result?.data?.authority) {
    return {
      authority: result?.data?.authority,
      paymentUrl: `${process.env.ZARINPAL_GATEWAY_URL}/${result?.data?.authority}`,
    };
  }
  throw createHttpError(400, "zarinpla service is not available");
}

async function zarinalVerify(amount, authority) {
  const result = await axios
    .post(
      process.env.ZARINPAL_VERIFY_URL,
      {
        merchant_id: process.env.ZARINPAL_MERCHANT_ID,
        amount: amount * 10,
        authority,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    )
    .then((res) => res.data)
    .catch((error) => {
      console.log(error);
      return error;
    });
  if (result?.data?.code == 100) {
    return true;
  } else if (result?.data.code == 101) {
    throw createHttpError(409, "already verified payment");
  }
  throw createHttpError(500, "something is wrong");
}

module.exports = { zarinalRequest, zarinalVerify };
