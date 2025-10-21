"use client";

import React, { useEffect } from "react";
import useAuthStatus from "../hooks/useAuthStatus";
import { useRouter } from "next/navigation";

const COLORS = {
  PRIMARY: "#E91E63",
  BACKGROUND: "#FFF5F8",
};

/**
 * Componente que protege una ruta. Si no está autenticado, redirige al login principal.
 */
const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { authStatus, isLoadingAuth } = useAuthStatus();
  const router = useRouter();

  useEffect(() => {
    // Si la carga de autenticación terminó y NO está autenticado, redirigir a la página principal (login)
    if (!isLoadingAuth && !authStatus.isAuthenticated) {
      // Usamos el router para redirigir a la página de login, que en tu caso es la raíz '/'
      router.replace("/");
    }
  }, [isLoadingAuth, authStatus.isAuthenticated, router]);

  // Si aún está cargando el estado, muestra una pantalla de carga
  if (isLoadingAuth) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: COLORS.BACKGROUND }}
      >
        <p className="text-xl font-medium" style={{ color: COLORS.PRIMARY }}>
          Verificando acceso...
        </p>
      </div>
    );
  }

  // Si ya cargó y está autenticado, muestra el contenido de la página
  if (authStatus.isAuthenticated) {
    return <>{children}</>;
  }

  // Si no está autenticado y ya cargó, el useEffect ya disparó la redirección, pero devolvemos null mientras ocurre
  return null;
};

export default AuthGuard;
