// server.js
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const twilio = require('twilio');

// DB + rutas (sensores)
const { connect } = require('./db');
const sensor_routes = require('./routes/sensor_routes');

const app = express();

// ---------------- CORS ----------------
const allowedOrigins = [
  'http://localhost:5173',
  'https://biostrucx.com',
  'https://www.biostrucx.com',
];
app.use(cors({
  origin: (origin, cb) => cb(null, !origin || allowedOrigins.includes(origin)),
  credentials: true,
}));
app.options('*', cors()); // preflight

// ---------------- Middlewares ----------
app.use(express.json());

// ---------------- Twilio Verify --------
const accountSid = process.env.twilio_account_sid;
const authToken  = process.env.twilio_auth_token;
const verifySid  = process.env.twilio_verify_sid; // debe empezar con VA...
const client = twilio(accountSid, authToken);

// helper simple E.164
const validPhone = (v = '') => /^\+\d{8,15}$/.test(String(v).trim());

// ---------------- Health ----------------
app.get('/health', (_, res) => res.json({ status: 'ok', uptime: process.uptime() }));

// ---------------- Auth: Send Code -------
app.post('/send-code', async (req, res) => {
  const { phoneNumber } = req.body || {};
  try {
    if (!phoneNumber) return res.status(400).json({ success: false, message: 'Falta phoneNumber' });
    if (!validPhone(phoneNumber)) {
      return res.status(400).json({ success: false, message: 'Usa formato internacional, ej: +447471256650' });
    }
    if (!accountSid || !authToken || !verifySid) {
      return res.status(500).json({ success: false, message: 'Twilio no configurado en entorno' });
    }

    const v = await client.verify.v2.services(verifySid)
      .verifications.create({ to: phoneNumber.trim(), channel: 'sms' });

    return res.json({ success: true, sid: v.sid });
  } catch (err) {
    console.error('❌ send-code error:', err?.message || err);
    return res.status(500).json({ success: false, message: err?.message || 'server_error' });
  }
});

// ---------------- Auth: Verify Code -----
app.post('/verify-code', async (req, res) => {
  const { phoneNumber, code } = req.body || {};
  try {
    if (!phoneNumber || !code) {
      return res.status(400).json({ status: 'denied', message: 'Faltan datos' });
    }
    if (!validPhone(phoneNumber)) {
      return res.status(400).json({ status: 'denied', message: 'Formato de número inválido' });
    }

    const check = await client.verify.v2.services(verifySid)
      .verificationChecks.create({ to: phoneNumber.trim(), code: String(code).trim() });

    if (check.status === 'approved') {
      // ⬇️ Política de acceso inicial: solo tu número entra a /dashboard/jeimie
      const allowed_numbers = ['+447471256650'];
      if (allowed_numbers.includes(phoneNumber.trim())) {
        return res.json({ status: 'allowed', redirect: '/dashboard/jeimie' });
      }
      return res.json({
        status: 'denied',
        message: 'Aún no eres parte de BioStrucX, únete y sé parte del cambio',
      });
    }

    return res.json({ status: 'invalid', message: 'Código incorrecto o expirado.' });
  } catch (err) {
    console.error('❌ verify-code error:', err?.message || err);
    return res.status(500).json({ status: 'error', message: err?.message || 'server_error' });
  }
});

// ---------------- Sensores --------------
app.use('/api/sensors', sensor_routes);

// ---------------- Start -----------------
const PORT = process.env.port || process.env.PORT || 5000;
connect().then(() => {
  app.listen(PORT, () => console.log(`🚀 API lista en :${PORT}`));
}).catch(err => {
  console.error('❌ Error conectando a MongoDB:', err?.message || err);
  process.exit(1);
});

