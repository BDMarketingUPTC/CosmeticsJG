import "./globals.css";
import type { Metadata } from "next";
import { Poppins, Playfair_Display } from "next/font/google"; // 1. Importa las nuevas fuentes
import { SyncProvider } from "./hooks/useSyncContext";
import { StatusIndicator } from "./components/StatusIndicator";

// 2. Define y configura las instancias de las fuentes
// Fuente Sans (Poppins) - Usada para el cuerpo del texto
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"], // Define los pesos que necesitas
  variable: "--font-sans", // 3. Asigna la variable CSS --font-sans
});

// Fuente Serif (Playfair Display) - Usada para títulos
const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  variable: "--font-serif", // 3. Asigna la variable CSS --font-serif
});

export const metadata: Metadata = {
  title: "Panel de Administración",
  description: "Gestión de inventario y facturación",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      {/* 4. Aplica las variables CSS al body */}
      <body
        className={`${poppins.variable} ${playfair.variable}`}
        style={{ fontFamily: "var(--font-sans)" }}
      >
        <SyncProvider>
          <main>{children}</main>
          {/* <StatusIndicator /> */}
        </SyncProvider>
      </body>
    </html>
  );
}
