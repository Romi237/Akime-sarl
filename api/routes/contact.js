const router  = require('express').Router();
const nodemailer = require('nodemailer');
const Message = require('../models/Message');
const { adminOrEditor } = require('../middleware/auth');

// ── Mailer ────────────────────────────────────────────────────────────────────
// Lazily create the transporter so the server still starts even if SMTP is
// not yet configured (emails will just log a warning instead of crashing).
function createTransporter() {
  const { EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS } = process.env;
  if (!EMAIL_HOST || !EMAIL_USER || !EMAIL_PASS) return null;

  return nodemailer.createTransport({
    host: EMAIL_HOST,
    port: parseInt(EMAIL_PORT) || 587,
    secure: parseInt(EMAIL_PORT) === 465,
    auth: { user: EMAIL_USER, pass: EMAIL_PASS },
  });
}

async function sendContactEmail(msg) {
  const transporter = createTransporter();

  if (!transporter) {
    console.warn('⚠️  SMTP not configured — skipping email notification');
    return;
  }

  const companyEmail = process.env.COMPANY_EMAIL || process.env.EMAIL_USER;
  const companyName  = process.env.COMPANY_NAME  || 'A-KIME Sarl';

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#1a1a1a">📩 Nouveau message — ${companyName}</h2>
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="padding:6px 0;font-weight:bold;width:130px">Nom</td>
            <td style="padding:6px 0">${msg.name}</td></tr>
        <tr><td style="padding:6px 0;font-weight:bold">Email</td>
            <td style="padding:6px 0"><a href="mailto:${msg.email}">${msg.email}</a></td></tr>
        ${msg.phone   ? `<tr><td style="padding:6px 0;font-weight:bold">Téléphone</td><td style="padding:6px 0">${msg.phone}</td></tr>` : ''}
        ${msg.company ? `<tr><td style="padding:6px 0;font-weight:bold">Société</td><td style="padding:6px 0">${msg.company}</td></tr>` : ''}
        ${msg.serviceType ? `<tr><td style="padding:6px 0;font-weight:bold">Service</td><td style="padding:6px 0">${msg.serviceType}</td></tr>` : ''}
        ${msg.subject ? `<tr><td style="padding:6px 0;font-weight:bold">Sujet</td><td style="padding:6px 0">${msg.subject}</td></tr>` : ''}
      </table>
      <hr style="margin:16px 0;border:none;border-top:1px solid #ddd"/>
      <p style="white-space:pre-wrap;color:#333">${msg.content}</p>
      <hr style="margin:16px 0;border:none;border-top:1px solid #ddd"/>
      <p style="color:#888;font-size:12px">Reçu le ${new Date(msg.createdAt).toLocaleString('fr-FR')} · ID: ${msg._id}</p>
    </div>`;

  await transporter.sendMail({
    from: `"${companyName}" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
    to: companyEmail,
    replyTo: msg.email,
    subject: `[Contact] ${msg.subject || msg.serviceType || 'Nouveau message'} — ${msg.name}`,
    html,
  });

  console.log(`📧  Contact email sent to ${companyEmail}`);
}

// ── Routes ────────────────────────────────────────────────────────────────────

// 📩 Public: submit contact message
router.post('/', async (req, res) => {
  try {
    const msg = await Message.create(req.body);

    // Fire-and-forget — don't let an email failure block the user response
    sendContactEmail(msg).catch(err =>
      console.error('❌  Failed to send contact email:', err.message)
    );

    res.json({ success: true, message: 'Message reçu', data: { id: msg._id } });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// 📥 Admin: list all messages
router.get('/', adminOrEditor(), async (req, res) => {
  try {
    const list = await Message.find().sort({ createdAt: -1 });
    res.json({ success: true, data: list });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ✅ BULK MARK AS READ
router.put('/bulk/read', adminOrEditor(), async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: "Aucun ID fourni" });
    }

    const result = await Message.updateMany(
      { _id: { $in: ids } },
      { read: true }
    );

    res.json({ success: true, message: `${result.modifiedCount} messages marqués comme lus` });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ✅ BULK DELETE MESSAGES
router.delete('/bulk/delete', adminOrEditor(), async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: "Aucun ID fourni" });
    }

    const result = await Message.deleteMany({ _id: { $in: ids } });

    res.json({ success: true, message: `${result.deletedCount} messages supprimés` });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// 👁 Admin: get single message by ID
router.get('/:id', adminOrEditor(), async (req, res) => {
  try {
    const msg = await Message.findById(req.params.id);
    if (!msg) return res.status(404).json({ success: false, message: 'Message not found' });
    res.json({ success: true, data: msg });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ✅ Mark as read
router.put('/:id/read', adminOrEditor(), async (req, res) => {
  try {
    const msg = await Message.findByIdAndUpdate(
      req.params.id,
      { read: true },
      { new: true }
    );
    if (!msg) return res.status(404).json({ success: false, message: 'Message not found' });
    res.json({ success: true, data: msg });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ❌ Delete a message
router.delete('/:id', adminOrEditor(), async (req, res) => {
  try {
    const msg = await Message.findByIdAndDelete(req.params.id);
    if (!msg) return res.status(404).json({ success: false, message: 'Message not found' });
    res.json({ success: true, message: 'Message supprimé' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
