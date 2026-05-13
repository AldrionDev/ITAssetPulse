import { apiFetch } from "./fetchInstance";

export interface LoginResponse {
  access_token: string;
}

export const loginRequest = async (
  username: string,
  password: string,
): Promise<LoginResponse> => {
  return apiFetch<LoginResponse>("/auth/login", {
    method: "POST",
    body: { username, password },
  });
};
