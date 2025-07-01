export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method not allowed' });
  }

  const { textToTranslate, targetLang, isHtml } = request.body;
  const geminiApiKey = process.env.GEMINI_API_KEY;

  const prompt = `Translate the following ${isHtml ? 'HTML content' : 'text'} to ${targetLang}. Preserve the HTML tags if they exist. Only return the translated text/HTML, nothing else, no explanations before or after:\n\n"${textToTranslate}"`;
  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`;

  try {
    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    });

    if (!geminiResponse.ok) {
      const errorBody = await geminiResponse.text();
      console.error('Gemini API Error:', errorBody);
      throw new Error('Failed to fetch from Gemini API');
    }

    const data = await geminiResponse.json();
    const translatedText = data.candidates[0].content.parts[0].text;

    response.status(200).json({ translatedText: translatedText });
  } catch (error) {
    console.error(error);
    response.status(500).json({ message: 'Error translating text.' });
  }
}
