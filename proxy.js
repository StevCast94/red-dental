// Proxy simple que sirve frontend y backend juntos
// Usa el Vite dev server para frontend y reenvía /api/* al backend
const http = require('http');

const FRONTEND_PORT = 5173;
const BACKEND_PORT = 5000;
const PROXY_PORT = 8080;

const server = http.createServer((req, res) => {
  const targetPort = req.url.startsWith('/api/') ? BACKEND_PORT : FRONTEND_PORT;
  const targetHost = req.url.startsWith('/api/') ? '127.0.0.1' : '127.0.0.1';
  const targetPath = req.url;

  const options = {
    hostname: targetHost,
    port: targetPort,
    path: targetPath,
    method: req.method,
    headers: { ...req.headers },
  };

  // Para WebSocket de Vite HMR
  if (req.headers.upgrade === 'websocket') {
    options.headers.connection = 'Upgrade';
    options.headers.upgrade = 'websocket';
  }

  const proxyReq = http.request(options, (proxyRes) => {
    // CORS
    res.writeHead(proxyRes.statusCode, {
      ...proxyRes.headers,
      'access-control-allow-origin': '*',
    });
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    res.writeHead(502);
    res.end('Proxy Error: ' + err.message);
  });

  req.pipe(proxyReq);
});

server.on('upgrade', (req, socket, head) => {
  const options = {
    hostname: '127.0.0.1',
    port: FRONTEND_PORT,
    path: req.url,
    headers: req.headers,
  };
  const proxyReq = http.request(options);
  proxyReq.on('upgrade', (proxyRes, proxySocket, proxyHead) => {
    socket.write('HTTP/1.1 101 Switching Protocols\r\n\r\n');
    proxySocket.pipe(socket);
    socket.pipe(proxySocket);
  });
  proxyReq.on('error', () => socket.destroy());
  proxyReq.end();
});

server.listen(PROXY_PORT, () => {
  console.log(`🌐 Proxy escuchando en http://localhost:${PROXY_PORT}`);
  console.log(`   Frontend (Vite): http://localhost:${FRONTEND_PORT}`);
  console.log(`   Backend (API):   http://localhost:${BACKEND_PORT}/api`);
});
