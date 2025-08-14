require('dotenv').config();

const express = require('express');
const cors = require('cors');
const twilio = require('twilio');

const app = express();
app.use(cors());           // Si quieres, limita con { origin: 'https://tu-dominio.com' }
app.use(express.json());

// 🔐 Twilio (Verify)
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken  = process.env.TWILIO_AUTH_TOKEN;
const verifySid  = process.env.TWILIO_VERIFY_SID;
const client = twilio(accountSid, authToken);

// 🏠 Ping simple
app.get('/', (_, res) => res.send('✅ Backend activo (Twilio Verify)'));

// 📤 Enviar código SMS
app.post('/send-code', async (req, res) => {
  const { phoneNumber } = req.body;

  if (!phoneNumber) {
    return res.status(400).json({ success: false, message: 'Falta phoneNumber' });
  }

  try {
    const v = await client.verify.v2.services(verifySid).verifications.create({
      to: phoneNumber,        // Formato E.164, ej: +447471256650
      channel: 'sms'
    });
    return res.json({ success: true, sid: v.sid });
  } catch (err) {
    console.error('❌ send-code error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ✅ Verificar código
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
      // 👉 Sin lista blanca: deja pasar a cualquiera que se verifique
      return res.json({ success: true, status: 'approved' });
    } else {
      return res.status(401).json({ success: false, message: 'Código inválido' });
    }
  } catch (err) {
    console.error('❌ verify-code error:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 🚀 Arranque
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 http://localhost:${PORT}`));
