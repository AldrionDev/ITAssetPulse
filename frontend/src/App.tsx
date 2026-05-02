import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { AuthProvider } from "./context/AuthProvider";
import LoginPageRoute from "./pages/LoginPageRoute";
import DashboardPage from "./pages/DashboardPage";
import { EmployeesPage } from "./pages/EmployeesPage";
import { NavBar } from "./components/NavBar";
import { AssetDetailPage } from "./pages/AssetDetailPage";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPageRoute />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <NavBar />
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/employees"
            element={
              <ProtectedRoute>
                <NavBar />
                <EmployeesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/assets/:id"
            element={
              <ProtectedRoute>
                <NavBar />
                <AssetDetailPage />
              </ProtectedRoute>
            }
          />  
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
