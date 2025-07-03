const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { GoogleAuth } = require('google-auth-library');

// Inicializa o Firebase Admin de forma segura, uma única vez.
if (!global.firebaseAdminApp) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    global.firebaseAdminApp = initializeApp({
      credential: cert(serviceAccount),
    });
  } catch (e) {
    console.error('Firebase Admin Initialization Error:', e.stack);
  }
}

const db = getFirestore();

// Função de tradução em lote otimizada
async function translateTexts(texts, targetLanguage, sourceLanguage = 'pt') {
    if (targetLanguage === sourceLanguage || !texts || texts.length === 0) {
        return texts; // Retorna os originais se não precisar traduzir
    }
    try {
        const auth = new GoogleAuth({ scopes: 'https://www.googleapis.com/auth/cloud-platform' });
        const client = await auth.getClient();
        const projectId = await auth.getProjectId();
        const location = 'us-central1';
        const url = `https://translation.googleapis.com/v3/projects/${projectId}/locations/${location}:translateText`;

        const request = {
            parent: `projects/${projectId}/locations/${location}`,
            contents: texts,
            mimeType: 'text/html',
            sourceLanguageCode: sourceLanguage,
            targetLanguageCode: targetLanguage,
        };
        
        const { data } = await client.request({ url, method: 'POST', data });
        return data.translations.map(t => t.translatedText);
    } catch(e) {
        console.error("Google Translate API Error:", e.message);
        return texts; // Em caso de erro na API, retorna os textos originais para não quebrar o site
    }
}

// O Handler principal da API
module.exports = async (request, response) => {
  try {
    const { lang = 'pt' } = request.query;
    
    // Busca os posts e o layout em paralelo para máxima velocidade
    const [postsSnapshot, layoutDoc] = await Promise.all([
        db.collection('posts').orderBy('createdAt', 'desc').get(),
        db.collection('settings').doc('layout').get()
    ]);
    
    const posts = postsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const layout = layoutDoc.exists ? layoutDoc.data() : { sidebar: [], 'main-menu': [] };

    // Se o idioma não for português, traduz tudo em lote
    if (lang !== 'pt' && posts.length > 0) {
        // Coleta todos os textos de posts e gadgets
        const textsToTranslate = [];
        posts.forEach(post => {
            textsToTranslate.push(post.title || '');
            textsToTranslate.push((post.content || '').substring(0, 250)); // Resumo para traduzir
            textsToTranslate.push((post.tags && post.tags.length > 0) ? post.tags[0] : '');
        });
        (layout.sidebar || []).forEach(gadget => {
            textsToTranslate.push(gadget.title || '');
        });

        // Chama a tradução uma única vez para tudo
        const translatedTexts = await translateTexts(textsToTranslate, lang);
        
        // Remonta os posts com os dados traduzidos
        let i = 0;
        const translatedPosts = posts.map(post => ({
          ...post,
          title: translatedTexts[i++],
          content: translatedTexts[i++],
          tags: [translatedTexts[i++]]
        }));
        
        // Remonta os gadgets com dados traduzidos
        const translatedLayout = {
            ...layout,
            sidebar: (layout.sidebar || []).map(gadget => ({
                ...gadget,
                title: translatedTexts[i++]
            }))
        };
        
        return response.status(200).json({ posts: translatedPosts, layout: translatedLayout });
    }

    // Se for português, retorna os dados originais
    response.status(200).json({ posts, layout });

  } catch (error) {
    console.error("Get Content API Error: ", error.stack);
    response.status(500).json({ error: "Internal Server Error" });
  }
};
