
import { GoogleGenAI, Type } from "@google/genai";
import { MixingRecipe, Paint, UserSettings } from "../types";

// Initialize Default Gemini Client
const defaultGeminiAi = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_PROMPT = `
Actúa como un pintor de miniaturas profesional experto en teoría del color.
Tu objetivo es crear una receta de mezcla para igualar un color HEX específico.
Solo puedes usar las pinturas proporcionadas en el inventario.

IMPORTANTE: DEBES RESPONDER ÚNICAMENTE EN FORMATO JSON VÁLIDO.
No incluyas texto antes ni después del JSON (nada de markdown, nada de '''json).
`;

const buildUserPrompt = (targetHex: string, userInventory: Paint[]) => {
    const inventoryList = userInventory.map(p => `${p.brand} - ${p.name}`).join(', ');
    return `
    Color Objetivo HEX: ${targetHex}.
    
    Inventario disponible:
    [${inventoryList}]
    
    Genera un JSON con esta estructura exacta:
    {
      "resultColorHex": "código hex aproximado del resultado",
      "matchAccuracy": número 0-100,
      "instructions": "breve consejo de mezcla en español",
      "items": [
        { "paintName": "Nombre", "brand": "Marca", "drops": número }
      ]
    }
    `;
};

// OpenRouter Fetch Helper
const callOpenRouter = async (apiKey: string, model: string, prompt: string): Promise<string> => {
    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
                // "HTTP-Referer": "https://colormix-app.com", // Optional for OpenRouter rankings
                // "X-Title": "ColorMix App"
            },
            body: JSON.stringify({
                model: model,
                messages: [
                    { role: "system", content: SYSTEM_PROMPT },
                    { role: "user", content: prompt }
                ],
                // Attempt to force JSON mode if supported, otherwise rely on system prompt
                response_format: { type: "json_object" } 
            })
        });

        if (!response.ok) {
            const err = await response.json();
            const errorMessage = err.error?.message || `OpenRouter Error: ${response.statusText}`;
            
            // Catch specific privacy error
            if (errorMessage.includes("data policy") || errorMessage.includes("matching your data policy")) {
                throw new Error("ERROR DE PRIVACIDAD: Los modelos gratuitos requieren habilitar el registro de datos en OpenRouter. Revisa la Configuración.");
            }
            
            throw new Error(errorMessage);
        }

        const data = await response.json();
        return data.choices[0]?.message?.content || "";

    } catch (error: any) {
        console.error("OpenRouter API Error:", error);
        // If it was our custom error, rethrow it clean, otherwise generic
        if (error.message.includes("ERROR DE PRIVACIDAD")) {
             throw error;
        }
        throw new Error(error.message || "Error conectando con OpenRouter");
    }
};

// Gemini SDK Helper
const callGemini = async (model: string, userPrompt: string, customApiKey?: string): Promise<string> => {
    try {
        // Use custom client if user provided key, otherwise default
        const client = customApiKey ? new GoogleGenAI({ apiKey: customApiKey }) : defaultGeminiAi;

        const response = await client.models.generateContent({
            model: model, 
            contents: userPrompt,
            config: {
                systemInstruction: SYSTEM_PROMPT,
                responseMimeType: "application/json",
                responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                    resultColorHex: { type: Type.STRING, description: "Hex code of the resulting mix" },
                    matchAccuracy: { type: Type.NUMBER, description: "Percentage of accuracy 0-100" },
                    instructions: { type: Type.STRING, description: "Short mixing advice in Spanish" },
                    items: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          paintName: { type: Type.STRING },
                          brand: { type: Type.STRING },
                          drops: { type: Type.NUMBER, description: "Number of drops" },
                        },
                        required: ["paintName", "brand", "drops"]
                      }
                    }
                  },
                  required: ["resultColorHex", "matchAccuracy", "instructions", "items"]
                }
            }
        });
        
        return response.text || "";
    } catch (error: any) {
        console.error("Gemini API Error:", error);
        throw new Error(error.message || "Error conectando con Gemini");
    }
};

export const generatePaintRecipe = async (
  targetHex: string,
  userInventory: Paint[],
  settings?: UserSettings
): Promise<MixingRecipe> => {
  
  const provider = settings?.provider || 'gemini';
  const modelId = settings?.modelId || 'gemini-2.5-flash';
  const userPrompt = buildUserPrompt(targetHex, userInventory);
  
  let jsonText = "";

  if (provider === 'openrouter') {
      if (!settings?.openRouterApiKey) {
          throw new Error("Falta la API Key de OpenRouter. Configúrala en Ajustes.");
      }
      jsonText = await callOpenRouter(settings.openRouterApiKey, modelId, userPrompt);
  } else {
      // Default to Gemini (pass custom key if it exists)
      jsonText = await callGemini(modelId, userPrompt, settings?.geminiApiKey);
  }

  try {
      // Clean markdown if present (OpenRouter models sometimes add ```json ... ``` despite instructions)
      const cleanJson = jsonText.replace(/```json/g, '').replace(/```/g, '').trim();
      const data = JSON.parse(cleanJson);

      return {
          targetColorHex: targetHex,
          ...data
      } as MixingRecipe;

  } catch (parseError) {
      console.error("Failed to parse JSON response:", jsonText);
      throw new Error("La IA generó una respuesta inválida. Intenta de nuevo o cambia de modelo.");
  }
};
