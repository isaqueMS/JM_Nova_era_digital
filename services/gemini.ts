
import { GoogleGenAI } from "@google/genai";

export const getAIResponse = async (userPrompt: string, customerName: string) => {
  try {
    // Fix: Always initialize GoogleGenAI inside the function scope to ensure current API key is used, following guidelines
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Fix: Select gemini-3-pro-preview as it is better suited for complex technical reasoning and troubleshooting tasks
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: userPrompt,
      config: {
        systemInstruction: `Você é o "Mestre Mik", o assistente técnico virtual do provedor JM Nova Era Digital. 
        Seu tom deve ser industrial, profissional, direto e técnico.
        O cliente atual se chama ${customerName}.
        Ajude-o com problemas de conexão, configuração de roteadores, explicações sobre IPV4/IPV6 e suporte financeiro.
        Sempre use terminologias de rede precisas.`,
        temperature: 0.7,
      },
    });

    // Fix: Ensure property .text is used directly (as per guidelines, not a function)
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "ALERTA: Falha no processador neural. Tente novamente em instantes.";
  }
};
