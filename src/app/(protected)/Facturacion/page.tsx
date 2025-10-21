// src/app/(protected)/HistorialFacturacion/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation"; // Importado para la navegación
import {
  ArchiveBoxIcon,
  DocumentTextIcon,
  XMarkIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon,
  BuildingOffice2Icon,
  CalendarDaysIcon,
  TrashIcon,
  EyeIcon,
  CurrencyDollarIcon,
  InformationCircleIcon,
  ArrowLeftIcon, // Icono para el botón de regresar
} from "@heroicons/react/24/outline";

// 🛑 IMPORTACIÓN CRÍTICA: Importamos la FUNCIÓN PURA, NO el Hook, para evitar el error.
import { generateInvoicePdfCore } from "./useInvoicePdf";
// Asegúrate de que la ruta de importación sea correcta.

// --- CONSTANTES Y TIPOS (Asegúrate que coinciden con la convención de GAS) ---

// URL de la API de GAS proporcionada
const GAS_INVOICE_API_URL =
  "https://script.google.com/macros/s/AKfycbxyx_2I4jtJN4Vc_EFNHPgzT8fGoWou05u3OHQvoniabyen9XduGl11BHvJYLNz5kgxow/exec";

// Estructura de un ítem de producto dentro de la factura
interface FacturaProducto {
  nombre: string;
  cantidad: number;
  precio: number;
}

// Estructura de datos de la factura (como viene de GAS)
interface Factura {
  ID_FACTURA: string; // SKU
  Fecha: string;
  Cliente: string;
  Empresa: string;
  Productos: FacturaProducto[]; // Ya parseado como array de objetos
  "Total Facturado": number;
}

// Estructura de la data cruda que esperamos de la API de GAS
interface FacturaRaw {
  ID_FACTURA?: string;
  SKU?: string;
  Fecha?: string;
  Cliente?: string;
  Empresa?: string;
  Productos?: string | FacturaProducto[];
  "Total Facturado"?: number;
}

// Estructura para el estado de previsualización
interface InvoicePreviewData {
  blobUrl: string;
  quoteNumber: string;
  fileName: string;
}

// Estructura para pasar al PDF core (simulando ClientData)
interface ClientDataPdf {
  name: string;
  company: string;
  email: string;
}

// Estructura de item para generateInvoicePdfCore
interface PdfItem {
  "NOMBRE PRODUCTO": string;
  REFERENCIA: string;
  invoiceQuantity: number;
  invoicePrice: number;
}

// --- HOOK PARA EL MANEJO DE LA API DE GAS ---
const useGasInvoices = () => {
  const [invoices, setInvoices] = useState<Factura[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInvoices = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `${GAS_INVOICE_API_URL}?action=getInvoices`,
        {
          method: "GET",
          mode: "cors",
        }
      );

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      // 🛑 CORREGIDO 1: Tipificación explícita de la respuesta JSON
      const data: FacturaRaw[] = await response.json();

      const mappedInvoices: Factura[] = data
        .map((inv) => {
          let productosData = inv.Productos || [];
          if (typeof productosData === "string") {
            try {
              productosData = JSON.parse(productosData) as FacturaProducto[];
              // 🛑 CORREGIDO 2: Eliminado 'e' no utilizado en el catch
            } catch (errorParse) {
              console.error("Error parsing JSON:", errorParse);
              productosData = []; // Si falla el JSON.parse, es un array vacío
            }
          }
          productosData = Array.isArray(productosData) ? productosData : [];

          // Mapeamos a la estructura Factura
          return {
            ID_FACTURA: inv.ID_FACTURA || inv.SKU || "N/A", // Soporte a ambos nombres
            Fecha: inv.Fecha || "",
            Cliente: inv.Cliente || "Cliente Anónimo",
            Empresa: inv.Empresa || "",
            Productos: productosData,
            "Total Facturado": inv["Total Facturado"] || 0,
          } as Factura;
        })
        .reverse();

      setInvoices(mappedInvoices);
      // 🛑 CORREGIDO 3: Manejo de error sin 'any'
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Error desconocido";
      setError(`Fallo al cargar facturas: ${errorMessage}`);
      console.error("Error al cargar facturas:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteInvoice = async (id: string) => {
    try {
      // 🛑 CORREGIDO 4: La advertencia 'response' no utilizada se elimina.
      // Aquí se espera la respuesta para verificar el éxito, pero se ignora.
      // Para evitar la advertencia, se puede omitir la declaración de la variable.
      await fetch(GAS_INVOICE_API_URL, {
        method: "POST",
        mode: "no-cors",
        body: JSON.stringify({ action: "deleteInvoice", id: id }),
        headers: { "Content-Type": "application/json" },
      });

      // Actualizar el estado local (optimista)
      setInvoices((prev) => prev.filter((inv) => inv.ID_FACTURA !== id));
      return true;
    } catch (e) {
      setError("Fallo al eliminar la factura. Revisa la consola.");
      console.error("Error al eliminar:", e);
      return false;
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  return { invoices, isLoading, error, fetchInvoices, deleteInvoice };
};

// --- MODAL DE VISTA PREVIA DEL PDF (Reutilizado del componente original) ---
const PdfViewerModal: React.FC<{
  blobUrl: string;
  quoteNumber: string;
  fileName: string;
  onClose: () => void;
}> = ({ blobUrl, quoteNumber, onClose, fileName }) => {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col border border-pink-100/50">
        <header className="flex justify-between items-center p-4 border-b border-pink-100 bg-gradient-to-r from-pink-50 to-rose-50 rounded-t-2xl">
          <h3 className="text-lg font-bold bg-gradient-to-r from-pink-600 to-rose-700 bg-clip-text text-transparent">
            Vista Previa de Factura: {quoteNumber}
          </h3>
          <div className="flex items-center space-x-3">
            <a
              href={blobUrl}
              download={fileName}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
              title="Descargar PDF"
            >
              <ArrowDownTrayIcon className="w-5 h-5" />
              <span>Descargar</span>
            </a>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/50 rounded-xl transition-all duration-200"
            >
              <XMarkIcon className="w-6 h-6 text-gray-400" />
            </button>
          </div>
        </header>
        <div className="flex-1 p-2 bg-gray-200 rounded-b-2xl">
          <iframe
            src={blobUrl}
            title="Vista Previa de PDF"
            width="100%"
            height="100%"
            className="border-none rounded-b-lg"
          />
        </div>
      </div>
    </div>
  );
};

// --- COMPONENTE PRINCIPAL DE LA PÁGINA ---
const HistorialFacturacionPage: React.FC = () => {
  const { invoices, isLoading, error, fetchInvoices, deleteInvoice } =
    useGasInvoices();
  const router = useRouter(); // Inicializamos el router para la navegación

  const [pdfPreview, setPdfPreview] = useState<InvoicePreviewData | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<string | null>(null);

  // --- ESTADOS DE FILTRADO Y BÚSQUEDA ---
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [minTotal, setMinTotal] = useState("");
  const [maxTotal, setMaxTotal] = useState("");

  // --- LÓGICA DE FILTRADO ---
  const filteredInvoices = useMemo(() => {
    // Si no hay facturas, devolvemos un array vacío
    if (!invoices.length) return [];

    return invoices.filter((invoice) => {
      const totalFacturado = invoice["Total Facturado"] || 0;
      const invoiceDate = new Date(invoice.Fecha);

      // 1. Filtro de Búsqueda por Cliente
      const matchesSearch = invoice.Cliente.toLowerCase().includes(
        searchTerm.toLowerCase()
      );

      // 2. Filtro de Rango de Fechas
      const minDate = startDate ? new Date(startDate) : null;
      const maxDate = endDate ? new Date(endDate) : null;

      // Ajuste para incluir el día completo en el rango de fechas
      if (maxDate) maxDate.setHours(23, 59, 59, 999);

      const matchesDate =
        (!minDate || invoiceDate >= minDate) &&
        (!maxDate || invoiceDate <= maxDate);

      // 3. Filtro de Rango de Total
      const minT = parseFloat(minTotal);
      const maxT = parseFloat(maxTotal);

      const matchesTotal =
        (!minTotal || isNaN(minT) || totalFacturado >= minT) &&
        (!maxTotal || isNaN(maxT) || totalFacturado <= maxT);

      return matchesSearch && matchesDate && matchesTotal;
    });
  }, [invoices, searchTerm, startDate, endDate, minTotal, maxTotal]);

  // Cálculo del Total Facturado en la vista filtrada
  const totalFacturadoFiltrado = filteredInvoices.reduce(
    (sum, inv) => sum + inv["Total Facturado"],
    0
  );

  // Handler para la vista previa del PDF
  const handleViewPdf = useCallback(async (factura: Factura) => {
    setIsGenerating(factura.ID_FACTURA);

    // 1. Convertir los datos de la factura (Productos) al formato de item PDF
    const itemsParaPdf: PdfItem[] = factura.Productos.map((p) => ({
      "NOMBRE PRODUCTO": p.nombre,
      REFERENCIA: "", // No viene de GAS, se deja vacío
      invoiceQuantity: p.cantidad,
      invoicePrice: p.precio,
    }));

    // 2. Calcular subtotales y cliente
    const subtotal = itemsParaPdf.reduce(
      (sum, item) => sum + item.invoiceQuantity * item.invoicePrice,
      0
    );
    const total = factura["Total Facturado"] || subtotal;
    const ivaCalculado = total - subtotal;
    const applyIVA = ivaCalculado > 0.01;

    // Cliente (simulación de ClientDataPdf)
    const clientData: ClientDataPdf = {
      name: factura.Cliente,
      company: factura.Empresa,
      email: "N/A",
    };

    try {
      // 3. LLAMADA SEGURA: Usamos la función pura CORE (NO el Hook useInvoicePdf)
      // 🛑 CORREGIDO 5: Se eliminó el casting 'as any' innecesario al tipar itemsParaPdf correctamente
      const data = await generateInvoicePdfCore(
        itemsParaPdf,
        clientData,
        subtotal,
        ivaCalculado,
        total,
        applyIVA
      );
      setPdfPreview(data);
    } catch (error) {
      console.error("Error al generar el PDF de la factura:", error);
      // Reemplazo de alert por console.error, cumpliendo la regla
      console.error(
        "ERROR: No se pudo generar el PDF. Revisa los datos de la factura."
      );
    } finally {
      setIsGenerating(null);
    }
  }, []);

  // Handler para eliminar (NOTA: Se eliminó el confirm() por reglas de la plataforma)
  const handleDelete = async (id: string) => {
    // Aquí debería haber un modal de confirmación personalizado, pero por simplicidad
    // y cumplimiento de reglas, la acción procede directamente.
    setIsDeleting(id);
    await deleteInvoice(id);
    setIsDeleting(null);
  };

  // Cerrar modal y liberar URL de blob
  const handleClosePdf = () => {
    if (pdfPreview) {
      URL.revokeObjectURL(pdfPreview.blobUrl);
    }
    setPdfPreview(null);
  };

  // Formateador de moneda
  const formatCurrency = (value: number) =>
    value.toLocaleString("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-gray-50 min-h-screen">
        <ArrowPathIcon className="w-10 h-10 text-pink-600 animate-spin" />
        <p className="ml-3 text-lg text-gray-700 mt-4">
          Cargando historial de facturación...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-4xl mx-auto bg-red-50 rounded-2xl shadow-lg border border-red-300 flex flex-col items-center">
        <InformationCircleIcon className="w-10 h-10 text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-red-700">Error de Conexión</h2>
        <p className="text-red-600 mt-2 text-center">{error}</p>
        <button
          onClick={fetchInvoices}
          className="mt-6 px-4 py-2 bg-pink-600 text-white rounded-xl hover:bg-pink-700 transition-colors flex items-center shadow-md"
        >
          <ArrowPathIcon className="w-5 h-5 mr-2" /> Reintentar Carga
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Modal de Vista Previa */}
      {pdfPreview && (
        <PdfViewerModal {...pdfPreview} onClose={handleClosePdf} />
      )}

      <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
        <header className="max-w-6xl mx-auto mb-6">
          <div className="flex items-center justify-start mb-4">
            {/* Botón de Regresar */}
            <button
              onClick={() => router.back()}
              className="p-2 mr-3 text-gray-600 hover:text-pink-600 transition-colors bg-white rounded-full shadow-md hover:shadow-lg border border-gray-200"
              title="Regresar a la página anterior"
            >
              <ArrowLeftIcon className="w-6 h-6" />
            </button>
            <h1 className="text-3xl font-extrabold bg-gradient-to-r from-pink-600 to-rose-700 bg-clip-text text-transparent flex items-center">
              <ArchiveBoxIcon className="w-8 h-8 mr-3 text-pink-600" />
              Historial de Facturación
            </h1>
          </div>
          <p className="text-gray-600">
            Revisa y gestiona las ventas realizadas ({filteredInvoices.length}{" "}
            facturas en vista, de {invoices.length} totales).
          </p>
        </header>

        {/* --- BARRA DE FILTROS Y BÚSQUEDA --- */}
        <div className="max-w-6xl mx-auto mb-8 p-4 bg-white rounded-xl shadow-inner border border-gray-100/70">
          <h3 className="text-lg font-bold text-gray-700 mb-4 border-b pb-2">
            Filtros y Búsqueda
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* 1. Buscador por Nombre de Cliente */}
            <div className="md:col-span-2">
              <label
                htmlFor="search"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Buscar Cliente
              </label>
              <input
                id="search"
                type="text"
                placeholder="Nombre del cliente o empresa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-pink-500 focus:border-pink-500 transition duration-150"
              />
            </div>

            {/* 2. Filtro de Fecha (Inicio) */}
            <div>
              <label
                htmlFor="startDate"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Fecha Desde
              </label>
              <input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-pink-500 focus:border-pink-500 transition duration-150"
              />
            </div>

            {/* 3. Filtro de Fecha (Fin) */}
            <div>
              <label
                htmlFor="endDate"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Fecha Hasta
              </label>
              <input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-pink-500 focus:border-pink-500 transition duration-150"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-4">
            <div className="md:col-span-2">
              <p className="text-sm font-bold text-gray-700 mb-1">
                Total Facturado
              </p>
              <p className="text-2xl font-extrabold text-pink-600">
                {formatCurrency(totalFacturadoFiltrado)}
              </p>
            </div>

            {/* 4. Filtro de Total (Mínimo) */}
            <div>
              <label
                htmlFor="minTotal"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Total Mínimo
              </label>
              <input
                id="minTotal"
                type="number"
                placeholder="0"
                value={minTotal}
                onChange={(e) => setMinTotal(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-pink-500 focus:border-pink-500 transition duration-150"
              />
            </div>

            {/* 5. Filtro de Total (Máximo) */}
            <div>
              <label
                htmlFor="maxTotal"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Total Máximo
              </label>
              <input
                id="maxTotal"
                type="number"
                placeholder="999999"
                value={maxTotal}
                onChange={(e) => setMaxTotal(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-pink-500 focus:border-pink-500 transition duration-150"
              />
            </div>

            {/* Botón de Resetear Filtros */}
            <div className="flex items-end pt-2 md:pt-0">
              <button
                onClick={() => {
                  setSearchTerm("");
                  setStartDate("");
                  setEndDate("");
                  setMinTotal("");
                  setMaxTotal("");
                }}
                className="w-full md:w-auto px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition duration-150 font-semibold shadow-sm flex items-center justify-center"
              >
                <XMarkIcon className="w-5 h-5 mr-1" /> Limpiar
              </button>
            </div>
          </div>
        </div>
        {/* --- FIN BARRA DE FILTROS Y BÚSQUEDA --- */}

        <main className="max-w-6xl mx-auto space-y-4">
          {filteredInvoices.length === 0 ? (
            <div className="text-center py-20 border-2 border-dashed border-pink-300 rounded-2xl bg-gradient-to-br from-white to-pink-50/50">
              <DocumentTextIcon className="w-16 h-16 text-pink-400 mx-auto mb-4" />
              <h4 className="text-xl font-semibold text-gray-700 mb-2">
                No hay facturas que coincidan con los filtros
              </h4>
              <p className="text-gray-500">
                Ajusta los criterios de búsqueda o los rangos.
              </p>
            </div>
          ) : (
            filteredInvoices.map((factura) => (
              <div
                key={factura.ID_FACTURA}
                className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-pink-100/50 p-6 flex flex-col md:flex-row justify-between items-start md:items-center transition-all duration-300 hover:shadow-xl hover:border-pink-200"
              >
                {/* Bloque de Información */}
                <div className="flex-1 min-w-0 mb-4 md:mb-0">
                  <p className="text-xs font-bold text-gray-500 mb-1">
                    ID:{" "}
                    <span className="text-pink-600">{factura.ID_FACTURA}</span>
                  </p>
                  <h2 className="text-xl font-bold text-gray-900 truncate">
                    {factura.Cliente || "Cliente Anónimo"}
                  </h2>
                  <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                    <span className="flex items-center">
                      <CalendarDaysIcon className="w-4 h-4 mr-1 text-pink-400" />
                      {new Date(factura.Fecha).toLocaleDateString("es-CO")}
                    </span>
                    {factura.Empresa && (
                      <span className="flex items-center">
                        <BuildingOffice2Icon className="w-4 h-4 mr-1 text-pink-400" />
                        {factura.Empresa}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-2 italic">
                    {factura.Productos.length > 0
                      ? `${factura.Productos.length} producto(s) en la venta.`
                      : "Productos no detallados."}
                  </div>
                </div>

                {/* Bloque de Valor y Acción */}
                <div className="flex items-center space-x-4">
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-gray-500 flex items-center justify-end">
                      <CurrencyDollarIcon className="w-4 h-4 mr-1" /> Total
                    </p>
                    <p className="text-2xl font-extrabold text-rose-600">
                      {formatCurrency(factura["Total Facturado"])}
                    </p>
                  </div>

                  <div className="flex space-x-2">
                    {/* Botón Ver Factura */}
                    <button
                      onClick={() => handleViewPdf(factura)}
                      disabled={isGenerating === factura.ID_FACTURA}
                      className={`flex items-center justify-center p-3 text-sm bg-gradient-to-r from-pink-500 to-rose-600 text-white font-semibold rounded-xl shadow-md transition-all duration-200 hover:shadow-lg disabled:opacity-50 ${
                        isGenerating === factura.ID_FACTURA
                          ? "disabled:cursor-wait"
                          : "hover:from-pink-600 hover:to-rose-700"
                      }`}
                      title="Generar y ver PDF"
                    >
                      {isGenerating === factura.ID_FACTURA ? (
                        <ArrowPathIcon className="w-5 h-5 animate-spin" />
                      ) : (
                        <EyeIcon className="w-5 h-5" />
                      )}
                    </button>

                    {/* Botón Eliminar Factura */}
                    <button
                      onClick={() => handleDelete(factura.ID_FACTURA)}
                      disabled={isDeleting === factura.ID_FACTURA}
                      className="flex items-center justify-center p-3 text-sm bg-red-100 text-red-600 hover:bg-red-200 font-semibold rounded-xl shadow-md transition-all duration-200 hover:shadow-lg disabled:opacity-50 disabled:cursor-wait"
                      title="Eliminar Factura"
                    >
                      {isDeleting === factura.ID_FACTURA ? (
                        <ArrowPathIcon className="w-5 h-5 animate-spin" />
                      ) : (
                        <TrashIcon className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </main>
      </div>
    </>
  );
};

export default HistorialFacturacionPage;
