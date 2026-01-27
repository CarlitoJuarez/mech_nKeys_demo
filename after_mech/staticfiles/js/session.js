export async function getAuthState() {
  const res = await fetch("/auth/session", { credentials: "same-origin" });
  if (!res.ok) return { authenticated: false, user: null };
  return res.json(); // { authenticated, user }
}
