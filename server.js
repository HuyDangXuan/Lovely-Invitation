require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const nodemailer = require("nodemailer");

const app = express();

// ===== Middlewares =====
app.use(helmet());
app.use(express.json({ limit: "200kb" }));

// 👉 Gộp frontend + backend => CORS rất đơn giản
app.use(cors({ origin: true }));

// ===== Rate limit API =====
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
});
app.use("/api/", limiter);

// ===== Serve static frontend =====
app.use(express.static(path.join(__dirname, "public")));

// ===== Health check =====
app.get("/health", (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// ===== SMTP =====
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 465),
  secure: String(process.env.SMTP_SECURE || "true") === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

transporter.verify((err) => {
  if (err) console.error("SMTP VERIFY ERROR:", err);
  else console.log("✅ SMTP ready");
});

// ===== API: send plan =====
app.post("/api/plan", async (req, res) => {
  try {
    const {
      area, budget, vibes, date, time,
      place, money, steps, note, to_email
    } = req.body || {};

    if (!area || !budget || !date || !time || !place || !money) {
      return res.status(400).json({ ok:false, message:"Thiếu dữ liệu bắt buộc" });
    }

    const to = to_email || process.env.MAIL_TO;
    if (!to) {
      return res.status(500).json({ ok:false, message:"Thiếu email người nhận" });
    }

    await transporter.sendMail({
      from: `"${process.env.MAIL_FROM_NAME || "Love Plan"}" <${process.env.SMTP_USER}>`,
      to,
      subject: `💌 Kèo hẹn Cầu Giấy – ${date} ${time}`,
      html: `
        <h3>📍 ${place}</h3>
        <p><b>🕒</b> ${date} ${time}</p>
        <p><b>💰</b> ${money}</p>
        <p><b>🎨 Vibe:</b> ${vibes}</p>
        <p><b>🗺️ Lịch trình:</b></p>
        <ul>${(steps||"").split("|").map(s=>`<li>${s}</li>`).join("")}</ul>
        <p>${note || ""}</p>
      `
    });

    res.json({ ok:true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok:false, message:"Send mail failed" });
  }
});

// ===== Fallback: mọi route trả index.html =====
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ===== Start =====
const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`✅ Server running at http://localhost:${port}`);
});
