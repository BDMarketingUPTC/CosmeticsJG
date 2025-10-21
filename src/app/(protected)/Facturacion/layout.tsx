import React from "react";
import AuthGuard from "../../components/AuthGuard"; // Ajusta la ruta de importación

const ProtectedLayout: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return (
    // ENVUELVE el contenido de esta ruta con el Guardia de Autenticación
    <AuthGuard>
      {/* Puedes añadir la barra de navegación del panel aquí, si no está en la page.tsx */}
      {children}
    </AuthGuard>
  );
};

export default ProtectedLayout;
