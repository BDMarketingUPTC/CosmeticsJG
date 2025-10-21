"use client";

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { useSync, Producto } from "../hooks/useSyncContext";
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  CubeIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  ArchiveBoxIcon,
  ArrowUpOnSquareIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  MicrophoneIcon, // Icono para búsqueda por voz
} from "@heroicons/react/24/outline";

// --- TIPADO DE API DE RECONOCIMIENTO DE VOZ (para eliminar 'any') ---

// 1. Tipado de la interfaz principal del motor de reconocimiento
interface ExtendedSpeechRecognition extends EventTarget {
  new (): ExtendedSpeechRecognition;
  grammars: any; // Dejamos 'any' aquí ya que es poco relevante y complejo de tipar.
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onaudiostart: ((this: ExtendedSpeechRecognition, ev: Event) => any) | null;
  onresult:
    | ((this: ExtendedSpeechRecognition, ev: SpeechRecognitionEvent) => any)
    | null;
  onerror:
    | ((
        this: ExtendedSpeechRecognition,
        ev: SpeechRecognitionErrorEvent
      ) => any)
    | null;
  onend: ((this: ExtendedSpeechRecognition, ev: Event) => any) | null;
  // Añadir otros eventos si son necesarios...
}

// 2. Tipado del evento de resultado (para event.results)
interface SpeechRecognitionEvent extends Event {
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
}

// Declaración global para asegurar la compatibilidad con navegadores
declare global {
  interface Window {
    SpeechRecognition: ExtendedSpeechRecognition;
    webkitSpeechRecognition: ExtendedSpeechRecognition;
  }
}

// --- SISTEMA DE NOTIFICACIÓN TOAST (Reemplazo de alert() en formulario) ---
type ToastType = "success" | "error" | "warning";

interface NotificationToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
}

const NotificationToast: React.FC<NotificationToastProps> = ({
  message,
  type,
  onClose,
}) => {
  const baseClasses =
    "fixed bottom-5 right-5 p-4 rounded-xl shadow-lg flex items-center space-x-3 z-[60] transition-all transform";

  let typeClasses = "";
  let Icon = XMarkIcon;

  switch (type) {
    case "success":
      typeClasses = "bg-green-600 text-white";
      Icon = CheckCircleIcon;
      break;
    case "error":
      typeClasses = "bg-red-600 text-white";
      Icon = ExclamationTriangleIcon;
      break;
    case "warning":
      typeClasses = "bg-amber-500 text-white";
      Icon = ExclamationTriangleIcon;
      break;
  }

  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className={`${baseClasses} ${typeClasses} animate-in slide-in-from-right-4 fade-in duration-300`}
    >
      <Icon className="w-6 h-6 flex-shrink-0" />
      <p className="text-sm font-semibold">{message}</p>
      <button
        onClick={onClose}
        className="p-1 rounded-full hover:bg-white/20 transition-colors"
      >
        <XMarkIcon className="w-5 h-5" />
      </button>
    </div>
  );
};

// --- MODAL DE CONFIRMACIÓN (Reemplazo de confirm() para eliminar) ---
interface ConfirmationDialogProps {
  message: string;
  itemName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  message,
  itemName,
  onConfirm,
  onCancel,
}) => {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm border border-slate-200/80 p-6 space-y-6">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <TrashIcon className="h-6 w-6 text-red-600" aria-hidden="true" />
          </div>
          <h3 className="mt-4 text-lg font-bold text-slate-900">
            Confirmar Eliminación
          </h3>
          <p className="mt-2 text-sm text-slate-500">{message}</p>
          <p className="mt-1 text-sm font-semibold text-red-600">{itemName}</p>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition-colors"
          >
            Sí, Eliminar
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Componente de Modal Ultra Profesional y Responsivo (Modificado para usar Toast) ---
interface ProductFormProps {
  productoInicial?: Producto;
  onSave: (producto: Producto) => void;
  onClose: () => void;
  inventario: Producto[];
  onValidationError: (message: string) => void; // NUEVO: Para manejar errores
}

const ProductFormModal: React.FC<ProductFormProps> = ({
  productoInicial,
  onSave,
  onClose,
  inventario,
  onValidationError, // Añadido
}) => {
  const isEditing = !!productoInicial;
  // Ajuste para inicializar con valores por defecto 0 si son null, para que el formulario funcione
  const initialProductState = productoInicial
    ? {
        ...productoInicial,
        Fecha: new Date(productoInicial.Fecha).toISOString().split("T")[0],
        "PRECIO COMPRA UNIDAD": productoInicial["PRECIO COMPRA UNIDAD"] ?? 0,
        "PRECIO VENTA": productoInicial["PRECIO VENTA"] ?? 0,
        "Cantidad unds": productoInicial["Cantidad unds"] ?? 1,
      }
    : {
        SKU: `SKU-${Date.now().toString().slice(-6)}-${Math.random()
          .toString(36)
          .substring(2, 6)
          .toUpperCase()}`,
        Fecha: new Date().toISOString().split("T")[0],
        REFERENCIA: "",
        "NOMBRE PRODUCTO": "",
        "PRECIO COMPRA UNIDAD": 0,
        "PRECIO VENTA": 0,
        "Cantidad unds": 1,
        marca: "",
        Provedor: "",
        Descripcion: "",
      };
  const [producto, setProducto] = useState<Producto>(initialProductState);

  const [foundProductByRef, setFoundProductByRef] = useState<Producto | null>(
    null
  );

  useEffect(() => {
    if (
      isEditing ||
      !producto.REFERENCIA ||
      String(producto.REFERENCIA).trim() === ""
    ) {
      setFoundProductByRef(null);
      return;
    }
    const currentRef = String(producto.REFERENCIA).trim().toLowerCase();
    const existingProduct = inventario.find(
      (p) =>
        p.REFERENCIA && String(p.REFERENCIA).trim().toLowerCase() === currentRef
    );
    setFoundProductByRef(existingProduct || null);
  }, [producto.REFERENCIA, inventario, isEditing]);

  const handleLoadFromReference = () => {
    if (!foundProductByRef) return;
    setProducto((prevProducto) => ({
      ...foundProductByRef,
      SKU: prevProducto.SKU,
      Fecha: prevProducto.Fecha,
      "Cantidad unds": 1,
      isLocal: true,
      "PRECIO COMPRA UNIDAD": foundProductByRef["PRECIO COMPRA UNIDAD"] ?? 0,
      "PRECIO VENTA": foundProductByRef["PRECIO VENTA"] ?? 0,
    }));
    setFoundProductByRef(null);
  };

  const formatPrice = (value: number | null | undefined): string => {
    if (value === null || value === undefined) {
      return "";
    }
    return value.toLocaleString("es-ES");
  };

  const parsePrice = (value: string): number | null => {
    if (!value) {
      return null;
    }
    const numericString = value.replace(/[^\d]/g, "");
    if (numericString === "") {
      return null;
    }
    return Number(numericString);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;

    if (name.includes("PRECIO")) return;

    setProducto((prev) => ({
      ...prev,
      [name]:
        type === "number" || name.includes("Cantidad")
          ? value === ""
            ? null
            : Number(value)
          : value,
    }));
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numericValue = parsePrice(value);

    setProducto((prev) => ({
      ...prev,
      [name]: numericValue,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!producto["NOMBRE PRODUCTO"] || !producto.SKU) {
      // REEMPLAZO DE alert() por Toast
      onValidationError("Por favor, rellena los campos Nombre y SKU.");
      return;
    }
    // Asegurarse de que los precios null se guarden como 0 si es necesario
    const productoFinal = {
      ...producto,
      "PRECIO COMPRA UNIDAD": producto["PRECIO COMPRA UNIDAD"] ?? 0,
      "PRECIO VENTA": producto["PRECIO VENTA"] ?? 0,
    };
    onSave(productoFinal);
    onClose();
  };

  const inputClasses =
    "w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200 placeholder:text-slate-400";
  const title = isEditing ? "Editar Producto" : "Añadir Nuevo Producto";

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl my-8 border border-slate-200/80">
        <header className="flex justify-between items-center p-6 border-b border-slate-200">
          <div>
            <h3 className="text-xl font-bold text-slate-800">{title}</h3>
            <p className="text-sm text-slate-500 mt-1">
              {isEditing
                ? "Modifica los datos del producto."
                : "Completa la información para registrarlo."}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors duration-200"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-x-6 gap-y-4">
            {/* --- Fila 1: SKU, Fecha, Cantidad, Referencia --- */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                SKU
              </label>
              <input
                name="SKU"
                value={producto.SKU}
                disabled
                className={
                  inputClasses +
                  " bg-slate-100 cursor-not-allowed font-mono !text-slate-500"
                }
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Fecha
              </label>
              <input
                type="date"
                name="Fecha"
                value={producto.Fecha}
                onChange={handleChange}
                required
                className={inputClasses}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Cantidad (unds) *
              </label>
              <input
                type="number" // Cantidad sigue siendo 'number'
                name="Cantidad unds"
                value={producto["Cantidad unds"] ?? ""} // Mostrar vacío si es null
                onChange={handleChange}
                min="0"
                required
                className={inputClasses}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Referencia
              </label>
              <input
                name="REFERENCIA"
                value={producto.REFERENCIA}
                onChange={handleChange}
                disabled={isEditing}
                className={inputClasses}
                placeholder="Ej: REF-00123"
              />
              {foundProductByRef && (
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-blue-800">
                      Ref. encontrada
                    </p>
                    <p className="text-xs text-blue-600">Cargar datos.</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleLoadFromReference}
                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-md text-xs transition-colors shadow-sm"
                  >
                    <ArrowUpOnSquareIcon className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* --- Fila 2: Nombre, Marca, P. Venta, P. Compra --- */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Nombre Producto *
              </label>
              <input
                name="NOMBRE PRODUCTO"
                value={producto["NOMBRE PRODUCTO"]}
                onChange={handleChange}
                required
                className={inputClasses}
                placeholder="Nombre descriptivo..."
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Marca
              </label>
              <input
                name="marca"
                value={producto.marca}
                onChange={handleChange}
                className={inputClasses}
                placeholder="Marca"
              />
            </div>
            {/* AJUSTE 5: Input de Precio Venta modificado */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Precio Venta ($) *
              </label>
              <input
                type="text" // Cambiado a text
                inputMode="numeric" // Teclado numérico en móviles
                name="PRECIO VENTA"
                value={formatPrice(producto["PRECIO VENTA"])} // Valor formateado
                onChange={handlePriceChange} // Handler de precio
                required
                className={inputClasses}
                placeholder="Ej: 10.000"
              />
            </div>
            {/* AJUSTE 6: Input de Precio Compra modificado */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Precio Compra ($)
              </label>
              <input
                type="text" // Cambiado a text
                inputMode="numeric" // Teclado numérico en móviles
                name="PRECIO COMPRA UNIDAD"
                value={formatPrice(producto["PRECIO COMPRA UNIDAD"])} // Valor formateado
                onChange={handlePriceChange} // Handler de precio
                className={inputClasses}
                placeholder="Ej: 5.000"
              />
            </div>

            {/* --- Fila 3: Proveedor y Descripción --- */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Proveedor
              </label>
              <input
                name="Provedor"
                value={producto.Provedor}
                onChange={handleChange}
                className={inputClasses}
                placeholder="Proveedor"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Descripción
              </label>
              <textarea
                name="Descripcion"
                value={producto.Descripcion}
                onChange={handleChange}
                rows={3}
                className={inputClasses + " resize-none"}
                placeholder="Descripción..."
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-6 mt-6 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg font-semibold text-sm transition-colors duration-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg font-semibold text-sm shadow-sm transition-colors duration-200"
            >
              {isEditing ? "Guardar Cambios" : "Agregar al Inventario"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- Componente de Estadísticas Sutil y Elegante (sin cambios) ---
const InventoryStats: React.FC<{ inventario: Producto[] }> = ({
  inventario,
}) => {
  const stats = useMemo(
    () => ({
      totalProductos: inventario.length,
      totalStock: inventario.reduce(
        (sum, p) => sum + (p["Cantidad unds"] || 0),
        0
      ),
      valorTotal: inventario.reduce(
        (sum, p) =>
          sum + (p["PRECIO COMPRA UNIDAD"] || 0) * (p["Cantidad unds"] || 0),
        0
      ),
      productosSinStock: inventario.filter(
        (p) => (p["Cantidad unds"] || 0) === 0
      ).length,
    }),
    [inventario]
  );

  const StatItem = ({
    label,
    value,
    icon,
  }: {
    label: string;
    value: string | number;
    icon: React.ReactNode;
  }) => (
    <div className="flex items-center gap-3">
      <div className="flex-shrink-0 w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500">
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <p className="text-lg font-bold text-slate-800">{value}</p>
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-6">
      <StatItem
        label="Productos"
        value={stats.totalProductos}
        icon={<CubeIcon className="w-5 h-5" />}
      />
      <StatItem
        label="Stock Total"
        value={`${stats.totalStock}`}
        icon={<ChartBarIcon className="w-5 h-5" />}
      />
      <StatItem
        label="Sin Stock"
        value={stats.productosSinStock}
        icon={<ArchiveBoxIcon className="w-5 h-5" />}
      />
      <StatItem
        label="Valor Inventario"
        value={stats.valorTotal.toLocaleString("es-CO", {
          style: "currency",
          currency: "COP",
          minimumFractionDigits: 0,
        })}
        icon={<CurrencyDollarIcon className="w-5 h-5" />}
      />
    </div>
  );
};

// --- Componente Principal de Inventario (Con Toasts, Modals y Búsqueda por Voz) ---
export const InventarioSection: React.FC = () => {
  const { inventario, registrarTransaccionLocal, inicializado } = useSync();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [productoAEditar, setProductoAEditar] = useState<
    Producto | undefined
  >();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Producto | null;
    direction: "ascending" | "descending";
  }>({ key: null, direction: "ascending" });

  // ESTADOS PARA REEMPLAZAR alert() y confirm()
  const [toast, setToast] = useState<{
    message: string;
    type: ToastType;
  } | null>(null);
  const [confirmState, setConfirmState] = useState<{
    product: Producto;
    message: string;
  } | null>(null);

  // --- NUEVO: ESTADOS Y LÓGICA PARA BÚSQUEDA POR VOZ ---
  const [isListening, setIsListening] = useState(false);
  // 💡 CORRECCIÓN TS: Tipado de useRef con la interfaz extendida
  const recognitionRef = useRef<ExtendedSpeechRecognition | null>(null);

  const showToast = useCallback(
    (message: string, type: ToastType = "success") => {
      setToast({ message, type });
    },
    []
  );

  useEffect(() => {
    // Inicializamos la API de reconocimiento de voz
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn(
        "Speech Recognition API no es compatible con este navegador."
      );
      return;
    }

    // 💡 CORRECCIÓN TS: Creación de la instancia con el tipo correcto
    const recognition: ExtendedSpeechRecognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = "es-CO"; // Español de Colombia
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    // 💡 CORRECCIÓN TS: Tipado del evento de resultado
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setSearchTerm(transcript);
    };

    // 💡 CORRECCIÓN TS: Tipado del evento de error
    recognition.onerror = (event) => {
      console.error("Error en reconocimiento de voz:", event.error);
      let errorMessage = "Ocurrió un error con el reconocimiento de voz.";
      if (
        event.error === "not-allowed" ||
        event.error === "service-not-allowed"
      ) {
        errorMessage =
          "Permiso para micrófono denegado. Actívalo en los ajustes de tu navegador.";
      } else if (event.error === "no-speech") {
        errorMessage = "No se detectó ninguna voz. Intenta de nuevo.";
      }
      showToast(errorMessage, "error");
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
  }, [showToast]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      showToast(
        "El reconocimiento de voz no es compatible con este navegador.",
        "warning"
      );
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (error) {
        // Puede ocurrir si se intenta iniciar mientras ya está activo.
        console.error("No se pudo iniciar el reconocimiento de voz:", error);
        setIsListening(false); // Aseguramos que el estado sea correcto.
      }
    }
  };
  // --- FIN DE LÓGICA PARA BÚSQUEDA POR VOZ ---

  const filteredAndSortedInventario = useMemo(() => {
    let sortableItems = [...inventario];
    if (searchTerm) {
      const lowercasedFilter = searchTerm.toLowerCase();
      sortableItems = sortableItems.filter((item) =>
        Object.values(item).some((val) =>
          String(val).toLowerCase().includes(lowercasedFilter)
        )
      );
    }

    if (sortConfig.key) {
      sortableItems.sort((a, b) => {
        const valA = a[sortConfig.key!];
        const valB = b[sortConfig.key!];

        // Manejo de null/undefined para ordenar correctamente
        const safeValA = valA ?? (typeof valA === "string" ? "" : -Infinity);
        const safeValB = valB ?? (typeof valB === "string" ? "" : -Infinity);

        let comparison = 0;
        if (typeof safeValA === "number" && typeof safeValB === "number") {
          comparison = safeValA - safeValB;
        } else {
          comparison = String(safeValA).localeCompare(String(safeValB));
        }
        return sortConfig.direction === "ascending" ? comparison : -comparison;
      });
    }
    return sortableItems;
  }, [inventario, searchTerm, sortConfig]);

  const requestSort = (key: keyof Producto) => {
    let direction: "ascending" | "descending" = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  interface SortableHeaderProps {
    label: string;
    columnKey: keyof Producto;
    className?: string;
  }

  const SortableHeader: React.FC<SortableHeaderProps> = ({
    label,
    columnKey,
    className = "",
  }) => (
    <button
      className={`flex items-center gap-2 group w-full ${className}`}
      onClick={() => requestSort(columnKey)}
    >
      {label}
      {sortConfig.key === columnKey ? (
        sortConfig.direction === "ascending" ? (
          <ChevronUpIcon className="w-4 h-4 text-indigo-600" />
        ) : (
          <ChevronDownIcon className="w-4 h-4 text-indigo-600" />
        )
      ) : (
        <ChevronUpIcon className="w-4 h-4 text-slate-300 group-hover:text-slate-500" />
      )}
    </button>
  );

  const handleSaveProduct = (producto: Producto) => {
    const isExistingInBase = inventario.some(
      (p) => p.SKU === producto.SKU && !p.isLocal
    );
    const tipoTransaccion =
      isExistingInBase || productoAEditar ? "UPDATE" : "ADD";
    registrarTransaccionLocal({
      id: producto.SKU,
      tipo: tipoTransaccion,
      producto: { ...producto, isLocal: true },
    });
    showToast(
      `Producto '${producto["NOMBRE PRODUCTO"]}' ${
        tipoTransaccion === "ADD" ? "añadido" : "actualizado"
      } con éxito.`,
      "success"
    );
  };

  const handleEditClick = (producto: Producto) => {
    setProductoAEditar(producto);
    setIsModalOpen(true);
  };

  // NUEVO: Pide la confirmación con el modal
  const handleDeleteRequest = (producto: Producto) => {
    setConfirmState({
      product: producto,
      message: `¿Estás seguro de ELIMINAR permanentemente el producto:`,
    });
  };

  // NUEVO: Función que ejecuta la eliminación si se confirma
  const executeDelete = () => {
    if (!confirmState) return;

    registrarTransaccionLocal({
      id: confirmState.product.SKU,
      tipo: "DELETE",
      producto: confirmState.product,
    });

    showToast(
      `Producto '${confirmState.product["NOMBRE PRODUCTO"]}' eliminado.`,
      "warning"
    );
    setConfirmState(null); // Cerrar el modal de confirmación
  };

  const handleOpenModal = () => {
    setProductoAEditar(undefined);
    setIsModalOpen(true);
  };

  if (!inicializado) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-600 font-semibold">Cargando inventario...</p>
        <p className="text-slate-500 text-sm">
          Preparando los datos para la gestión offline.
        </p>
      </div>
    );
  }

  return (
    <section className="p-4 sm:p-6 space-y-6">
      <div className="p-4 sm:p-6 bg-white rounded-xl border border-slate-200/80 space-y-4">
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">
              Gestión de Inventario
            </h2>
            <p className="text-slate-500 mt-1">
              {filteredAndSortedInventario.length} productos encontrados.
            </p>
          </div>
          <div className="w-full md:w-auto">
            <InventoryStats inventario={inventario} />
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full pt-4 border-t border-slate-200">
          <div className="relative flex-grow">
            <MagnifyingGlassIcon className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por nombre, REF, etc..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-12 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white transition-colors"
            />
            <button
              type="button"
              onClick={toggleListening}
              className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                isListening
                  ? "bg-red-500 text-white animate-pulse"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
              title={isListening ? "Detener grabación" : "Buscar por voz"}
            >
              <MicrophoneIcon className="w-5 h-5" />
            </button>
          </div>
          <button
            onClick={handleOpenModal}
            className="flex items-center justify-center space-x-2 px-5 py-2.5 text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg font-semibold shadow-sm transition-colors whitespace-nowrap"
          >
            <PlusIcon className="w-5 h-5" />
            <span>Nuevo Producto</span>
          </button>
        </div>
      </div>

      {isModalOpen && (
        <ProductFormModal
          inventario={inventario}
          productoInicial={productoAEditar}
          onSave={handleSaveProduct}
          onClose={() => {
            setIsModalOpen(false);
            setProductoAEditar(undefined);
          }}
          // Pasamos el handler para que el formulario pueda mostrar el Toast
          onValidationError={(msg) => showToast(msg, "error")}
        />
      )}

      {/* RENDERIZADO DEL MODAL DE CONFIRMACIÓN */}
      {confirmState && (
        <ConfirmationDialog
          message={confirmState.message}
          itemName={confirmState.product["NOMBRE PRODUCTO"]}
          onConfirm={executeDelete}
          onCancel={() => setConfirmState(null)}
        />
      )}

      {/* RENDERIZADO DEL TOAST DE NOTIFICACIÓN */}
      {toast && (
        <NotificationToast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="w-1"></th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  <SortableHeader
                    label="Producto"
                    columnKey="NOMBRE PRODUCTO"
                    className="justify-start"
                  />
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  <SortableHeader
                    label="Costo"
                    columnKey="PRECIO COMPRA UNIDAD"
                    className="justify-end"
                  />
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  <SortableHeader
                    label="Precio Venta"
                    columnKey="PRECIO VENTA"
                    className="justify-end"
                  />
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  <SortableHeader
                    label="Stock"
                    columnKey="Cantidad unds"
                    className="justify-center"
                  />
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200/70">
              {filteredAndSortedInventario.map((producto) => (
                <tr
                  key={producto.SKU}
                  className="group hover:bg-slate-50/70 transition-colors duration-150 relative"
                >
                  <td
                    className={`w-1 ${
                      producto.isLocal ? "bg-amber-400" : "bg-transparent"
                    }`}
                  ></td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0 w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                        <CubeIcon className="w-5 h-5 text-slate-500" />
                      </div>
                      <div>
                        <div
                          onClick={() => handleEditClick(producto)}
                          className="font-semibold text-slate-800 cursor-pointer hover:text-indigo-600 transition-colors line-clamp-1"
                        >
                          {producto["NOMBRE PRODUCTO"]}
                        </div>
                        <div className="text-xs text-slate-500 font-mono mt-1">
                          Ref: {producto.REFERENCIA}
                        </div>
                        <div className="mt-1 flex items-center gap-x-4 text-xs text-slate-500">
                          {producto.marca && (
                            <div>
                              <span className="font-medium text-slate-400">
                                Marca:
                              </span>{" "}
                              {producto.marca}
                            </div>
                          )}
                          {producto.Provedor && (
                            <div>
                              <span className="font-medium text-slate-400">
                                Proveedor:
                              </span>{" "}
                              {producto.Provedor}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right whitespace-nowrap text-sm text-slate-600">
                    {(producto["PRECIO COMPRA UNIDAD"] ?? 0).toLocaleString(
                      "es-CO",
                      {
                        style: "currency",
                        currency: "COP",
                        minimumFractionDigits: 0,
                      }
                    )}
                  </td>
                  <td className="px-6 py-4 text-right whitespace-nowrap text-sm font-semibold text-slate-800">
                    {(producto["PRECIO VENTA"] ?? 0).toLocaleString("es-CO", {
                      style: "currency",
                      currency: "COP",
                      minimumFractionDigits: 0,
                    })}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        (producto["Cantidad unds"] ?? 0) > 10
                          ? "bg-green-100 text-green-800"
                          : (producto["Cantidad unds"] ?? 0) > 0
                          ? "bg-amber-100 text-amber-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {producto["Cantidad unds"] ?? 0}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex justify-center items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEditClick(producto)}
                        className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-md transition-all"
                        title="Editar producto"
                      >
                        <PencilSquareIcon className="w-5 h-5" />
                      </button>
                      <button
                        // LLAMADA ACTUALIZADA: Ahora inicia el modal de confirmación
                        onClick={() => handleDeleteRequest(producto)}
                        className="p-2 text-slate-500 hover:text-red-600 hover:bg-slate-100 rounded-md transition-all"
                        title="Eliminar producto"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredAndSortedInventario.length === 0 && (
          <div className="text-center py-16 px-6">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CubeIcon className="w-9 h-9 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800">
              {searchTerm
                ? "No se encontraron productos"
                : "Tu inventario está vacío"}
            </h3>
            <p className="text-slate-500 mt-2 max-w-md mx-auto">
              {searchTerm
                ? `No hay resultados para "${searchTerm}". Intenta con otra búsqueda o limpia el filtro.`
                : "Comienza agregando tu primer producto para llevar el control."}
            </p>
            {!searchTerm && (
              <button
                onClick={handleOpenModal}
                className="mt-6 flex items-center mx-auto space-x-2 px-5 py-2.5 text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg font-semibold shadow-sm transition-colors"
              >
                <PlusIcon className="w-5 h-5" />
                <span>Agregar Primer Producto</span>
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
};
