"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  createContext,
  useContext,
  ReactNode,
} from "react";

// --- Tipos y Constantes (sin cambios) ---
export type Producto = {
  SKU: string;
  Fecha: string;
  "NOMBRE PRODUCTO": string;
  "PRECIO COMPRA UNIDAD": number | null;
  "PRECIO VENTA": number | null;
  "Cantidad unds": number | null;
  REFERENCIA: string;
  marca: string;
  Provedor: string;
  Descripcion: string;
  isLocal?: boolean;
};
export type Transaccion = {
  id: string;
  tipo: "ADD" | "UPDATE" | "DELETE";
  producto: Producto;
};
type SyncState = {
  inventarioBase: Producto[];
  inventarioFinal: Producto[];
  transaccionesPendientes: Transaccion[];
  countTransacciones: number;
  estaSincronizando: boolean;
  ultimaActualizacion: string | null;
  inicializado: boolean;
  isOnline: boolean;
};
interface SyncContextType extends SyncState {
  actualizarInventario: (forzar?: boolean) => Promise<boolean>;
  sincronizarCambios: () => Promise<void>;
  registrarTransaccionLocal: (transaccion: Transaccion) => void;
  inventario: Producto[];
}

// 💡 MEJORA TS: Tipado estricto para localForage.setItem, eliminando 'any'.
const localForage = {
  getItem: async <T>(key: string): Promise<T | null> => {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem(key);
    return stored ? (JSON.parse(stored) as T) : null;
  },
  setItem: async (key: string, value: Producto[] | Transaccion[]) => {
    if (typeof window === "undefined") return;
    localStorage.setItem(key, JSON.stringify(value));
  },
};

const GAS_API_URL =
  "https://script.google.com/macros/s/AKfycbykYu2c83rpTgxJ0vLNtxI8wGJXryNe1cy37f9OGGwHxwWxTRbdWOgdJIRl_SV4CKaP/exec";
const INITIAL_STATE: SyncState = {
  inventarioBase: [],
  inventarioFinal: [],
  transaccionesPendientes: [],
  countTransacciones: 0,
  estaSincronizando: false,
  ultimaActualizacion: null,
  inicializado: false,
  isOnline: true,
};

// ==================================================================
// === FUNCIÓN applyTransacciones CORREGIDA =========================
// ==================================================================
const applyTransacciones = (
  base: Producto[],
  transacciones: Transaccion[]
): Producto[] => {
  const skusModificados = new Set(transacciones.map((tx) => tx.producto.SKU));

  // 1. Filtrar los productos BASE, excluyendo aquellos con transacciones pendientes (para evitar duplicados).
  const inventarioBaseFiltrado: Producto[] = base
    .filter((p) => !skusModificados.has(p.SKU))
    .map((p) => {
      // Eliminar la marca isLocal del inventario base por si acaso
      const { isLocal, ...rest } = p;
      return rest as Producto;
    });

  // 2. Mapear las transacciones pendientes a productos (excluyendo DELETE) y marcarlas como locales.
  const productosLocales: Producto[] = transacciones
    .filter((tx) => tx.tipo !== "DELETE")
    .map((tx) => ({
      ...tx.producto,
      isLocal: true, // Marcar como local (pendiente de sincronizar)
    }));

  // 3. Combinar los dos arrays de forma inmutable. Los productos locales van primero.
  const final: Producto[] = [...productosLocales, ...inventarioBaseFiltrado];

  return final;
};
// ==================================================================

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export const SyncProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<SyncState>(INITIAL_STATE);

  // Efecto para detectar el estado de la conexión (sin cambios)
  useEffect(() => {
    setState((s) => ({ ...s, isOnline: navigator.onLine }));
    const handleOnline = () => setState((s) => ({ ...s, isOnline: true }));
    const handleOffline = () => setState((s) => ({ ...s, isOnline: false }));
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Carga inicial desde caché (sin cambios)
  useEffect(() => {
    const loadCache = async () => {
      const baseData =
        (await localForage.getItem<Producto[]>("inventario_base")) || [];
      const transactions =
        (await localForage.getItem<Transaccion[]>(
          "transacciones_pendientes"
        )) || [];
      const finalInventory = applyTransacciones(baseData, transactions);
      setState((s) => ({
        ...s,
        inventarioBase: baseData,
        transaccionesPendientes: transactions,
        inventarioFinal: finalInventory,
        countTransacciones: transactions.length,
        inicializado: true,
        ultimaActualizacion:
          baseData.length > 0 ? new Date().toLocaleTimeString() : null,
      }));
    };
    loadCache();
  }, []);

  // Función para sincronizar cambios (sin cambios en su lógica interna)
  const sincronizarCambios = useCallback(async () => {
    if (!navigator.onLine) {
      console.warn("Intento de sincronización cancelado: Sin conexión.");
      return;
    }
    if (state.transaccionesPendientes.length === 0 || state.estaSincronizando)
      return;
    setState((s) => ({ ...s, estaSincronizando: true }));
    try {
      await fetch(GAS_API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "processTransactions",
          transactions: state.transaccionesPendientes,
        }),
      });
      const response = await fetch(`${GAS_API_URL}?action=getProducts`);
      if (!response.ok)
        throw new Error(`Error al refrescar datos: ${response.statusText}`);
      const nuevoInventarioBase: Producto[] = await response.json();

      // Guardado de la base actualizada y limpieza de transacciones pendientes
      await localForage.setItem("transacciones_pendientes", []);
      await localForage.setItem("inventario_base", nuevoInventarioBase);

      setState((s) => ({
        ...s,
        inventarioBase: nuevoInventarioBase,
        // Al sincronizar, el inventario final se convierte en el base (ya que no quedan pendientes)
        inventarioFinal: nuevoInventarioBase,
        transaccionesPendientes: [],
        countTransacciones: 0,
        ultimaActualizacion: new Date().toLocaleTimeString(),
        estaSincronizando: false,
      }));
    } catch (error) {
      console.error("Error al sincronizar en la nube:", error);
      setState((s) => ({ ...s, estaSincronizando: false }));
    }
  }, [state.transaccionesPendientes, state.estaSincronizando]);

  // ==================================================================
  // === EFECTO CORREGIDO PARA AUTO-SINCRONIZACIÓN ====================
  // ==================================================================
  // Este es el ÚNICO efecto que dispara la sincronización automática.
  // Se activa solo si hay 10+ cambios y hay conexión.
  useEffect(() => {
    if (
      state.countTransacciones >= 10 &&
      state.isOnline &&
      !state.estaSincronizando
    ) {
      console.log(
        `[Auto-Sync] ${state.countTransacciones} cambios detectados. Sincronizando automáticamente.`
      );
      sincronizarCambios();
    }
  }, [
    state.countTransacciones,
    state.isOnline,
    state.estaSincronizando,
    sincronizarCambios,
  ]);

  // Las demás funciones se mantienen igual
  const registrarTransaccionLocal = useCallback((transaccion: Transaccion) => {
    setState((prevState) => {
      const nuevasTransacciones = [...prevState.transaccionesPendientes];
      const existingIndex = nuevasTransacciones.findIndex(
        (tx) => tx.producto.SKU === transaccion.producto.SKU
      );
      if (existingIndex !== -1)
        nuevasTransacciones[existingIndex] = transaccion;
      else nuevasTransacciones.push(transaccion);

      const nuevoInventarioFinal = applyTransacciones(
        prevState.inventarioBase,
        nuevasTransacciones
      );
      const newCount = nuevasTransacciones.length;

      // Guardamos en localStorage
      localForage.setItem("transacciones_pendientes", nuevasTransacciones);

      return {
        ...prevState,
        transaccionesPendientes: nuevasTransacciones,
        countTransacciones: newCount,
        inventarioFinal: nuevoInventarioFinal,
      };
    });
  }, []);

  const actualizarInventario = useCallback(
    async (forzar: boolean = false) => {
      if (!state.isOnline) return false;
      if (state.countTransacciones > 0 && !forzar) return false;
      setState((s) => ({ ...s, estaSincronizando: true }));
      try {
        const response = await fetch(`${GAS_API_URL}?action=getProducts`);
        if (!response.ok)
          throw new Error(`Error al obtener datos: ${response.statusText}`);
        const nuevosDatos: Producto[] = await response.json();

        // Guardamos en localStorage
        await localForage.setItem("inventario_base", nuevosDatos);

        const finalInventory = applyTransacciones(
          nuevosDatos,
          state.transaccionesPendientes
        );
        setState((s) => ({
          ...s,
          inventarioBase: nuevosDatos,
          inventarioFinal: finalInventory,
          ultimaActualizacion: new Date().toLocaleTimeString(),
        }));
        return true;
      } catch (error) {
        console.error("Error al actualizar desde GAS:", error);
        return false;
      } finally {
        setState((s) => ({ ...s, estaSincronizando: false }));
      }
    },
    [state.countTransacciones, state.transaccionesPendientes, state.isOnline]
  );

  const value: SyncContextType = {
    ...state,
    inventario: state.inventarioFinal,
    actualizarInventario,
    sincronizarCambios,
    registrarTransaccionLocal,
  };

  return React.createElement(SyncContext.Provider, { value }, children);
};

export const useSync = () => {
  const context = useContext(SyncContext);
  if (context === undefined) {
    throw new Error("useSync debe ser usado dentro de un SyncProvider");
  }
  return context;
};
