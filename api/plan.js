const nodemailer = require("nodemailer");

function parseBody(req) {
  return new Promise((resolve, reject) => {
    if (req.body) return resolve(req.body);
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });
  });
}

module.exports = async (req, res) => {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, message: "Method Not Allowed" });
    }

    const body = await parseBody(req);

    const {
      area, budget, vibes, date, time,
      place, money, steps, note, to_email
    } = body || {};

    if (!area || !budget || !date || !time || !place || !money) {
      return res.status(400).json({ ok: false, message: "Thiếu dữ liệu bắt buộc" });
    }

    const {
      SMTP_HOST, SMTP_PORT, SMTP_SECURE,
      SMTP_USER, SMTP_PASS,
      MAIL_TO, MAIL_FROM_NAME
    } = process.env;

    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
      return res.status(500).json({
        ok: false,
        message: "Thiếu SMTP env: SMTP_HOST/SMTP_USER/SMTP_PASS"
      });
    }

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT || 465),
      secure: String(SMTP_SECURE || "true") === "true",
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });

    const to = to_email || MAIL_TO;
    if (!to) {
      return res.status(500).json({ ok: false, message: "Thiếu email người nhận (MAIL_TO hoặc to_email)" });
    }

    await transporter.sendMail({
      from: `"${MAIL_FROM_NAME || "Love Plan"}" <${SMTP_USER}>`,
      to,
      subject: `💌 Kèo hẹn Cầu Giấy – ${date} ${time}`,
      html: `
        <h3>📍 ${place}</h3>
        <p><b>🕒</b> ${date} ${time}</p>
        <p><b>💰</b> ${money}</p>
        <p><b>🎨 Vibe:</b> ${vibes || ""}</p>
        <p><b>🗺️ Lịch trình:</b></p>
        <ul>${String(steps||"").split("|").filter(Boolean).map(s => `<li>${s.trim()}</li>`).join("")}</ul>
        <p>${note || ""}</p>
      `,
    });

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("PLAN ERROR:", e);
    return res.status(500).json({ ok: false, message: e.message || "Send mail failed" });
  }
};
