const axios = require("axios");
const createHttpError = require("http-errors");

function config() {
  for (const key of ["ZARINPAL_REQUEST_URL", "ZARINPAL_VERIFY_URL", "ZARINPAL_GATEWAY_URL", "ZARINPAL_MERCHANT_ID", "ZARINPAL_CALLBACK_URL"]) {
    if (!process.env[key]) throw createHttpError(500, `Missing ${key}`);
  }
}
function amountValue(amount) {
  const n = Number(amount);
  if (!Number.isSafeInteger(n) || n < 1) throw createHttpError(400, "Invalid payment amount");
  return n;
}
async function zarinalRequest(amount, user, description = "خرید محصول") {
  config();
  try {
    const { data: response } = await axios.post(process.env.ZARINPAL_REQUEST_URL, {
      merchant_id: process.env.ZARINPAL_MERCHANT_ID,
      callback_url: process.env.ZARINPAL_CALLBACK_URL,
      amount: amountValue(amount), currency: "IRT", description,
      metadata: { mobile: user?.mobile || "" },
    }, { timeout: 15000 });
    const data = response?.data;
    if (data?.code !== 100 || !data.authority) throw createHttpError(502, "Gateway rejected payment request");
    return { authority: data.authority, paymentUrl: `${process.env.ZARINPAL_GATEWAY_URL.replace(/\/$/, "")}/${data.authority}` };
  } catch (err) { if (err.status || err.statusCode) throw err; throw createHttpError(502, "Payment gateway unavailable"); }
}
async function zarinalVerify(amount, authority) {
  config();
  if (!authority || typeof authority !== "string") throw createHttpError(400, "Invalid authority");
  try {
    const { data: response } = await axios.post(process.env.ZARINPAL_VERIFY_URL, {
      merchant_id: process.env.ZARINPAL_MERCHANT_ID,
      amount: amountValue(amount), currency: "IRT", authority,
    }, { timeout: 15000 });
    const data = response?.data;
    if (data?.code === 100 && data.ref_id) return { refId: String(data.ref_id) };
    if (data?.code === 101) return { alreadyVerified: true, refId: data.ref_id ? String(data.ref_id) : null };
    throw createHttpError(409, "Payment was not verified");
  } catch (err) { if (err.status || err.statusCode) throw err; throw createHttpError(502, "Payment verification unavailable"); }
}
module.exports = { config, zarinalRequest, zarinalVerify };
