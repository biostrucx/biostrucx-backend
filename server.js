// ⚙️ Cargar variables de entorno (solo aplica localmente)
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const app = express();

// 🧠 Middleware
app.use(cors());
app.use(express.json());

// 📂 Servir carpeta de clientes como pública
app.use('/cliente_1', express.static('clients/cliente_1'));

// ✅ Verificación de variables de entorno
console.log("🔐 TWILIO_ACCOUNT_SID:", process.env.TWILIO_ACCOUNT_SID ? "OK" : "❌ Missing");
console.log("🔐 TWILIO_AUTH_TOKEN:", process.env.TWILIO_AUTH_TOKEN ? "OK" : "❌ Missing");
console.log("🔐 TWILIO_VERIFY_SID:", process.env.TWILIO_VERIFY_SID ? "OK" : "❌ Missing");

// 🔑 Twilio config
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifySid = process.env.TWILIO_VERIFY_SID;

const twilio = require('twilio');
const client = twilio(accountSid, authToken);

// 📋 Lista de usuarios autorizados
const allowedUsers = {
  '+447471256650': '/dashboard/cliente_1'
};

// 🌐 Ruta de prueba
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
    res.status(500).json({ success: false, error: error.message });
  }
});

// ➤ Verificar código SMS
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

    if (verificationCheck.status === 'approved') {
      const redirect = allowedUsers[phoneNumber];
      if (redirect) {
        return res.json({ success: true, status: 'allowed', redirect });
      } else {
        return res.status(403).json({
          success: false,
          status: 'denied',
          message: 'Aún no eres parte de BioStrucX, únete y sé parte del cambio'
        });
      }
    } else {
      return res.status(401).json({ success: false, message: 'Código inválido' });
    }
  } catch (error) {
    console.error("❌ Error al verificar código:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 🚀 Iniciar servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en http://localhost:${PORT}`);
});


