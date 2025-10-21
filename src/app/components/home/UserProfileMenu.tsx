import React, { useState } from "react";
import {
  UserCircleIcon,
  KeyIcon,
  ArrowLeftEndOnRectangleIcon,
  ChatBubbleBottomCenterTextIcon,
} from "@heroicons/react/24/outline";
import localforage from "localforage";

// Definición de Colores
const COLORS = {
  PRIMARY: "#E91E63",
  ACCENT: "#D4AF37",
  FOREGROUND: "#1A1A1A",
  BORDER: "#F8BBD0",
};

const useAuth = (username: string | null) => ({
  user: { name: username || "Usuario", email: "cosmeticsjg@gmail.com" },
  logout: async () => {
    await localforage.removeItem("userAuth");
    window.location.reload();
  },
});

interface UserProfileMenuProps {
  onPasswordChange: () => void;
  username: string;
}

const UserProfileMenu: React.FC<UserProfileMenuProps> = ({
  onPasswordChange,
  username,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout } = useAuth(username);

  // Enlace directo a tu WhatsApp
  const whatsappLink = `https://wa.me/573115186410?text=Hola%2C%20necesito%20soporte%20con%20el%20Panel%20de%20Administración%20Cosmético%20JG%20Duitama.`;

  const menuItems = [
    { name: "Cambiar Contraseña", icon: KeyIcon, action: onPasswordChange },
    {
      name: "Cerrar Sesión",
      icon: ArrowLeftEndOnRectangleIcon,
      action: logout,
    },
    {
      name: "Contactar a Desarrollo",
      icon: ChatBubbleBottomCenterTextIcon,
      href: whatsappLink,
      external: true,
    },
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-full transition duration-150"
        style={{
          backgroundColor: "white",
          boxShadow: "0 2px 5px rgba(0, 0, 0, 0.1)",
          color: COLORS.PRIMARY,
        }}
        aria-expanded={isOpen}
      >
        <UserCircleIcon className="h-7 w-7" />
      </button>

      {/* Menú Desplegable */}
      {isOpen && (
        <div
          className="absolute right-0 mt-3 w-72 rounded-xl shadow-2xl p-4 z-50"
          style={{
            backgroundColor: "white",
            border: `1px solid ${COLORS.BORDER}`,
          }}
          // Detiene la propagación para evitar cierres accidentales al hacer clic dentro
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div
            className="border-b pb-3 mb-3"
            style={{ borderColor: COLORS.BORDER }}
          >
            <p
              className="font-semibold text-lg"
              style={{ color: COLORS.PRIMARY }}
            >
              {user.name}
            </p>
            <p className="text-xs text-gray-500">{user.email}</p>
          </div>
          <nav className="space-y-1">
            {menuItems.map((item) => {
              const baseClasses =
                "flex items-center w-full px-3 py-2 text-sm rounded-lg transition duration-150 hover:bg-gray-50";
              const Icon = item.icon;

              if (item.external && item.href) {
                return (
                  <a
                    key={item.name}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={baseClasses}
                    style={{ color: COLORS.FOREGROUND }}
                  >
                    <Icon
                      className="h-5 w-5 mr-3"
                      style={{ color: COLORS.PRIMARY }}
                    />
                    {item.name}
                  </a>
                );
              }

              return (
                <button
                  key={item.name}
                  onClick={() => {
                    item.action?.();
                    setIsOpen(false);
                  }}
                  className={baseClasses}
                  style={{ color: COLORS.FOREGROUND }}
                >
                  <Icon
                    className="h-5 w-5 mr-3"
                    style={{ color: COLORS.PRIMARY }}
                  />
                  {item.name}
                </button>
              );
            })}
          </nav>
        </div>
      )}
    </div>
  );
};

export default UserProfileMenu;
