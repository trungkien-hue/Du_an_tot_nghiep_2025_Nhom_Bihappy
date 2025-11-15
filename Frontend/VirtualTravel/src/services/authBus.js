// src/services/authBus.js
export const emitAuthChanged = () => window.dispatchEvent(new Event("auth-changed"));
export const onAuthChanged = (handler) => {
  window.addEventListener("auth-changed", handler);
  return () => window.removeEventListener("auth-changed", handler);
};
