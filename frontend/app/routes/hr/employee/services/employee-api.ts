import type { Employee } from "../types";

const baseApiUrl = (import.meta.env.VITE_API_URL || "http://localhost:5000/api-v1").replace(/\/+$/, "");

export const API_BASE_URL = `${baseApiUrl}/employees`;

function getHeaders() {
  const token = localStorage.getItem("token");

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function parseResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") || "";
  const raw = await response.text();

  let data: any = null;

  if (raw && contentType.includes("application/json")) {
    try {
      data = JSON.parse(raw);
    } catch {
      throw new Error("API trả về JSON không hợp lệ.");
    }
  } else if (raw) {
    if (raw.trimStart().startsWith("<!DOCTYPE") || raw.trimStart().startsWith("<html")) {
      throw new Error(
        `API nhân sự không trả về JSON. Kiểm tra backend route /api-v1/employees. HTTP ${response.status}.`,
      );
    }

    data = { message: raw.slice(0, 300) };
  }

  if (!response.ok) {
    throw new Error(
      data?.message || `API lỗi HTTP ${response.status}.`,
    );
  }

  return data as T;
}

export type EmployeeListResponse = {
  employees: Employee[];
  pagination?: {
    total: number;
    totalPages: number;
    page?: number;
    limit?: number;
  };
};

export async function getEmployees(params: {
  search?: string;
  department?: string;
  status?: string;
  page: number;
  limit: number;
}) {
  const query = new URLSearchParams();

  if (params.search?.trim()) query.set("search", params.search.trim());
  if (params.department) query.set("department", params.department);
  if (params.status) query.set("status", params.status);

  query.set("page", String(params.page));
  query.set("limit", String(params.limit));

  const response = await fetch(`${API_BASE_URL}?${query.toString()}`, {
    headers: getHeaders(),
  });

  return parseResponse<EmployeeListResponse>(response);
}

export async function createEmployee(payload: unknown) {
  const response = await fetch(API_BASE_URL, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });

  return parseResponse<Employee>(response);
}

export async function updateEmployee(id: string, payload: unknown) {
  const response = await fetch(`${API_BASE_URL}/${id}`, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });

  return parseResponse<Employee>(response);
}

export async function deleteEmployee(id: string) {
  const response = await fetch(`${API_BASE_URL}/${id}`, {
    method: "DELETE",
    headers: getHeaders(),
  });

  return parseResponse<{ message?: string }>(response);
}

export async function updateEmployeeStatus(
  id: string,
  status: Employee["status"],
) {
  const response = await fetch(`${API_BASE_URL}/${id}/status`, {
    method: "PATCH",
    headers: getHeaders(),
    body: JSON.stringify({ status }),
  });

  return parseResponse<Employee>(response);
}
