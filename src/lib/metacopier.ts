const BASE_URL = "https://api.metacopier.io/rest/api/v1";

function getHeaders() {
  return {
    "X-API-Key": process.env.METACOPIER_API_KEY!,
    "Content-Type": "application/json",
  };
}

async function apiRequest(method: string, path: string, body?: unknown) {
  const options: RequestInit = {
    method,
    headers: getHeaders(),
  };
  if (body) {
    options.body = JSON.stringify(body);
  }
  const res = await fetch(`${BASE_URL}${path}`, options);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`MetaCopier API error (${res.status}): ${text}`);
  }

  if (res.status === 204) return null;

  return res.json();
}

export async function getBrokers(): Promise<string[]> {
  return apiRequest("GET", "/brokers/mt5/all");
}

export async function createSlaveAccount(
  server: string,
  login: string,
  password: string,
  alias: string
) {
  return apiRequest("POST", "/accounts", {
    type: { id: 1 }, // MT5
    region: { id: 2 }, // London
    loginServer: server,
    loginAccountNumber: login,
    loginAccountPassword: password,
    alias,
  });
}

export async function startAccount(accountId: string) {
  return apiRequest("POST", `/accounts/${accountId}/actions/start`);
}

export async function stopAccount(accountId: string) {
  return apiRequest("POST", `/accounts/${accountId}/actions/stop`);
}

export async function createCopier(
  accountId: string,
  masterAlias: string,
  multiplier: number
) {
  return apiRequest("POST", `/accounts/${accountId}/copiers`, {
    copyFromAccountOrStrategy: masterAlias,
    multiplier,
    copyStopLoss: true,
    copyTakeProfit: true,
    skipPendingOrders: true,
    copyOpenPositions: false,
    active: true,
  });
}

export async function updateCopier(
  accountId: string,
  copierId: string,
  settings: { multiplier?: number }
) {
  return apiRequest("PUT", `/accounts/${accountId}/copiers/${copierId}`, settings);
}

export async function deleteCopier(accountId: string, copierId: string) {
  return apiRequest("DELETE", `/accounts/${accountId}/copiers/${copierId}`);
}

export async function deleteAccount(accountId: string) {
  return apiRequest("DELETE", `/accounts/${accountId}`);
}

export async function getAccountInfo(accountId: string) {
  return apiRequest("GET", `/accounts/${accountId}/information`);
}

export async function getAccount(accountId: string) {
  return apiRequest("GET", `/accounts/${accountId}`);
}
