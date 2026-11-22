const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const host = '127.0.0.1';
const port = 8768;
const origin = `http://${host}:${port}`;
const workspaceHeader = 'x-math-teaching-studio';
const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};
const shouldOpen = process.argv.includes('--open');

function openBrowser() {
  if (!shouldOpen || process.platform !== 'win32') return;
  const opener = spawn('cmd.exe', ['/d', '/c', `start "" "${origin}"`], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
    windowsVerbatimArguments: true,
  });
  opener.unref();
}

function serveWorkspace(request, response) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, origin).pathname);
  } catch {
    response.writeHead(400).end();
    return;
  }
  const asset = pathname === '/' ? 'index.html' : pathname.slice(1);
  const type = contentTypes[path.extname(asset)];
  if (!type || !/^[a-zA-Z0-9][a-zA-Z0-9.-]*$/.test(asset)) {
    response.writeHead(404).end();
    return;
  }
  fs.readFile(path.join(__dirname, asset), (error, contents) => {
    if (error) {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, {
      'Content-Type': type,
      'Content-Length': contents.length,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      [workspaceHeader]: '1',
    });
    response.end(request.method === 'HEAD' ? undefined : contents);
  });
}

function startPreview(additionalRoute = () => false) {
  const server = http.createServer((request, response) => {
    if (request.headers.host !== new URL(origin).host) {
      response.writeHead(421).end();
      return;
    }
    if (!additionalRoute(request, response)) serveWorkspace(request, response);
  });

  server.on('error', error => {
    if (error.code !== 'EADDRINUSE') {
      console.error(error.message);
      process.exitCode = 1;
      return;
    }
    const check = http.get(origin, { method: 'HEAD', timeout: 1500 }, response => {
      response.resume();
      if (response.headers[workspaceHeader] === '1') openBrowser();
      else {
        console.error(`端口 ${port} 已被其他程序使用。`);
        process.exitCode = 1;
      }
    });
    check.on('timeout', () => check.destroy());
    check.on('error', () => { process.exitCode = 1; });
  });

  server.listen(port, host, () => {
    console.log(`数学教学工作台已启动 ${origin}`);
    openBrowser();
  });
  return server;
}

module.exports = { startPreview, origin };
if (require.main === module) startPreview();
