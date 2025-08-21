require('dotenv').config();

const express = require('express');
const cors = require('cors');
const twilio = require('twilio');

// DB + rutas (sensores)
const { connect } = require('./db');
const sensor_routes = require('./routes/sensor_routes');

const app = express();
app.use(cors());            // opcional: { origin: 'https://biostrucx.com' }
app.use(express.json());

// 🔐 Twilio (Verify) — respeta tus nombres actuales
const accountSid = process.env.twilio_account_sid;
const authToken  = process.env.twilio_auth_token;
const verifySid  = process.env.twilio_verify_sid;
const client = twilio(accountSid, authToken);

// 🏠 Ping simple
app.get('/', (_, res) => res.send('✅ Backend activo (Twilio Verify + Sensors)'));

// 📤 Enviar código SMS (mantén "phoneNumber" para no romper tu frontend)
app.post('/send-code', async (req, res) => {
  const { phoneNumber } = req.body;
  if (!phoneNumber) {
    return res.status(400).json({ success: false, message: 'Falta phoneNumber' });
  }
  try {
    const v = await client.verify.v2.services(verifySid).verifications.create({
      to: phoneNumber,            // E.164, ej: +447471256650
      channel: 'sms'
    });
    return res.json({ success: true, sid: v.sid });
  } catch (err) {
    console.error('❌ send-code error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ✅ Verificar código (mantén "phoneNumber" y "code")
app.post('/verify-code', async (req, res) => {
  const { phoneNumber, code } = req.body;
  if (!phoneNumber || !code) {
    return res.status(400).json({ success: false, message: 'Faltan datos' });
  }
  try {
    const check = await client.verify.v2.services(verifySid).verificationChecks.create({
      to: phoneNumber,
      code
    });
    if (check.status === 'approved') {
      return res.json({ success: true, status: 'approved' });
    } else {
      return res.status(401).json({ success: false, message: 'Código inválido' });
    }
  } catch (err) {
    console.error('❌ verify-code error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 📡 API sensores (minúsculas + snake_case)
// POST /api/sensors/:clientid  -> guarda en sensor_data (TS)
app.use('/api/sensors', sensor_routes);

// 🚀 Arranque tras conectar a Mongo
const PORT = process.env.port || process.env.PORT || 5000;
connect().then(() => {
  app.listen(PORT, () => console.log(`🚀 API lista en :${PORT}`));
}).catch(err => {
  console.error('❌ Error conectando a MongoDB:', err.message);
  process.exit(1);
});

