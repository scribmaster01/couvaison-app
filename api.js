// api.js
const API_BASE = 'https://votre-backend.com/api'; // à remplacer par l'URL de votre backend

// Fonction pour récupérer le token JWT stocké
function getToken() {
  return localStorage.getItem('token');
}

// Fonction pour définir le token après connexion
function setToken(token) {
  localStorage.setItem('token', token);
}

// Fonction pour se déconnecter
function clearToken() {
  localStorage.removeItem('token');
}

// Fonction générique pour les appels API authentifiés
async function apiFetch(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers
  };
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Erreur API');
  }
  return response.json();
}

// Fonctions d'authentification
export async function login(firstName, password) {
  const data = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ firstName, password })
  });
  setToken(data.token);
  return data.user;
}

export async function register(firstName, farmName, address, password, species) {
  const data = await apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ firstName, farmName, address, password, species })
  });
  setToken(data.token);
  return data.user;
}

export async function getMe() {
  return apiFetch('/auth/me');
}

// Lots
export async function getLots() {
  return apiFetch('/lots');
}

export async function createLot(lotData) {
  return apiFetch('/lots', {
    method: 'POST',
    body: JSON.stringify(lotData)
  });
}

export async function updateLot(id, lotData) {
  return apiFetch(`/lots/${id}`, {
    method: 'PUT',
    body: JSON.stringify(lotData)
  });
}

export async function deleteLot(id) {
  return apiFetch(`/lots/${id}`, {
    method: 'DELETE'
  });
}

// Clients
export async function getClients() {
  return apiFetch('/clients');
}

export async function createClient(clientData) {
  return apiFetch('/clients', {
    method: 'POST',
    body: JSON.stringify(clientData)
  });
}

export async function updateClient(id, clientData) {
  return apiFetch(`/clients/${id}`, {
    method: 'PUT',
    body: JSON.stringify(clientData)
  });
}

export async function deleteClient(id) {
  return apiFetch(`/clients/${id}`, {
    method: 'DELETE'
  });
}

// Températures
export async function getTempLogs() {
  return apiFetch('/temp-logs');
}

export async function createTempLog(logData) {
  return apiFetch('/temp-logs', {
    method: 'POST',
    body: JSON.stringify(logData)
  });
}

export async function deleteTempLog(id) {
  return apiFetch(`/temp-logs/${id}`, {
    method: 'DELETE'
  });
}

// Notifications
export async function getNotifications() {
  return apiFetch('/notifications');
}

export async function clearNotifications() {
  return apiFetch('/notifications', {
    method: 'DELETE'
  });
}

// Stats (on récupère les lots, les calculs se font côté client)
export async function getStats() {
  return apiFetch('/stats');
}