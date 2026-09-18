// src/controllers/eventosController.js

let clientes = [];

const iniciarStream = (req, res) => {
  // 1. Liberação explícita de CORS para o EventSource
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // 2. Configuração rigorosa dos headers exigidos pelo SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Envia um evento inicial apenas para o front confirmar que conectou
  res.write(`data: ${JSON.stringify({ evento: 'CONECTADO', mensagem: 'Conexão em tempo real estabelecida.' })}\n\n`);

  // Adiciona a conexão ativa no array
  clientes.push(res);

  // Remove da memória se fechar a aba
  req.on('close', () => {
    clientes = clientes.filter(cliente => cliente !== res);
  });
};

const emitirEvento = (evento, payload) => {
  clientes.forEach(cliente => {
    cliente.write(`data: ${JSON.stringify({ evento, ...payload })}\n\n`);
  });
};

setInterval(() => {
  clientes.forEach(cliente => {
    // No protocolo SSE, uma linha começando com dois pontos (:) é um comentário. O front ignora.
    cliente.write(': keepalive\n\n');
  });
}, 20000);

module.exports = {
  iniciarStream,
  emitirEvento
};