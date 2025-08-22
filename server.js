// server.js
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const twilio = require('twilio');

// DB + rutas (sensores)
const { connect } = require('./db');
const sensor_routes = require('./routes/sensor_routes');

const app = express();
app.use(cors());
app.use(express.json());

// Twilio Verify
const accountSid = process.env.twilio_account_sid;
const authToken  = process.env.twilio_auth_token;
const verifySid  = process.env.twilio_verify_sid;
const client = twilio(accountSid, authToken);

// Root
app.get('/', (_, res) => res.send('✅ Backend activo (Twilio Verify + Sensors)'));

// Enviar código
app.post('/send-code', async (req, res) => {
  const { phoneNumber } = req.body;
  if (!phoneNumber) {
    return res.status(400).json({ success: false, message: 'Falta phoneNumber' });
  }
  try {
    const v = await client.verify.v2.services(verifySid).verifications.create({
      to: phoneNumber,
      channel: 'sms'
    });
    res.json({ success: true, sid: v.sid });
  } catch (err) {
    console.error('❌ send-code error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Verificar código
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
      res.json({ success: true, status: 'approved' });
    } else {
      res.status(401).json({ success: false, message: 'Código inválido' });
    }
  } catch (err) {
    console.error('❌ verify-code error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Rutas sensores
app.use('/api/sensors', sensor_routes);

// Arranque
const PORT = process.env.PORT || 5000;
connect().then(() => {
  app.listen(PORT, () => console.log(`🚀 API lista en :${PORT}`));
}).catch(err => {
  console.error('❌ Error conectando a MongoDB:', err.message);
  process.exit(1);
});

