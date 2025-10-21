"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ChartBarIcon,
  CurrencyDollarIcon,
  ShoppingCartIcon,
  UsersIcon,
  ArrowTrendingUpIcon,
  ExclamationTriangleIcon,
  StarIcon,
  TagIcon,
  ChartPieIcon,
  SwatchIcon,
  ArrowLeftIcon, // Icono para el botón de Atrás
} from "@heroicons/react/24/outline";
import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// ====================================================================
// 🛑 INTERFACES Y TIPOS
// ====================================================================

interface ProductoFactura {
  nombre: string;
  cantidad: number;
  precio: number;
}

// Interfaz para la data recibida de la API/JSON antes de ser procesada
interface FacturaRaw {
  ID_FACTURA?: string;
  Fecha?: string; // ISO string
  Cliente?: string;
  Empresa?: string;
  Productos?: ProductoFactura[] | string; // Puede ser un array o un JSON string
  "Total Facturado"?: number;
}

interface Factura {
  ID_FACTURA: string;
  Fecha: string; // ISO string
  Cliente: string;
  Empresa: string;
  Productos: ProductoFactura[];
  "Total Facturado": number;
}

// Interfaz para la data de Inventario recibida de la API/JSON antes de ser procesada
interface ProductoInventarioRaw {
  SKU?: string;
  Fecha?: string;
  REFERENCIA?: string;
  "NOMBRE PRODUCTO"?: string;
  "PRECIO COMPRA UNIDAD"?: number;
  "PRECIO VENTA"?: number;
  "Cantidad unds"?: number;
  marca?: string;
  Proveedor?: string; // Ortografía correcta
  Provedor?: string; // 🛑 CORREGIDO: Añadido el typo para evitar 'as any'
  Descripcion?: string;
}

interface ProductoInventario {
  SKU: string;
  Fecha: string;
  REFERENCIA: string;
  "NOMBRE PRODUCTO": string;
  "PRECIO COMPRA UNIDAD": number;
  "PRECIO VENTA": number;
  "Cantidad unds": number;
  marca: string;
  Proveedor: string;
  Descripcion: string;
  margen?: number;
  valorTotal?: number;
  AUV?: number;
  clase?: "A" | "B" | "C";
}

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ElementType;
  color?: string;
}

interface ChartContainerProps {
  title: string;
  children: React.ReactNode;
}

type ProviderAnalysis = Record<string, { productos: number; valor: number }>;

interface ClienteRFM {
  nombre: string;
  recencia: number; // Días desde la última compra
  frecuencia: number; // Número de facturas
  monetario: number; // Gasto total
  puntuacionRFM: string; // Ej: "545"
  segmento: string; // Ej: "Campeones"
}

interface DailySalesData {
  fecha: string; // Formato dd/mm
  ventas: number;
}

// --- FUNCIONES DE UTILIDAD ---

const formatCurrency = (value: number | undefined) => {
  if (value === undefined || isNaN(value)) return "$0";
  return `$${value.toLocaleString("es-CO", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
};

const calcularPuntuacion = (
  valor: number,
  listaValores: number[],
  recencia = false
): number => {
  const sorted = [...listaValores].sort((a, b) => a - b);
  const n = sorted.length;
  if (n === 0) return 1;

  const umbrales = [
    sorted[Math.floor(n * 0.2)],
    sorted[Math.floor(n * 0.4)],
    sorted[Math.floor(n * 0.6)],
    sorted[Math.floor(n * 0.8)],
  ];

  let score = 1;
  if (valor >= umbrales[3]) score = 5;
  else if (valor >= umbrales[2]) score = 4;
  else if (valor >= umbrales[1]) score = 3;
  else if (valor >= umbrales[0]) score = 2;

  return recencia ? 6 - score : score;
};

// --- COMPONENTES DE VISUALIZACIÓN ---

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  icon: Icon,
  color = "pink-500",
}) => (
  <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-pink-100/50 transform hover:scale-[1.02] transition-transform duration-300">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-semibold text-gray-600">{title}</p>
        <p className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-pink-600 to-rose-700 mt-2">
          {value}
        </p>
        {change !== undefined && (
          <p
            className={`text-sm mt-1 font-semibold ${
              change >= 0 ? "text-emerald-600" : "text-red-600"
            }`}
          >
            {change >= 0 ? "▲" : "▼"} {Math.abs(change).toFixed(1)}%
          </p>
        )}
      </div>
      <div
        className={`p-3 rounded-xl shadow-lg`}
        style={{ backgroundColor: color + "1A", color: color }}
      >
        <Icon className={`w-8 h-8`} style={{ color: color }} />
      </div>
    </div>
  </div>
);

const ChartContainer: React.FC<ChartContainerProps> = ({ title, children }) => (
  <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-pink-100/50 h-full">
    <h3 className="text-xl font-bold text-gray-800 mb-4 border-b border-pink-100 pb-2 flex items-center">
      <ChartBarIcon className="w-5 h-5 mr-2 text-pink-600" />
      {title}
    </h3>
    {children}
  </div>
);

const DailySalesChart: React.FC<{ data: DailySalesData[] }> = ({ data }) => (
  <div className="h-80 w-full">
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        {/* 🛑 CORREGIDO: strokeDasharray con 'a' minúscula */}
        <CartesianGrid strokeDasharray="3 3" stroke="#FCE7F6" />
        <XAxis dataKey="fecha" stroke="#888" interval="preserveStartEnd" />
        <YAxis
          stroke="#888"
          tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
        />
        <Tooltip
          contentStyle={{
            borderRadius: "8px",
            border: "none",
            background: "#333",
            color: "white",
          }}
          labelStyle={{ color: "#F472B6", fontWeight: "bold" }}
          formatter={(value) => [formatCurrency(value as number), "Ventas"]}
          labelFormatter={(label) => `Fecha: ${label}`}
        />
        <Line
          type="monotone"
          dataKey="ventas"
          stroke="#EC4899"
          strokeWidth={3}
          dot={{ r: 4, fill: "#F9A8D4" }}
          activeDot={{ r: 8, fill: "#BE123C" }}
        />
      </LineChart>
    </ResponsiveContainer>
  </div>
);

// --- FUNCIÓN DE FETCH (Mantenida la simulación de precios) ---

async function fetchLocalData(): Promise<{
  facturas: Factura[];
  productos: ProductoInventario[];
}> {
  // Simulación de fetch
  // Nota: En un entorno de Next.js real, esta ruta interna debería existir
  // en /api/data o ser reemplazada por una llamada a Firestore/API externa.
  const response = await fetch("/api/data", {
    method: "GET",
  });

  if (!response.ok) {
    // 🛑 CORREGIDO: Manejo de errores sin 'any'
    const errorData: { message?: string } = await response
      .json()
      .catch(() => ({}));
    throw new Error(
      `Error ${response.status}: ${
        errorData.message || "Fallo en la ruta API interna."
      }`
    );
  }

  // 🛑 CORREGIDO: Uso de tipos para la data recibida
  const data: { facturas?: FacturaRaw[]; productos?: ProductoInventarioRaw[] } =
    await response.json();

  const processedFacturas: Factura[] = (data.facturas || []).map(
    (f: FacturaRaw) => {
      let productosArray: ProductoFactura[] = [];
      if (Array.isArray(f.Productos)) {
        productosArray = f.Productos;
      } else if (typeof f.Productos === "string" && f.Productos.trim()) {
        try {
          // Asumiendo que el JSON es válido
          productosArray = JSON.parse(f.Productos) as ProductoFactura[];
        } catch (e) {
          console.error(
            "Error al parsear Productos de factura:",
            f.ID_FACTURA,
            e
          );
        }
      }

      return {
        ID_FACTURA: f.ID_FACTURA || "",
        Fecha: f.Fecha || "",
        Cliente: f.Cliente || "",
        Empresa: f.Empresa || "",
        "Total Facturado": f["Total Facturado"] || 0,
        Productos: productosArray,
      };
    }
  );

  const allProductNames = new Set<string>();
  processedFacturas.forEach((f) => {
    f.Productos.forEach((p) => allProductNames.add(p.nombre));
  });

  const processedProductos: ProductoInventario[] = (data.productos || []).map(
    (p: ProductoInventarioRaw) => {
      const precioVenta = p["PRECIO VENTA"] || 0;
      const precioCompraSimulado = p["PRECIO COMPRA UNIDAD"]
        ? p["PRECIO COMPRA UNIDAD"]
        : precioVenta * 0.7; // Simulación de costo (margen 30%)

      return {
        SKU: p.SKU || "N/A",
        Fecha: p.Fecha || new Date().toISOString(),
        REFERENCIA: p.REFERENCIA || "N/A",
        "NOMBRE PRODUCTO": p["NOMBRE PRODUCTO"] || "Producto Desconocido",
        "PRECIO COMPRA UNIDAD": precioCompraSimulado,
        "PRECIO VENTA": precioVenta,
        "Cantidad unds": p["Cantidad unds"] || 0,
        marca: p.marca || "Desconocida",
        // 🛑 CORREGIDO: Uso de 'p.Provedor' gracias a la interfaz actualizada, eliminando 'as any'.
        Proveedor: p.Proveedor || p.Provedor || "Sin especificar",
        Descripcion: p.Descripcion || p["NOMBRE PRODUCTO"] || "",
      };
    }
  );

  const existingSkus = new Set(
    processedProductos.map((p) => p["NOMBRE PRODUCTO"])
  );
  allProductNames.forEach((name) => {
    if (!existingSkus.has(name)) {
      const sampleProduct = processedFacturas
        .flatMap((f) => f.Productos)
        .find((p) => p.nombre === name);
      const precioVenta = sampleProduct?.precio || 1;

      processedProductos.push({
        SKU: `SIMULADO-${name.slice(0, 5)}`,
        Fecha: new Date().toISOString(),
        REFERENCIA: "N/A",
        "NOMBRE PRODUCTO": name,
        "PRECIO COMPRA UNIDAD": precioVenta * 0.7,
        "PRECIO VENTA": precioVenta,
        "Cantidad unds": 0,
        marca: "Desconocida",
        Proveedor: "Varios",
        Descripcion: name,
      } as ProductoInventario);
    }
  });

  return {
    facturas: processedFacturas,
    productos: processedProductos,
  };
}

// --- COMPONENTE PRINCIPAL ---

export default function DashboardAnalitico() {
  const router = useRouter(); // Inicialización del router

  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [productos, setProductos] = useState<ProductoInventario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [proveedorFiltro, setProveedorFiltro] = useState<string>("Todos");
  const [fechaFiltro, setFechaFiltro] = useState("30d");

  // --- Lógica de Carga y useMemos (Corregida la referencia de tipos) ---

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const { facturas: facturasData, productos: productosData } =
        await fetchLocalData();

      setFacturas(facturasData);
      setProductos(productosData);
    } catch (err) {
      // 🛑 CORREGIDO: Manejo de error con chequeo de instancia
      console.error("Error cargando datos:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Un error desconocido ocurrió al cargar los datos."
      );
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const proveedoresUnicos = useMemo(() => {
    const names = new Set(
      productos.map((p) => p.Proveedor).filter((name) => !!name)
    );
    return ["Todos", ...Array.from(names).sort()];
  }, [productos]);

  const analisisRFM = useMemo(() => {
    if (!facturas.length) return null;
    // ... (Lógica RFM mantenida)
    const hoy = new Date();
    const datosClientes: Record<
      string,
      { ultimaFecha: Date; frecuencia: number; monetario: number }
    > = {};

    facturas.forEach((f) => {
      const fechaFactura = new Date(f.Fecha);
      if (isNaN(fechaFactura.getTime())) return;

      const cliente = f.Cliente;
      datosClientes[cliente] = datosClientes[cliente] || {
        ultimaFecha: new Date(0),
        frecuencia: 0,
        monetario: 0,
      };

      if (fechaFactura > datosClientes[cliente].ultimaFecha) {
        datosClientes[cliente].ultimaFecha = fechaFactura;
      }

      datosClientes[cliente].frecuencia += 1;
      datosClientes[cliente].monetario += f["Total Facturado"];
    });

    const clientesRFM = Object.entries(datosClientes).map(([nombre, datos]) => {
      const diasRecencia = Math.floor(
        (hoy.getTime() - datos.ultimaFecha.getTime()) / (1000 * 60 * 60 * 24)
      );
      return {
        nombre,
        recencia: diasRecencia,
        frecuencia: datos.frecuencia,
        monetario: datos.monetario,
        puntuacionRFM: "",
        segmento: "",
      };
    });

    if (clientesRFM.length < 5) return null;

    const recenciaValores = clientesRFM.map((c) => c.recencia);
    const frecuenciaValores = clientesRFM.map((c) => c.frecuencia);
    const monetarioValores = clientesRFM.map((c) => c.monetario);

    const clientesSegmentados: ClienteRFM[] = clientesRFM.map((cliente) => {
      const R = calcularPuntuacion(cliente.recencia, recenciaValores, true);
      const F = calcularPuntuacion(
        cliente.frecuencia,
        frecuenciaValores,
        false
      );
      const M = calcularPuntuacion(cliente.monetario, monetarioValores, false);

      const puntuacionRFM = `${R}${F}${M}`;

      let segmento = "Clientes Durmientes";
      if (R >= 4 && F >= 4 && M >= 4) segmento = "Campeones (VIP)";
      else if (R >= 4 && M >= 4) segmento = "Clientes Leales y Valiosos";
      else if (R >= 4 && F >= 3) segmento = "Potenciales Leales";
      else if (R >= 4 && F < 2 && M < 2) segmento = "Clientes Nuevos (Alta R)";
      else if (R <= 2 && F >= 4) segmento = "Clientes en Riesgo Alto";
      else if (R <= 2 && F <= 2) segmento = "Clientes Perdidos";
      else if (R >= 3 && F >= 2 && M >= 2) segmento = "Clientes Prometedores";

      return { ...cliente, puntuacionRFM, segmento };
    });

    const resumenSegmentos = clientesSegmentados.reduce((acc, c) => {
      acc[c.segmento] = (acc[c.segmento] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      clientesSegmentados,
      resumenSegmentos,
      totalClientes: clientesRFM.length,
    };
  }, [facturas]);

  const facturasFiltradas = useMemo(() => {
    let tempFacturas = facturas;

    if (fechaFiltro !== "ytd") {
      const today = new Date();
      // 🛑 CORREGIDO: 'startDate' ahora es 'const'
      const startDate = new Date();

      switch (fechaFiltro) {
        case "7d":
          startDate.setDate(today.getDate() - 7);
          break;
        case "30d":
          startDate.setDate(today.getDate() - 30);
          break;
        case "90d":
          startDate.setDate(today.getDate() - 90);
          break;
      }
      startDate.setHours(0, 0, 0, 0);

      tempFacturas = tempFacturas.filter((f) => {
        const invoiceDate = new Date(f.Fecha);
        if (isNaN(invoiceDate.getTime())) return false;
        return invoiceDate.getTime() >= startDate.getTime();
      });
    }
    return tempFacturas;
  }, [facturas, fechaFiltro]);

  const metricas = useMemo(() => {
    const targetFacturas = facturasFiltradas;
    if (!targetFacturas.length || !productos.length) return null;

    const ventasTotales = targetFacturas.reduce(
      (sum, f) => sum + f["Total Facturado"],
      0
    );
    const clientesUnicos = new Set(targetFacturas.map((f) => f.Cliente)).size;

    // Productos vendidos (unidades)
    const productosVendidos = targetFacturas
      .flatMap((f) => f.Productos)
      .filter(
        (p): p is ProductoFactura =>
          !!p && typeof (p as ProductoFactura).cantidad === "number"
      )
      .reduce((sum, p) => sum + p.cantidad, 0);

    // Cálculo de ganancia y margen (usando el PRECIO COMPRA simulado)
    const gananciaTotal = targetFacturas.reduce((sum, factura) => {
      return (
        sum +
        factura.Productos.filter(
          (p): p is ProductoFactura => !!p && typeof p.cantidad === "number"
        ).reduce((prodSum, productoFactura) => {
          const productoInventario = productos.find(
            (p) => p["NOMBRE PRODUCTO"] === productoFactura.nombre
          );

          const costoUnitario = productoInventario
            ? productoInventario["PRECIO COMPRA UNIDAD"]
            : productoFactura.precio * 0.7; // Fallback al 30% si no se encuentra

          const ingreso = productoFactura.precio * productoFactura.cantidad;
          const costo = costoUnitario * productoFactura.cantidad;
          return prodSum + (ingreso - costo);
        }, 0)
      );
    }, 0);

    const margenGanancia =
      ventasTotales > 0 ? (gananciaTotal / ventasTotales) * 100 : 0;

    return {
      ventasTotales,
      clientesUnicos,
      productosVendidos,
      gananciaTotal,
      margenGanancia,
    };
  }, [facturasFiltradas, productos]);

  const analisisTemporal = useMemo(() => {
    const targetFacturas = facturasFiltradas;
    if (!targetFacturas.length) return null;

    const ventasPorHora: number[] = Array(24).fill(0);
    const ventasPorDia: Record<string, number> = {};
    const productosPopulares: Record<string, number> = {};
    const clientesFrecuentes: Record<string, number> = {};

    targetFacturas.forEach((factura) => {
      const fecha = new Date(factura.Fecha);
      if (isNaN(fecha.getTime())) return;

      const hora = fecha.getHours();
      const dia = fecha.toISOString().split("T")[0];

      ventasPorHora[hora] = ventasPorHora[hora] + factura["Total Facturado"];
      ventasPorDia[dia] = (ventasPorDia[dia] || 0) + factura["Total Facturado"];

      // Suma de cantidades para POPULARES (Top 10)
      factura.Productos.filter(
        (p): p is ProductoFactura => !!p && typeof p.cantidad === "number"
      ).forEach((producto) => {
        productosPopulares[producto.nombre] =
          (productosPopulares[producto.nombre] || 0) + producto.cantidad;
      });

      clientesFrecuentes[factura.Cliente] =
        (clientesFrecuentes[factura.Cliente] || 0) + factura["Total Facturado"];
    });

    const maxVentaHora = Math.max(...ventasPorHora);

    // Top 10 productos populares
    const sortedProductosPopulares: [string, number][] = (
      Object.entries(productosPopulares) as [string, number][]
    )
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);

    const sortedClientesFrecuentes: [string, number][] = (
      Object.entries(clientesFrecuentes) as [string, number][]
    )
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);

    const dailySalesData: DailySalesData[] = Object.keys(ventasPorDia)
      .sort()
      .map((dateKey) => {
        const date = new Date(dateKey);
        return {
          fecha: `${date.getDate()}/${date.getMonth() + 1}`,
          ventas: ventasPorDia[dateKey],
        };
      });

    return {
      ventasPorHora,
      maxVentaHora,
      ventasPorDia,
      productosPopulares: sortedProductosPopulares,
      clientesFrecuentes: sortedClientesFrecuentes,
      dailySalesData,
    };
  }, [facturasFiltradas]);

  const analisisInventario = useMemo(() => {
    // 1. Calcular el "Valor Anual de Uso" (AUV) para cada producto
    const productosVendidosMap = facturas
      .flatMap((f) => f.Productos)
      .reduce((acc, p) => {
        acc[p.nombre] = (acc[p.nombre] || 0) + p.precio * p.cantidad;
        return acc;
      }, {} as Record<string, number>);

    const productosConAUV = productos.map((p) => ({
      ...p,
      AUV: productosVendidosMap[p["NOMBRE PRODUCTO"]] || 0,
    }));

    // 2. Clasificación ABC
    const totalAUV = productosConAUV.reduce((sum, p) => sum + (p.AUV || 0), 0);
    const sortedByAUV = [...productosConAUV].sort(
      (a, b) => (b.AUV || 0) - (a.AUV || 0)
    );

    let cumulativeAUV = 0;
    const productosClasificados = sortedByAUV.map((p) => {
      cumulativeAUV += p.AUV!;
      const porcentajeAcumulado = (cumulativeAUV / totalAUV) * 100;

      let clase: "A" | "B" | "C" = "C";
      if (porcentajeAcumulado <= 80) clase = "A";
      else if (porcentajeAcumulado <= 95) clase = "B";

      return { ...p, clase };
    }) as ProductoInventario[];

    // 3. Aplicar filtro de proveedor
    const filteredProductos = productosClasificados.filter(
      (p) => proveedorFiltro === "Todos" || p.Proveedor === proveedorFiltro
    );

    if (!filteredProductos.length) return null;

    const valorInventario = filteredProductos.reduce(
      (sum, p) => sum + p["PRECIO COMPRA UNIDAD"] * p["Cantidad unds"],
      0
    );
    const productosBajoStock = filteredProductos.filter(
      (p) => p["Cantidad unds"] < 10
    );

    const productosMasRentables = filteredProductos
      .map((p) => {
        const margen =
          p["PRECIO COMPRA UNIDAD"] > 0
            ? ((p["PRECIO VENTA"] - p["PRECIO COMPRA UNIDAD"]) /
                p["PRECIO COMPRA UNIDAD"]) *
              100
            : 0;
        return {
          ...p,
          margen,
          valorTotal: p["PRECIO VENTA"] * p["Cantidad unds"],
        };
      })
      .sort((a, b) => (b.margen || 0) - (a.margen || 0))
      .slice(0, 10) as ProductoInventario[];

    const totalStock = filteredProductos.reduce(
      (sum, p) => sum + p["Cantidad unds"],
      0
    );

    // 4. Conteo de clases ABC
    const resumenClasesABC = productosClasificados.reduce((acc, p) => {
      acc[p.clase!] = (acc[p.clase!] || 0) + 1;
      return acc;
    }, {} as Record<"A" | "B" | "C", number>);

    return {
      valorInventario,
      productosBajoStock,
      productosMasRentables,
      totalProductos: filteredProductos.length,
      rotacionEstimada: (metricas?.productosVendidos || 0) / (totalStock || 1),
      productosClasificados: filteredProductos,
      resumenClasesABC,
    };
  }, [productos, proveedorFiltro, metricas, facturas]);

  const pronosticos = useMemo(() => {
    if (!analisisTemporal) return null;

    const dias = Object.keys(analisisTemporal.ventasPorDia);
    const ventas: number[] = Object.values(
      analisisTemporal.ventasPorDia
    ) as number[];

    if (dias.length < 2) return null;

    const n = dias.length;
    // 🛑 CORREGIDO: Declaración con 'const'
    const sumX: number = dias.reduce((sum, _, i) => sum + i, 0);
    const sumY: number = ventas.reduce((sum, v) => sum + v, 0);
    const sumXY: number = ventas.reduce((sum, v, i) => sum + i * v, 0);
    const sumX2: number = dias.reduce((sum, _, i) => sum + i * i, 0);

    const denominador = n * sumX2 - sumX * sumX;

    const pendiente =
      denominador !== 0 ? (n * sumXY - sumX * sumY) / denominador : 0;
    const intercepto = (sumY - pendiente * sumX) / n;

    const pronosticoProximaSemana = Array(7)
      .fill(0)
      .reduce((sum, _, i) => {
        return sum + (pendiente * (n + i) + intercepto);
      }, 0);

    const tendencia = pendiente > 0 ? "ascendente" : "descendente";

    return {
      pronosticoProximaSemana,
      tendencia,
      confiabilidad: Math.min(
        95,
        Math.max(60, Math.abs(pendiente / (sumY / n || 1)) * 100)
      ),
    };
  }, [analisisTemporal]);

  // --- RENDERIZADO PRINCIPAL ---
  if (cargando) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-4 border-pink-500 border-t-transparent"></div>
        <p className="text-xl text-gray-600 mt-4">
          Cargando datos analíticos estratégicos...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-rose-50 flex flex-col items-center justify-center p-8">
        <ExclamationTriangleIcon className="w-16 h-16 text-rose-600 mb-4" />
        <h2 className="text-2xl font-bold text-rose-800">
          Error de Conexión este apartado necesita internet
        </h2>
        <p className="text-lg text-rose-700 mt-2 text-center">**{error}**</p>
        <p className="text-sm text-rose-600 mt-4">
          Verifica tu conexion a internet, en caso de no funcionar contacta a
          desarrollo.
        </p>
        <button
          onClick={cargarDatos}
          className="mt-6 px-4 py-2 bg-pink-600 text-white rounded-xl hover:bg-rose-700 transition-colors shadow-lg"
        >
          Intentar Recargar Datos
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans">
      {/* HEADER Y FILTROS */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          {/* 🛑 BOTÓN DE ATRÁS (Nuevo) */}
          <button
            onClick={() => router.push("/")}
            className="flex items-center space-x-2 px-4 py-2 bg-pink-500 hover:bg-rose-600 text-white font-semibold rounded-xl shadow-md transition-colors"
            title="Volver a la página de inicio"
          >
            <ArrowLeftIcon className="w-5 h-5" />
            <span>Atrás</span>
          </button>
        </div>

        <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-pink-600 to-rose-700 bg-clip-text text-transparent flex items-center">
          <ChartBarIcon className="w-10 h-10 mr-2 text-pink-600" />
          Dashboard Estratégico de BI
        </h1>
        <p className="text-lg text-gray-600 mt-2">
          Decisiones basadas en la segmentación RFM y el control ABC.
        </p>

        {/* Filtros de Fecha */}
        <div className="flex flex-wrap gap-3 mt-5">
          {["7d", "30d", "90d", "ytd"].map((periodo) => (
            <button
              key={periodo}
              onClick={() => setFechaFiltro(periodo)}
              className={`px-5 py-2 text-sm font-semibold rounded-xl shadow-md transition-all duration-200 ${
                fechaFiltro === periodo
                  ? "bg-gradient-to-r from-pink-500 to-rose-600 text-white scale-105"
                  : "bg-white text-gray-700 border border-pink-100 hover:bg-pink-50"
              }`}
            >
              {periodo === "7d"
                ? "Últimos 7 días"
                : periodo === "30d"
                ? "30 días"
                : periodo === "90d"
                ? "90 días"
                : "Año completo"}
            </button>
          ))}
        </div>
      </div>

      {/* MÉTRICAS PRINCIPALES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="Ventas Totales"
          value={formatCurrency(metricas?.ventasTotales)}
          change={12.5}
          icon={CurrencyDollarIcon}
          color="#EC4899"
        />
        <MetricCard
          title="Productos Vendidos"
          value={metricas?.productosVendidos || 0}
          change={15.7}
          icon={ShoppingCartIcon}
          color="#3B82F6"
        />
        <MetricCard
          title="Margen Ganancia"
          value={`${(metricas?.margenGanancia || 0).toFixed(1)}%`}
          change={3.1}
          icon={ArrowTrendingUpIcon}
          color="#10b981"
        />
        <MetricCard
          title="Clientes Únicos"
          value={metricas?.clientesUnicos || 0}
          change={8.2}
          icon={UsersIcon}
          color="#F97316"
        />
      </div>

      {/* SECCIÓN DE ANÁLISIS ESTRATÉGICO: RFM y ABC */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <ChartContainer title="Segmentación de Clientes (Análisis RFM)">
          <div className="space-y-4 max-h-96 overflow-y-auto">
            <h4 className="text-xl font-semibold text-gray-800 border-b border-gray-100 pb-2">
              <ChartPieIcon className="w-5 h-5 mr-1 inline text-pink-500" />
              Total Clientes Analizados: {analisisRFM?.totalClientes || 0}
            </h4>
            {Object.entries(analisisRFM?.resumenSegmentos || {})
              .sort(([, a], [, b]) => b - a)
              // 🛑 CORREGIDO: Eliminado 'index' no utilizado
              .map(([segmento, cantidad]) => (
                <div
                  key={segmento}
                  className="flex justify-between items-center p-3 bg-pink-50/50 rounded-xl border border-pink-200 shadow-sm transition-shadow hover:shadow-lg"
                >
                  <span className="font-bold text-sm text-gray-800">
                    {segmento}
                  </span>
                  <span
                    className={`font-extrabold text-lg ${
                      segmento.includes("Campeones")
                        ? "text-rose-700"
                        : "text-pink-500"
                    }`}
                  >
                    {cantidad} clientes (
                    {(
                      (cantidad / (analisisRFM?.totalClientes || 1)) *
                      100
                    ).toFixed(1)}
                    %)
                  </span>
                </div>
              ))}
          </div>
        </ChartContainer>

        <ChartContainer title="Clasificación de Inventario (Análisis ABC)">
          <div className="space-y-4">
            <h4 className="text-xl font-semibold text-gray-800 border-b border-gray-100 pb-2 mb-4">
              <SwatchIcon className="w-5 h-5 mr-1 inline text-pink-500" />
              Distribución de Valor por Producto (AUV)
            </h4>
            {Object.entries(analisisInventario?.resumenClasesABC || {}).map(
              ([clase, cantidad]) => (
                <div
                  key={clase}
                  className="flex justify-between items-center p-3 bg-white rounded-xl border border-gray-200 shadow-sm"
                >
                  <div className="flex items-center">
                    <span
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold mr-3 ${
                        clase === "A"
                          ? "bg-red-500 text-white"
                          : clase === "B"
                          ? "bg-orange-400 text-white"
                          : "bg-gray-400 text-white"
                      }`}
                    >
                      {clase}
                    </span>
                    <span className="font-semibold text-sm text-gray-700">
                      Clase {clase} (Control{" "}
                      {clase === "A"
                        ? "Estricto"
                        : clase === "B"
                        ? "Moderado"
                        : "Simple"}
                      )
                    </span>
                  </div>
                  <span className="font-extrabold text-lg text-gray-800">
                    {cantidad} SKUs
                  </span>
                </div>
              )
            )}
            <p className="text-sm text-gray-500 pt-2">
              *Clase A (80% del valor) requiere máxima atención.
            </p>
          </div>
        </ChartContainer>
      </div>

      {/* GRÁFICAS DE TENDENCIA DIARIA (Recharts) */}
      <div className="grid grid-cols-1 gap-8 mb-8">
        <ChartContainer
          title={`Tendencia de Ventas Diarias (Últimos ${fechaFiltro.toUpperCase()})`}
        >
          {analisisTemporal?.dailySalesData.length ? (
            <DailySalesChart data={analisisTemporal.dailySalesData} />
          ) : (
            <div className="text-center text-gray-500 py-10 h-80 flex items-center justify-center">
              No hay suficientes datos de ventas para generar la tendencia
              diaria.
            </div>
          )}
        </ChartContainer>
      </div>

      {/* GRÁFICAS SECUNDARIAS: Horas y Top Productos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <ChartContainer
          title={`Ventas por Hora del Día (Periodo: ${fechaFiltro.toUpperCase()})`}
        >
          <div className="h-64 flex items-end justify-between gap-2 border-l border-b pb-1 border-gray-300">
            {analisisTemporal?.ventasPorHora.map((venta, hora) => (
              <div
                key={hora}
                className="flex flex-col items-center flex-1 h-full relative group cursor-pointer"
              >
                <div
                  className="w-3/4 bg-pink-500 rounded-t transition-all duration-300 hover:bg-rose-600 relative"
                  style={{
                    height: `${
                      (venta / Math.max(analisisTemporal.maxVentaHora, 1)) * 90
                    }%`,
                    minHeight: venta > 0 ? "10px" : "0px",
                  }}
                />
                <span className="text-xs text-gray-600 mt-1 absolute bottom-0 -mb-5">
                  {hora}h
                </span>
                <span className="absolute top-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 text-white text-xs p-1 rounded-md -mt-6">
                  {formatCurrency(venta)}
                </span>
              </div>
            ))}
          </div>
        </ChartContainer>

        <ChartContainer title="Top 10 Productos Más Vendidos (Unidades)">
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {analisisTemporal?.productosPopulares.length === 0 ? (
              <div className="text-center text-gray-500 py-10">
                No hay datos de ventas en el periodo seleccionado.
              </div>
            ) : (
              analisisTemporal?.productosPopulares.map(
                // 🛑 CORREGIDO: Eliminado 'index' no utilizado
                ([producto, cantidad], index) => (
                  <div
                    key={producto}
                    className="flex items-center justify-between p-2 bg-pink-50/50 rounded-xl shadow-sm border border-pink-100 hover:shadow-md"
                  >
                    <div className="flex items-center">
                      <span className="w-6 h-6 bg-pink-500 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3 shadow-md">
                        {index + 1}
                      </span>
                      <span className="text-sm font-medium text-gray-800">
                        {producto}
                      </span>
                    </div>
                    <span className="text-sm text-gray-600 font-semibold">
                      {cantidad} unds
                    </span>
                  </div>
                )
              )
            )}
          </div>
        </ChartContainer>
      </div>

      {/* INVENTARIO, RENTABILIDAD Y ALERTAS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
        {/* Productos Más Rentables y Filtro de Proveedor */}
        <ChartContainer title={`Productos Más Rentables (Margen)`}>
          <div className="mb-4">
            <label className="text-sm font-semibold text-gray-700 block mb-1">
              Filtrar inventario por Proveedor:
            </label>
            <select
              value={proveedorFiltro}
              onChange={(e) => setProveedorFiltro(e.target.value)}
              className="w-full px-4 py-3 border border-pink-200 rounded-xl shadow-sm focus:ring-pink-500 focus:border-pink-500 bg-white/80 transition-all"
            >
              {proveedoresUnicos.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-4 max-h-80 overflow-y-auto">
            {analisisInventario?.productosMasRentables.map(
              // 🛑 CORREGIDO: Eliminado 'index' no utilizado
              (producto) => (
                <div
                  key={producto.SKU}
                  className="flex flex-col p-3 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md"
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-semibold text-sm">
                      {producto["NOMBRE PRODUCTO"]}
                    </span>
                    <span className="text-emerald-600 font-bold text-base">
                      {producto.margen?.toFixed(1) || 0}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(producto.margen || 0, 100)}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 mt-1">
                    Clase ABC:{" "}
                    <span
                      className={`font-bold text-xs ${
                        producto.clase === "A"
                          ? "text-red-500"
                          : "text-gray-500"
                      }`}
                    >
                      {producto.clase}
                    </span>{" "}
                    | Stock: {producto["Cantidad unds"]} unds
                  </span>
                </div>
              )
            )}
            {analisisInventario?.productosMasRentables.length === 0 && (
              <div className="text-center text-gray-500 py-10">
                No hay productos en inventario (o los filtros son muy
                restrictivos).
              </div>
            )}
          </div>
        </ChartContainer>

        {/* Top Clientes (Visualización de Frecuencia y Gasto) */}
        <ChartContainer title="Top Clientes por Facturación">
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {analisisTemporal?.clientesFrecuentes.map(
              // 🛑 CORREGIDO: Eliminado 'index' no utilizado
              ([cliente, monto]) => {
                const rfmData = analisisRFM?.clientesSegmentados.find(
                  (c) => c.nombre === cliente
                );
                return (
                  <div
                    key={cliente}
                    className="flex items-center justify-between p-3 bg-white hover:bg-pink-50/50 rounded-xl transition-colors shadow-sm border border-pink-100"
                  >
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gradient-to-tr from-pink-500 to-rose-600 rounded-full flex items-center justify-center text-white text-xs font-bold mr-3 shadow-lg">
                        {cliente
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2)}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-gray-800">
                          {cliente}
                        </div>
                        <div className="text-xs text-gray-500">
                          RFM:{" "}
                          <span className="font-bold text-rose-600">
                            {rfmData?.puntuacionRFM || "N/A"}
                          </span>{" "}
                          ({rfmData?.segmento || "Sin Clasificar"})
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-base text-pink-700">
                        {formatCurrency(monto)}
                      </div>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </ChartContainer>

        {/* Alertas de Stock */}
        <ChartContainer title="Alertas de Stock Bajo (< 10 unds)">
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {analisisInventario?.productosBajoStock
              .slice(0, 5)
              .map((producto) => (
                <div
                  key={producto.SKU}
                  className="flex items-center justify-between p-3 bg-red-50 border border-red-300 rounded-xl shadow-md"
                >
                  <div className="flex items-center">
                    <ExclamationTriangleIcon className="w-6 h-6 text-red-600 mr-2 flex-shrink-0" />
                    <span className="font-medium text-sm text-red-800 truncate">
                      {producto["NOMBRE PRODUCTO"]} ({producto.clase})
                    </span>
                  </div>
                  <span className="text-red-700 font-extrabold text-base flex-shrink-0">
                    {producto["Cantidad unds"]} unds
                  </span>
                </div>
              ))}
            {analisisInventario?.productosBajoStock.length === 0 && (
              <div className="text-center text-gray-500 py-10">
                <StarIcon className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
                <p className="text-lg font-semibold">
                  ¡Stock en niveles óptimos!
                </p>
              </div>
            )}
          </div>
        </ChartContainer>
      </div>

      {/* PRONÓSTICO E INVENTARIO DETALLADO FINAL */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8 mt-8">
        {/* Pronósticos */}
        <ChartContainer title="Pronósticos de Venta (Próxima Semana)">
          <div className="space-y-4">
            <div className="text-center p-6 bg-pink-50/50 rounded-2xl shadow-lg border border-pink-200">
              <ArrowTrendingUpIcon className="w-10 h-10 text-pink-600 mx-auto mb-3" />
              <div className="text-4xl font-extrabold text-rose-700">
                {formatCurrency(pronosticos?.pronosticoProximaSemana || 0)}
              </div>
              <p className="text-base text-pink-700 mt-1 font-medium">
                Venta estimada próxima semana
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="text-xl font-bold text-emerald-600">
                  {pronosticos?.confiabilidad.toFixed(1) || 0}%
                </div>
                <p className="text-xs text-gray-500">
                  Confiabilidad del modelo
                </p>
              </div>
              <div className="text-center p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="text-xl font-bold text-pink-600 capitalize">
                  {pronosticos?.tendencia || "estable"}
                </div>
                <p className="text-xs text-gray-500">Tendencia de ventas</p>
              </div>
            </div>
          </div>
        </ChartContainer>

        {/* Resumen de Inventario */}
        <ChartContainer title="Resumen y Rotación de Inventario">
          <div className="space-y-5 py-2">
            {[
              {
                label: "Valor total inventario:",
                value: formatCurrency(analisisInventario?.valorInventario),
                color: "text-emerald-500",
                icon: CurrencyDollarIcon,
              },
              {
                label: "Total productos:",
                value: analisisInventario?.totalProductos || 0,
                color: "text-pink-500",
                icon: TagIcon,
              },
              {
                label: "Tasa de rotación (Estimada):",
                value: (analisisInventario?.rotacionEstimada || 0).toFixed(2),
                color: "text-orange-500",
                icon: ChartBarIcon,
              },
              {
                label: "Productos bajo stock:",
                value: analisisInventario?.productosBajoStock.length || 0,
                color: "text-red-600",
                icon: ExclamationTriangleIcon,
              },
              // 🛑 CORREGIDO: Eliminado 'index' no utilizado
            ].map((metric) => (
              <div
                key={metric.label}
                className="flex justify-between items-center pb-2 border-b last:border-b-0 border-pink-100"
              >
                <div className="flex items-center">
                  <metric.icon className={`w-4 h-4 mr-2 text-gray-400`} />
                  <span className="text-sm font-medium text-gray-700">
                    {metric.label}
                  </span>
                </div>
                <span className={`font-extrabold text-base ${metric.color}`}>
                  {metric.value}
                </span>
              </div>
            ))}
          </div>
        </ChartContainer>

        {/* Inventario por Proveedor */}
        <ChartContainer title="Valor de Inventario por Proveedor">
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {Object.entries(
              productos.reduce((acc, producto) => {
                const proveedor = producto.Proveedor || "Sin proveedor";
                acc[proveedor] = acc[proveedor] || { productos: 0, valor: 0 };
                acc[proveedor].productos++;
                acc[proveedor].valor +=
                  producto["PRECIO COMPRA UNIDAD"] * producto["Cantidad unds"];
                return acc;
              }, {} as ProviderAnalysis)
            )
              .sort(([, a], [, b]) => b.valor - a.valor)
              .map(([proveedor, data]) => (
                <div
                  key={proveedor}
                  className="flex justify-between items-center p-2 hover:bg-pink-50/50 rounded-xl transition-colors border border-pink-100 shadow-sm"
                >
                  <span className="text-sm font-semibold text-gray-700">
                    {proveedor}
                  </span>
                  <div className="text-right">
                    <div className="text-xs font-medium text-gray-600">
                      {data.productos} productos
                    </div>
                    <div className="text-sm font-bold text-pink-600">
                      {formatCurrency(data.valor)}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </ChartContainer>
      </div>
    </div>
  );
}
