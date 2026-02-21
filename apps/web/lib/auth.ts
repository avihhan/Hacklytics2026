const KEY = "taxpilot_auth";

export function isAuthed(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(KEY) === "1";
}

export function loginDummy() {
  localStorage.setItem(KEY, "1");
}

export function logoutDummy() {
  localStorage.removeItem(KEY);
}