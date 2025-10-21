"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
// Importamos el hook de sync
// 💡 CORRECCIÓN 1: Se eliminó 'Transaccion' de la importación para corregir el warning.
import { useSync, Producto } from "../../hooks/useSyncContext";
import { useInvoicePdf } from "./useInvoicePdf"; // Importamos el nuevo hook
import {
  PlusIcon,
  TrashIcon,
  XMarkIcon,
  PrinterIcon,
  BuildingOffice2Icon,
  PencilIcon,
  InformationCircleIcon,
  ArchiveBoxIcon,
  CheckBadgeIcon,
  ArrowRightIcon,
  ArrowPathIcon,
  CheckIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";

// --- CONSTANTES GLOBALES Y API ---
const GAS_INVOICE_URL =
  "https://script.google.com/macros/s/AKfycbwT6zmORFCtqULLvxasiNYJcqjkjhP8QDNmFBMXdddIA-LyPXA8NuGkktnybiSg5q6gJw/exec";

// --- Interfaces (Mantenidas aquí ya que son necesarias para el estado local) ---
interface InvoiceItem extends Producto {
  invoiceQuantity: number;
  invoicePrice: number;
}
interface Factura {
  ID_FACTURA: string;
  Fecha: string;
  Cliente: string;
  Empresa: string;
  Productos: { nombre: string; cantidad: number; precio: number }[];
  "Total Facturado": number;
}
interface InvoicePreviewData {
  blobUrl: string;
  quoteNumber: string;
  fileName: string;
}
interface ClientState {
  name: string;
  company: string;
  email: string;
}

// --- MODALES (Mantenidos en el archivo principal para el renderizado) ---

// MODAL DE CONFIRMACIÓN DE FACTURA (Basado en PdfViewerModal)
const InvoiceConfirmationModal: React.FC<{
  blobUrl: string;
  quoteNumber: string;
  onClose: () => void;
  onConfirm: () => void;
  isConfirming: boolean;
}> = ({ blobUrl, quoteNumber, onClose, onConfirm, isConfirming }) => {
  // ... (El cuerpo del modal se mantiene igual)
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col border border-pink-100/50">
        <header className="flex justify-between items-center p-4 border-b border-pink-100 bg-gradient-to-r from-pink-50 to-rose-50 rounded-t-2xl">
          <h3 className="text-lg font-bold bg-gradient-to-r from-pink-600 to-rose-700 bg-clip-text text-transparent">
            Vista Previa: {quoteNumber}
          </h3>
          <div className="flex items-center space-x-3">
            <button
              onClick={onConfirm}
              disabled={isConfirming}
              className="flex items-center justify-center space-x-2 px-4 py-2 w-72 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-wait"
            >
              {isConfirming ? (
                <>
                  <ArrowPathIcon className="w-5 h-5 animate-spin" />
                  <span>Procesando Venta...</span>
                </>
              ) : (
                <>
                  <CheckBadgeIcon className="w-5 h-5" />
                  <span>Confirmar Venta y Reducir Stock</span>
                </>
              )}
            </button>
            <a
              href={blobUrl}
              download={`factura_${quoteNumber}.pdf`}
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

// MODAL DE HISTORIAL DE FACTURAS (Mantenido igual)
const HistoryModal: React.FC<{
  history: Factura[];
  onClose: () => void;
}> = ({ history, onClose }) => {
  // ... (El cuerpo del modal se mantiene igual)
  const router = useRouter();
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl border border-pink-100/50">
        <header className="flex justify-between items-center p-4 border-b border-pink-100 bg-gradient-to-r from-pink-50 to-rose-50 rounded-t-2xl">
          <h3 className="text-lg font-bold bg-gradient-to-r from-pink-600 to-rose-700 bg-clip-text text-transparent">
            Historial de Facturas Recientes
          </h3>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded-xl"
          >
            <XMarkIcon className="w-7 h-7" />
          </button>
        </header>
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {history.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              No hay facturas en el historial.
            </p>
          ) : (
            <div className="space-y-4">
              {history.map((factura) => (
                <div
                  key={factura.ID_FACTURA}
                  className="p-4 border border-gray-200 rounded-lg bg-white shadow-sm"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-pink-700">
                        {factura.Cliente}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(factura.Fecha).toLocaleString("es-CO")}
                      </p>
                    </div>
                    <p className="font-bold text-lg text-gray-800">
                      {factura["Total Facturado"].toLocaleString("es-CO", {
                        style: "currency",
                        currency: "COP",
                        maximumFractionDigits: 0,
                      })}
                    </p>
                  </div>
                  <div className="mt-2 text-xs">
                    <p className="font-semibold">
                      {factura.Productos.length} producto(s):
                    </p>
                    <ul className="list-disc list-inside text-gray-600">
                      {factura.Productos.map((item, idx) => (
                        <li key={`${item.nombre}-${idx}`}>
                          {item.nombre} (x{item.cantidad})
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <footer className="p-4 border-t border-pink-100 bg-gradient-to-r from-pink-50 to-rose-50 rounded-b-2xl flex justify-end">
          <button
            onClick={() => router.push("/Datos")} // Ajusta esta ruta si es necesario
            className="flex items-center gap-2 px-4 py-2 text-sm bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition shadow-md hover:shadow-lg"
          >
            Ver Historial Completo <ArrowRightIcon className="w-4 h-4" />
          </button>
        </footer>
      </div>
    </div>
  );
};

// MODAL DE NOTIFICACIÓN REUTILIZABLE (Mantenido igual)
const NotificationModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  message: string;
}> = ({ isOpen, onClose, message }) => {
  // ... (El cuerpo del modal se mantiene igual)
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl shadow-xl p-6 m-4 max-w-sm w-full text-center border border-pink-100/50">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
          <CheckIcon className="h-6 w-6 text-green-600" aria-hidden="true" />
        </div>
        <h3 className="text-lg leading-6 font-medium text-gray-900 mt-4">
          Éxito
        </h3>
        <p className="text-sm text-gray-500 mt-2">{message}</p>
        <button
          onClick={onClose}
          className="mt-6 w-full inline-flex justify-center rounded-xl border border-transparent shadow-sm px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-600 text-base font-medium text-white hover:from-pink-600 hover:to-rose-700 focus:outline-none"
        >
          Entendido
        </button>
      </div>
    </div>
  );
};

// --- Componente Principal de Facturación ---
export const FacturacionSection: React.FC = () => {
  const { inventario, inicializado, registrarTransaccionLocal, isOnline } =
    useSync();

  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [client, setClient] = useState<ClientState>({
    name: "",
    company: "",
    email: "",
  });
  const [applyIVA, setApplyIVA] = useState(false);

  // --- ESTADOS DE PROCESO ---
  const [isConfirmingSale, setIsConfirmingSale] = useState(false);
  const [invoiceHistory, setInvoiceHistory] = useState<Factura[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [notification, setNotification] = useState({
    open: false,
    message: "",
  });
  const [invoicePreviewData, setInvoicePreviewData] =
    useState<InvoicePreviewData | null>(null);

  // --- CÁLCULOS (Mantenidos) ---
  const { subtotal, iva, total } = useMemo(() => {
    const sub = invoiceItems.reduce(
      (acc, item) => acc + item.invoicePrice * item.invoiceQuantity,
      0
    );
    const tax = applyIVA ? sub * 0.19 : 0;
    return { subtotal: sub, iva: tax, total: sub + tax };
  }, [invoiceItems, applyIVA]);

  // --- LLAMADA AL HOOK DE PDF (¡EL CAMBIO CLAVE!) ---
  const { generatePdf } = useInvoicePdf(
    invoiceItems,
    client,
    subtotal,
    iva,
    total,
    applyIVA
  );

  // --- LÓGICA DE SINCRONIZACIÓN DE FACTURAS PENDIENTES (Mantenida) ---
  const syncPendingInvoices = useCallback(async () => {
    const pending = JSON.parse(localStorage.getItem("pendingInvoices") || "[]");
    if (pending.length === 0 || !isOnline) return;

    console.log(
      `[Sync] Conexión restaurada. Enviando ${pending.length} facturas pendientes...`
    );
    // 💡 CORRECCIÓN 2: Se cambió 'let' por 'const' para corregir el error 'prefer-const'.
    const failedInvoices = [];

    for (const factura of pending) {
      try {
        await fetch(GAS_INVOICE_URL, {
          method: "POST",
          mode: "no-cors",
          body: JSON.stringify({ action: "addInvoice", ...factura }),
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        console.error(
          `[Sync] Error al enviar la factura ${factura.ID_FACTURA}. Se reintentará más tarde.`,
          error
        );
        failedInvoices.push(factura);
      }
    }

    localStorage.setItem("pendingInvoices", JSON.stringify(failedInvoices));
    if (failedInvoices.length === 0) {
      console.log(
        "[Sync] Todas las facturas pendientes han sido enviadas a Google Sheets."
      );
    }
  }, [isOnline]);

  // Cargar historial y sincronizar pendientes al inicio (Mantenidos)
  useEffect(() => {
    const savedHistory = localStorage.getItem("invoiceHistory");
    if (savedHistory) {
      setInvoiceHistory(JSON.parse(savedHistory));
    }
    syncPendingInvoices();
  }, [syncPendingInvoices]);

  useEffect(() => {
    window.addEventListener("online", syncPendingInvoices);
    return () => window.removeEventListener("online", syncPendingInvoices);
  }, [syncPendingInvoices]);

  // --- Handlers (Mantenidos) ---
  const handleAddProduct = (producto: Producto) => {
    if (invoiceItems.find((item) => item.SKU === producto.SKU)) return;
    setInvoiceItems((prev) => [
      ...prev,
      {
        ...producto,
        invoiceQuantity: 1,
        invoicePrice: producto["PRECIO VENTA"] ?? 0,
      },
    ]);
    setSearchTerm("");
  };

  const handleRemoveProduct = (sku: string) => {
    setInvoiceItems((prev) => prev.filter((item) => item.SKU !== sku));
  };

  const handleItemChange = (
    sku: string,
    field: "invoiceQuantity" | "invoicePrice",
    value: string
  ) => {
    const num = parseFloat(value) || 0;
    setInvoiceItems((prev) =>
      prev.map((item) => (item.SKU === sku ? { ...item, [field]: num } : item))
    );
  };

  const handleClientChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setClient({ ...client, [e.target.name]: e.target.value });
  };

  // --- Filtrado (Mantenido) ---
  const filteredProducts = useMemo(() => {
    if (!searchTerm) return [];
    const lower = searchTerm.toLowerCase();
    return inventario
      .filter(
        (p) =>
          p["NOMBRE PRODUCTO"].toLowerCase().includes(lower) ||
          String(p.REFERENCIA).toLowerCase().includes(lower) ||
          (p.marca && p.marca.toLowerCase().includes(lower))
      )
      .slice(0, 15);
  }, [searchTerm, inventario]);

  // --- FUNCIÓN PARA GENERAR VISTA PREVIA (¡SIMPLIFICADA!) ---
  const handleGeneratePreview = async () => {
    try {
      const data = await generatePdf(); // Llamada al hook
      setInvoicePreviewData(data);
    } catch (error) {
      console.error("Error al generar el PDF:", error);
      // Podrías agregar una notificación de error aquí
    }
  };

  // --- FUNCIÓN PARA CONFIRMAR LA VENTA (Mantenida) ---
  const handleConfirmAndProcessSale = async () => {
    if (isConfirmingSale) return;
    setIsConfirmingSale(true);

    // 1. Disminuir el inventario localmente
    invoiceItems.forEach((item) => {
      const productoOriginal = inventario.find((p) => p.SKU === item.SKU);
      if (productoOriginal) {
        const productoActualizado = {
          ...productoOriginal,
          "Cantidad unds":
            (productoOriginal["Cantidad unds"] ?? 0) - item.invoiceQuantity,
        };
        registrarTransaccionLocal({
          id: item.SKU,
          tipo: "UPDATE",
          producto: productoActualizado as Producto, // Casting a Producto
        });
      }
    });

    // 2. Crear y guardar el historial de la factura localmente
    const finalClientName = client.name.trim() || "Cliente Preferencial";
    const nuevaFactura: Factura = {
      ID_FACTURA: `FAC-${Date.now()}`,
      Fecha: new Date().toISOString(),
      Cliente: finalClientName,
      Empresa: client.company,
      Productos: invoiceItems.map((item) => ({
        nombre: item["NOMBRE PRODUCTO"],
        cantidad: item.invoiceQuantity,
        precio: item.invoicePrice,
      })),
      "Total Facturado": total,
    };

    const updatedHistory = [nuevaFactura, ...invoiceHistory];
    setInvoiceHistory(updatedHistory);
    localStorage.setItem("invoiceHistory", JSON.stringify(updatedHistory));

    // 3. Limpiar la UI y notificar
    if (invoicePreviewData) {
      URL.revokeObjectURL(invoicePreviewData.blobUrl);
    }
    setInvoicePreviewData(null);
    setInvoiceItems([]);
    setClient({ name: "", company: "", email: "" });
    setApplyIVA(false);
    setNotification({
      open: true,
      message: `Venta a ${finalClientName} confirmada. El stock se actualizó localmente.`,
    });

    // 4. Intentar enviar a GAS (o guardar como pendiente si está offline)
    if (isOnline) {
      try {
        await fetch(GAS_INVOICE_URL, {
          method: "POST",
          mode: "no-cors",
          body: JSON.stringify({ action: "addInvoice", ...nuevaFactura }),
        });
      } catch (error) {
        console.warn(
          "Error enviando factura a GAS, guardando pendiente.",
          error
        );
        const pending = JSON.parse(
          localStorage.getItem("pendingInvoices") || "[]"
        );
        localStorage.setItem(
          "pendingInvoices",
          JSON.stringify([...pending, nuevaFactura])
        );
      }
    } else {
      console.log("Offline. Guardando factura como pendiente.");
      const pending = JSON.parse(
        localStorage.getItem("pendingInvoices") || "[]"
      );
      localStorage.setItem(
        "pendingInvoices",
        JSON.stringify([...pending, nuevaFactura])
      );
    }

    setIsConfirmingSale(false);
  };

  // --- RENDER (Mantenido) ---
  if (!inicializado) {
    return (
      <div className="flex items-center justify-center py-20">
        {/* Usando el icono de carga de heroicons para consistencia */}
        <ArrowPathIcon className="w-10 h-10 text-pink-600 animate-spin" />
        <p className="ml-3 text-lg font-semibold text-gray-700">
          Cargando inventario...
        </p>
      </div>
    );
  }

  return (
    <>
      {/* --- RENDER DE MODALES --- */}
      {invoicePreviewData && (
        <InvoiceConfirmationModal
          blobUrl={invoicePreviewData.blobUrl}
          quoteNumber={invoicePreviewData.quoteNumber}
          isConfirming={isConfirmingSale}
          onConfirm={handleConfirmAndProcessSale}
          onClose={() => {
            URL.revokeObjectURL(invoicePreviewData.blobUrl);
            setInvoicePreviewData(null);
          }}
        />
      )}
      {showHistoryModal && (
        <HistoryModal
          history={invoiceHistory.slice(0, 10)}
          onClose={() => setShowHistoryModal(false)}
        />
      )}
      <NotificationModal
        isOpen={notification.open}
        onClose={() => setNotification({ open: false, message: "" })}
        message={notification.message}
      />

      {/* --- ESTRUCTURA DE GRID --- */}
      <div
        className={`grid grid-cols-1 xl:grid-cols-4 gap-6 ${
          invoicePreviewData ? "no-print" : ""
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
              {/* ... (icono de búsqueda) ... */}
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
                          <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                            <span>Ref: {product.REFERENCIA}</span>
                          </div>
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

        {/* --- COLUMNA 2: ITEMS DE FACTURA --- */}
        <div className="xl:col-span-2 h-auto">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-pink-100/50 p-6 h-auto">
            <div className="flex items-center justify-between mb-6 flex-shrink-0">
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-pink-600 to-rose-700 bg-clip-text text-transparent">
                  Generador de Facturas
                </h2>
                <p className="text-gray-600 mt-1">
                  Items: {invoiceItems.length}
                </p>
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
              {invoiceItems.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed border-gray-300 rounded-2xl bg-gradient-to-br from-gray-50 to-pink-50/30 flex flex-col justify-center">
                  <ArchiveBoxIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-xl font-semibold text-gray-600 mb-2">
                    Factura Vacía
                  </h4>
                  <p className="text-gray-500">
                    Busca y agrega productos para comenzar
                  </p>
                </div>
              ) : (
                invoiceItems.map((item) => {
                  const hasExceededStock =
                    item.invoiceQuantity > (item["Cantidad unds"] ?? 0);
                  return (
                    <div
                      key={item.SKU}
                      className="flex items-center bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 group"
                    >
                      {/* ... (Icono, Título, Ref...) ... */}
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
                              value={item.invoicePrice}
                              onChange={(e) =>
                                handleItemChange(
                                  item.SKU,
                                  "invoicePrice",
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
                              value={item.invoiceQuantity}
                              onChange={(e) =>
                                handleItemChange(
                                  item.SKU,
                                  "invoiceQuantity",
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
                              <div title={`Stock: ${item["Cantidad unds"]}`}>
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
                              item.invoicePrice * item.invoiceQuantity
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
                <BuildingOffice2Icon className="w-5 h-5 mr-2 text-pink-600" />
                2. Datos del Cliente
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Nombre del Cliente
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

            {/* Tarjeta de Totales y Acción */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-pink-100/50 p-6 flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900 flex items-center flex-shrink-0">
                  <PencilIcon className="w-5 h-5 mr-2 text-pink-600" />
                  3. Total y Acción
                </h3>
                {/* Botón de Historial */}
                <button
                  onClick={() => setShowHistoryModal(true)}
                  className="flex items-center space-x-1 text-sm font-semibold text-pink-600 hover:text-pink-800 transition-colors"
                >
                  <ArchiveBoxIcon className="w-5 h-5" />
                  <span>Historial</span>
                </button>
              </div>

              {/* Totales */}
              <div className="bg-gradient-to-r from-gray-50 to-pink-50 rounded-xl p-6 border border-pink-200 mt-auto">
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-lg text-gray-700">
                    <span>Subtotal:</span>
                    <span className="font-semibold">
                      {subtotal.toLocaleString("es-CO", {
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
                        {iva.toLocaleString("es-CO", {
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
                      {total.toLocaleString("es-CO", {
                        style: "currency",
                        currency: "COP",
                        maximumFractionDigits: 0,
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {/* --- BOTÓN DE GENERAR (Acción actualizada) --- */}
              <button
                onClick={handleGeneratePreview}
                disabled={invoiceItems.length === 0 || isConfirmingSale}
                className="w-full mt-6 py-4 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 disabled:hover:scale-100 flex-shrink-0"
              >
                <div className="flex items-center justify-center space-x-3">
                  <PrinterIcon className="w-6 h-6" />
                  <span className="text-lg">Generar Factura</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
