let currentEscHandler = null;

export function handleEsc(callback) {
  deleteEsc();

  function handler(event) {
    if (event.key === "Escape") {
      callback();
      document.removeEventListener("keydown", handler);
      if (currentEscHandler === handler) currentEscHandler = null;
    }
  }

  document.addEventListener("keydown", handler);
  currentEscHandler = handler;
}

// NOTE: MAYBE NOT NEEDED
export function handleEsc_add(callback) {
  function handler(event) {
    if (event.key === "Escape") {
      callback();
      document.removeEventListener("keydown", handler);
    }
  }

  document.addEventListener("keydown", handler);
}

export function deleteEsc() {
  if (currentEscHandler) {
    document.removeEventListener("keydown", currentEscHandler);
    currentEscHandler = null;
  }
}
