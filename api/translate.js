export default async function handler(request, response) {
  console.log('[API START] A função /api/translate foi chamada.');

  if (request.method !== 'POST') {
    console.error('[API ERROR] Método não permitido:', request.method);
    return response.status(405).json({ message: 'Método não permitido.' });
  }

  try {
    const { textToTranslate, targetLang, isHtml } = request.body;
    console.log(`[API DATA] Recebido pedido para traduzir para: ${targetLang}`);

    const geminiApiKey = process.env.GEMINI_API_KEY;

    if (!geminiApiKey || geminiApiKey.trim() === '') {
      console.error('[API CONFIG ERROR] A variável de ambiente GEMINI_API_KEY não está configurada na Vercel ou está vazia.');
      return response.status(500).json({ message: 'Erro de configuração no servidor: Chave da API em falta.' });
    }
    
    console.log('[API INFO] Chave da API do Gemini encontrada. A enviar pedido para o Google...');
    const prompt = `Translate the following ${isHtml ? 'HTML content' : 'text'} to ${targetLang}. Preserve the HTML tags if they exist. Only return the translated text/HTML, nothing else, no explanations before or after:\n\n"${textToTranslate}"`;
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`;

    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    });

    console.log(`[API INFO] Resposta recebida do Gemini com status: ${geminiResponse.status}`);

    if (!geminiResponse.ok) {
      const errorBody = await geminiResponse.text();
      console.error('[API GEMINI ERROR] O Gemini API retornou um erro. Corpo do erro:', errorBody);
      throw new Error(`O Gemini API retornou um erro: ${geminiResponse.statusText}`);
    }

    const data = await geminiResponse.json();

    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts[0]) {
        console.error('[API GEMINI ERROR] Estrutura da resposta do Gemini é inválida:', JSON.stringify(data));
        throw new Error('Formato da resposta do Gemini API inesperado.');
    }

    const translatedText = data.candidates[0].content.parts[0].text;
    console.log('[API SUCCESS] Tradução bem-sucedida. A enviar resposta para o site.');
    
    response.status(200).json({ translatedText: translatedText });

  } catch (error) {
    console.error('[API CATCH ERROR] Ocorreu um erro inesperado na função de tradução:', error.message);
    response.status(500).json({ message: 'Ocorreu um erro interno no servidor durante a tradução.' });
  }
}
