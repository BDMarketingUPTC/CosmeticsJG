import React, { useState } from "react";
import localforage from "localforage";
import { ArrowPathIcon } from "@heroicons/react/24/outline";

const COLORS = {
  PRIMARY: "#E91E63",
  ACCENT: "#D4AF37",
  BACKGROUND: "#FFF5F8",
  FOREGROUND: "#1A1A1A",
  BORDER: "#F8BBD0",
};

// 🚨 REEMPLAZAR con la URL de tu Despliegue de GAS
const GAS_AUTH_ENDPOINT = "/api/login";

interface LoginScreenProps {
  onLoginSuccess: (userData: { username: string }) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(GAS_AUTH_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "login",
          username,
          password,
        }),
      });

      const rawText = await response.text();
      console.log("🔍 Respuesta cruda del GAS:", rawText);

      if (!rawText) {
        throw new Error("Respuesta vacía del servidor");
      }

      let data;
      try {
        data = JSON.parse(rawText);
      } catch (parseError) {
        // Mejorando la depuración del error de parseo
        console.error("❌ Error al parsear JSON:", parseError);
        throw new Error("Respuesta no es JSON válido");
      }

      if (data.success) {
        const userData = { username };
        await localforage.setItem("userAuth", userData);
        onLoginSuccess(userData);
      } else {
        setError(data.message || "Credenciales inválidas.");
      }
    } catch (apiError) {
      // 💡 CORRECCIÓN TS: Uso de 'apiError' en console.error para eliminar el warning de variable no usada.
      console.error("❌ Error al intentar iniciar sesión:", apiError);
      setError(
        "Error de comunicación. Verifica tu conexión o la configuración del servidor."
      );
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        backgroundColor: COLORS.BACKGROUND,
        fontFamily: `'Poppins', sans-serif`,
      }}
    >
      <div
        className="w-full max-w-md p-10 rounded-2xl shadow-2xl"
        style={{
          backgroundColor: "white",
          border: `1px solid ${COLORS.BORDER}`,
        }}
      >
        <h1
          className="text-4xl font-serif text-center mb-2"
          style={{ color: COLORS.PRIMARY }}
        >
          Panel de Administración
        </h1>
        <h2
          className="text-xl font-medium text-center mb-8"
          style={{ color: COLORS.ACCENT }}
        >
          Cosmético JG Duitama
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-gray-700"
            >
              Usuario
            </label>
            <input
              id="username"
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 block w-full p-3 border rounded-lg focus:ring-2 focus:ring-pink-200"
              style={{ borderColor: COLORS.BORDER }}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700"
            >
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full p-3 border rounded-lg focus:ring-2 focus:ring-pink-200"
              style={{ borderColor: COLORS.BORDER }}
            />
          </div>

          {error && (
            <p
              className="text-sm font-medium text-center p-2 rounded"
              style={{ color: COLORS.PRIMARY, backgroundColor: "#FEE2E2" }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-full text-white font-medium shadow-md transition duration-200 hover:shadow-lg transform hover:scale-[1.01] disabled:opacity-50"
            style={{
              backgroundColor: COLORS.PRIMARY,
              // Usando template literal para la sombra y la variable COLORS.PRIMARY
              boxShadow: `0 4px 15px ${COLORS.PRIMARY}66`, // 66 = 40% opacidad
            }}
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <ArrowPathIcon className="w-5 h-5 mr-2 animate-spin" />
                Cargando...
              </span>
            ) : (
              "Iniciar Sesión"
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginScreen;
