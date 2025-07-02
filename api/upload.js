const { put } = require('@vercel/blob');

module.exports = async (request, response) => {
  // Garante que o método da requisição é POST
  if (request.method !== 'POST') {
    return response.status(405).send('Método Não Permitido');
  }

  const filename = request.headers['x-vercel-filename'] || 'file.txt';
  const contentType = request.headers['content-type'] || 'text/plain';

  try {
    // Faz o upload do corpo da requisição (a imagem) para o Vercel Blob
    const blob = await put(filename, request.body, {
      access: 'public',
      contentType: contentType,
    });

    // Se o upload der certo, responde com o status 200 (OK) e os dados do arquivo
    response.status(200).json(blob);
    
  } catch (error) {
    console.error('ERRO NO UPLOAD DO VERCEL BLOB:', error);
    // Se der erro, responde com o status 500 (Erro do Servidor) e uma mensagem
    response.status(500).json({ 
      message: 'Ocorreu um erro no servidor durante o upload.', 
      error: error.message 
    });
  }
};
