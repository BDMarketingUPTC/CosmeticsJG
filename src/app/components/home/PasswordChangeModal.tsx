import React, { useState, useEffect, useCallback } from "react";
import localforage from "localforage";
import {
  ArrowPathIcon,
  EnvelopeIcon,
  InformationCircleIcon,
  KeyIcon,
} from "@heroicons/react/24/outline";

const COLORS = {
  PRIMARY: "#E91E63",
  ACCENT: "#D4AF37",
  BORDER: "#F8BBD0",
  FOREGROUND: "#1A1A1A",
};

// 🚨 REEMPLAZAR con la URL de tu Despliegue de GAS
// Nota: Usar un proxy como '/api/login/contrasena' es una buena práctica de seguridad.
const LOCAL_API_ENDPOINT = "/api/login/contrasena";

interface PasswordChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
}

const PasswordChangeModal: React.FC<PasswordChangeModalProps> = ({
  isOpen,
  onClose,
  username,
}) => {
  const [step, setStep] = useState(1);
  const [emailKey, setEmailKey] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // --- CORRECCIÓN CLAVE: Usamos useState para guardar la clave generada ---
  const [tempKey, setTempKey] = useState("");

  // Función para generar una nueva clave (usamos useCallback por limpieza)
  const generateNewKey = useCallback(() => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }, []);

  // --- Ciclo de Vida: Solo generar la clave al abrir el modal ---
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setEmailKey("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage("");

      // Generar la clave SOLAMENTE cuando el modal se abre y guardarla en el estado
      setTempKey(generateNewKey());
    }
  }, [isOpen, generateNewKey]);

  if (!isOpen) return null;

  // --- Step 1: Solicitud de envío de clave por correo ---
  const handleSendKey = async () => {
    // Si la clave no se generó (caso inusual), la generamos ahora.
    if (!tempKey) {
      setTempKey(generateNewKey());
    }

    setIsLoading(true);
    setMessage("");

    try {
      const response = await fetch(LOCAL_API_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sendTempKey",
          username,
          tempKey, // Usamos la clave constante del estado
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage(
          "Clave secreta enviada al correo registrado. Revisa tu bandeja de entrada."
        );
        setStep(2);
      } else {
        setMessage(
          data.message ||
            "Error al enviar la clave. Verifica que el usuario tenga un correo."
        );
      }
    } catch (error) {
      // 💡 CORRECCIÓN TS: Uso explícito de 'error' en console.error
      console.error("Error al intentar enviar la clave:", error);
      setMessage("Error de conexión al intentar enviar la clave.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- Step 2: Verificación de clave y actualización de contraseña ---
  const handleUpdatePassword = async () => {
    if (newPassword !== confirmPassword) {
      setMessage("Las contraseñas no coinciden.");
      return;
    }

    // 1. Verificación Front-end de la clave: AHORA SÍ FUNCIONARÁ CORRECTAMENTE
    if (emailKey !== tempKey) {
      setMessage(
        "La clave secreta ingresada es incorrecta. Vuelve a solicitarla si es necesario."
      );
      return;
    }

    setIsLoading(true);
    setMessage("");

    try {
      const response = await fetch(LOCAL_API_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updatePassword",
          username,
          newPassword,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage(
          "¡Contraseña actualizada exitosamente! Se cerrará la sesión para que uses la nueva clave."
        );
        setTimeout(() => {
          onClose();
          localforage
            .removeItem("userAuth")
            .then(() => window.location.reload());
        }, 3000);
      } else {
        setMessage(
          data.message || "Error al actualizar la contraseña en el Sheets."
        );
      }
    } catch (error) {
      // 💡 CORRECCIÓN TS: Uso explícito de 'error' en console.error
      console.error("Error de conexión al intentar actualizar:", error);
      setMessage("Error de conexión al intentar actualizar.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
      <div
        className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-lg"
        style={{ border: `2px solid ${COLORS.PRIMARY}` }}
      >
        <h2
          className="text-2xl font-serif mb-6 flex items-center"
          style={{ color: COLORS.PRIMARY }}
        >
          <KeyIcon className="w-6 h-6 mr-2" />
          Cambiar Contraseña para {username}
        </h2>

        {message && (
          <p
            className="text-sm font-medium p-3 rounded mb-4 flex items-center"
            style={{ color: COLORS.FOREGROUND, backgroundColor: COLORS.BORDER }}
          >
            <InformationCircleIcon className="w-5 h-5 mr-2" />
            {message}
          </p>
        )}

        {/* PASO 1: Solicitud de Clave */}
        {step === 1 && (
          <>
            <p className="text-gray-600 mb-6">
              Se generará una clave secreta (6 dígitos) para el usuario{" "}
              <b>{username}</b> y se enviará al correo registrado.
            </p>
            <button
              onClick={handleSendKey}
              disabled={isLoading}
              className="w-full py-3 rounded-full text-white font-medium transition duration-200 disabled:opacity-50 disabled:cursor-wait flex items-center justify-center"
              style={{ backgroundColor: COLORS.PRIMARY }}
            >
              {isLoading ? (
                <span className="flex items-center">
                  <ArrowPathIcon className="w-5 h-5 mr-2 animate-spin" />
                  Enviando clave...
                </span>
              ) : (
                <span className="flex items-center">
                  <EnvelopeIcon className="w-5 h-5 mr-2" />
                  Solicitar Clave Secreta por Correo
                </span>
              )}
            </button>
          </>
        )}

        {/* PASO 2: Verificación de Clave y Nueva Contraseña */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Clave Secreta del Correo (6 dígitos)
              </label>
              <input
                type="text"
                maxLength={6}
                value={emailKey}
                onChange={(e) => setEmailKey(e.target.value)}
                className="mt-1 block w-full p-3 border rounded-lg focus:ring-2 focus:ring-pink-200"
                style={{ borderColor: COLORS.BORDER }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Nueva Contraseña
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1 block w-full p-3 border rounded-lg focus:ring-2 focus:ring-pink-200"
                style={{ borderColor: COLORS.BORDER }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Verificar Nueva Contraseña
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 block w-full p-3 border rounded-lg focus:ring-2 focus:ring-pink-200"
                style={{ borderColor: COLORS.BORDER }}
              />
            </div>

            <button
              onClick={handleUpdatePassword}
              disabled={
                isLoading || !emailKey || !newPassword || !confirmPassword
              }
              className="w-full py-3 rounded-full text-white font-medium transition duration-200 disabled:opacity-50 disabled:cursor-wait flex items-center justify-center"
              style={{ backgroundColor: COLORS.ACCENT }}
            >
              {isLoading ? (
                <span className="flex items-center">
                  <ArrowPathIcon className="w-5 h-5 mr-2 animate-spin" />
                  Actualizando...
                </span>
              ) : (
                "Actualizar Contraseña"
              )}
            </button>
          </div>
        )}

        <button
          onClick={onClose}
          className="mt-4 text-sm text-gray-500 hover:text-gray-700"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
};

export default PasswordChangeModal;
