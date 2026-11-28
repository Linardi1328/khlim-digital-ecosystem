"use client";

interface ModalStackEntry {
  id: symbol;
  container: HTMLElement;
  canCloseOnEscape: () => boolean;
  onClose: () => void;
  previousActiveElement: HTMLElement | null;
}

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  'input:not([disabled]):not([type="hidden"])',
  "select:not([disabled])",
  "textarea:not([disabled])",
  "summary",
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(", ");

const modalStack: ModalStackEntry[] = [];
let savedBodyOverflow: string | null = null;
let listenersAttached = false;

export function getModalFocusableElements(
  container: HTMLElement,
): HTMLElement[] {
  const candidates = Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  );
  return candidates.filter((el) => {
    if (el.hasAttribute("disabled")) return false;
    if (el.getAttribute("aria-hidden") === "true") return false;
    if (el.closest("[hidden], [inert]") !== null) return false;
    const style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") return false;
    return true;
  });
}

function getTopModal(): ModalStackEntry | null {
  return modalStack[modalStack.length - 1] ?? null;
}

function focusElementSafe(el: HTMLElement | null | undefined): boolean {
  if (!el || !el.isConnected) return false;
  if (el.hasAttribute("disabled") || el.closest("[hidden], [inert]") !== null) {
    return false;
  }
  try {
    el.focus({ preventScroll: false });
  } catch {
    el.focus();
  }
  return document.activeElement === el;
}

function handleModalKeyDown(event: KeyboardEvent): void {
  const top = getTopModal();
  if (!top) return;

  if (event.key === "Escape") {
    event.preventDefault();
    event.stopPropagation();
    if (top.canCloseOnEscape()) {
      top.onClose();
    }
    return;
  }

  if (event.key !== "Tab") return;

  const focusables = getModalFocusableElements(top.container);
  if (focusables.length === 0) {
    event.preventDefault();
    focusElementSafe(top.container);
    return;
  }

  const active =
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];

  if (!active || !top.container.contains(active)) {
    event.preventDefault();
    focusElementSafe(event.shiftKey ? last : first);
    return;
  }

  if (event.shiftKey) {
    if (active === first || active === top.container) {
      event.preventDefault();
      focusElementSafe(last);
    }
    return;
  }

  if (active === last) {
    event.preventDefault();
    focusElementSafe(first);
  }
}

function handleModalFocusIn(event: FocusEvent): void {
  const top = getTopModal();
  if (!top) return;
  const target = event.target;
  if (target instanceof Node && top.container.contains(target)) {
    return;
  }
  const focusables = getModalFocusableElements(top.container);
  focusElementSafe(focusables[0] ?? top.container);
}

function attachGlobalListeners(): void {
  if (listenersAttached || typeof window === "undefined") return;
  savedBodyOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";
  window.addEventListener("keydown", handleModalKeyDown, true);
  document.addEventListener("focusin", handleModalFocusIn, true);
  listenersAttached = true;
}

function detachGlobalListeners(): void {
  if (!listenersAttached || typeof window === "undefined") return;
  window.removeEventListener("keydown", handleModalKeyDown, true);
  document.removeEventListener("focusin", handleModalFocusIn, true);
  document.body.style.overflow = savedBodyOverflow ?? "";
  savedBodyOverflow = null;
  listenersAttached = false;
}

export function registerModalFocusTrap(options: {
  container: HTMLElement;
  onClose: () => void;
  canCloseOnEscape?: () => boolean;
}): () => void {
  const previousActiveElement =
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

  const entry: ModalStackEntry = {
    id: Symbol("modal"),
    container: options.container,
    onClose: options.onClose,
    canCloseOnEscape: options.canCloseOnEscape ?? (() => true),
    previousActiveElement,
  };

  modalStack.push(entry);
  attachGlobalListeners();

  const rafId = window.requestAnimationFrame(() => {
    if (getTopModal()?.id !== entry.id) return;
    const active = document.activeElement;
    if (active instanceof Node && entry.container.contains(active)) return;
    const focusables = getModalFocusableElements(entry.container);
    focusElementSafe(focusables[0] ?? entry.container);
  });

  return () => {
    window.cancelAnimationFrame(rafId);
    const index = modalStack.findIndex((item) => item.id === entry.id);
    const wasTop = index === modalStack.length - 1;
    if (index !== -1) {
      modalStack.splice(index, 1);
    }

    if (modalStack.length === 0) {
      detachGlobalListeners();
      if (!focusElementSafe(entry.previousActiveElement)) {
        const mainEl = document.querySelector<HTMLElement>("main");
        if (mainEl) {
          const focusables = getModalFocusableElements(mainEl);
          if (!focusElementSafe(focusables[0])) {
            if (!mainEl.hasAttribute("tabindex")) {
              mainEl.setAttribute("tabindex", "-1");
            }
            focusElementSafe(mainEl);
          }
        }
      }
      return;
    }

    if (wasTop) {
      const nextTop = getTopModal();
      if (!nextTop) return;
      const restored =
        entry.previousActiveElement !== null &&
        nextTop.container.contains(entry.previousActiveElement) &&
        focusElementSafe(entry.previousActiveElement);
      if (!restored) {
        const focusables = getModalFocusableElements(nextTop.container);
        if (!focusElementSafe(focusables[0])) {
          focusElementSafe(nextTop.container);
        }
      }
    }
  };
}
