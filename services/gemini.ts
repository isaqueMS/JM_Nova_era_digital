
import { GoogleGenAI } from "@google/genai";

export const getAIResponse = async (userPrompt: string, customerName: string) => {
  try {
    // Fix: Use EXPO_PUBLIC_ prefix for environment variables in Expo
    const ai = new GoogleGenAI({ apiKey: process.env.EXPO_PUBLIC_GEMINI_API_KEY });

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
