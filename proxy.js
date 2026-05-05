// Proxy estable con reconexión automática
// Sirve frontend (Vite) y backend (Express) juntos
const http = require('http');

const FRONTEND_PORT = 5173;
const BACKEND_PORT = 5000;
const PROXY_PORT = 8080;

// Timeouts para evitar conexiones colgadas
const AGENT = new http.Agent({ keepAlive: true, maxSockets: 100 });

const server = http.createServer((req, res) => {
  const isApi = req.url.startsWith('/api/');
  const targetPort = isApi ? BACKEND_PORT : FRONTEND_PORT;
  const targetPath = req.url;

  const options = {
    hostname: '127.0.0.1',
    port: targetPort,
    path: targetPath,
    method: req.method,
    headers: { ...req.headers, connection: 'keep-alive' },
    agent: AGENT,
    timeout: 30000,
  };

  const proxyReq = http.request(options, (proxyRes) => {
    const headers = { ...proxyRes.headers, 'access-control-allow-origin': '*' };
    res.writeHead(proxyRes.statusCode, headers);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error(`[Proxy] Error al conectar con puerto ${targetPort}:`, err.message);
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Servicio no disponible', detail: err.message }));
  });

  proxyReq.on('timeout', () => {
    proxyReq.destroy();
    if (!res.headersSent) {
      res.writeHead(504, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Timeout del servicio' }));
    }
  });

  req.pipe(proxyReq);
});

// WebSocket para HMR de Vite
server.on('upgrade', (req, socket, head) => {
  const options = {
    hostname: '127.0.0.1',
    port: FRONTEND_PORT,
    path: req.url,
    headers: req.headers,
  };
  const proxyReq = http.request(options);
  proxyReq.on('upgrade', (proxyRes, proxySocket) => {
    socket.write('HTTP/1.1 101 Switching Protocols\r\n\r\n');
    proxySocket.pipe(socket);
    socket.pipe(proxySocket);
  });
  proxyReq.on('error', () => socket.destroy());
  proxyReq.end();
});

server.listen(PROXY_PORT, () => {
  console.log(`🌐 Proxy estable en http://localhost:${PROXY_PORT}`);
  console.log(`   Frontend: http://localhost:${FRONTEND_PORT}`);
  console.log(`   Backend:  http://localhost:${BACKEND_PORT}`);
});

// Verificación periódica de que los servicios responden
setInterval(() => {
  const bkReq = http.get(`http://127.0.0.1:${BACKEND_PORT}/api/health`, (res) => {
    res.resume();
  });
  bkReq.on('error', () => console.error(`[Proxy] ⚠️ Backend en ${BACKEND_PORT} no responde`));
  bkReq.setTimeout(3000, () => { bkReq.destroy(); });
  
  const feReq = http.get(`http://127.0.0.1:${FRONTEND_PORT}/`, (res) => {
    res.resume();
  });
  feReq.on('error', () => console.error(`[Proxy] ⚠️ Frontend en ${FRONTEND_PORT} no responde`));
  feReq.setTimeout(3000, () => { feReq.destroy(); });
}, 30000); // Cada 30 segundos
