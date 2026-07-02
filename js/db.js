const DB_NAME = "rabachino-degustacao";
const DB_VERSION = 1;
const STORE_NAME = "fichas";

let connectionPromise;

function requestAsPromise(request) {
  return new Promise((resolve, reject) => {
    request.addEventListener("success", () => resolve(request.result), { once: true });
    request.addEventListener("error", () => reject(request.error), { once: true });
  });
}

function transactionDone(transaction) {
  return new Promise((resolve, reject) => {
    transaction.addEventListener("complete", resolve, { once: true });
    transaction.addEventListener("abort", () => reject(transaction.error), { once: true });
    transaction.addEventListener("error", () => reject(transaction.error), { once: true });
  });
}

export function openDatabase() {
  if (!("indexedDB" in window)) {
    return Promise.reject(new Error("Este navegador não oferece armazenamento IndexedDB."));
  }
  if (connectionPromise) return connectionPromise;

  connectionPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.addEventListener("upgradeneeded", () => {
      const database = request.result;
      const store = database.objectStoreNames.contains(STORE_NAME)
        ? request.transaction.objectStore(STORE_NAME)
        : database.createObjectStore(STORE_NAME, { keyPath: "id" });

      const indexes = [
        ["createdAt", "createdAt"],
        ["updatedAt", "updatedAt"],
        ["vinhoBusca", "vinhoBusca"],
        ["produtorBusca", "produtorBusca"],
        ["tipologia", "tipologia"],
        ["safra", "safra"],
      ];
      indexes.forEach(([name, keyPath]) => {
        if (!store.indexNames.contains(name)) store.createIndex(name, keyPath);
      });
    });

    request.addEventListener("success", () => {
      const database = request.result;
      database.addEventListener("versionchange", () => {
        database.close();
        connectionPromise = null;
      });
      resolve(database);
    }, { once: true });

    request.addEventListener("blocked", () => {
      reject(new Error("Feche outras abas deste app para atualizar o banco de dados."));
    }, { once: true });
    request.addEventListener("error", () => {
      connectionPromise = null;
      reject(request.error ?? new Error("Não foi possível abrir o banco de dados."));
    }, { once: true });
  });

  return connectionPromise;
}

async function withStore(mode, operation) {
  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, mode);
  const store = transaction.objectStore(STORE_NAME);
  const result = await operation(store);
  await transactionDone(transaction);
  return result;
}

export async function getAllSheets() {
  return withStore("readonly", async (store) => {
    const records = await requestAsPromise(store.getAll());
    return records.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  });
}

export function getSheet(id) {
  return withStore("readonly", (store) => requestAsPromise(store.get(id)));
}

export function saveSheet(sheet) {
  return withStore("readwrite", async (store) => {
    await requestAsPromise(store.put(sheet));
    return sheet;
  });
}

export function saveSheets(sheets) {
  return withStore("readwrite", async (store) => {
    await Promise.all(sheets.map((sheet) => requestAsPromise(store.put(sheet))));
    return sheets;
  });
}

export function deleteSheet(id) {
  return withStore("readwrite", (store) => requestAsPromise(store.delete(id)));
}
