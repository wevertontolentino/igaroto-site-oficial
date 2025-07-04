export default async function handler(request, response) {
  // Apenas aceita pedidos do tipo POST
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Método não permitido.' });
  }

  try {
    const { textToTranslate, targetLang, isHtml } = request.body;
    const geminiApiKey = process.env.GEMINI_API_KEY;

    // Verifica se a chave da API está configurada no servidor (Vercel)
    if (!geminiApiKey || geminiApiKey.trim() === '') {
      return response.status(500).json({ message: 'Erro de configuração no servidor: Chave da API em falta.' });
    }
    
    // Prepara o pedido para o Google
    const prompt = `Translate the following ${isHtml ? 'HTML content' : 'text'} to ${targetLang}. Preserve the HTML tags if they exist. Only return the translated text/HTML, nothing else, no explanations before or after:\n\n"${textToTranslate}"`;
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`;

    // Envia o pedido para o Google
    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    });

    const responseBodyText = await geminiResponse.text();

    // Se o Google retornar um erro, envia essa mensagem de erro para o site
    if (!geminiResponse.ok) {
        return response.status(geminiResponse.status).json({ message: `Erro retornado pelo Google: ${responseBodyText}` });
    }
    
    // Analisa a resposta bem-sucedida
    const data = JSON.parse(responseBodyText);

    // Verifica se a resposta tem o formato esperado
    if (!data.candidates || !data.candidates[0]?.content?.parts[0]?.text) {
        throw new Error('Formato da resposta do Gemini API inesperado.');
    }

    const translatedText = data.candidates[0].content.parts[0].text;
    
    // Envia o texto traduzido de volta para o site
    response.status(200).json({ translatedText: translatedText });

  } catch (error) {
    // Em caso de um erro inesperado no nosso código, regista-o
    console.error('[API CATCH ERROR]', error.message);
    response.status(500).json({ message: 'Ocorreu um erro interno inesperado no servidor.' });
  }
}
