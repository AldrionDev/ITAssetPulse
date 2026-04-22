export interface LoginResponse {
  access_token: string;
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

export const loginRequest = async (
  username: string,
  password: string
): Promise<LoginResponse> => {
  const response = await fetch("http://localhost:3000/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    throw new AuthError("Invalid username or password!");
  }

  return response.json() as Promise<LoginResponse>;
};