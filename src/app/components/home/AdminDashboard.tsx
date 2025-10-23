import React from "react";
import {
  ShoppingBagIcon,
  ClockIcon,
  ChartBarSquareIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";

// Definición de Colores mapeados a variables CSS para compatibilidad con Dark/Light Mode.
const COLORS = {
  BACKGROUND: "var(--background)",
  CARD_BG: "var(--background)",
  TEXT_MAIN: "var(--foreground)",
  TEXT_SECONDARY: "var(--foreground)",
  PRIMARY_ACCENT: "var(--color-primary)", // Pink-500
  SECONDARY_ACCENT: "var(--color-secondary)", // Rose-600
  SUCCESS_ACCENT: "var(--color-success)", // Emerald-500
  BORDER: "var(--border-color)",
  SHADOW_BASE: "var(--shadow-base)", // Variable de sombra para un look limpio
};

interface SectionCardProps {
  title: string;
  description: string;
  icon: React.ReactElement<React.SVGProps<SVGSVGElement>>; // Icono tipado correctamente
  href: string;
  color: string;
  // 💡 CORRECCIÓN: 'hoverColor' eliminado ya que no se usaba, resolviendo el warning.
}

/**
 * Tarjeta de navegación profesional y minimalista para el modo claro.
 */
const SectionCard: React.FC<SectionCardProps> = ({
  title,
  description,
  icon,
  href,
  color,
  // 💡 CORRECCIÓN: 'hoverColor' eliminado de la desestructuración
}) => {
  // 💡 CORRECCIÓN TS: Tipado correcto para Heroicons al clonar.
  const IconComponent = React.cloneElement(
    icon, // Ya tipado como React.ReactElement<React.SVGProps<SVGSVGElement>>
    {
      // Icono más grande y visible
      className:
        "h-12 w-12 transition-transform duration-300 group-hover:scale-110",
      style: { color: color }, // Usa el color del acento
    }
  );

  return (
    <a
      href={href}
      className="group flex flex-col justify-between p-6 md:p-8 rounded-xl transition-all duration-500 ease-in-out cursor-pointer transform hover:-translate-y-2 hover:shadow-xl relative overflow-hidden"
      style={{
        backgroundColor: COLORS.CARD_BG,
        border: `1px solid ${COLORS.BORDER}`,
        boxShadow: COLORS.SHADOW_BASE,
      }}
    >
      {/* Capa de fondo degradado en hover para efecto visual avanzado */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300 rounded-xl"
        style={{
          background: `linear-gradient(135deg, ${color}33, transparent 70%)`,
        }} // 33 es opacidad en HEX
      />

      <div className="relative z-10">
        <div className="mb-4">{IconComponent}</div>

        {/* Título */}
        <h2
          className="text-2xl font-bold mt-2 mb-1 tracking-tight"
          style={{ color: COLORS.TEXT_MAIN }}
        >
          {title}
        </h2>

        {/* Descripción (Minimalista) */}
        <p
          className="text-sm leading-snug opacity-80" // Texto más pequeño y condensado
          style={{ color: COLORS.TEXT_SECONDARY }}
        >
          {description}
        </p>
      </div>

      {/* Enlace de Acción */}
      <div className="flex items-center mt-6 relative z-10">
        <span
          className="text-sm font-semibold transition-all duration-300 group-hover:tracking-wider"
          style={{ color: color }}
        >
          Ir al Módulo
        </span>
        <ArrowRightIcon
          className="h-4 w-4 ml-2 transition-transform duration-300 group-hover:translate-x-1"
          style={{ color: color }}
        />
      </div>
    </a>
  );
};

/**
 * Página principal del Centro de Control del Panel de Administración.
 * @export
 * @default
 */
const App: React.FC = () => {
  const sections: SectionCardProps[] = [
    {
      title: "Business Intelligence (BI)",
      description:
        "KPIs, tendencias y analíticas de crecimiento en tiempo real.",
      icon: <ChartBarSquareIcon />,
      href: "/AdminPanel",
      color: COLORS.PRIMARY_ACCENT,
      // hoverColor: "rgba(236, 72, 153, 0.1)", // pink-500 con opacidad 10%
    },
    {
      title: "Inventario & TPV",
      description: "Control de stock, gestión de productos y punto de venta.",
      icon: <ShoppingBagIcon />,
      href: "/Inventario",
      color: COLORS.SECONDARY_ACCENT,
      // hoverColor: "rgba(225, 29, 72, 0.1)", // rose-600 con opacidad 10%
    },
    {
      title: "Historial y Auditoría",
      description:
        "Consultar, filtrar y exportar reportes de transacciones pasadas.",
      icon: <ClockIcon />,
      href: "/Facturacion",
      color: COLORS.SUCCESS_ACCENT,
      // hoverColor: "rgba(16, 185, 129, 0.1)", // emerald-500 con opacidad 10%
    },
  ];

  return (
    <div
      className="min-h-screen p-8 lg:p-16 flex flex-col items-center"
      style={{
        backgroundColor: COLORS.BACKGROUND,
      }}
    >
      {/* Encabezado Elegante y Marca */}
      <header className="text-center  lg:mb-16 max-w-4xl ">
        <p
          className="text-base font-semibold uppercase tracking-widest mb-1"
          style={{ color: COLORS.PRIMARY_ACCENT }}
        >
          Plataforma Empresarial
        </p>
        <h1
          className="text-5xl lg:text-6xl font-extrabold tracking-tight mb-2"
          style={{ color: COLORS.TEXT_MAIN }}
        >
          Centro de Módulos de Gestión
        </h1>
        <h2
          className="text-xl font-medium opacity-80"
          style={{ color: COLORS.TEXT_SECONDARY }}
        >
          Cosmétics JG Duitama
        </h2>
        <p
          className="mt-4 text-lg opacity-75"
          style={{ color: COLORS.TEXT_SECONDARY }}
        >
          Acceso rápido a las herramientas fundamentales para la administración
          y el crecimiento del negocio.
        </p>
      </header>

      {/* Contenedores de Sección (La Grid principal) */}
      <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {sections.map((section, index) => (
          <SectionCard key={index} {...section} />
        ))}
      </div>

      {/* Footer (Mock) */}
      <footer
        className="mt-20 pt-10 pb-6 border-t w-full max-w-6xl mx-auto text-center text-sm"
        style={{ borderColor: COLORS.BORDER }}
      >
        <p className="opacity-70 mb-2" style={{ color: COLORS.TEXT_SECONDARY }}>
          &copy; {new Date().getFullYear()} Cosmétics JG Duitama — Todos los
          derechos reservados.
        </p>
        <p className="text-xs" style={{ color: COLORS.TEXT_SECONDARY }}>
          Desarrollado con por{" "}
          <a
            href="https://briamtorres.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold hover:underline hover:text-blue-500 transition-colors"
            style={{ color: COLORS.TEXT_MAIN }}
          >
            Briam Torres & Cromneon
          </a>
        </p>
      </footer>
    </div>
  );
};

export default App;
