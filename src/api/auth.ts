import type { AuthResponse } from "../types";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

export interface LoginRequest {
  email: string;
  password: string;
  realm: "SUPER" | "AGENCY" | "GUARD";
}

export async function login(request: LoginRequest): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    let message = "Не удалось выполнить вход";

    try {
      const errorBody = await response.json();
      if (typeof errorBody?.message === "string") {
        message = errorBody.message;
      }
    } catch (error) {
      console.error("Ошибка разбора ответа авторизации", error);
    }

    throw new Error(message);
  }

  return response.json();
}
