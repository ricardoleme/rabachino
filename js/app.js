import { createBackup, downloadBackup, readBackup } from "./backup.js";
import {
  deleteSheet,
  getAllSheets,
  getSheet,
  openDatabase,
  saveSheet,
  saveSheets,
} from "./db.js";
import { createFormController } from "./form.js";
import { createListController, renderDetails } from "./list.js";
import { debounce, populateVintageSelect } from "./utils.js";

const views = {
  home: document.querySelector("#home-view"),
  form: document.querySelector("#form-view"),
  detail: document.querySelector("#detail-view"),
};

const confirmDialog = document.querySelector("#confirm-dialog");
const confirmTitle = document.querySelector("#confirm-title");
const confirmCopy = document.querySelector("#confirm-copy");
const confirmAction = document.querySelector("#confirm-action");
const detailContent = document.querySelector("#detail-content");
const aboutDialog = document.querySelector("#about-dialog");
const installDialog = document.querySelector("#install-dialog");
const installButton = document.querySelector("#install-app");
const installInstructions = document.querySelector("#install-instructions");
const exportButton = document.querySelector("#export-data");
const importButton = document.querySelector("#import-data");
const importFile = document.querySelector("#import-file");
let activeSheetId = null;
let cleanupDetail = () => {};
let deferredInstallPrompt = null;

function showView(name) {
  Object.entries(views).forEach(([key, view]) => view.classList.toggle("hidden", key !== name));
  window.scrollTo({ top: 0, behavior: "instant" });
}

function notify(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast${type === "error" ? " error" : ""}`;
  toast.setAttribute("role", type === "error" ? "alert" : "status");
  toast.textContent = message;
  document.querySelector("#toast-region").append(toast);
  window.setTimeout(() => toast.remove(), 3800);
}

function requestConfirmation({
  title,
  copy,
  actionLabel = "Confirmar",
  danger = true,
}) {
  confirmTitle.textContent = title;
  confirmCopy.textContent = copy;
  confirmAction.textContent = actionLabel;
  confirmAction.className = `button ${danger ? "button-danger" : "button-primary"}`;
  confirmDialog.returnValue = "";
  confirmDialog.showModal();
  return new Promise((resolve) => {
    confirmDialog.addEventListener("close", () => {
      resolve(confirmDialog.returnValue === "confirm");
    }, { once: true });
  });
}

const listController = createListController({
  container: document.querySelector("#sheet-list"),
  emptyState: document.querySelector("#empty-state"),
  resultCount: document.querySelector("#result-count"),
  searchInput: document.querySelector("#search"),
  typeSelect: document.querySelector("#filter-type"),
  vintageSelect: document.querySelector("#filter-vintage"),
  minPriceInput: document.querySelector("#filter-price-min"),
  maxPriceInput: document.querySelector("#filter-price-max"),
  priceError: document.querySelector("#filter-price-error"),
  sparklingOnlyInput: document.querySelector("#filter-sparkling"),
  ratingInputs: [...document.querySelectorAll('input[name="classificacao"]')],
  onOpen: openDetails,
});

const formController = createFormController({
  form: document.querySelector("#tasting-form"),
  requestConfirmation,
  notify,
  async onSave(sheet) {
    await saveSheet(sheet);
    await refreshSheets();
    notify(sheet.id === activeSheetId ? "Ficha atualizada." : "Ficha salva.");
    activeSheetId = sheet.id;
    await openDetails(sheet.id);
  },
  onCancel() {
    if (activeSheetId) openDetails(activeSheetId);
    else showView("home");
  },
});

async function refreshSheets() {
  const sheets = await getAllSheets();
  listController.setSheets(sheets);
}

async function openDetails(id) {
  try {
    const sheet = await getSheet(id);
    if (!sheet) {
      notify("Esta ficha não foi encontrada.", "error");
      activeSheetId = null;
      showView("home");
      return;
    }
    activeSheetId = id;
    cleanupDetail();
    cleanupDetail = renderDetails(detailContent, sheet, {
      onEdit: () => openForm(sheet),
      onDelete: () => removeCurrentSheet(sheet),
    });
    showView("detail");
    detailContent.querySelector("h1")?.focus?.();
  } catch (error) {
    console.error(error);
    notify("Não foi possível abrir a ficha.", "error");
  }
}

function openForm(sheet = null) {
  activeSheetId = sheet?.id ?? null;
  document.querySelector("#form-eyebrow").textContent = sheet ? "Editar degustação" : "Nova degustação";
  document.querySelector("#form-title").textContent = sheet
    ? `Revise ${sheet.vinho}`
    : "Conte a história deste vinho";
  showView("form");
  formController.open(sheet);
}

async function removeCurrentSheet(sheet) {
  const confirmed = await requestConfirmation({
    title: "Excluir esta ficha?",
    copy: `A ficha de “${sheet.vinho}” e sua foto serão removidas deste dispositivo.`,
    actionLabel: "Excluir definitivamente",
    danger: true,
  });
  if (!confirmed) return;

  try {
    await deleteSheet(sheet.id);
    cleanupDetail();
    cleanupDetail = () => {};
    activeSheetId = null;
    await refreshSheets();
    showView("home");
    notify("Ficha excluída.");
  } catch (error) {
    console.error(error);
    notify("Não foi possível excluir a ficha.", "error");
  }
}

async function goHome() {
  if (!views.form.classList.contains("hidden") && formController.isDirty()) {
    await formController.attemptCancel(() => {
      activeSheetId = null;
      cleanupDetail();
      cleanupDetail = () => {};
      showView("home");
    });
    return;
  }
  if (!views.form.classList.contains("hidden")) formController.destroy();
  activeSheetId = null;
  cleanupDetail();
  cleanupDetail = () => {};
  showView("home");
}

populateVintageSelect(document.querySelector("#filter-vintage"), { includeAll: true });

const rerenderFilters = debounce(() => listController.render(), 180);
document.querySelector("#search").addEventListener("input", rerenderFilters);
document.querySelector("#filter-type").addEventListener("change", () => listController.render());
document.querySelector("#filter-vintage").addEventListener("change", () => listController.render());
document.querySelector("#filter-price-min").addEventListener("input", rerenderFilters);
document.querySelector("#filter-price-max").addEventListener("input", rerenderFilters);
document.querySelector("#filter-sparkling").addEventListener("change", () => listController.render());
document.querySelectorAll('input[name="classificacao"]').forEach((input) => {
  input.addEventListener("change", () => listController.render());
});
document.querySelector("#clear-filters").addEventListener("click", () => {
  document.querySelector("#filters-form").reset();
  listController.render();
  document.querySelector("#search").focus();
});
document.querySelector("#new-sheet").addEventListener("click", () => openForm());
document.querySelector("#empty-new-sheet").addEventListener("click", () => openForm());
document.querySelector("#brand-home").addEventListener("click", goHome);
document.querySelector("#about-open").addEventListener("click", () => aboutDialog.showModal());
document.querySelector("#detail-back").addEventListener("click", () => {
  activeSheetId = null;
  cleanupDetail();
  cleanupDetail = () => {};
  showView("home");
});

async function exportData() {
  exportButton.disabled = true;
  try {
    const sheets = await getAllSheets();
    if (!sheets.length) {
      notify("Não há fichas para exportar.", "error");
      return;
    }
    const backup = await createBackup(sheets);
    downloadBackup(backup);
    notify(`${sheets.length} ${sheets.length === 1 ? "ficha exportada" : "fichas exportadas"}.`);
  } catch (error) {
    console.error(error);
    notify("Não foi possível exportar os dados. Tente novamente.", "error");
  } finally {
    exportButton.disabled = false;
  }
}

async function importData(file) {
  importButton.disabled = true;
  try {
    let sheets;
    try {
      sheets = await readBackup(file);
    } catch (error) {
      console.error(error);
      notify(error instanceof Error
        ? error.message
        : "O arquivo selecionado não é um backup válido.", "error");
      return;
    }
    if (!sheets.length) {
      notify("O backup selecionado não contém fichas.", "error");
      return;
    }

    const currentSheets = await getAllSheets();
    const currentIds = new Set(currentSheets.map((sheet) => sheet.id));
    const updatedCount = sheets.filter((sheet) => currentIds.has(sheet.id)).length;
    const createdCount = sheets.length - updatedCount;
    const changes = [
      createdCount ? `${createdCount} ${createdCount === 1 ? "nova ficha" : "novas fichas"}` : "",
      updatedCount ? `${updatedCount} ${updatedCount === 1 ? "ficha atualizada" : "fichas atualizadas"}` : "",
    ].filter(Boolean).join(" e ");

    const confirmed = await requestConfirmation({
      title: "Importar este backup?",
      copy: `O backup contém ${sheets.length} ${
        sheets.length === 1 ? "ficha" : "fichas"
      }: ${changes}. As demais fichas deste dispositivo serão preservadas.`,
      actionLabel: "Importar dados",
      danger: false,
    });
    if (!confirmed) return;

    await saveSheets(sheets);
    await refreshSheets();
    if (!views.detail.classList.contains("hidden") && activeSheetId) {
      await openDetails(activeSheetId);
    }
    notify(`${sheets.length} ${sheets.length === 1 ? "ficha importada" : "fichas importadas"}.`);
  } catch (error) {
    console.error(error);
    notify("Não foi possível salvar as fichas importadas. Verifique o espaço disponível e tente novamente.", "error");
  } finally {
    importButton.disabled = false;
    importFile.value = "";
  }
}

exportButton.addEventListener("click", exportData);
importButton.addEventListener("click", () => {
  if (formController.isDirty()) {
    notify("Salve ou cancele as alterações antes de importar um backup.", "error");
    return;
  }
  importFile.click();
});
importFile.addEventListener("change", () => {
  const [file] = importFile.files;
  if (file) importData(file);
});

function isRunningStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches
    || window.navigator.standalone === true;
}

function markAppAsInstalled() {
  installButton.textContent = "Aplicativo instalado";
  installButton.disabled = true;
}

function showInstallInstructions() {
  const isAppleMobile = /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  installInstructions.textContent = isAppleMobile
    ? "No Safari, toque em Compartilhar e depois em “Adicionar à Tela de Início”."
    : "Abra o menu do navegador e escolha “Instalar app” ou “Adicionar à tela inicial”.";
  installDialog.showModal();
}

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
});

window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  markAppAsInstalled();
  notify("Atalho criado na tela inicial.");
});

installButton.addEventListener("click", async () => {
  if (isRunningStandalone()) {
    markAppAsInstalled();
    return;
  }
  if (!deferredInstallPrompt) {
    showInstallInstructions();
    return;
  }

  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
});

if (isRunningStandalone()) markAppAsInstalled();

window.addEventListener("load", () => {
  document.querySelector("#new-sheet").focus({ preventScroll: true });
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./service-worker.js").catch((error) => {
      console.error("Não foi possível ativar o funcionamento offline.", error);
    });
  }
}, { once: true });

window.addEventListener("beforeunload", (event) => {
  if (!formController.isDirty()) return;
  event.preventDefault();
  event.returnValue = "";
});

async function initialize() {
  try {
    await openDatabase();
    await refreshSheets();
  } catch (error) {
    console.error(error);
    const container = document.querySelector("#sheet-list");
    container.setAttribute("aria-busy", "false");
    const message = document.createElement("div");
    message.className = "error-summary";
    message.setAttribute("role", "alert");
    const title = document.createElement("strong");
    title.textContent = "Não foi possível acessar o armazenamento local.";
    const copy = document.createElement("span");
    copy.textContent = "Verifique se o navegador permite dados locais e recarregue a página.";
    message.append(title, copy);
    container.replaceChildren(message);
    notify("O armazenamento local está indisponível.", "error");
  }
}

initialize();
