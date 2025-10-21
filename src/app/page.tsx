"use client";

import React, { useState } from "react";
// 💡 CORRECCIÓN: 'localforage' eliminado ya que no se usa directamente aquí.
// El hook 'useAuthStatus' maneja la interacción con el storage.
// import localforage from "localforage";

// 💡 Asume que el hook 'useAuthStatus' está en '../hooks/useAuthStatus'
import useAuthStatus from "../app/hooks/useAuthStatus";

// 💡 Asume que los componentes están en 'components/...'
import LoginScreen from "../app/components/home/LoginScreen";
import AdminDashboard from "../app/components/home/AdminDashboard";
import UserProfileMenu from "../app/components/home/UserProfileMenu";
import PasswordChangeModal from "../app/components/home/PasswordChangeModal";

const COLORS = {
  PRIMARY: "#E91E63",
  BACKGROUND: "#FFF5F8",
};

const AppPage: React.FC = () => {
  // Utilizamos el hook para obtener el estado y la función de actualización
  const { authStatus, isLoadingAuth, setAuth } = useAuthStatus();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Función que se llama al tener éxito en el LoginScreen
  const handleLoginSuccess = (userData: { username: string }) => {
    // Actualiza el estado global de autenticación y guarda en localforage
    setAuth(true, userData.username);
  };

  // --- Muestra una pantalla de carga mientras verifica el estado offline ---
  if (isLoadingAuth) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: COLORS.BACKGROUND }}
      >
        <p className="text-xl font-medium" style={{ color: COLORS.PRIMARY }}>
          Cargando Estado de Sesión...
        </p>
      </div>
    );
  }

  // --- Si NO está autenticado, muestra la Pantalla de Login ---
  if (!authStatus.isAuthenticated || !authStatus.username) {
    // La página raíz es la página de Login
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  // --- Si está autenticado, muestra el Panel de Control Principal (Home) ---
  return (
    <>
      <div
        className="flex flex-col h-screen overflow-hidden"
        style={{
          fontFamily: `'Poppins', sans-serif`,
          backgroundColor: COLORS.BACKGROUND,
        }}
      >
        {/* Barra Superior con el Menú de Usuario */}
        <header
          className="p-4 flex justify-end items-center shadow-md z-10"
          style={{ backgroundColor: "white" }}
        >
          <UserProfileMenu
            onPasswordChange={() => setIsModalOpen(true)}
            username={authStatus.username}
          />
        </header>

        {/* Contenido Principal: El Launcher del Dashboard */}
        <main className="flex-1 overflow-auto">
          <AdminDashboard />
        </main>
      </div>

      {/* Modal de Cambio de Contraseña */}
      {authStatus.username && (
        <PasswordChangeModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          username={authStatus.username}
        />
      )}
    </>
  );
};

export default AppPage;
