export const CURRENT_YEAR = new Date().getFullYear();

export function localToday() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function normalizeSearch(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("pt-BR")
    .replace(/\s+/g, " ");
}

export function formatDate(value) {
  if (!value) return "Data não informada";
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat("pt-BR").format(new Date(year, month - 1, day));
}

export function formatDateTime(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function vintageLabel(value) {
  return value === null || value === "" || value === undefined ? "Sem Safra" : String(value);
}

export function debounce(callback, delay = 200) {
  let timer;
  return (...args) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => callback(...args), delay);
  };
}

export function createId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  const bytes = new Uint8Array(16);
  globalThis.crypto?.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function populateVintageSelect(select, { includeAll = false } = {}) {
  const fragment = document.createDocumentFragment();
  if (includeAll) fragment.append(new Option("Todas", ""));
  fragment.append(new Option("Sem Safra", "none"));
  for (let year = CURRENT_YEAR; year >= 1900; year -= 1) {
    fragment.append(new Option(String(year), String(year)));
  }
  select.replaceChildren(fragment);
}

export function titleFromKey(key) {
  const labels = {
    limpido: "Límpido",
    turvo: "Turvo",
    rubi: "Rubi",
    granada: "Granada",
    violaceo: "Violáceo",
    marrom: "Marrom",
    amareloPalido: "Amarelo Pálido",
    amareloOuro: "Amarelo Ouro",
    amareloEsverdeado: "Amarelo Esverdeado",
    vermelhoClaro: "Vermelho Claro",
    rosa: "Rosa",
    elegante: "Elegante",
    normal: "Normal",
    defeituoso: "Defeituoso",
    muito: "Muito",
    pouco: "Pouco",
    doce: "Doce",
    salgado: "Salgado",
    amargo: "Amargo",
    acido: "Ácido",
    quente: "Quente",
    frio: "Frio",
    equilibrado: "Equilibrado",
    desarmonico: "Desarmônico",
    erva: "Erva",
    fruta: "Fruta",
    flores: "Flores",
    especiarias: "Especiarias",
    madeira: "Madeira",
    mineral: "Mineral",
    harmonico: "Harmônico",
    jovem: "Jovem",
    pronto: "Pronto",
  };
  return labels[key] ?? key;
}

export function nonZeroEntries(group = {}) {
  return Object.entries(group).filter(([, value]) => value === -1 || value === 1);
}

export async function optimizeImage(file, maxDimension = 1600, quality = 0.82) {
  if (!file || file.size === 0) return null;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size < 1_500_000) {
    bitmap.close();
    return file;
  }
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const type = file.type === "image/png" ? "image/png" : "image/jpeg";
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error("Não foi possível processar a imagem.")),
      type,
      quality,
    );
  });
}
