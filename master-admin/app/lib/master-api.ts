import { apiGet, apiPost, apiPatch, apiDelete } from "./api";

// Dashboard
export const getDashboardOverview = () => apiGet("/master/dashboard/overview");

// Tenants
export const getTenants = (page = 1, limit = 20) =>
  apiGet(`/master/tenants?page=${page}&limit=${limit}`);

export const getTenantById = (id: string) => apiGet(`/master/tenants/${id}`);

export const getTenantStats = (id: string) => apiGet(`/master/tenants/${id}/stats`);

export const createTenant = (data: Record<string, unknown>) =>
  apiPost("/master/tenants", data);

export const updateTenant = (id: string, data: Record<string, unknown>) =>
  apiPatch(`/master/tenants/${id}`, data);

export const suspendTenant = (id: string) => apiPost(`/master/tenants/${id}/suspend`);

export const activateTenant = (id: string) => apiPost(`/master/tenants/${id}/activate`);

export const deleteTenant = (id: string) => apiDelete(`/master/tenants/${id}`);

// Master Documents
export const getMasterDocuments = (params: Record<string, any> = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v) query.set(k, String(v)); });
  return apiGet(`/master/documents?${query.toString()}`);
};

export const getMasterDocumentById = (id: string) => apiGet(`/master/documents/${id}`);

export const createMasterDocument = (data: Record<string, unknown>) =>
  apiPost("/master/documents", data);

export const updateMasterDocument = (id: string, data: Record<string, unknown>) =>
  apiPatch(`/master/documents/${id}`, data);

export const deleteMasterDocument = (id: string) => apiDelete(`/master/documents/${id}`);

export const publishMasterDocument = (id: string) =>
  apiPost(`/master/documents/${id}/publish`);

export const unpublishMasterDocument = (id: string) =>
  apiPost(`/master/documents/${id}/unpublish`);

export const getMasterDocumentVersions = (id: string) =>
  apiGet(`/master/documents/${id}/versions`);

// Categories
export const getMasterCategories = () => apiGet("/master/categories");

export const createMasterCategory = (data: Record<string, unknown>) =>
  apiPost("/master/categories", data);

export const updateMasterCategory = (id: string, data: Record<string, unknown>) =>
  apiPatch(`/master/categories/${id}`, data);

export const deleteMasterCategory = (id: string) => apiDelete(`/master/categories/${id}`);

// Tags
export const getMasterTags = () => apiGet("/master/tags");

export const createMasterTag = (data: Record<string, unknown>) =>
  apiPost("/master/tags", data);

export const deleteMasterTag = (id: string) => apiDelete(`/master/tags/${id}`);

// Settings
export const getLlmSettings = () => apiGet("/master/settings/llm");

export const updateLlmSettings = (data: Record<string, string>) =>
  apiPatch("/master/settings/llm", data);
