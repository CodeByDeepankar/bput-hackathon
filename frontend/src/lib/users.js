const RAW_API_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.trim();
const API_BASE_URL = (RAW_API_BASE_URL && RAW_API_BASE_URL.length
  ? RAW_API_BASE_URL.replace(/\/$/, '')
  : '/api');

export async function fetchUserRole(userId) {
  const res = await fetch(`${API_BASE_URL}/users/${encodeURIComponent(userId)}/role`, {
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to fetch role (${res.status})`);
  return res.json();
}

export async function saveUserRole({ userId, role, name, schoolId, class: klass }) {
  const res = await fetch(`${API_BASE_URL}/users/role`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, role, name, schoolId, class: klass }),
  });
  if (!res.ok) throw new Error(`Failed to save role (${res.status})`);
  return res.json();
}
