import { useState } from "react";
import { loginRequest } from "../api/authApi";

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    !!localStorage.getItem("token"),
  );
  const [loginError, setLoginError] = useState<string | null>(null);

  const login = async (username: string, password: string) => {
    try {
      const data = await loginRequest(username, password);
      localStorage.setItem("token", data.access_token);
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
  };

  return { isAuthenticated, loginError, login, logout };
};
