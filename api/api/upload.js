import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(request) {
  if (request.method !== 'POST') {
    return new Response('Método não permitido', { status: 405 });
  }

  const filename = request.headers.get('x-vercel-filename') || 'file.txt';
  const contentType = request.headers.get('content-type') || 'text/plain';
  const file = request.body;

  if (!file) {
    return new Response('Nenhum arquivo para upload', { status: 400 });
  }

  try {
    const blob = await put(filename, file, {
      contentType,
      access: 'public',
    });

    return NextResponse.json(blob);

  } catch (error) {
    console.error('Erro no upload do Vercel Blob:', error);
    return new Response(JSON.stringify({ message: 'Erro ao fazer upload do arquivo.', error: error.message }), { status: 500 });
  }
}
