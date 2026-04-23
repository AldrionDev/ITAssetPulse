import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LoginPage } from "../components/LoginPage";

const LoginPageRoute = () => {
  const { login, loginError, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  return <LoginPage onLogin={login} error={loginError} />;
};

export default LoginPageRoute;
