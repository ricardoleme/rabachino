const http = require("http");
const fs = require("fs");
const path = require("path");

const DEFAULT_PORT = 5174;
const HOST = "127.0.0.1";

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json",
  ".woff2": "font/woff2",
};

function parsePort(value = process.env.PORT) {
  const port = Number(value || DEFAULT_PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Porta invalida: ${value}`);
  }
  return port;
}

function send(response, status, body, headers = {}) {
  response.writeHead(status, headers);
  response.end(body);
}

function resolveRequest(root, requestUrl) {
  const url = new URL(requestUrl, `http://${HOST}`);
  const pathname = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  const file = path.resolve(root, `.${pathname}`);
  if (!file.startsWith(root)) return null;
  return file;
}

function createStaticServer({ root = process.cwd() } = {}) {
  const safeRoot = path.resolve(root);

  return http.createServer((request, response) => {
    if (request.method !== "GET" && request.method !== "HEAD") {
      send(response, 405, "Metodo nao permitido", { Allow: "GET, HEAD" });
      return;
    }

    const file = resolveRequest(safeRoot, request.url);
    if (!file) {
      send(response, 403, "Acesso negado");
      return;
    }

    fs.readFile(file, (error, data) => {
      if (error) {
        send(response, 404, "Arquivo nao encontrado");
        return;
      }

      const headers = {
        "Cache-Control": "no-store",
        "Content-Type": MIME_TYPES[path.extname(file)] || "application/octet-stream",
      };
      response.writeHead(200, headers);
      if (request.method === "HEAD") response.end();
      else response.end(data);
    });
  });
}

function startServer({ port = parsePort(), root = process.cwd() } = {}) {
  const server = createStaticServer({ root });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, HOST, () => {
      server.off("error", reject);
      resolve({ server, origin: `http://${HOST}:${port}` });
    });
  });
}

if (require.main === module) {
  startServer()
    .then(({ origin }) => {
      console.log(`Rabachino servido em ${origin}`);
    })
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}

module.exports = { createStaticServer, startServer };
