import { useState } from "react";
import type { ReactNode } from "react";
import { AuthContext } from "./AuthContext";
import { loginRequest } from "../api/authApi";

interface AuthUser {
  username: string;
  role: string;
}

interface JwtPayload {
  username: string;
  role: string;
  exp: number;
  iat: number;
}

const getUserFromToken = (token: string): AuthUser | null => {
  try {
    const payloadBase64 = token.split(".")[1];
    const payload = JSON.parse(atob(payloadBase64)) as JwtPayload;

    return {
      username: payload.username,
      role: payload.role,
    };
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const token = localStorage.getItem("token");

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!token);
  const [user, setUser] = useState<AuthUser | null>(
    token ? getUserFromToken(token) : null,
  );
  const [loginError, setLoginError] = useState<string | null>(null);

  const login = async (username: string, password: string) => {
    try {
      const data = await loginRequest(username, password);

      localStorage.setItem("token", data.access_token);
      setUser(getUserFromToken(data.access_token));
      setIsAuthenticated(true);
      setLoginError(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Something went wrong.";

      setLoginError(message);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setIsAuthenticated(false);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, loginError, user, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};
