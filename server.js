const express = require('express');
const cors = require('cors');
const app = express();
require('dotenv').config(); // solo si corres localmente

// Configurar middlewares
app.use(cors());
app.use(express.json());

// Twilio config
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifySid = process.env.TWILIO_VERIFY_SID;

const client = require('twilio')(accountSid, authToken);

// Ruta raíz opcional
app.get('/', (req, res) => {
  res.send('🔐 BioStrucX Backend Activo');
});

// ➤ Enviar código SMS
app.post('/send-code', async (req, res) => {
  const { phoneNumber } = req.body;
  console.log("📲 Enviando código a:", phoneNumber);

  if (!phoneNumber) {
    return res.status(400).json({ success: false, message: "Número no recibido" });
  }

  try {
    const verification = await client.verify.v2
      .services(verifySid)
      .verifications.create({
        to: phoneNumber,
        channel: 'sms'
      });

    console.log("✅ Código enviado:", verification.sid);
    res.json({ success: true, sid: verification.sid });
  } catch (error) {
    console.error("❌ Error al enviar código:", error);
    res.status(500).json({ success: false, error });
  }
});

// ➤ Verificar código
app.post('/verify-code', async (req, res) => {
  const { phoneNumber, code } = req.body;
  console.log("🔐 Verificando código para:", phoneNumber, "con código:", code);

  if (!phoneNumber || !code) {
    return res.status(400).json({ success: false, message: "Faltan datos" });
  }

  try {
    const verificationCheck = await client.verify.v2
      .services(verifySid)
      .verificationChecks.create({
        to: phoneNumber,
        code: code
      });

    console.log("🔁 Resultado:", verificationCheck.status);
    res.json({ success: verificationCheck.status === 'approved' });
  } catch (error) {
    console.error("❌ Error al verificar código:", error);
    res.status(500).json({ success: false, error });
  }
});

// Iniciar servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en http://localhost:${PORT}`);
});
