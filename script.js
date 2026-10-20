/**
 * Petal & Thread Studio
 * Vanilla behavior only: in-page nav is plain links, this file covers
 * shop filters, the unwired Buy hook, and the custom-request form.
 *
 * TODO(buy-overlay): Buy is not designed yet. Buttons dispatch
 * `petal:buy` and do not open a menu. When a Venmo / chat overlay
 * exists, listen for that event (detail.productId) and render it.
 */

const desktopQuery = window.matchMedia("(min-width: 1024px)");

const emailInput = document.querySelector("#contact");
const messageInput = document.querySelector("#request");

function syncPlaceholders() {
  const desktop = desktopQuery.matches;
  if (emailInput) {
    emailInput.placeholder = desktop
      ? "you@email.com or phone"
      : "you@email.com or (555) 123-4567";
  }
  if (messageInput) {
    messageInput.placeholder = desktop
      ? "e.g. a pressed-flower frame from my wedding bouquet, about 8×10, soft pinks and greens…"
      : "e.g. a pressed-flower frame from my wedding bouquet, about 8×10, soft pinks…";
  }
}

syncPlaceholders();
desktopQuery.addEventListener("change", syncPlaceholders);

const chips = [...document.querySelectorAll(".chip")];
const cards = [...document.querySelectorAll(".card")];
const shopStatus = document.querySelector("#shop-status");

function categoryLabel(filter) {
  if (filter === "all") return "all";
  if (filter === "paper") return desktopQuery.matches ? "paper goods" : "paper";
  return filter;
}

function applyFilter(filter) {
  let shown = 0;
  cards.forEach((card) => {
    const match = filter === "all" || card.dataset.category === filter;
    card.hidden = !match;
    if (match) shown += 1;
  });
  chips.forEach((chip) => {
    const on = chip.dataset.filter === filter;
    chip.setAttribute("aria-pressed", on ? "true" : "false");
  });
  if (shopStatus) {
    const noun = shown === 1 ? "bloom" : "blooms";
    const where = filter === "all" ? "the shop" : categoryLabel(filter);
    shopStatus.textContent = `Showing ${shown} ${noun} in ${where}.`;
  }
}

chips.forEach((chip) => {
  chip.addEventListener("click", () => applyFilter(chip.dataset.filter));
});

const moreButton = document.querySelector("#show-more");
if (moreButton) {
  moreButton.addEventListener("click", () => {
    const visible = cards.filter((card) => !card.hidden).length;
    if (shopStatus) {
      shopStatus.textContent =
        visible === cards.length
          ? "That’s every bloom in the shop right now."
          : `That’s every ${categoryLabel(chips.find((chip) => chip.getAttribute("aria-pressed") === "true")?.dataset.filter || "all")} bloom on the page.`;
    }
  });
}

document.querySelectorAll("[data-buy-hook]").forEach((button) => {
  button.addEventListener("click", () => {
    button.dispatchEvent(
      new CustomEvent("petal:buy", {
        bubbles: true,
        detail: { productId: button.dataset.product },
      }),
    );
  });
});

const form = document.querySelector("#request-form");
const photoInput = document.querySelector("#photo");
const dropzone = document.querySelector(".dropzone");
const dropFile = document.querySelector("#drop-file");
const formStatus = document.querySelector("#form-status");

function setError(input, message) {
  const error = document.querySelector(`#${input.id}-error`);
  input.setAttribute("aria-invalid", message ? "true" : "false");
  if (!error) return;
  error.textContent = message;
  error.hidden = !message;
}

function validContact(value) {
  const text = value.trim();
  if (text.includes("@")) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text);
  }
  const digits = text.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15;
}

function fileProblem(file) {
  if (!file) return "";
  const okType = file.type === "image/jpeg" || file.type === "image/png" || /\.(jpe?g|png)$/i.test(file.name);
  if (!okType) return "Use a JPG or PNG.";
  if (file.size > 10 * 1024 * 1024) return "That photo is over 10 MB.";
  return "";
}

function showFile(file) {
  if (!dropFile) return;
  if (!file) {
    dropFile.hidden = true;
    dropFile.textContent = "";
    return;
  }
  dropFile.hidden = false;
  dropFile.textContent = file.name;
}

if (photoInput && dropzone) {
  photoInput.addEventListener("change", () => {
    const file = photoInput.files && photoInput.files[0];
    const problem = fileProblem(file);
    setError(photoInput, problem);
    showFile(problem ? null : file);
    if (problem) photoInput.value = "";
  });

  ["dragenter", "dragover"].forEach((type) => {
    dropzone.addEventListener(type, (event) => {
      event.preventDefault();
      dropzone.classList.add("is-dragover");
    });
  });
  ["dragleave", "drop"].forEach((type) => {
    dropzone.addEventListener(type, (event) => {
      event.preventDefault();
      dropzone.classList.remove("is-dragover");
    });
  });
  dropzone.addEventListener("drop", (event) => {
    const file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
    if (!file) return;
    const problem = fileProblem(file);
    setError(photoInput, problem);
    if (problem) {
      showFile(null);
      return;
    }
    const transfer = new DataTransfer();
    transfer.items.add(file);
    photoInput.files = transfer.files;
    showFile(file);
  });
}

if (form) {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = form.querySelector("#name");
    let ok = true;

    if (!name.value.trim()) {
      setError(name, "Add your name so Rosie knows who to reply to.");
      ok = false;
    } else {
      setError(name, "");
    }

    if (!emailInput.value.trim()) {
      setError(emailInput, "Add an email or a phone number.");
      ok = false;
    } else if (!validContact(emailInput.value)) {
      setError(emailInput, "That doesn’t look like an email or a phone number yet.");
      ok = false;
    } else {
      setError(emailInput, "");
    }

    if (!messageInput.value.trim()) {
      setError(messageInput, "Tell Rosie a little about what you’d like.");
      ok = false;
    } else {
      setError(messageInput, "");
    }

    const file = photoInput && photoInput.files && photoInput.files[0];
    const problem = fileProblem(file);
    setError(photoInput, problem);
    if (problem) ok = false;

    if (!ok) {
      const firstInvalid = form.querySelector("[aria-invalid='true']");
      if (firstInvalid) firstInvalid.focus();
      if (formStatus) formStatus.textContent = "";
      return;
    }

    if (formStatus) {
      formStatus.textContent =
        "Thanks — this form isn’t connected to Rosie’s inbox yet. Email hello@petalandthread.studio with the same note and she’ll reply within 2 days.";
    }
  });
}
