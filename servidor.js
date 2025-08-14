// --- Pieza 1: Las Herramientas ---
const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();
const cors = require('cors');

// --- Montaje del Motor ---
const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3000;

// --- "ARCHIVADOR" / BASE DE DATOS FALSA ---
const fakeMemberDatabase = {
    "user_mikel": { 
        nombre: "Mikel", 
        numero_socio: "101010", 
        estado_cuota: "Pagada", 
        proximo_pago: "01/08/2026", 
        localidad: "Tribuna Principal Alta, Fila 5, Asiento 12",
        antiguedad: "15 años"
    }
};
const fakeTicketDatabase = [
    { id: 1, partido: "Real Sociedad vs FC Barcelona", fecha: "14 SEP 2025", zona: "Tribuna Este Alta", precio: 95, vendedor: "Iñigo M." },
    { id: 2, partido: "Real Sociedad vs Real Madrid", fecha: "05 OCT 2025", zona: "Fondo Aitor Zabaleta", precio: 110, vendedor: "Ane G." },
];
const fakeMerchandiseDatabase = [
    { id: 101, nombre: "Camiseta Local 25/26", precio: 89.95, url: "https://tienda.realsociedad.eus/es/camiseta-local" },
    { id: 103, nombre: "Bufanda Txuri-Urdin", precio: 25.00, url: "https://tienda.realsociedad.eus/es/bufanda" },
];
// ---------------------------------------------

// --- Configuración de la Inteligencia (Gemini) ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash"});

// --- Ruta de Chat con Lógica Profesional ---
app.post('/chat', async (req, res) => {
  try {
    const userMessage = req.body.message;
    if (!userMessage) {
      return res.status(400).json({ error: 'No se ha proporcionado ningún mensaje.' });
    }

    // --- PASO 1: CLASIFICAR LA INTENCIÓN DEL USUARIO ---
    const classifierPrompt = `
      Analiza la siguiente pregunta de un usuario y clasifícala en una de estas dos categorías:
      1. "DATOS_PRIVADOS": si la pregunta es sobre información personal del socio, entradas o productos de la tienda (ej: "¿cuánto pago?", "¿qué entradas hay?", "¿cuál es mi número de socio?").
      2. "CONOCIMIENTO_GENERAL": si la pregunta es sobre la historia del club, jugadores, estadio, o cualquier otra cosa que no sea información personal (ej: "¿quién es el máximo goleador?", "¿cuándo se fundó el club?").
      Responde únicamente con la palabra "DATOS_PRIVADOS" o "CONOCIMIENTO_GENERAL".

      Pregunta del usuario: "${userMessage}"
    `;
    
    const classificationResult = await model.generateContent(classifierPrompt);
    const intent = (await classificationResult.response.text()).trim();

    let finalResponseText;

    // --- PASO 2: RESPONDER SEGÚN LA INTENCIÓN CLASIFICADA ---
    if (intent === "DATOS_PRIVADOS") {
      // Si la intención es privada, construimos un prompt solo con los datos privados.
      const memberDataString = JSON.stringify(fakeMemberDatabase["user_mikel"]);
      const ticketDataString = JSON.stringify(fakeTicketDatabase);
      const merchDataString = JSON.stringify(fakeMerchandiseDatabase);

      const privateDataPrompt = `
        **INSTRUCCIONES:** Eres 'FAN IA'. Responde a la pregunta del usuario basándote ESTRICTA y ÚNICAMENTE en el siguiente contexto de datos. No uses ningún otro conocimiento. Si los datos no contienen la respuesta, di que no tienes esa información. Para productos, incluye el enlace de compra en formato Markdown: [Nombre](url).

        **CONTEXTO DE DATOS:**
        - DATOS_SOCIO: ${memberDataString}
        - ENTRADAS_DISPONIBLES: ${ticketDataString}
        - PRODUCTOS_TIENDA: ${merchDataString}
        ---
        **PREGUNTA DEL USUARIO:** "${userMessage}"
      `;
      const privateResult = await model.generateContent(privateDataPrompt);
      finalResponseText = await privateResult.response.text();

    } else { // Si la intención es CONOCIMIENTO_GENERAL (o cualquier otra cosa por seguridad)
      // Construimos un prompt simple, sin datos privados que puedan confundir.
      const generalKnowledgePrompt = `
        **INSTRUCCIONES:** Eres 'FAN IA', un asistente experto en la Real Sociedad. Responde a la siguiente pregunta del usuario usando tu conocimiento general sobre el club. Tu tono debe ser amable y servicial.
        ---
        **PREGUNTA DEL USUARIO:** "${userMessage}"
      `;
      const generalResult = await model.generateContent(generalKnowledgePrompt);
      finalResponseText = await generalResult.response.text();
    }

    res.json({ reply: finalResponseText });

  } catch (error) {
    console.error('Error en la ruta /chat:', error);
    res.status(500).json({ error: 'Ha ocurrido un error en el servidor.' });
  }
});

// --- Puesta en Marcha ---
app.listen(PORT, () => {
  console.log(`✅ ¡Motor con Lógica Profesional arrancado! Escuchando en el puerto ${PORT}.`);
});
