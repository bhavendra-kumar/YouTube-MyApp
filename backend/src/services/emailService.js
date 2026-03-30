import nodemailer from "nodemailer";
import { env } from "../config/env.js";

function isNonEmpty(value) {
  return typeof value === "string" && value.trim().length > 0;
}

export function isSmtpConfigured() {
  return Boolean(
    isNonEmpty(env?.smtp?.host) &&
      isNonEmpty(env?.smtp?.user) &&
      isNonEmpty(env?.smtp?.pass)
  );
}

function getTransporter() {
  let host = String(env?.smtp?.host || "").trim();
  const port = Number(env?.smtp?.port || 587);
  const user = String(env?.smtp?.user || "").trim();
  const pass = String(env?.smtp?.pass || "").trim();
  const from = String(env?.smtp?.from || user).trim();

  if (!host || !user || !pass) {
    // If SMTP not configured, log to console and skip sending.
    return null;
  }

  // Common mistake: SMTP_HOST accidentally set to an email address.
  if (host.includes("@")) {
    // eslint-disable-next-line no-console
    console.error(
      "[emailService] Invalid SMTP_HOST (looks like an email address). " +
        "For Gmail use SMTP_HOST=smtp.gmail.com and SMTP_USER=<your gmail address>."
    );
    return null;
  }

  return {
    transporter: nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    }),
    from,
  };
}

async function safeSendMail(t, mail) {
  if (!t) return { sent: false, reason: "smtp_not_configured" };
  try {
    await t.transporter.sendMail({ from: t.from, ...mail });
    return { sent: true };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[emailService] Failed to send email:", err?.message || err);
    const code = String(err?.code || "");
    if (code === "EAUTH") return { sent: false, reason: "smtp_auth_failed" };
    if (code === "EAI_FAIL" || code === "ENOTFOUND") return { sent: false, reason: "smtp_dns_failed" };
    return { sent: false, reason: "smtp_error" };
  }
}

export async function sendInvoiceEmail({ to, name, plan, amountPaise, paymentId, orderId }) {
  const t = getTransporter();
  const amount = (amountPaise / 100).toFixed(2);
  const date = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

  const planLimits = {
    FREE: "5 minutes per video",
    BRONZE: "7 minutes per video",
    SILVER: "10 minutes per video",
    GOLD: "Unlimited viewing",
  };

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 30px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #ff0000 0%, #cc0000 100%); padding: 32px; text-align: center; }
    .header h1 { color: #fff; margin: 0; font-size: 28px; letter-spacing: -0.5px; }
    .header p { color: rgba(255,255,255,0.85); margin: 6px 0 0; font-size: 14px; }
    .body { padding: 32px; }
    .plan-badge { display: inline-block; background: #ff0000; color: #fff; font-weight: 700; font-size: 18px; padding: 8px 24px; border-radius: 20px; margin-bottom: 24px; letter-spacing: 1px; }
    .field { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f0f0f0; font-size: 14px; }
    .field:last-child { border-bottom: none; }
    .field .label { color: #888; }
    .field .value { font-weight: 600; color: #333; }
    .amount-row .value { font-size: 18px; color: #ff0000; }
    .benefit { background: #fff8f8; border-left: 3px solid #ff0000; padding: 12px 16px; border-radius: 4px; margin: 20px 0; font-size: 14px; color: #555; }
    .footer { background: #f9f9f9; text-align: center; padding: 20px; font-size: 12px; color: #aaa; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎬 YouTube Clone</h1>
      <p>Payment Confirmation &amp; Invoice</p>
    </div>
    <div class="body">
      <p>Hi <strong>${name || "Valued User"}</strong>,</p>
      <p>Thank you for upgrading! Your payment was successful.</p>
      <div>
        <span class="plan-badge">${plan} PLAN</span>
      </div>
      <div class="field"><span class="label">Invoice Date</span><span class="value">${date} IST</span></div>
      <div class="field"><span class="label">Plan</span><span class="value">${plan}</span></div>
      <div class="field"><span class="label">Watch Limit</span><span class="value">${planLimits[plan] || "Unlimited"}</span></div>
      <div class="field"><span class="label">Payment ID</span><span class="value" style="font-size:12px;font-family:monospace">${paymentId}</span></div>
      <div class="field"><span class="label">Order ID</span><span class="value" style="font-size:12px;font-family:monospace">${orderId}</span></div>
      <div class="field amount-row"><span class="label">Amount Paid</span><span class="value">₹${amount}</span></div>
      <div class="benefit">
        ✅ Your account has been upgraded to <strong>${plan}</strong>. You can now enjoy ${planLimits[plan] || "unlimited viewing"} on YouTube Clone.
      </div>
      <p style="font-size:13px;color:#888;margin-top:24px;">This is an auto-generated invoice. Please keep it for your records.</p>
    </div>
    <div class="footer">© ${new Date().getFullYear()} YouTube Clone · All rights reserved</div>
  </div>
</body>
</html>`;

  if (!t) {
    console.log(`[EMAIL INVOICE] To: ${to} | Plan: ${plan} | Amount: ₹${amount} | PaymentId: ${paymentId}`);
    return { sent: false, reason: "smtp_not_configured" };
  }

  return safeSendMail(t, {
    to,
    subject: `✅ Payment Confirmed — ${plan} Plan | YouTube Clone`,
    html,
  });
}

export async function sendOtpEmail({ to, otp, name, expiryMinutes }) {
  const t = getTransporter();
  const expires = Number.isFinite(expiryMinutes) ? expiryMinutes : (env.otp?.expiryMinutes || 10);
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><style>
  body{font-family:'Segoe UI',Arial,sans-serif;background:#f4f4f4;margin:0;padding:0;}
  .container{max-width:480px;margin:30px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);}
  .header{background:linear-gradient(135deg,#ff0000,#cc0000);padding:24px;text-align:center;}
  .header h1{color:#fff;margin:0;font-size:22px;}
  .body{padding:32px;text-align:center;}
  .otp{font-size:42px;font-weight:700;letter-spacing:8px;color:#ff0000;background:#fff8f8;border:2px dashed #ff0000;display:inline-block;padding:12px 32px;border-radius:8px;margin:20px 0;}
  .footer{background:#f9f9f9;text-align:center;padding:16px;font-size:12px;color:#aaa;}
</style></head>
<body>
  <div class="container">
    <div class="header"><h1>🎬 YouTube Clone — OTP Verification</h1></div>
    <div class="body">
      <p>Hi <strong>${name || "User"}</strong>,</p>
      <p>Your one-time verification code is:</p>
      <div class="otp">${otp}</div>
      <p style="color:#888;font-size:13px;">This code expires in <strong>${expires} minutes</strong>. Do not share it with anyone.</p>
    </div>
    <div class="footer">© ${new Date().getFullYear()} YouTube Clone</div>
  </div>
</body>
</html>`;

  if (!t) {
    // eslint-disable-next-line no-console
    console.log(`[OTP EMAIL] To: ${to} | OTP: ${otp}`);
    return { sent: false, reason: "smtp_not_configured" };
  }

  return safeSendMail(t, {
    to,
    subject: "🔐 Your YouTube Clone Login OTP",
    html,
  });
}
