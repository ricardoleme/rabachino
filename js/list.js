import {
  formatCurrency,
  formatDate,
  formatDateTime,
  NO_PHOTO_SOURCE,
  nonZeroEntries,
  normalizeSearch,
  titleFromKey,
  vintageLabel,
} from "./utils.js";

const CHAMPAGNE_SOURCE = "assets/images/champagne.svg";

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function hasPerlageValue(sheet) {
  const perlage = sheet?.visual?.perlage ?? {};
  return ["continuo", "fino", "longo"].some((key) => (
    perlage[key] !== null && perlage[key] !== undefined && perlage[key] !== ""
  ));
}

function isSparkling(sheet) {
  return Boolean(sheet?.espumante ?? hasPerlageValue(sheet));
}

function sparklingBadge() {
  const badge = element("img", "sparkling-badge");
  badge.src = CHAMPAGNE_SOURCE;
  badge.alt = "";
  badge.loading = "lazy";
  return badge;
}

const CARD_TYPE_CLASSES = {
  Branco: "wine-card-branco",
  Laranja: "wine-card-laranja",
  "Rosé": "wine-card-rose",
  Tinto: "wine-card-tinto",
};

function normalizedRating(value) {
  const rating = Number(value);
  return Number.isInteger(rating) && rating >= 1 && rating <= 5 ? rating : null;
}

function starDisplay(value, className = "") {
  const rating = normalizedRating(value);
  const wrapper = element("div", `star-display${className ? ` ${className}` : ""}`);
  wrapper.textContent = rating
    ? `${"★".repeat(rating)}${"☆".repeat(5 - rating)}`
    : "☆☆☆☆☆";
  wrapper.setAttribute(
    "aria-label",
    rating
      ? `Avaliação final: ${rating} de 5 estrelas`
      : "Avaliação final não informada",
  );
  return wrapper;
}

function finalRatingBlock(value) {
  const wrapper = element("div", "detail-assessment");
  wrapper.append(
    element("h3", "", "Avaliação final"),
    starDisplay(value, "detail-rating"),
  );
  return wrapper;
}

function observationsBlock(value) {
  const wrapper = element("div", "detail-assessment");
  wrapper.append(
    element("h3", "", "Observações"),
    element("p", "detail-observations", value || "Não informado"),
  );
  return wrapper;
}

export function createListController({
  container,
  emptyState,
  resultCount,
  searchInput,
  typeSelect,
  vintageSelect,
  minPriceInput,
  maxPriceInput,
  priceError,
  sparklingOnlyInput,
  ratingInputs,
  onOpen,
}) {
  let sheets = [];
  let objectUrls = [];

  function revokeUrls() {
    objectUrls.forEach((url) => URL.revokeObjectURL(url));
    objectUrls = [];
  }

  function selectedRatings() {
    return ratingInputs
      .filter((input) => input.checked)
      .map((input) => input.value);
  }

  function updatePriceRangeMessage(minPrice, maxPrice) {
    const hasInvalidRange = minPrice !== null && maxPrice !== null && maxPrice < minPrice;
    const message = "O preço até deve ser maior ou igual ao preço de.";

    priceError.textContent = hasInvalidRange ? message : "";
    priceError.classList.toggle("hidden", !hasInvalidRange);
    if (hasInvalidRange) {
      minPriceInput.setAttribute("aria-invalid", "true");
      maxPriceInput.setAttribute("aria-invalid", "true");
    } else {
      minPriceInput.removeAttribute("aria-invalid");
      maxPriceInput.removeAttribute("aria-invalid");
    }
    maxPriceInput.setCustomValidity(hasInvalidRange ? message : "");

    return hasInvalidRange;
  }

  function filteredSheets() {
    const term = normalizeSearch(searchInput.value);
    const type = typeSelect.value;
    const vintage = vintageSelect.value;
    const minPrice = minPriceInput.value === "" ? null : Number(minPriceInput.value);
    const maxPrice = maxPriceInput.value === "" ? null : Number(maxPriceInput.value);
    const onlySparkling = sparklingOnlyInput.checked;
    const ratings = selectedRatings();
    const hasInvalidPriceRange = updatePriceRangeMessage(minPrice, maxPrice);
    if (hasInvalidPriceRange) return [];

    return sheets.filter((sheet) => {
      const matchesTerm = !term
        || sheet.vinhoBusca?.includes(term)
        || sheet.produtorBusca?.includes(term)
        || normalizeSearch(sheet.vinho).includes(term)
        || normalizeSearch(sheet.produtor).includes(term);
      const matchesType = !type || sheet.tipologia === type;
      const matchesVintage = !vintage
        || (vintage === "none" ? sheet.safra === null : Number(sheet.safra) === Number(vintage));
      const price = Number(sheet.preco);
      const hasPrice = Number.isFinite(price);
      const matchesMinPrice = minPrice === null || (hasPrice && price >= minPrice);
      const matchesMaxPrice = maxPrice === null || (hasPrice && price <= maxPrice);
      const sheetRating = normalizedRating(sheet.final?.avaliacao);
      const matchesSparkling = !onlySparkling || isSparkling(sheet);
      const matchesRating = ratings.length === 0
        || ratings.some((rating) => (
          rating === "none" ? sheetRating === null : sheetRating === Number(rating)
        ));
      return matchesTerm
        && matchesType
        && matchesVintage
        && matchesMinPrice
        && matchesMaxPrice
        && matchesSparkling
        && matchesRating;
    });
  }

  function createCard(sheet) {
    const typeClass = CARD_TYPE_CLASSES[sheet.tipologia] ?? "";
    const article = element("article", `wine-card${typeClass ? ` ${typeClass}` : ""}`);
    const button = element("button", "wine-card-button");
    button.type = "button";
    const rating = normalizedRating(sheet.final?.avaliacao);
    button.setAttribute(
      "aria-label",
      `Abrir ficha de ${sheet.vinho}, ${sheet.produtor}${
        rating ? `, avaliação final ${rating} de 5 estrelas` : ""
      }`,
    );
    button.addEventListener("click", () => onOpen(sheet.id));

    let visual;
    if (sheet.foto instanceof Blob) {
      const url = URL.createObjectURL(sheet.foto);
      objectUrls.push(url);
      visual = element("img", "wine-thumb");
      visual.src = url;
      visual.alt = "";
      visual.loading = "lazy";
    } else {
      visual = element("img", "wine-thumb");
      visual.src = NO_PHOTO_SOURCE;
      visual.alt = "";
    }
    const visualFrame = element("div", "wine-thumb-frame");
    visualFrame.append(visual);

    const copy = element("div", "wine-card-copy");
    copy.append(
      element("h3", "", sheet.vinho),
      element("p", "", sheet.produtor),
      starDisplay(sheet.final?.avaliacao, "card-rating"),
    );
    const meta = element("div", "card-meta");
    [
      sheet.tipologia,
      vintageLabel(sheet.safra),
      formatDate(sheet.data),
    ].forEach((value) => meta.append(element("span", "tag", value)));
    copy.append(meta);
    button.append(visualFrame, copy);
    article.append(button);
    if (isSparkling(sheet)) article.append(sparklingBadge());
    return article;
  }

  function render() {
    revokeUrls();
    const filtered = filteredSheets();
    container.replaceChildren(...filtered.map(createCard));
    container.setAttribute("aria-busy", "false");
    resultCount.textContent = `${filtered.length} ${filtered.length === 1 ? "ficha" : "fichas"}`;
    emptyState.classList.toggle("hidden", filtered.length > 0);
    container.classList.toggle("hidden", filtered.length === 0);

    const hasFilters = searchInput.value
      || typeSelect.value
      || vintageSelect.value
      || minPriceInput.value
      || maxPriceInput.value
      || sparklingOnlyInput.checked
      || selectedRatings().length > 0;
    const title = emptyState.querySelector("#empty-title");
    const copy = emptyState.querySelector("#empty-copy");
    const action = emptyState.querySelector("#empty-new-sheet");
    if (hasFilters) {
      title.textContent = "Nenhuma ficha encontrada";
      copy.textContent = "Tente mudar ou limpar os filtros.";
      action.classList.add("hidden");
    } else {
      title.textContent = "Nenhuma ficha por aqui";
      copy.textContent = "Comece registrando sua primeira degustação.";
      action.classList.remove("hidden");
    }
  }

  return {
    setSheets(nextSheets) {
      sheets = nextSheets;
      render();
    },
    render,
    destroy: revokeUrls,
  };
}

function dataItem(label, value) {
  const wrapper = document.createElement("div");
  wrapper.append(element("dt", "", label), element("dd", "", value || "Não informado"));
  return wrapper;
}

function assessmentBlock(title, values) {
  const wrapper = element("div", "detail-assessment");
  wrapper.append(element("h3", "", title));
  const entries = nonZeroEntries(values);
  if (!entries.length) {
    wrapper.append(element("p", "detail-empty", "Não avaliado"));
    return wrapper;
  }
  const list = element("ul", "assessment-list");
  entries.forEach(([key, value]) => {
    const item = element(
      "li",
      `assessment-chip${value === -1 ? " negative" : ""}`,
      `${value === -1 ? "−" : "+"} ${titleFromKey(key)}`,
    );
    list.append(item);
  });
  wrapper.append(list);
  return wrapper;
}

function detailCard(title, children, printWidth = "") {
  const card = element(
    "section",
    `detail-card${printWidth ? ` detail-card-print-${printWidth}` : ""}`,
  );
  card.append(element("h2", "", title), ...children);
  return card;
}

function printDocumentTitle(wineName) {
  const safeWineName = String(wineName ?? "")
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
  return safeWineName
    ? `Ficha de degustação - ${safeWineName}`
    : "Ficha de degustação";
}

function printSheet(sheet) {
  const previousTitle = document.title;
  let restored = false;

  const restoreTitle = () => {
    if (restored) return;
    restored = true;
    document.title = previousTitle;
    window.removeEventListener("afterprint", restoreTitle);
  };

  document.title = printDocumentTitle(sheet.vinho);
  window.addEventListener("afterprint", restoreTitle, { once: true });

  try {
    window.print();
  } catch (error) {
    restoreTitle();
    throw error;
  }

  window.setTimeout(restoreTitle, 1000);
}

export function renderDetails(container, sheet, { onEdit, onDelete }) {
  const urls = [];
  const hero = element("header", "detail-hero has-photo");
  const photo = element("img", "detail-photo");
  if (sheet.foto instanceof Blob) {
    const url = URL.createObjectURL(sheet.foto);
    urls.push(url);
    photo.src = url;
    photo.alt = `Foto do rótulo de ${sheet.vinho}`;
  } else {
    photo.src = NO_PHOTO_SOURCE;
    photo.alt = `Nenhuma foto cadastrada para ${sheet.vinho}`;
  }
  hero.append(photo);
  if (isSparkling(sheet)) hero.append(sparklingBadge());

  const heading = element("div", "detail-heading");
  heading.append(
    element("p", "eyebrow", `${sheet.tipologia} · ${vintageLabel(sheet.safra)}`),
    element("h1", "", sheet.vinho),
    element("p", "", sheet.produtor),
  );
  heading.querySelector("h1").id = "detail-title";
  const actions = element("div", "detail-actions");
  const edit = element("button", "button button-secondary", "Editar");
  edit.type = "button";
  edit.addEventListener("click", onEdit);
  const print = element("button", "button button-secondary", "Imprimir / salvar PDF");
  print.type = "button";
  print.title = "Imprimir ou salvar a ficha em PDF";
  print.addEventListener("click", () => printSheet(sheet));
  const remove = element("button", "button button-danger", "Excluir");
  remove.type = "button";
  remove.addEventListener("click", onDelete);
  actions.append(edit, print, remove);
  heading.append(actions);
  hero.append(heading);

  const generalData = element("dl", "detail-data");
  generalData.append(
    dataItem("Lugar", sheet.lugar),
    dataItem("Data", formatDate(sheet.data)),
    dataItem("Tipologia", sheet.tipologia),
    dataItem("Espumante", isSparkling(sheet) ? "Sim" : "Não"),
    dataItem("Álcool", sheet.alcool === null ? "Não informado" : `${sheet.alcool}%`),
    dataItem("Preço", formatCurrency(sheet.preco)),
    dataItem("Uvas", sheet.uvas),
    dataItem("Harmonização", sheet.harmonizacao),
    dataItem("Safra", vintageLabel(sheet.safra)),
    dataItem("Atualizada em", formatDateTime(sheet.updatedAt)),
  );

  const perlage = sheet.visual?.perlage ?? {};
  const perlageData = element("dl", "detail-data");
  perlageData.append(
    dataItem("Contínuo", perlage.continuo ? `${perlage.continuo}/5` : "Não avaliado"),
    dataItem("Fino", perlage.fino ? `${perlage.fino}/5` : "Não avaliado"),
    dataItem("Longo", perlage.longo ? `${perlage.longo}/5` : "Não avaliado"),
  );

  const finalChildren = [
    assessmentBlock("Descritores", sheet.final?.descritores),
    assessmentBlock("Equilíbrio", sheet.final?.equilibrio),
    assessmentBlock("Evolução", sheet.final?.evolucao),
  ];
  if (sheet.final?.perfume) {
    const perfume = element("p", "");
    const strong = element("strong", "", "Perfume de: ");
    perfume.append(strong, document.createTextNode(sheet.final.perfume));
    finalChildren.push(perfume);
  }
  finalChildren.push(
    observationsBlock(sheet.final?.observacoes),
    finalRatingBlock(sheet.final?.avaliacao),
  );

  const visualChildren = [
    assessmentBlock("Cor", sheet.visual?.cor),
    assessmentBlock("Limpidez", sheet.visual?.limpidez),
  ];
  if (isSparkling(sheet)) {
    visualChildren.push(
      element("h3", "", "Perlage"),
      perlageData,
    );
  }

  const sections = element("div", "detail-sections");
  sections.append(
    detailCard("Informações gerais", [generalData], "half"),
    detailCard("Exame visual", visualChildren, "half"),
    detailCard("Exame olfativo", [
      assessmentBlock("Qualidade", sheet.olfativo?.qualidade),
      assessmentBlock("Intensidade", sheet.olfativo?.intensidade),
      assessmentBlock("Duração", sheet.olfativo?.duracao),
    ], "third"),
    detailCard("Gosto e tato", [
      assessmentBlock("Sabores", sheet.gosto?.sabores),
      assessmentBlock("Alcoolicidade", sheet.tato?.alcoolicidade),
      assessmentBlock("Tanino", sheet.tato?.tanino),
    ], "third"),
    detailCard("Retrogosto, retrolfato e evolução", finalChildren, "third"),
  );

  container.replaceChildren(hero, sections);
  return () => urls.forEach((url) => URL.revokeObjectURL(url));
}
