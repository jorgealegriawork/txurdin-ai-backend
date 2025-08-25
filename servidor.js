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

// --- Ruta de Chat con Lógica Profesional Definitiva ---
app.post('/chat', async (req, res) => {
  try {
    const userMessage = req.body.message;
    const currentUserId = 101010; 

    if (!userMessage) {
      return res.status(400).json({ error: 'No se ha proporcionado ningún mensaje.' });
    }

    // --- Recopilamos todo el contexto de la base de datos ---
    const { data: memberData } = await supabase.from('socios').select('*').eq('id_socio', currentUserId).single();
    const { data: ticketData } = await supabase.from('asientos_liberados').select('*');
    const { data: merchData } = await supabase.from('productos').select('*');
    const { data: partidosData } = await supabase.from('partidos').select('*');

    // --- El Prompt Maestro Definitivo y Estricto ---
    const masterPrompt = `
      **ROL Y OBJETIVO:**
      Eres 'FAN IA', un asistente de consulta de datos para un club de fútbol. Tu única función es responder a la pregunta del usuario basándote ESTRICTA Y EXCLUSIVAMENTE en el **CONTEXTO DE DATOS** en formato JSON que te proporciono.

      **REGLAS DE ORO (OBLIGATORIAS):**
      1. **FUENTE ÚNICA DE VERDAD:** El **CONTEXTO DE DATOS** es tu única fuente de información. No puedes usar tu conocimiento general. No puedes inventar datos.
      2. **RESPUESTA DIRECTA:** Responde de forma concisa y directa a la pregunta del usuario.
         - Si te preguntan por "mi numero de socio", busca el campo "id_socio" en DATOS_SOCIO.
         - Si te preguntan por el precio de una camiseta, busca en PRODUCTOS_TIENDA.
         - Si te preguntan por entradas, busca en ENTRADAS_DISPONIBLES.
      3. **MANEJO DE ERRORES:** Si la respuesta a la pregunta del usuario no se encuentra en el CONTEXTO DE DATOS, DEBES responder única y exclusivamente con la frase: "No dispongo de esa información en este momento."

      ---
      **CONTEXTO DE DATOS (Fuente de Verdad):**

      **DATOS_SOCIO (El usuario que pregunta):**
      ${JSON.stringify(memberData)}

      **ENTRADAS_DISPONIBLES (Asientos que otros socios venden):**
      ${JSON.stringify(ticketData)}

      **PRODUCTOS_TIENDA:**
      ${JSON.stringify(merchData)}

      **PARTIDOS_PROGRAMADOS:**
      ${JSON.stringify(partidosData)}
      ---

      **PREGUNTA DEL USUARIO A RESPONDER:**
      "${userMessage}"
    `;

    const result = await model.generateContent(masterPrompt);
    const response = await result.response;
    const finalResponseText = response.text();

    res.json({ reply: finalResponseText });

  } catch (error) {
    console.error('Error en la ruta /chat:', error);
    res.status(500).json({ error: 'Ha ocurrido un error en el servidor.' });
  }
});
