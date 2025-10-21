"use client";

import React, { useState, useEffect } from "react";
// Asumiendo que useSync está disponible y funcional
import { useSync } from "../hooks/useSyncContext";
import {
  ArrowsUpDownIcon,
  CloudArrowUpIcon,
  CubeIcon,
  ArrowLeftIcon, // Importado para el botón de regreso
  // DocumentTextIcon,
  // ChartBarIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";

// --- Custom Modal/Message Box (Reemplazo de alert()) ---
interface ModalProps {
  message: string;
  onClose: () => void;
}
const CustomModal: React.FC<ModalProps> = ({ message, onClose }) => (
  <div className="fixed inset-0 bg-gray-900 bg-opacity-70 z-[100] flex items-center justify-center p-4">
    <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 transform transition-all duration-300 scale-100">
      <div className="flex items-center space-x-3 mb-4">
        <span className="text-yellow-500 text-3xl">⚠️</span>
        <h3 className="text-xl font-bold text-gray-800">Atención Requerida</h3>
      </div>
      <p className="text-gray-600 mb-6">{message}</p>
      <div className="text-right">
        <button
          onClick={onClose}
          className="px-4 py-2 bg-pink-600 text-white rounded-lg font-medium hover:bg-pink-700 transition duration-150"
        >
          Entendido
        </button>
      </div>
    </div>
  </div>
);

// --- Componente de Botón de Sincronización (SIN CAMBIOS) ---
const SyncButton: React.FC = () => {
  const { sincronizarCambios, estaSincronizando, countTransacciones } =
    useSync();

  const getButtonState = () => {
    if (estaSincronizando) {
      return {
        className:
          "bg-gradient-to-r from-yellow-400 to-yellow-600 animate-pulse shadow-lg",
        text: "Sincronizando...",
        icon: (
          <div className="w-5 h-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
        ),
      };
    }

    if (countTransacciones > 0) {
      return {
        className:
          "bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 shadow-lg hover:shadow-xl transform hover:scale-105",
        text: `Sincronizar ${countTransacciones} cambio${
          countTransacciones > 1 ? "s" : ""
        }`,
        icon: <CloudArrowUpIcon className="w-5 h-5 animate-bounce" />,
      };
    }

    return {
      className:
        "bg-gradient-to-r from-gray-400 to-gray-600 cursor-not-allowed",
      text: "Sincronizado",
      icon: <CloudArrowUpIcon className="w-5 h-5" />,
    };
  };

  const buttonState = getButtonState();

  return (
    <button
      onClick={sincronizarCambios}
      disabled={estaSincronizando || countTransacciones === 0}
      className={`
        flex items-center space-x-3 px-4 py-2 md:px-6 md:py-3 text-sm font-bold text-white 
        rounded-xl transition-all duration-300 ease-out 
        ${buttonState.className}
        disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none
        group relative overflow-hidden flex-shrink-0
      `}
    >
      <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
      {buttonState.icon}
      <span className="relative">{buttonState.text}</span>
      {countTransacciones > 0 && !estaSincronizando && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full animate-ping" />
      )}
    </button>
  );
};

// --- Componente de Estado de Conexión (SIMPLIFICADO) ---
const ConnectionStatus: React.FC = () => {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    // Establecer estado inicial
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <div
      className={`flex items-center space-x-2 px-3 py-2 rounded-lg flex-shrink-0 ${
        isOnline ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
      }`}
    >
      <div
        className={`w-2 h-2 rounded-full ${
          isOnline ? "bg-green-500" : "bg-red-500"
        } ${isOnline ? "animate-pulse" : ""}`}
      />
      <span className="text-sm font-medium hidden sm:inline">
        {isOnline ? "En línea" : "Sin conexión"}
      </span>
      <span className="text-sm font-medium sm:hidden">
        {isOnline ? "Online" : "Offline"}
      </span>
    </div>
  );
};

// --- Componente de Navegación del Header (MODIFICADO) ---
const HeaderNavigation: React.FC<{
  seccionActual: string;
  setSeccionActual: (seccion: string) => void;
}> = ({ seccionActual, setSeccionActual }) => {
  const secciones = [
    { id: "inventario", nombre: "Inventario" },
    { id: "cotizaciones", nombre: "Cotizaciones" },
    { id: "facturacion", nombre: "Facturación" },
  ];

  return (
    <nav className="flex space-x-1 sm:space-x-2">
      {secciones.map((seccion) => (
        <button
          key={seccion.id}
          onClick={() => setSeccionActual(seccion.id)}
          className={`
            px-3 py-1 sm:px-4 sm:py-2 text-sm font-medium rounded-lg transition-all duration-200 flex-shrink-0
            ${
              seccionActual === seccion.id
                ? "text-pink-700 bg-pink-100 shadow-sm"
                : "text-gray-600 hover:text-pink-600 hover:bg-gray-50"
            }
          `}
        >
          {seccion.nombre}
        </button>
      ))}
    </nav>
  );
};

// --- Layout Principal (REDISEÑADO) ---
export const DashboardLayout: React.FC<{
  children: React.ReactNode;
  seccionActual: string;
  setSeccionActual: (seccion: string) => void;
}> = ({ children, seccionActual, setSeccionActual }) => {
  const { actualizarInventario, estaSincronizando, countTransacciones } =
    useSync();

  // Estado para el modal de advertencia
  const [modalMessage, setModalMessage] = useState<string | null>(null);

  // Lógica de Actualizar con Modal
  const handleActualizar = async () => {
    if (countTransacciones > 0) {
      setModalMessage(
        `Tienes ${countTransacciones} cambio${
          countTransacciones > 1 ? "s" : ""
        } pendientes. Debes sincronizar tus cambios antes de poder actualizar desde la nube.`
      );
      return;
    }
    await actualizarInventario();
  };

  const closeModal = () => setModalMessage(null);

  return (
    // Fondo general más limpio y minimalista
    <div className="min-h-screen bg-gray-50 font-sans">
      {modalMessage && (
        <CustomModal message={modalMessage} onClose={closeModal} />
      )}

      {/* Header rediseñado: Sticky, responsivo y profesional */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-lg border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 py-3">
          {/* Fila superior: Logo y Controles de Sincronización */}
          <div className="flex items-center justify-between">
            {/* IZQUIERDA: Botón de Regreso y Título */}
            <div className="flex items-center space-x-2 flex-shrink-0">
              {/* Botón de Regreso */}
              <Link
                href="/"
                title="Ir al Dashboard Inicial"
                className="p-2 rounded-full text-gray-500 hover:bg-gray-100 transition duration-150"
              >
                <ArrowLeftIcon className="w-6 h-6" />
              </Link>

              {/* Logo y Título */}
              <div className="flex items-center space-x-2">
                <div className="bg-gradient-to-r from-pink-500 to-rose-600 p-1.5 rounded-lg shadow-md flex-shrink-0">
                  <CubeIcon className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-lg sm:text-xl font-bold text-gray-800 leading-tight">
                  Sistema de gestión <br className="sm:hidden" />
                  <span className="text-pink-600">Cosmetics JG Duitama</span>
                </h1>
              </div>
            </div>

            {/* CENTRO (Desktop): Navegación Principal */}
            <div className="hidden md:block absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <HeaderNavigation
                seccionActual={seccionActual}
                setSeccionActual={setSeccionActual}
              />
            </div>

            {/* DERECHA (Desktop): Controles de Sincronización y Estado */}
            <div className="hidden md:flex items-center space-x-3 flex-shrink-0">
              <ConnectionStatus />

              {/* Botón de Actualizar */}
              <button
                onClick={handleActualizar}
                disabled={estaSincronizando || countTransacciones > 0}
                title={
                  countTransacciones > 0
                    ? "Sincroniza tus cambios pendientes primero"
                    : "Actualizar datos desde GAS"
                }
                className={`
                  p-3 rounded-xl transition-all duration-300 ease-out
                  text-gray-600 bg-gray-100 hover:bg-gray-200
                  disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50
                  ${estaSincronizando ? "animate-pulse" : ""}
                `}
              >
                <ArrowsUpDownIcon className="w-5 h-5" />
              </button>

              {/* Botón de Sincronización */}
              <SyncButton />
            </div>
          </div>

          {/* CONTROLES Y NAVEGACIÓN (MOBILE LAYOUT) */}
          <div className="md:hidden mt-3 pt-3 border-t border-gray-100 flex flex-col space-y-3">
            {/* Controles: Sincronización y Estado (Visible solo en móvil) */}
            <div className="flex items-center justify-between space-x-3">
              <ConnectionStatus />
              <div className="flex items-center space-x-3">
                {/* Botón de Actualizar (Móvil) */}
                <button
                  onClick={handleActualizar}
                  disabled={estaSincronizando || countTransacciones > 0}
                  title={
                    countTransacciones > 0
                      ? "Sincroniza tus cambios pendientes primero"
                      : "Actualizar datos desde GAS"
                  }
                  className={`
                            p-2 rounded-lg transition-all duration-300 ease-out
                            text-gray-600 bg-gray-100 hover:bg-gray-200
                            disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50
                            ${estaSincronizando ? "animate-pulse" : ""}
                        `}
                >
                  <ArrowsUpDownIcon className="w-5 h-5" />
                </button>
                <SyncButton />
              </div>
            </div>

            {/* Navegación (Horizontal Scrollable en móvil) */}
            <div className="overflow-x-auto pb-1 -mx-4 sm:-mx-6 px-4 sm:px-6">
              <HeaderNavigation
                seccionActual={seccionActual}
                setSeccionActual={setSeccionActual}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 py-8">
        {/* El contenido se renderiza en una tarjeta blanca "flotante" */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden min-h-[70vh]">
          {children}
        </div>
      </main>
    </div>
  );
};
