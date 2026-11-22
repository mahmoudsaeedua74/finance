/** Stable for one form submission so a network retry can reuse the same database ID. */
export function newEntryId() {
  return Array.from(crypto.getRandomValues(new Uint8Array(12)), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
