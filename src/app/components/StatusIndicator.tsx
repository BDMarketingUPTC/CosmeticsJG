"use client";

import React, { useState, useEffect, useCallback } from "react";
// Eliminamos el MOCK y restauramos la importación del hook real que proporciona el contexto.
import { useSync } from "../hooks/useSyncContext";
import {
  CheckCircleIcon,
  WifiIcon,
  ArrowPathIcon,
  CloudArrowUpIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

export const StatusIndicator: React.FC = () => {
  // Ahora usamos el hook real:
  const { isOnline, estaSincronizando, countTransacciones } = useSync();

  const [isVisible, setIsVisible] = useState(true);
  const [showNotification, setShowNotification] = useState(false);
  const [previousStatusType, setPreviousStatusType] = useState<string>("");

  // ==================================================================
  // === Lógica para determinar el estado actual ======================
  // ==================================================================
  const getStatus = useCallback(() => {
    if (estaSincronizando) {
      return {
        type: "syncing",
        icon: <ArrowPathIcon className="w-4 h-4 animate-spin" />, // Añadida animación de rotación
        text: "Sincronizando...",
        description: "Guardando cambios en la nube",
        gradient: "from-blue-500 to-cyan-500",
        bgColor: "bg-gradient-to-r from-blue-500 to-cyan-500",
        borderColor: "border-blue-200",
        textColor: "text-white",
        pulse: true,
        progress: true,
      };
    }

    if (!isOnline) {
      return {
        type: "offline",
        icon: <WifiIcon className="w-4 h-4" />,
        text: `Modo Offline`,
        description: `${countTransacciones} cambio${
          countTransacciones !== 1 ? "s" : ""
        } local${countTransacciones !== 1 ? "es" : ""}`,
        gradient: "from-gray-600 to-gray-700",
        bgColor: "bg-gradient-to-r from-gray-600 to-gray-700",
        borderColor: "border-gray-500",
        textColor: "text-white",
        pulse: true,
        badge: countTransacciones,
      };
    }

    if (countTransacciones > 0) {
      return {
        type: "pending",
        icon: <CloudArrowUpIcon className="w-4 h-4" />,
        text: "Pendiente",
        description: `${countTransacciones} cambio${
          countTransacciones !== 1 ? "s" : ""
        } por sincronizar`,
        gradient: "from-amber-500 to-orange-500",
        bgColor: "bg-gradient-to-r from-amber-500 to-orange-500",
        borderColor: "border-amber-200",
        textColor: "text-white",
        pulse: true,
        badge: countTransacciones,
      };
    }

    return {
      type: "synced",
      icon: <CheckCircleIcon className="w-4 h-4" />,
      text: "Sincronizado",
      description: "Todo está actualizado en la nube",
      gradient: "from-emerald-500 to-green-500",
      bgColor: "bg-gradient-to-r from-emerald-500 to-green-500",
      borderColor: "border-emerald-200",
      textColor: "text-white",
      pulse: false,
    };
  }, [isOnline, estaSincronizando, countTransacciones]);

  const status = getStatus();

  // ==================================================================
  // === Lógica de Notificación con Auto-ocultado (Timeout) ===========
  // ==================================================================
  useEffect(() => {
    const currentState = status.type;
    let timer: NodeJS.Timeout;

    // Solo mostramos el toast si el estado ha cambiado
    if (previousStatusType && previousStatusType !== currentState) {
      // 1. Mostrar notificación
      setShowNotification(true);

      // 2. Ocultar notificación después de 4 segundos
      timer = setTimeout(() => {
        setShowNotification(false);
      }, 4000); // 4 segundos de visibilidad
    }

    // 3. Actualizar el estado previo para la próxima comparación
    setPreviousStatusType(currentState);

    // 4. Limpieza del timer al desmontar o antes de ejecutar un nuevo efecto
    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [status.type, previousStatusType]);

  // ==================================================================
  // === Componente Toast de Notificación Temporal ====================
  // ==================================================================
  const NotificationToast = () => (
    <div
      // Posición fija en la esquina inferior izquierda, justo encima del indicador principal
      className="fixed bottom-20 left-6 z-50 animate-in slide-in-from-left-10 duration-300"
    >
      <div
        className={`
          flex items-center space-x-3 p-4 rounded-2xl shadow-2xl 
          bg-white/95 backdrop-blur-xl border ${status.borderColor}
          min-w-[280px] transform transition-all duration-500
        `}
      >
        <div
          className={`p-2 rounded-full ${status.bgColor} shadow-lg text-white`}
        >
          {/* El icono usa el estado real. El de syncing ya tiene el animate-spin */}
          {status.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">{status.text}</p>
          <p className="text-xs text-gray-600 truncate">{status.description}</p>
        </div>

        {/* Botón de cierre manual */}
        <button
          onClick={() => setShowNotification(false)}
          className="p-1 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
          title="Cerrar notificación"
        >
          <XMarkIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* 1. Notification Toast (Visible solo al cambiar el estado) */}
      {showNotification && <NotificationToast />}

      {/* 2. Main Status Indicator (Visible permanentemente o cerrado manualmente) */}
      {/* Ubicado en la esquina inferior IZQUIERDA (left-6) */}
      <div className="fixed bottom-6 left-6 z-50 animate-in fade-in duration-500">
        <div className="relative group">
          {/* Background Glow Effect */}
          <div
            className={`
              absolute inset-0 rounded-2xl bg-gradient-to-r ${status.gradient} 
              opacity-20 group-hover:opacity-30 blur-lg transition-all duration-300
              ${
                status.pulse && status.type !== "syncing" ? "animate-pulse" : ""
              }
            `}
          />

          {/* Main Indicator */}
          <button
            onClick={() => setIsVisible(!isVisible)}
            className={`
              relative flex items-center space-x-3 px-4 py-3 
              rounded-2xl shadow-2xl border backdrop-blur-xl
              transition-all duration-300 ease-out transform
              hover:scale-105 hover:shadow-3xl active:scale-95
              ${status.bgColor} ${status.borderColor} border
              ${
                // El indicador principal se oculta hacia la IZQUIERDA si no es visible
                isVisible ? "translate-x-0" : "-translate-x-32"
              } 
            `}
          >
            {/* Animated Icon */}
            <div className="relative">
              <div
                className={`${
                  status.pulse && status.type !== "syncing" // Desactivamos el ping si está girando
                    ? "animate-ping absolute -inset-1 rounded-full opacity-30"
                    : ""
                } ${status.bgColor}`}
              />
              <div className="relative text-white">{status.icon}</div>
            </div>

            {/* Text Content */}
            <div className="flex items-center space-x-3">
              <div className="text-left">
                <p className={`text-sm font-bold ${status.textColor}`}>
                  {status.text}
                </p>
                <p
                  className={`text-xs font-medium ${status.textColor} opacity-90`}
                >
                  {status.description}
                </p>
              </div>

              {/* Badge for counts */}
              {status.badge && (
                <div
                  className={`
                    flex items-center justify-center min-w-6 h-6 px-1
                    rounded-full text-xs font-bold
                    bg-white/20 backdrop-blur-sm border border-white/30
                    animate-bounce
                  `}
                >
                  {status.badge}
                </div>
              )}

              {/* Progress Indicator */}
              {status.progress && (
                <div className="w-16 h-1 bg-white/30 rounded-full overflow-hidden">
                  <div className="h-full bg-white animate-progress" />
                </div>
              )}
            </div>

            {/* Close/Open Toggle */}
            <div
              className={`
                absolute -right-2 w-5 h-5 rounded-full border-2 border-white 
                bg-gray-600 flex items-center justify-center
                transition-transform duration-300
                ${isVisible ? "rotate-180" : "rotate-0"}
              `}
            >
              <div className="w-1 h-1 bg-white rounded-full" />
            </div>
          </button>

          {/* Extended Status Info (on hover) */}
          {/* Panel de hover posicionado en 'left-0' para que se expanda hacia la derecha */}
          <div className="absolute bottom-16 left-0 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none">
            <div className="bg-white/95 backdrop-blur-xl rounded-2xl p-4 shadow-2xl border border-gray-200 min-w-[200px]">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-900">
                  Estado del Sistema
                </p>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">Conexión:</span>
                  <span
                    className={`text-xs font-medium ${
                      isOnline ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {isOnline ? "En línea" : "Offline"}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">Sincronización:</span>
                  <span
                    className={`text-xs font-medium ${
                      countTransacciones === 0
                        ? "text-green-600"
                        : "text-amber-600"
                    }`}
                  >
                    {countTransacciones === 0 ? "Al día" : "Pendiente"}
                  </span>
                </div>

                <div className="pt-2 border-t border-gray-200">
                  <p className="text-xs text-gray-500">
                    {!isOnline
                      ? "Los cambios se guardan localmente hasta recuperar conexión"
                      : countTransacciones > 0
                      ? "Los cambios se sincronizarán automáticamente"
                      : "Todo sincronizado correctamente"}
                  </p>
                </div>
              </div>
              {/* Decorative accent: ahora en -right-1 */}
              <div className="absolute top-4 -right-1 w-1 h-8 rounded-full bg-gradient-to-b from-pink-500 to-rose-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Custom animations */}
      <style jsx>{`
        @keyframes progress {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        .animate-progress {
          animation: progress 2s linear infinite; /* Usamos linear para simular un progreso continuo */
        }
        .shadow-3xl {
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        }
      `}</style>
    </>
  );
};
