const STATES = {
  "-1": { symbol: "−", copy: "Negativo" },
  "0": { symbol: "•", copy: "Neutro" },
  "1": { symbol: "+", copy: "Positivo" },
};

function nextState(current) {
  if (current === 0) return 1;
  if (current === 1) return -1;
  return 0;
}

function updateButton(button, value) {
  const state = STATES[String(value)];
  button.dataset.value = String(value);
  button.querySelector(".tri-symbol").textContent = state.symbol;
  button.querySelector(".tri-state-copy").textContent = state.copy;
  button.setAttribute("aria-label", `${button.dataset.label}: ${state.copy}`);
}

export function renderTriGroup(container, groupName, options, values = {}) {
  const fragment = document.createDocumentFragment();
  options.forEach(({ key, label }) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "tri-control";
    button.dataset.group = groupName;
    button.dataset.key = key;
    button.dataset.label = label;

    const symbol = document.createElement("span");
    symbol.className = "tri-symbol";
    symbol.setAttribute("aria-hidden", "true");

    const copy = document.createElement("span");
    copy.className = "tri-label";
    copy.textContent = label;
    const stateCopy = document.createElement("small");
    stateCopy.className = "tri-state-copy";
    copy.append(stateCopy);
    button.append(symbol, copy);
    updateButton(button, Number(values[key] ?? 0));
    button.addEventListener("click", () => updateButton(button, nextState(Number(button.dataset.value))));
    fragment.append(button);
  });
  container.dataset.triGroup = groupName;
  container.replaceChildren(fragment);
}

export function initializeTriGroups(root = document) {
  root.querySelectorAll("[data-tri-group][data-options]").forEach((container) => {
    const options = container.dataset.options.split(",").map((entry) => {
      const [key, label] = entry.split(":");
      return { key, label };
    });
    renderTriGroup(container, container.dataset.triGroup, options);
  });
}

export function readTriGroups(root = document) {
  const result = {};
  root.querySelectorAll(".tri-control").forEach((button) => {
    const path = button.dataset.group.split(".");
    let target = result;
    path.forEach((part, index) => {
      if (index === path.length - 1) {
        target[part] ??= {};
        target[part][button.dataset.key] = Number(button.dataset.value);
      } else {
        target[part] ??= {};
        target = target[part];
      }
    });
  });
  return result;
}

export function setTriGroups(root, values) {
  root.querySelectorAll(".tri-control").forEach((button) => {
    const path = button.dataset.group.split(".");
    let value = values;
    path.forEach((part) => {
      value = value?.[part];
    });
    updateButton(button, Number(value?.[button.dataset.key] ?? 0));
  });
}

export function hasMarkedTriState(container) {
  return [...container.querySelectorAll(".tri-control")]
    .some((button) => Number(button.dataset.value) !== 0);
}
