const jsonHeaders = { "Content-Type": "application/json" };

function getToken() {
  return localStorage.getItem("sitani_token");
}

async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.body ? jsonHeaders : {}),
      ...options.headers,
      Authorization: getToken() ? `Bearer ${getToken()}` : ""
    }
  });

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    throw new Error(payload?.message || "Terjadi kesalahan.");
  }

  return payload;
}

export const api = {
  get: (url) => request(url),
  post: (url, body) => request(url, { method: "POST", body: JSON.stringify(body) }),
  put: (url, body) => request(url, { method: "PUT", body: JSON.stringify(body) }),
  delete: (url) => request(url, { method: "DELETE" })
};
