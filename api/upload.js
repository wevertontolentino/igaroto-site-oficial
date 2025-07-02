const { put } = require('@vercel/blob');

// ESSA É A PARTE CRUCIAL QUE ESTAVA FALTANDO.
// Ela diz à Vercel para não mexer no corpo da requisição.
export const config = {
  api: {
    bodyParser: false,
  },
};

// O resto do código continua como estava, mas agora receberá o arquivo corretamente.
module.exports = async (request, response) => {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  const filename = request.headers['x-vercel-filename'] || 'fallback.txt';

  try {
    // O objeto 'request' em si é o stream do arquivo quando bodyParser é false
    const blob = await put(filename, request, {
      access: 'public',
    });
    
    // Responde com sucesso e os dados do blob
    return response.status(200).json(blob);

  } catch (error) {
    console.error('ERRO NO UPLOAD DO VERCEL BLOB:', error.message);
    return response.status(500).json({ 
      message: `Ocorreu um erro no servidor: ${error.message}`
    });
  }
};
