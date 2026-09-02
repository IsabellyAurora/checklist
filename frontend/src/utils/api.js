export async function fetchWithAuth(url, options = {}) {
  // Pega o token salvo no login
  let token = localStorage.getItem('accessToken');

  // 1. Pega os headers que já vieram nas opções
  const headers = {
    ...options.headers,
  };

  // 2. A MÁGICA PARA O UPLOAD DE IMAGEM FUNCIONAR:
  // Se o corpo da requisição NÃO for um arquivo (FormData), definimos como JSON.
  // Mas se for FormData, deixamos sem Content-Type para o navegador criar o boundary automático!
  if (options.body && options.body instanceof FormData) {
    delete headers['Content-Type']; 
  } else {
    // Se não for FormData, garante que é JSON (caso não tenham passado outro)
    if (!headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
  }

  // Se o token existir, injeta no header
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Monta as configurações da requisição (Passos 1 e 3)
  const config = {
    ...options,
    credentials: 'include', // Obrigatório para enviar/receber o Cookie do Refresh Token
    headers: headers // Usa os headers que preparamos inteligentemente ali em cima
  };

  // Faz a requisição original
  let response = await fetch(url, config);

  // Passo 4: O Interceptor (Se o Access Token expirou)
  if (response.status === 401) {
    try {
      // Tenta renovar usando o Cookie HttpOnly
      const refreshResponse = await fetch('/api/refresh-token', {
        method: 'POST',
        credentials: 'include' 
      });

      if (refreshResponse.ok) {
        const json = await refreshResponse.json();
        
        // Atualiza o novo token (Confirme com seu colega se a rota devolve dentro de .data)
        token = json.data ? json.data.accessToken : json.accessToken;
        localStorage.setItem('accessToken', token);

        // Refaz a requisição original que havia falhado com o novo token
        config.headers['Authorization'] = `Bearer ${token}`;
        response = await fetch(url, config);
      } else {
        // Se o refresh falhar (passou de 7 dias ou cookie inválido), força logout
        forcarLogout();
      }
    } catch (erro) {
      forcarLogout();
    }
  }

  return response;
}

function forcarLogout() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('usuarioLogado');
  window.location.href = '/'; // Joga para a tela de login
}