const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const { startServer } = require("../scripts/server");

const ROOT = path.resolve(__dirname, "..");
const PROFILE_DIR = path.join(ROOT, ".tmp-chrome-profile");
const DEBUG_PORT = Number(process.env.CHROME_DEBUG_PORT || 9225);
const PORT = Number(process.env.PORT || 5174);
const HEADLESS = process.env.HEADLESS === "1";
const HEADLESS_ARG = process.env.CHROME_HEADLESS_ARG || "--headless=new";
const DB_NAME = "rabachino-degustacao";

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
].filter(Boolean);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function findChrome() {
  const chrome = CHROME_CANDIDATES.find((candidate) => fs.existsSync(candidate));
  if (!chrome) {
    throw new Error("Chrome nao encontrado. Defina CHROME_PATH com o caminho do chrome.exe.");
  }
  return chrome;
}

function removeWorkspacePath(target) {
  const resolved = path.resolve(target);
  if (!resolved.startsWith(ROOT)) {
    throw new Error(`Recusando remover caminho fora do projeto: ${resolved}`);
  }
  fs.rmSync(resolved, { recursive: true, force: true });
}

async function removeWorkspacePathWithRetry(target) {
  let lastError;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      removeWorkspacePath(target);
      return;
    } catch (error) {
      lastError = error;
      await sleep(250);
    }
  }
  throw lastError;
}

async function stopProcess(processHandle) {
  if (!processHandle || processHandle.exitCode !== null) return;
  await new Promise((resolve) => {
    processHandle.once("exit", resolve);
    processHandle.kill();
    setTimeout(resolve, 2000);
  });
}

async function waitForJson(url, { timeout = 8000 } = {}) {
  const started = Date.now();
  let lastError;
  while (Date.now() - started < timeout) {
    try {
      const response = await fetch(url);
      if (response.ok) return response.json();
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await sleep(150);
  }
  throw new Error(`Nao foi possivel acessar ${url}: ${lastError?.message || "timeout"}`);
}

class CdpClient {
  constructor(webSocketUrl) {
    this.webSocketUrl = webSocketUrl;
    this.id = 0;
    this.pending = new Map();
    this.listeners = new Map();
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.socket = new WebSocket(this.webSocketUrl);
      this.socket.addEventListener("open", resolve, { once: true });
      this.socket.addEventListener("error", reject, { once: true });
      this.socket.addEventListener("message", (event) => this.handleMessage(event));
      this.socket.addEventListener("close", (event) => {
        this.pending.forEach(({ reject: rejectPending }) => {
          rejectPending(new Error(`Conexao CDP encerrada. code=${event.code} reason=${event.reason || "(vazio)"}`));
        });
        this.pending.clear();
      });
    });
  }

  handleMessage(event) {
    const message = JSON.parse(event.data);
    if (message.id && this.pending.has(message.id)) {
      const { resolve, reject } = this.pending.get(message.id);
      this.pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result);
      return;
    }
    const callbacks = this.listeners.get(message.method);
    if (callbacks) callbacks.forEach((callback) => callback(message.params));
  }

  send(method, params = {}) {
    const id = ++this.id;
    this.socket.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
    });
  }

  once(method) {
    return new Promise((resolve) => {
      const callback = (params) => {
        const callbacks = this.listeners.get(method);
        callbacks.delete(callback);
        resolve(params);
      };
      if (!this.listeners.has(method)) this.listeners.set(method, new Set());
      this.listeners.get(method).add(callback);
    });
  }

  close() {
    this.socket.close();
  }
}

async function launchChrome(origin) {
  removeWorkspacePath(PROFILE_DIR);
  fs.mkdirSync(PROFILE_DIR, { recursive: true });

  const args = [
    `--remote-debugging-port=${DEBUG_PORT}`,
    "--disable-gpu",
    "--disable-gpu-compositing",
    "--disable-dev-shm-usage",
    "--disable-features=DawnGraphite,UseSkiaRenderer,Vulkan",
    "--use-angle=swiftshader",
    "--use-gl=swiftshader",
    "--no-first-run",
    "--remote-allow-origins=*",
    `--user-data-dir=${PROFILE_DIR}`,
    origin,
  ];
  if (HEADLESS) args.unshift(HEADLESS_ARG);

  const chrome = spawn(findChrome(), args, { stdio: ["ignore", "pipe", "pipe"] });
  let stderr = "";
  chrome.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  try {
    const tabs = await waitForJson(`http://127.0.0.1:${DEBUG_PORT}/json`, { timeout: 10000 });
    const tab = tabs.find((item) => item.type === "page" && item.webSocketDebuggerUrl);
    assert(tab, "Chrome abriu, mas nenhuma aba CDP foi encontrada.");
    return {
      chrome,
      tab,
      readStderr: () => stderr.trim(),
    };
  } catch (error) {
    chrome.kill();
    throw new Error(`${error.message}\nChrome stderr:\n${stderr.trim() || "(vazio)"}`);
  }
}

async function evaluate(client, expression) {
  const result = await client.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description || "Erro ao avaliar script no navegador.");
  }
  return result.result.value;
}

async function waitFor(client, expression, message, timeout = 5000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (await evaluate(client, expression)) return;
    await sleep(100);
  }
  throw new Error(message);
}

async function resetDatabase(client) {
  const blankLoad = client.once("Page.loadEventFired");
  await client.send("Page.navigate", { url: `http://127.0.0.1:${PORT}/__smoke_blank` });
  await blankLoad;

  await evaluate(client, `
    new Promise((resolve) => {
      const request = indexedDB.deleteDatabase(${JSON.stringify(DB_NAME)});
      request.onsuccess = () => resolve(true);
      request.onerror = () => resolve(false);
      request.onblocked = () => setTimeout(() => resolve(false), 500);
    })
  `);
  const load = client.once("Page.loadEventFired");
  await client.send("Page.navigate", { url: `http://127.0.0.1:${PORT}/` });
  await load;
}

async function runBrowserSmoke(client) {
  await client.send("Page.enable");
  await client.send("Runtime.enable");
  await waitFor(client, "document.readyState === 'complete'", "Pagina nao terminou de carregar.");
  await resetDatabase(client);
  await waitFor(client, "document.querySelector('#sheet-list')?.getAttribute('aria-busy') === 'false'", "Lista inicial nao carregou.");

  await evaluate(client, `
    (() => {
      document.querySelector('#new-sheet').click();
      return true;
    })()
  `);
  await waitFor(client, "!document.querySelector('#form-view').classList.contains('hidden')", "Formulario nao abriu.");

  const initialSparkling = await evaluate(client, `
    ({
      checked: document.querySelector('#sparkling').checked,
      perlageHidden: document.querySelector('#perlage-group').classList.contains('hidden')
    })
  `);
  assert(initialSparkling.checked === false, "Espumante deveria iniciar como Nao.");
  assert(initialSparkling.perlageHidden === true, "Perlage deveria iniciar oculto.");

  await evaluate(client, `
    (() => {
      const setValue = (selector, value, eventName = 'input') => {
        const field = document.querySelector(selector);
        field.value = value;
        field.dispatchEvent(new Event(eventName, { bubbles: true }));
      };
      setValue('#wine', 'Smoke Espumante');
      setValue('#producer', 'Teste Local');
      setValue('#wine-type', 'Branco', 'change');
      setValue('#vintage', 'none', 'change');
      document.querySelector('#sparkling').click();
      document.querySelector('#perlage-continuo-3').checked = true;
      document.querySelector('#perlage-continuo-3').dispatchEvent(new Event('change', { bubbles: true }));
      document.querySelector('#tasting-form').requestSubmit();
      return true;
    })()
  `);

  await waitFor(client, "!document.querySelector('#detail-view').classList.contains('hidden')", "Detalhe nao abriu apos salvar.");
  const savedDetail = await evaluate(client, `
    ({
      title: document.querySelector('#detail-title')?.textContent,
      badge: Boolean(document.querySelector('#detail-content .sparkling-badge')),
      detailText: document.querySelector('#detail-content')?.textContent
    })
  `);
  assert(savedDetail.title === "Smoke Espumante", "Ficha salva nao abriu no detalhe.");
  assert(savedDetail.badge, "Detalhe da ficha espumante nao exibiu o icone.");
  assert(savedDetail.detailText.includes("Espumante") && savedDetail.detailText.includes("Sim"), "Detalhe nao exibiu Espumante = Sim.");
  assert(savedDetail.detailText.includes("3/5"), "Perlage salvo nao apareceu no detalhe.");

  const load = client.once("Page.loadEventFired");
  await client.send("Page.reload", { ignoreCache: true });
  await load;
  await waitFor(client, "document.querySelector('#sheet-list')?.getAttribute('aria-busy') === 'false'", "Lista nao carregou apos recarregar.");

  const reloaded = await evaluate(client, `
    ({
      hasCard: document.querySelector('#sheet-list')?.textContent.includes('Smoke Espumante'),
      badge: Boolean(document.querySelector('#sheet-list .sparkling-badge'))
    })
  `);
  assert(reloaded.hasCard, "Ficha nao persistiu apos recarregar.");
  assert(reloaded.badge, "Cartao da ficha espumante nao exibiu o icone.");

  await resetDatabase(client);
}

async function main() {
  let server;
  let chrome;
  let client;
  let readChromeStderr = () => "";
  let step = "inicializando";
  try {
    step = "subindo servidor";
    const started = await startServer({ port: PORT, root: ROOT });
    server = started.server;
    step = "abrindo Chrome";
    const { tab, chrome: chromeProcess, readStderr } = await launchChrome(started.origin);
    chrome = chromeProcess;
    readChromeStderr = readStderr;
    step = "conectando CDP";
    client = new CdpClient(tab.webSocketDebuggerUrl);
    await client.connect();
    step = "executando smoke";
    await runBrowserSmoke(client);
    console.log("SMOKE_PASS Chrome: ficha espumante criada, persistida e validada.");
  } catch (error) {
    const chromeStderr = readChromeStderr();
    const suffix = chromeStderr ? `\nChrome stderr:\n${chromeStderr}` : "";
    throw new Error(`Falha no smoke durante: ${step}\n${error.message}${suffix}`);
  } finally {
    client?.close();
    await stopProcess(chrome);
    server?.close();
    await removeWorkspacePathWithRetry(PROFILE_DIR);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
