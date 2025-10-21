"use client";

import React, { useState, useMemo } from "react";
import {
  PlusIcon,
  TrashIcon,
  XMarkIcon,
  PrinterIcon,
  PencilIcon,
  InformationCircleIcon,
  DocumentChartBarIcon,
  UserCircleIcon,
  CubeIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";

// Asegúrate de que la ruta a tu hook sea correcta
// 💡 Importamos Producto desde el contexto de sincronización
import { useSync, Producto } from "../../hooks/useSyncContext";
// Importamos el nuevo hook de lógica de PDF
// Asumimos que usePdfGenerator acepta los tipos correctos
import { usePdfGenerator } from "./usePdfGenerator";

// --- INTERFACES ---

// 💡 CORRECCIÓN TS: Sobreescribimos las propiedades de Producto para forzar a que sean 'number'
// dentro de QuoteItem, eliminando la incompatibilidad de 'number | null'.
interface QuoteItem extends Producto {
  "PRECIO COMPRA UNIDAD": number;
  "PRECIO VENTA": number;
  "Cantidad unds": number;

  // Campos específicos de cotización, que también son numéricos
  quoteQuantity: number;
  quotePrice: number;
}

interface QuoteDetails {
  validityDays: number;
  finalMessage: string;
}

// --- Componente de Vista Previa de PDF (Modal) ---
const PdfViewerModal: React.FC<{
  blobUrl: string;
  quoteNumber: string;
  onClose: () => void;
}> = ({ blobUrl, quoteNumber, onClose }) => {
  // ... (Componente se mantiene igual)
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col border border-pink-100/50">
        {/* Encabezado del Modal */}
        <header className="flex justify-between items-center p-4 border-b border-pink-100 bg-gradient-to-r from-pink-50 to-rose-50 rounded-t-2xl">
          <h3 className="text-lg font-bold bg-gradient-to-r from-pink-600 to-rose-700 bg-clip-text text-transparent">
            Vista Previa: {quoteNumber}
          </h3>
          <div className="flex items-center space-x-3">
            <a
              href={blobUrl}
              download={`cotizacion_${quoteNumber}.pdf`}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
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
        {/* Contenido (iframe para el PDF) */}
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

// --- Componente Principal Rediseñado ---
export const CotizacionesSection: React.FC = () => {
  const { inventario, inicializado } = useSync();
  const { generatePdf } = usePdfGenerator();

  // --- ESTADOS DE LA COTIZACIÓN ---
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [client, setClient] = useState({ name: "", company: "", email: "" });
  const [quoteDetails, setQuoteDetails] = useState<QuoteDetails>({
    validityDays: 15,
    finalMessage: "Ha sido un placer atenderle. Estamos a su disposición.",
  });
  const [applyIVA, setApplyIVA] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // --- ESTADOS DE INTERACCIÓN CON EL PDF ---
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedQuoteData, setGeneratedQuoteData] = useState<{
    blobUrl: string;
    quoteNumber: string;
    fileName: string;
  } | null>(null);

  // --- Handlers ---
  const handleAddProduct = (producto: Producto) => {
    // 💡 OK: SKU es accesible
    if (quoteItems.find((item) => item.SKU === producto.SKU)) return;
    setQuoteItems((prev) => [
      ...prev,
      {
        ...producto,
        // Al crear QuoteItem, aseguramos que los campos se resuelvan a number (0 o 1)
        "PRECIO VENTA": producto["PRECIO VENTA"] ?? 0,
        "PRECIO COMPRA UNIDAD": producto["PRECIO COMPRA UNIDAD"] ?? 0,
        "Cantidad unds": producto["Cantidad unds"] ?? 0,

        quoteQuantity: 1,
        quotePrice: producto["PRECIO VENTA"] ?? 0,
      } as QuoteItem, // Casting a QuoteItem con los tipos forzados a number
    ]);
    setSearchTerm("");
  };

  const handleRemoveProduct = (sku: string) => {
    // 💡 OK: SKU es accesible
    setQuoteItems((prev) => prev.filter((item) => item.SKU !== sku));
  };

  const handleItemChange = (
    sku: string,
    field: "quoteQuantity" | "quotePrice",
    value: string
  ) => {
    const num = parseFloat(value) || 0;
    // 💡 OK: SKU es accesible
    setQuoteItems((prev) =>
      prev.map((item) => (item.SKU === sku ? { ...item, [field]: num } : item))
    );
  };

  const handleClientChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setClient({ ...client, [e.target.name]: e.target.value });
  };

  // --- Filtrado ---
  const filteredProducts = useMemo(() => {
    if (!searchTerm) return [];
    const lower = searchTerm.toLowerCase();
    // 💡 OK: Producto se infiere correctamente
    return inventario
      .filter(
        (p) =>
          p["NOMBRE PRODUCTO"].toLowerCase().includes(lower) ||
          String(p.REFERENCIA).toLowerCase().includes(lower) ||
          (p.marca && p.marca.toLowerCase().includes(lower))
      )
      .slice(0, 15);
  }, [searchTerm, inventario]);

  // --- Cálculos (Logica de cotizaciones) ---
  const totals = useMemo(() => {
    const subtotal = quoteItems.reduce(
      (acc, item) => acc + item.quotePrice * item.quoteQuantity,
      0
    );
    const iva = applyIVA ? subtotal * 0.19 : 0;
    return { subtotal, iva, total: subtotal + iva };
  }, [quoteItems, applyIVA]);

  // --- HANDLER DE GENERACIÓN DE PDF ---
  const handleGenerateAndShowPdf = async () => {
    if (quoteItems.length === 0 || !client.name.trim()) return;

    setIsGenerating(true);

    try {
      // Pasamos los items tal como están (QuoteItem[]) al generador que espera ese tipo
      const pdfData = await generatePdf(
        quoteItems,
        client,
        quoteDetails,
        totals
      );

      setGeneratedQuoteData(pdfData);
    } catch (error) {
      console.error("Error generando el PDF:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const closePdfModal = () => {
    // 💡 CORRECCIÓN 2: Uso del encadenamiento opcional (?) para evitar TS2531
    if (generatedQuoteData?.blobUrl) {
      // Limpiar la URL del blob para liberar memoria
      URL.revokeObjectURL(generatedQuoteData.blobUrl);
    }
    setGeneratedQuoteData(null);
  };

  if (!inicializado) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="ml-3 text-pink-600">Cargando inventario...</p>
      </div>
    );
  }

  return (
    <>
      {/* --- RENDER DEL MODAL --- */}
      {generatedQuoteData && (
        <PdfViewerModal
          blobUrl={generatedQuoteData.blobUrl}
          quoteNumber={generatedQuoteData.quoteNumber}
          onClose={closePdfModal}
        />
      )}

      {/* --- ESTRUCTURA DE GRID --- */}
      <div
        className={`grid grid-cols-1 xl:grid-cols-4 gap-6 ${
          generatedQuoteData ? "no-print" : ""
        }`}
      >
        {/* --- COLUMNA 1: BÚSQUEDA --- */}
        <div className="xl:col-span-1 h-auto">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-pink-100/50 p-6 h-auto">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center flex-shrink-0">
              <PlusIcon className="w-5 h-5 mr-2 text-pink-600" />
              1. Agregar Productos
            </h3>
            <div className="relative mb-4 flex-shrink-0">
              <input
                type="text"
                placeholder="🔍 Buscar productos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 bg-white/80 transition-all duration-200"
              />
            </div>
            <div className="overflow-y-auto max-h-[400px]">
              {searchTerm && filteredProducts.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-xl shadow-lg">
                  {filteredProducts.map((product: Producto) => (
                    <div
                      key={product.SKU}
                      onClick={() => handleAddProduct(product)}
                      className="p-4 hover:bg-pink-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors duration-200 group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 truncate">
                            {product["NOMBRE PRODUCTO"]}
                          </h4>
                          <div className="flex items-center space-x-4 mt-2">
                            <span className="text-sm font-semibold text-green-600">
                              {(product["PRECIO VENTA"] || 0).toLocaleString(
                                "es-CO",
                                {
                                  style: "currency",
                                  currency: "COP",
                                  maximumFractionDigits: 0,
                                }
                              )}
                            </span>
                            <span
                              className={`text-xs font-medium ${
                                (product["Cantidad unds"] || 0) > 0
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}
                            >
                              Stock: {product["Cantidad unds"] || 0}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4 flex-shrink-0">
                          <div className="p-2 bg-gray-100 rounded-full group-hover:bg-pink-100 transition-colors">
                            <PlusIcon className="w-4 h-4 text-gray-400 group-hover:text-pink-600" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {searchTerm && filteredProducts.length === 0 && (
                <p className="text-center text-gray-500 p-4">
                  No se encontraron productos.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* --- COLUMNA 2: ITEMS DE COTIZACIÓN --- */}
        <div className="xl:col-span-2 h-auto">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-pink-100/50 p-6 h-auto">
            <div className="flex items-center justify-between mb-6 flex-shrink-0">
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-pink-600 to-rose-700 bg-clip-text text-transparent">
                  Generador de Cotizaciones
                </h2>
                <p className="text-gray-600 mt-1">Items: {quoteItems.length}</p>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="applyIVA"
                  checked={applyIVA}
                  onChange={(e) => setApplyIVA(e.target.checked)}
                  className="w-4 h-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded"
                />
                <label
                  htmlFor="applyIVA"
                  className="text-sm font-semibold text-gray-700"
                >
                  Aplicar IVA (19%)
                </label>
              </div>
            </div>
            <div className="space-y-4">
              {quoteItems.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed border-gray-300 rounded-2xl bg-gradient-to-br from-gray-50 to-pink-50/30 flex flex-col justify-center">
                  <DocumentChartBarIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-xl font-semibold text-gray-600 mb-2">
                    No hay productos
                  </h4>
                  <p className="text-gray-500">
                    Busca y agrega productos para comenzar
                  </p>
                </div>
              ) : (
                quoteItems.map((item) => {
                  // item["Cantidad unds"] puede ser number o null, usamos ?? 0
                  const hasExceededStock =
                    item.quoteQuantity > (item["Cantidad unds"] ?? 0);
                  return (
                    <div
                      key={item.SKU}
                      className="flex items-center bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 group"
                    >
                      <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-pink-100 to-rose-200 rounded-lg flex items-center justify-center shadow-sm">
                        <CubeIcon className="w-6 h-6 text-pink-600" />
                      </div>
                      <div className="flex-1 ml-4 min-w-0">
                        <h4 className="font-semibold text-gray-900 truncate">
                          {item["NOMBRE PRODUCTO"]}
                        </h4>
                        <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                          <span>Ref: {item.REFERENCIA}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4 ml-4">
                        {/* Precio unitario */}
                        <div>
                          <label className="text-xs font-semibold text-gray-500 block mb-1">
                            Precio Unit.
                          </label>
                          <div className="flex items-center">
                            <PencilIcon className="w-3 h-3 text-gray-400 mr-1 flex-shrink-0" />
                            <input
                              type="number"
                              value={item.quotePrice}
                              onChange={(e) =>
                                handleItemChange(
                                  item.SKU,
                                  "quotePrice",
                                  e.target.value
                                )
                              }
                              min="0"
                              className="w-24 text-sm text-gray-700 border-b border-dashed focus:outline-none focus:border-pink-500 bg-transparent"
                            />
                          </div>
                        </div>
                        {/* Cantidad */}
                        <div>
                          <label className="text-xs font-semibold text-gray-500 block mb-1">
                            Cantidad
                          </label>
                          <div className="flex items-center space-x-1">
                            <input
                              type="number"
                              value={item.quoteQuantity}
                              onChange={(e) =>
                                handleItemChange(
                                  item.SKU,
                                  "quoteQuantity",
                                  e.target.value
                                )
                              }
                              min="1"
                              className={`w-16 text-center border rounded-lg py-1 font-semibold ${
                                hasExceededStock
                                  ? "border-red-300 bg-red-50 text-red-700"
                                  : "border-gray-300 bg-gray-50 text-gray-700"
                              }`}
                            />
                            {hasExceededStock && (
                              <div
                                title={`Stock: ${item["Cantidad unds"] ?? 0}`}
                              >
                                <InformationCircleIcon className="w-5 h-5 text-red-500" />
                              </div>
                            )}
                          </div>
                        </div>
                        {/* Total */}
                        <div className="text-right">
                          <label className="text-xs font-semibold text-gray-500 block mb-1">
                            Total
                          </label>
                          <p className="text-base font-bold text-pink-700 w-24">
                            {(
                              item.quotePrice * item.quoteQuantity
                            ).toLocaleString("es-CO", {
                              style: "currency",
                              currency: "COP",
                              maximumFractionDigits: 0,
                            })}
                          </p>
                        </div>
                        {/* Eliminar */}
                        <button
                          onClick={() => handleRemoveProduct(item.SKU)}
                          className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                          title="Eliminar producto"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* --- COLUMNA 3: CLIENTE Y TOTALES --- */}
        <div className="xl:col-span-1 h-auto xl:sticky xl:top-28">
          <div className="space-y-6">
            {/* Tarjeta de Cliente */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-pink-100/50 p-6 flex-shrink-0">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <UserCircleIcon className="w-5 h-5 mr-2 text-pink-600" />
                2. Datos del Cliente
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Nombre del Cliente *
                  </label>
                  <input
                    type="text"
                    name="name"
                    placeholder="Ingresa el nombre del cliente"
                    value={client.name}
                    onChange={handleClientChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-200 bg-white/80"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Empresa (Opcional)
                  </label>
                  <input
                    type="text"
                    name="company"
                    placeholder="Nombre de la empresa"
                    value={client.company}
                    onChange={handleClientChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-200 bg-white/80"
                  />
                </div>
              </div>
            </div>

            {/* Tarjeta de Configuración y Totales */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-pink-100/50 p-6 flex flex-col">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center flex-shrink-0">
                <PencilIcon className="w-5 h-5 mr-2 text-pink-600" />
                3. Opciones y Total
              </h3>

              <button
                onClick={() => setShowDetails(!showDetails)}
                className="flex items-center space-x-2 text-sm font-semibold text-pink-600 hover:text-pink-800 transition-colors mb-4"
              >
                <PencilIcon className="w-4 h-4" />
                <span>
                  {showDetails
                    ? "Ocultar detalles"
                    : "Añadir detalles (Validez, Mensaje)"}
                </span>
              </button>

              {showDetails && (
                <div className="grid grid-cols-1 gap-4 mb-6 animate-in fade-in duration-300">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Validez (días)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={quoteDetails.validityDays}
                      onChange={(e) =>
                        setQuoteDetails((prev) => ({
                          ...prev,
                          validityDays: Number(e.target.value),
                        }))
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Mensaje personalizado
                    </label>
                    <input
                      type="text"
                      value={quoteDetails.finalMessage}
                      onChange={(e) =>
                        setQuoteDetails((prev) => ({
                          ...prev,
                          finalMessage: e.target.value,
                        }))
                      }
                      placeholder="Mensaje final..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-200"
                    />
                  </div>
                </div>
              )}

              {/* Totales */}
              <div className="bg-gradient-to-r from-gray-50 to-pink-50 rounded-xl p-6 border border-pink-200 mt-auto">
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-lg text-gray-700">
                    <span>Subtotal:</span>
                    <span className="font-semibold">
                      {totals.subtotal.toLocaleString("es-CO", {
                        style: "currency",
                        currency: "COP",
                        maximumFractionDigits: 0,
                      })}
                    </span>
                  </div>
                  {applyIVA && (
                    <div className="flex justify-between items-center text-lg text-gray-700 border-b border-gray-300 pb-3">
                      <span>IVA (19%):</span>
                      <span className="font-semibold">
                        {totals.iva.toLocaleString("es-CO", {
                          style: "currency",
                          currency: "COP",
                          maximumFractionDigits: 0,
                        })}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-2xl font-bold text-pink-700 pt-3">
                    <span>TOTAL:</span>
                    <span>
                      {totals.total.toLocaleString("es-CO", {
                        style: "currency",
                        currency: "COP",
                        maximumFractionDigits: 0,
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {/* --- BOTÓN DE GENERAR PDF --- */}
              <button
                onClick={handleGenerateAndShowPdf}
                disabled={
                  quoteItems.length === 0 || !client.name.trim() || isGenerating
                }
                className="w-full mt-6 py-4 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 disabled:hover:scale-100 flex-shrink-0"
              >
                <div className="flex items-center justify-center space-x-3">
                  {isGenerating ? (
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <PrinterIcon className="w-6 h-6" />
                  )}
                  <span className="text-lg">
                    {isGenerating
                      ? "Generando PDF..."
                      : client.name.trim()
                      ? "Generar Cotización"
                      : "Falta nombre del cliente"}
                  </span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
