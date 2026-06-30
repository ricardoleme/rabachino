import { deleteSheet, getAllSheets, getSheet, openDatabase, saveSheet } from "./db.js";
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
let activeSheetId = null;
let cleanupDetail = () => {};

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
document.querySelector("#clear-filters").addEventListener("click", () => {
  document.querySelector("#filters-form").reset();
  listController.render();
  document.querySelector("#search").focus();
});
document.querySelector("#new-sheet").addEventListener("click", () => openForm());
document.querySelector("#empty-new-sheet").addEventListener("click", () => openForm());
document.querySelector("#brand-home").addEventListener("click", goHome);
document.querySelector("#detail-back").addEventListener("click", () => {
  activeSheetId = null;
  cleanupDetail();
  cleanupDetail = () => {};
  showView("home");
});

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
