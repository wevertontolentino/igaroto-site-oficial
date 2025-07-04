export default async function handler(request, response) {
  console.log('[API START] A função /api/translate foi chamada.');

  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Método não permitido.' });
  }

  try {
    const { textToTranslate, targetLang, isHtml } = request.body;
    const geminiApiKey = process.env.GEMINI_API_KEY;

    if (!geminiApiKey || geminiApiKey.trim() === '') {
      console.error('[API CONFIG ERROR] A variável de ambiente GEMINI_API_KEY não está configurada na Vercel ou está vazia.');
      return response.status(500).json({ message: 'Erro de configuração no servidor: Chave da API em falta.' });
    }
    
    const prompt = `Translate the following ${isHtml ? 'HTML content' : 'text'} to ${targetLang}. Preserve the HTML tags if they exist. Only return the translated text/HTML, nothing else, no explanations before or after:\n\n"${textToTranslate}"`;
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`;

    console.log('[API INFO] A enviar pedido para o Google...');
    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    });

    console.log(`[API INFO] Resposta recebida do Gemini com status: ${geminiResponse.status}`);

    // Lê a resposta como texto para evitar erros de JSON e para podermos ver o que é
    const responseBodyText = await geminiResponse.text();
    console.log('[API INFO] Corpo da resposta recebida do Gemini:', responseBodyText);

    if (!geminiResponse.ok) {
      console.error('[API GEMINI ERROR] O Gemini API retornou um erro.', {
          status: geminiResponse.status,
          body: responseBodyText
      });
      return response.status(geminiResponse.status).json({ message: `Erro do Google: ${responseBodyText}` });
    }
    
    // Agora que sabemos que a resposta está OK, podemos analisá-la com segurança
    const data = JSON.parse(responseBodyText);

    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts[0] || !data.candidates[0].content.parts[0].text) {
        console.error('[API GEMINI ERROR] Estrutura da resposta do Gemini é inválida:', responseBodyText);
        throw new Error('Formato da resposta do Gemini API inesperado.');
    }

    const translatedText = data.candidates[0].content.parts[0].text;
    console.log('[API SUCCESS] Tradução bem-sucedida. A enviar resposta para o site.');
    
    response.status(200).json({ translatedText: translatedText });

  } catch (error) {
    console.error('[API CATCH ERROR] Ocorreu um erro inesperado na função de tradução:', error.name, error.message);
    response.status(500).json({ message: 'Ocorreu um erro interno no servidor durante a tradução.' });
  }
}
