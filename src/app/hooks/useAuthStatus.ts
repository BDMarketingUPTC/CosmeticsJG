import { useState, useEffect } from "react";
import localforage from "localforage";

type AuthState = {
  isAuthenticated: boolean;
  username: string | null;
};

const useAuthStatus = () => {
  const [authStatus, setAuthStatus] = useState<AuthState>({
    isAuthenticated: false,
    username: null,
  });
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  // Función para establecer el estado de autenticación (útil para el login/logout)
  const setAuth = (status: boolean, user: string | null) => {
    setAuthStatus({ isAuthenticated: status, username: user });
  };

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const userData: { username: string } | null = await localforage.getItem(
          "userAuth"
        );
        if (userData && userData.username) {
          setAuthStatus({ isAuthenticated: true, username: userData.username });
        } else {
          setAuthStatus({ isAuthenticated: false, username: null });
        }
      } catch (error) {
        console.error("Error al leer localforage:", error);
        setAuthStatus({ isAuthenticated: false, username: null });
      } finally {
        setIsLoadingAuth(false);
      }
    };
    checkAuthStatus();
  }, []);

  return { authStatus, isLoadingAuth, setAuth };
};

export default useAuthStatus;
