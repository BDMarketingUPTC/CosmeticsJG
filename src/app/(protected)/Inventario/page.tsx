"use client";

import { useState } from "react";
import { DashboardLayout } from "../../components/DashboardLayout";
import { InventarioSection } from "../../components/Inventario";
import { FacturacionSection } from "../../components/facturacion/Facturacion";
import { CotizacionesSection } from "../../components/cotizaciones/Cotizaciones";
import { SyncProvider } from "../../hooks/useSyncContext";

export default function Home() {
  // 1. El estado que controla la sección visible se define aquí.
  const [seccionActual, setSeccionActual] = useState("inventario");

  // 2. Esta función decide qué componente mostrar basado en el estado actual.
  const renderSeccion = () => {
    switch (seccionActual) {
      case "inventario":
        return <InventarioSection />;
      case "facturacion":
        return <FacturacionSection />;
      case "cotizaciones":
        return <CotizacionesSection />;
      default:
        // Por defecto, siempre muestra el inventario.
        return <InventarioSection />;
    }
  };

  return (
    <SyncProvider>
      <DashboardLayout
        // 3. Se pasan el estado y la función para actualizarlo al layout.
        seccionActual={seccionActual}
        setSeccionActual={setSeccionActual}
      >
        {/* 4. Aquí se renderiza el componente que la función 'renderSeccion' devuelve. */}
        {renderSeccion()}
      </DashboardLayout>
    </SyncProvider>
  );
}
