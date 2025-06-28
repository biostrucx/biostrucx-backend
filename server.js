const qs = require('qs');
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// 🔐 CREDENCIALES DIRECTAS (Twilio)
const accountSid = 'AC22151d92ddd226ff23c654e09f6301db';
const authToken = 'b7a2221b6118a1c45b426123daaf72b8';
const serviceSid = 'VA7c55a112f1875f29f21cdeb7a6e9489b';

// 📤 Enviar código de verificación por SMS
app.post('/send-code', async (req, res) => {
  const { phone } = req.body;
  console.log("📞 Teléfono recibido:", phone);

  try {
    await axios.post(
      `https://verify.twilio.com/v2/Services/${serviceSid}/Verifications`,
      qs.stringify({
        To: phone,
        Channel: 'sms'
      }),
      {
        auth: {
          username: accountSid,
          password: authToken
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    console.log(`📨 Enviando código a: ${phone}`);
    res.status(200).json({ message: 'Código enviado correctamente.' });

  } catch (error) {
    console.error('❌ Error al enviar código:', error.response?.data || error.message);
    res.status(400).json({ message: 'Error al enviar código.' });
  }
});

// ✅ Verificar el código ingresado por el usuario
app.post('/verify-code', async (req, res) => {
  const { phone, code } = req.body;

  try {
    const response = await axios.post(
      `https://verify.twilio.com/v2/Services/${serviceSid}/VerificationCheck`,
      qs.stringify({
        To: phone,
        Code: code
      }),
      {
        auth: {
          username: accountSid,
          password: authToken
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    if (response.data.status === 'approved') {
      console.log('✅ Código correcto');
      res.status(200).json({ message: 'Verificación exitosa.' });
    } else {
      console.log('❌ Código incorrecto');
      res.status(401).json({ message: 'Código incorrecto.' });
    }

  } catch (error) {
    console.error('❌ Error al verificar el código:', error.response?.data || error.message);
    res.status(500).json({ message: 'Error interno en la verificación.' });
  }
});

// 🚀 Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en http://localhost:${PORT}`);
});
