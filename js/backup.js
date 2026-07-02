import { normalizeSearch } from "./utils.js";

const BACKUP_FORMAT = "rabachino-degustacao-backup";
const BACKUP_VERSION = 1;
const MAX_BACKUP_SIZE = 250 * 1024 * 1024;
const MAX_PHOTO_SIZE = 5 * 1024 * 1024;
const VALID_TYPES = new Set(["Branco", "Laranja", "Rosé", "Tinto"]);

function bytesToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  const chunks = [];
  const chunkSize = 32_768;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    chunks.push(String.fromCharCode(...bytes.subarray(index, index + chunkSize)));
  }

  return btoa(chunks.join(""));
}

function base64ToBlob(value, type) {
  let binary;
  try {
    binary = atob(value);
  } catch {
    throw new Error("O backup contém uma foto inválida.");
  }

  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type });
}

async function serializeSheet(sheet) {
  const serialized = { ...sheet, foto: null };
  if (sheet.foto instanceof Blob) {
    serialized.fotoDados = bytesToBase64(await sheet.foto.arrayBuffer());
  }
  return serialized;
}

function validateSheet(sheet, index) {
  const position = index + 1;
  const requiredStrings = [
    "id",
    "lugar",
    "data",
    "vinho",
    "produtor",
    "createdAt",
    "updatedAt",
  ];

  if (!sheet || typeof sheet !== "object" || Array.isArray(sheet)) {
    throw new Error(`A ficha ${position} do backup é inválida.`);
  }
  if (requiredStrings.some((field) => typeof sheet[field] !== "string" || !sheet[field].trim())) {
    throw new Error(`A ficha ${position} não contém todos os dados obrigatórios.`);
  }
  if (!VALID_TYPES.has(sheet.tipologia)) {
    throw new Error(`A ficha ${position} contém uma tipologia inválida.`);
  }
  if (sheet.safra !== null
    && (!Number.isInteger(sheet.safra)
      || sheet.safra < 1900
      || sheet.safra > new Date().getFullYear())) {
    throw new Error(`A ficha ${position} contém uma safra inválida.`);
  }
  if (sheet.fotoDados != null && typeof sheet.fotoDados !== "string") {
    throw new Error(`A ficha ${position} contém dados de foto inválidos.`);
  }
  if (sheet.fotoDados) {
    if (typeof sheet.fotoTipo !== "string" || !sheet.fotoTipo.startsWith("image/")) {
      throw new Error(`A ficha ${position} contém um tipo de foto inválido.`);
    }
    if (sheet.fotoDados.length > Math.ceil(MAX_PHOTO_SIZE / 3) * 4 + 4) {
      throw new Error(`A foto da ficha ${position} excede o limite de 5 MB.`);
    }
  }
}

function deserializeSheet(sheet) {
  const { fotoDados, ...record } = sheet;
  record.foto = fotoDados
    ? base64ToBlob(fotoDados, record.fotoTipo || "application/octet-stream")
    : null;
  if (record.foto?.size > MAX_PHOTO_SIZE) {
    throw new Error("O backup contém uma foto que excede o limite de 5 MB.");
  }
  record.vinhoBusca = normalizeSearch(record.vinho);
  record.produtorBusca = normalizeSearch(record.produtor);
  return record;
}

export async function createBackup(sheets) {
  const serializedSheets = await Promise.all(sheets.map(serializeSheet));
  const contents = JSON.stringify({
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    fichas: serializedSheets,
  });
  return new Blob([contents], { type: "application/json" });
}

export function downloadBackup(blob) {
  const date = new Date().toLocaleDateString("sv-SE");
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `rabachino-backup-${date}.json`;
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export async function readBackup(file) {
  if (file.size > MAX_BACKUP_SIZE) {
    throw new Error("O arquivo de backup excede o limite de 250 MB.");
  }

  let backup;
  try {
    backup = JSON.parse(await file.text());
  } catch {
    throw new Error("O arquivo selecionado não é um backup JSON válido.");
  }

  if (backup?.format !== BACKUP_FORMAT || backup?.version !== BACKUP_VERSION) {
    throw new Error("O arquivo não é um backup compatível com esta versão do aplicativo.");
  }
  if (!Array.isArray(backup.fichas)) {
    throw new Error("O backup não contém uma lista válida de fichas.");
  }

  const ids = new Set();
  backup.fichas.forEach((sheet, index) => {
    validateSheet(sheet, index);
    if (ids.has(sheet.id)) {
      throw new Error(`O backup contém o identificador duplicado “${sheet.id}”.`);
    }
    ids.add(sheet.id);
  });

  return backup.fichas.map(deserializeSheet);
}
