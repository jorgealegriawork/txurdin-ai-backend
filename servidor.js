// --- Pieza 1: Las Herramientas ---
const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const cors = require('cors');

// --- Montaje del Motor ---
const app = express();
app.use(cors());
app.use(express.json());
const PORT = 3000;

// --- Conexión a la Base de Datos (Supabase) ---
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// --- Configuración de la Inteligencia (Gemini) ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash"});

// --- Ruta de Chat con Lógica Profesional de Dos Pasos ---
app.post('/chat', async (req, res) => {
  try {
    const userMessage = req.body.message;
    const currentUserId = 101010; 

    if (!userMessage) {
      return res.status(400).json({ error: 'No se ha proporcionado ningún mensaje.' });
    }

    // --- CEREBRO 1: CLASIFICADOR DE INTENCIÓN ---
    const classifierPrompt = `
      Analiza la pregunta del usuario y clasifícala en una de estas dos categorías:
      1. "DATOS_PRIVADOS": Si la pregunta trata sobre información personal del socio (cuota, antigüedad, puntos, número de socio), o si pregunta específicamente por entradas a la venta, precios de entradas para partidos concretos, o productos de la tienda.
         EJEMPLOS: "¿cuánto pago?", "¿qué entradas hay a la venta?", "¿cuánto vale una entrada para el próximo partido?", "¿cuánto cuesta la camiseta?".
      2. "CONOCIMIENTO_GENERAL": Si la pregunta es sobre la historia del club, jugadores, estadio, resultados, o cualquier otra cosa que no sea una consulta directa sobre los datos de venta o del socio.
         EJEMPLOS: "¿quién es el máximo goleador?", "¿cuándo se fundó el club?", "¿cómo quedó el último partido?".

      Responde únicamente con la palabra "DATOS_PRIVADOS" o "CONOCIMIENTO_GENERAL".

      Pregunta del usuario: "${userMessage}"
    `;
    
    const classificationResult = await model.generateContent(classifierPrompt);
    const intent = (await classificationResult.response.text()).trim();

    let finalResponseText;

    // --- CEREBRO 2: EL EXPERTO ADECUADO RESPONDE ---
    if (intent === "DATOS_PRIVADOS") {
      // Llamamos al Experto en Datos
      const { data: memberData } = await supabase.from('socios').select('*').eq('id_socio', currentUserId).single();
      const { data: ticketData } = await supabase.from('asientos_liberados').select('*, partidos(rival, competicion, fecha)');
      const { data: merchData } = await supabase.from('productos').select('*');
      
      const privateDataPrompt = `
        **INSTRUCCIONES:** Eres 'FAN IA'. Responde a la pregunta del usuario de forma directa y concisa, basándote ESTRICTA y ÚNICAMENTE en el siguiente contexto de datos. Si la respuesta no está en los datos, di "No dispongo de esa información en este momento.". Para productos, incluye el enlace de compra en formato Markdown: [Nombre](url).

        **CONTEXTO DE DATOS:**
        - DATOS_SOCIO: ${JSON.stringify(memberData)}
        - ENTRADAS_DISPONIBLES: ${JSON.stringify(ticketData)}
        - PRODUCTOS_TIENDA: ${JSON.stringify(merchData)}
        ---
        **PREGUNTA DEL USUARIO:** "${userMessage}"
      `;
      const privateResult = await model.generateContent(privateDataPrompt);
      finalResponseText = await privateResult.response.text();

    } else { // Si la intención es CONOCIMIENTO_GENERAL
      // Llamamos al Experto en el Club
      const today = new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
      const generalKnowledgePrompt = `
        **INSTRUCCIONES:** Eres 'FAN IA', un asistente experto en la Real Sociedad. Responde a la pregunta del usuario de forma directa y concisa usando tu conocimiento general. Si te preguntan por el próximo partido, busca el siguiente partido real en el calendario. Considera que la fecha de hoy es ${today}.
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
  console.log(`✅ ¡Motor Profesional Final arrancado! Escuchando en el puerto ${PORT}.`);
});
