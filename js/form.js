import {
  createId,
  localToday,
  NO_PHOTO_SOURCE,
  normalizeSearch,
  optimizeImage,
  populateVintageSelect,
} from "./utils.js";
import {
  hasMarkedTriState,
  initializeTriGroups,
  readTriGroups,
  renderTriGroup,
  setTriGroups,
} from "./tri-state.js";

const COLOR_OPTIONS = {
  Branco: [
    { key: "amareloPalido", label: "Amarelo Pálido" },
    { key: "amareloOuro", label: "Amarelo Ouro" },
    { key: "amareloEsverdeado", label: "Amarelo Esverdeado" },
  ],
  Laranja: [
    { key: "douradoIntenso", label: "Dourado intenso" },
    { key: "ambar", label: "Âmbar" },
    { key: "cobre", label: "Cobre" },
    { key: "ocre", label: "Ocre" },
    { key: "palha", label: "Palha" },
  ],
  Tinto: [
    { key: "rubi", label: "Rubi" },
    { key: "granada", label: "Granada" },
    { key: "violaceo", label: "Violáceo" },
    { key: "marrom", label: "Marrom" },
  ],
  "Rosé": [
    { key: "vermelhoClaro", label: "Vermelho Claro" },
    { key: "rosa", label: "Rosa" },
  ],
};

const PERLAGE = [
  ["continuo", "Contínuo"],
  ["fino", "Fino"],
  ["longo", "Longo"],
];

function buildPerlage(container) {
  const fragment = document.createDocumentFragment();
  PERLAGE.forEach(([key, label]) => {
    const row = document.createElement("div");
    row.className = "rating-row";
    const title = document.createElement("span");
    title.textContent = label;
    const options = document.createElement("div");
    options.className = "rating-options";
    options.setAttribute("role", "radiogroup");
    options.setAttribute("aria-label", label);

    for (let value = 1; value <= 5; value += 1) {
      const input = document.createElement("input");
      input.className = "visually-hidden";
      input.type = "radio";
      input.name = `perlage-${key}`;
      input.id = `perlage-${key}-${value}`;
      input.value = String(value);
      const optionLabel = document.createElement("label");
      optionLabel.htmlFor = input.id;
      optionLabel.textContent = String(value);
      options.append(input, optionLabel);
    }

    const clear = document.createElement("button");
    clear.type = "button";
    clear.className = "clear-rating";
    clear.title = `Limpar nota de ${label}`;
    clear.setAttribute("aria-label", `Limpar nota de ${label}`);
    clear.textContent = "×";
    clear.addEventListener("click", () => {
      options.querySelectorAll("input").forEach((input) => { input.checked = false; });
      options.dispatchEvent(new Event("change", { bubbles: true }));
    });
    row.append(title, options, clear);
    fragment.append(row);
  });
  container.replaceChildren(fragment);
}

function readPerlage(form) {
  return Object.fromEntries(PERLAGE.map(([key]) => {
    const checked = form.querySelector(`input[name="perlage-${key}"]:checked`);
    return [key, checked ? Number(checked.value) : null];
  }));
}

function setPerlage(form, values = {}) {
  PERLAGE.forEach(([key]) => {
    form.querySelectorAll(`input[name="perlage-${key}"]`).forEach((input) => {
      input.checked = Number(input.value) === Number(values[key]);
    });
  });
}

function updateFinalRating(container) {
  const checked = container.querySelector('input[name="final-rating"]:checked');
  const selected = checked ? Number(checked.value) : 0;
  container.querySelectorAll(".star-rating label").forEach((label) => {
    label.classList.toggle("selected", Number(label.dataset.value) <= selected);
  });
}

function buildFinalRating(container) {
  const options = document.createElement("div");
  options.className = "star-rating";
  options.setAttribute("role", "radiogroup");
  options.setAttribute("aria-label", "Avaliação final");

  for (let value = 1; value <= 5; value += 1) {
    const input = document.createElement("input");
    input.className = "visually-hidden";
    input.type = "radio";
    input.name = "final-rating";
    input.id = `final-rating-${value}`;
    input.value = String(value);
    input.setAttribute("aria-label", `${value} ${value === 1 ? "estrela" : "estrelas"}`);

    const label = document.createElement("label");
    label.htmlFor = input.id;
    label.dataset.value = String(value);
    label.textContent = "★";
    label.title = `${value} ${value === 1 ? "estrela" : "estrelas"}`;
    options.append(input, label);
  }

  const clear = document.createElement("button");
  clear.type = "button";
  clear.className = "clear-rating";
  clear.title = "Limpar avaliação final";
  clear.setAttribute("aria-label", "Limpar avaliação final");
  clear.textContent = "×";
  clear.addEventListener("click", () => {
    options.querySelectorAll("input").forEach((input) => { input.checked = false; });
    updateFinalRating(container);
    options.dispatchEvent(new Event("change", { bubbles: true }));
  });
  options.addEventListener("change", () => updateFinalRating(container));
  container.className = "final-rating-control";
  container.replaceChildren(options, clear);
}

function readFinalRating(form) {
  const checked = form.querySelector('input[name="final-rating"]:checked');
  return checked ? Number(checked.value) : null;
}

function setFinalRating(form, value) {
  form.querySelectorAll('input[name="final-rating"]').forEach((input) => {
    input.checked = Number(input.value) === Number(value);
  });
  updateFinalRating(form.querySelector("#final-rating-control"));
}

function emptyPhotoPreview(container) {
  const image = document.createElement("img");
  image.src = NO_PHOTO_SOURCE;
  image.alt = "Nenhuma foto do vinho adicionada";
  container.replaceChildren(image);
}

export function createFormController({
  form,
  onSave,
  onCancel,
  requestConfirmation,
  notify,
}) {
  const elements = {
    id: form.querySelector("#sheet-id"),
    wine: form.querySelector("#wine"),
    producer: form.querySelector("#producer"),
    place: form.querySelector("#place"),
    date: form.querySelector("#date"),
    type: form.querySelector("#wine-type"),
    alcohol: form.querySelector("#alcohol"),
    price: form.querySelector("#price"),
    grapes: form.querySelector("#grapes"),
    pairing: form.querySelector("#pairing"),
    vintage: form.querySelector("#vintage"),
    photo: form.querySelector("#photo"),
    photoPreview: form.querySelector("#photo-preview"),
    removePhoto: form.querySelector("#remove-photo"),
    perfume: form.querySelector("#perfume"),
    observations: form.querySelector("#observations"),
    colorGroup: form.querySelector("#color-group"),
    colorHint: form.querySelector("#color-hint"),
    summary: form.querySelector("#form-error-summary"),
    submit: form.querySelector("#save-sheet"),
  };

  let sourceSheet = null;
  let photoBlob = null;
  let photoName = "";
  let photoType = "";
  let previewUrl = "";
  let dirty = false;
  let loading = false;
  let lastType = "";

  initializeTriGroups(form);
  buildPerlage(form.querySelector("#perlage-ratings"));
  buildFinalRating(form.querySelector("#final-rating-control"));
  populateVintageSelect(elements.vintage);

  function revokePreview() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = "";
  }

  function renderPhoto() {
    revokePreview();
    if (!photoBlob) {
      emptyPhotoPreview(elements.photoPreview);
      elements.removePhoto.classList.add("hidden");
      return;
    }
    previewUrl = URL.createObjectURL(photoBlob);
    const image = document.createElement("img");
    image.src = previewUrl;
    image.alt = "Prévia da foto do rótulo";
    elements.photoPreview.replaceChildren(image);
    elements.removePhoto.classList.remove("hidden");
  }

  function renderColor(type, values = {}) {
    const options = COLOR_OPTIONS[type];
    elements.colorHint.textContent = options ? type : "Selecione primeiro a tipologia";
    if (!options) {
      elements.colorGroup.replaceChildren();
      elements.colorGroup.dataset.triGroup = "visual.cor";
      return;
    }
    renderTriGroup(elements.colorGroup, "visual.cor", options, values);
  }

  async function handleTypeChange() {
    const nextType = elements.type.value;
    if (!loading && lastType && nextType !== lastType && hasMarkedTriState(elements.colorGroup)) {
      const confirmed = await requestConfirmation({
        title: "Trocar a tipologia?",
        copy: "As avaliações de cor já preenchidas serão removidas.",
        actionLabel: "Trocar tipologia",
        danger: false,
      });
      if (!confirmed) {
        loading = true;
        elements.type.value = lastType;
        loading = false;
        return;
      }
    }
    lastType = nextType;
    renderColor(nextType);
    dirty = true;
  }

  function clearErrors() {
    elements.summary.classList.add("hidden");
    elements.summary.replaceChildren();
    form.querySelectorAll("[aria-invalid]").forEach((field) => {
      field.removeAttribute("aria-invalid");
      field.removeAttribute("aria-describedby");
    });
    form.querySelectorAll(".field-error").forEach((error) => { error.textContent = ""; });
  }

  function setError(field, message) {
    field.setAttribute("aria-invalid", "true");
    const error = form.querySelector(`#${field.id}-error`);
    if (error) {
      error.textContent = message;
      field.setAttribute("aria-describedby", error.id);
    }
    return { field, message };
  }

  function validate() {
    clearErrors();
    const errors = [];
    [
      [elements.wine, "Informe o nome do vinho."],
      [elements.producer, "Informe o produtor."],
      [elements.place, "Informe o lugar da degustação."],
      [elements.date, "Informe a data da degustação."],
      [elements.type, "Selecione a tipologia."],
      [elements.vintage, "Selecione a safra ou Sem Safra."],
    ].forEach(([field, message]) => {
      if (!field.value.trim()) errors.push(setError(field, message));
    });

    if (elements.alcohol.value !== "") {
      const alcohol = Number(elements.alcohol.value);
      if (!Number.isFinite(alcohol) || alcohol < 0 || alcohol > 22) {
        errors.push(setError(elements.alcohol, "Informe um valor entre 0 e 22%."));
      }
    }

    if (elements.price.value !== "") {
      const price = Number(elements.price.value);
      if (!Number.isFinite(price) || price < 0) {
        errors.push(setError(elements.price, "Informe um preço igual ou maior que zero."));
      }
    }

    if (errors.length) {
      const strong = document.createElement("strong");
      strong.textContent = "Revise os campos destacados.";
      const copy = document.createElement("span");
      copy.textContent = `${errors.length} ${errors.length === 1 ? "campo precisa" : "campos precisam"} de atenção.`;
      elements.summary.replaceChildren(strong, copy);
      elements.summary.classList.remove("hidden");
      elements.summary.focus();
      errors[0].field.focus({ preventScroll: false });
      return false;
    }
    return true;
  }

  function collectSheet() {
    const now = new Date().toISOString();
    const tri = readTriGroups(form);
    const vintage = elements.vintage.value === "none" ? null : Number(elements.vintage.value);
    const wine = elements.wine.value.trim();
    const producer = elements.producer.value.trim();

    return {
      id: sourceSheet?.id ?? createId(),
      lugar: elements.place.value.trim(),
      data: elements.date.value,
      vinho: wine,
      vinhoBusca: normalizeSearch(wine),
      tipologia: elements.type.value,
      alcool: elements.alcohol.value === "" ? null : Number(elements.alcohol.value),
      preco: elements.price.value === "" ? null : Number(elements.price.value),
      uvas: elements.grapes.value.trim(),
      harmonizacao: elements.pairing.value.trim(),
      produtor: producer,
      produtorBusca: normalizeSearch(producer),
      safra: vintage,
      foto: photoBlob,
      fotoNome: photoName || null,
      fotoTipo: photoType || null,
      visual: {
        cor: tri.visual?.cor ?? {},
        limpidez: tri.visual?.limpidez ?? {},
        perlage: readPerlage(form),
      },
      olfativo: {
        qualidade: tri.olfativo?.qualidade ?? {},
        intensidade: tri.olfativo?.intensidade ?? {},
        duracao: tri.olfativo?.duracao ?? {},
      },
      gosto: { sabores: tri.gosto?.sabores ?? {} },
      tato: {
        alcoolicidade: tri.tato?.alcoolicidade ?? {},
        tanino: tri.tato?.tanino ?? {},
      },
      final: {
        descritores: tri.final?.descritores ?? {},
        perfume: elements.perfume.value.trim(),
        equilibrio: tri.final?.equilibrio ?? {},
        evolucao: tri.final?.evolucao ?? {},
        observacoes: elements.observations.value.trim(),
        avaliacao: readFinalRating(form),
      },
      createdAt: sourceSheet?.createdAt ?? now,
      updatedAt: now,
    };
  }

  async function handlePhoto(event) {
    const [file] = event.target.files;
    if (!file) return;
    const error = form.querySelector("#photo-error");
    error.textContent = "";
    if (!file.type.startsWith("image/")) {
      error.textContent = "Escolha um arquivo de imagem.";
      elements.photo.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      error.textContent = "A imagem deve ter no máximo 5 MB.";
      elements.photo.value = "";
      return;
    }

    try {
      elements.photoPreview.setAttribute("aria-busy", "true");
      photoBlob = typeof createImageBitmap === "function" ? await optimizeImage(file) : file;
      photoName = file.name;
      photoType = photoBlob.type || file.type;
      dirty = true;
      renderPhoto();
    } catch (error_) {
      error.textContent = "Não foi possível processar esta imagem.";
      console.error(error_);
    } finally {
      elements.photoPreview.removeAttribute("aria-busy");
      elements.photo.value = "";
    }
  }

  async function attemptCancel(afterCancel = onCancel) {
    if (dirty) {
      const confirmed = await requestConfirmation({
        title: "Descartar alterações?",
        copy: "As informações preenchidas desde o último salvamento serão perdidas.",
        actionLabel: "Descartar",
        danger: true,
      });
      if (!confirmed) return false;
    }
    dirty = false;
    revokePreview();
    afterCancel();
    return true;
  }

  form.addEventListener("input", () => {
    if (!loading) dirty = true;
  });
  form.addEventListener("change", () => {
    if (!loading) dirty = true;
  });
  elements.type.addEventListener("change", handleTypeChange);
  elements.photo.addEventListener("change", handlePhoto);
  elements.removePhoto.addEventListener("click", () => {
    photoBlob = null;
    photoName = "";
    photoType = "";
    dirty = true;
    renderPhoto();
  });
  form.querySelectorAll(".clear-rating").forEach((button) => {
    button.addEventListener("click", () => { dirty = true; });
  });
  form.querySelector("#cancel-form").addEventListener("click", () => attemptCancel());
  document.querySelector("#form-back").addEventListener("click", () => attemptCancel());

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!validate()) return;
    elements.submit.disabled = true;
    elements.submit.textContent = "Salvando…";
    try {
      const sheet = collectSheet();
      await onSave(sheet);
      sourceSheet = sheet;
      dirty = false;
    } catch (error) {
      console.error(error);
      notify("Não foi possível salvar. Seus dados continuam no formulário.", "error");
    } finally {
      elements.submit.disabled = false;
      elements.submit.textContent = "Salvar ficha";
    }
  });

  function open(sheet = null) {
    loading = true;
    clearErrors();
    form.reset();
    sourceSheet = sheet;
    elements.id.value = sheet?.id ?? "";
    elements.wine.value = sheet?.vinho ?? "";
    elements.producer.value = sheet?.produtor ?? "";
    elements.place.value = sheet?.lugar ?? "Senac Salto";
    elements.date.value = sheet?.data ?? localToday();
    elements.type.value = sheet?.tipologia ?? "";
    elements.alcohol.value = sheet?.alcool ?? "";
    elements.price.value = sheet?.preco ?? "";
    elements.grapes.value = sheet?.uvas ?? "";
    elements.pairing.value = sheet?.harmonizacao ?? "";
    elements.vintage.value = sheet?.safra === null || sheet?.safra === undefined
      ? "none"
      : String(sheet.safra);
    elements.perfume.value = sheet?.final?.perfume ?? "";
    elements.observations.value = sheet?.final?.observacoes ?? "";
    lastType = elements.type.value;
    renderColor(lastType, sheet?.visual?.cor);
    setTriGroups(form, sheet ?? {});
    setPerlage(form, sheet?.visual?.perlage);
    setFinalRating(form, sheet?.final?.avaliacao);
    photoBlob = sheet?.foto ?? null;
    photoName = sheet?.fotoNome ?? "";
    photoType = sheet?.fotoTipo ?? "";
    renderPhoto();
    dirty = false;
    loading = false;
    elements.wine.focus();
  }

  return {
    open,
    attemptCancel,
    isDirty: () => dirty,
    destroy: revokePreview,
  };
}
