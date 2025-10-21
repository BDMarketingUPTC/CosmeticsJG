// ✅ URLs de tus dos Google Apps Script publicados como aplicaciones web
const INVOICES_API_URL =
  "https://script.google.com/macros/s/AKfycbxyx_2I4jtJN4Vc_EFNHPgzT8fGoWou05u3OHQvoniabyen9XduGl11BHvJYLNz5kgxow/exec";
const PRODUCTS_API_URL =
  "https://script.google.com/macros/s/AKfycbySGf1CvWR5VAM0ldwJYnSpfgh5p-ZnOJzJuWUoq9Xhzs9Y-0sYYTkbRmRvF7KOo8SA/exec";

// --- TIPOS DE DATOS ---

// Estructura de un objeto de error que puede devolver la función fetchGasData
interface ApiError {
  status: number;
  message: string;
}

// Un tipo genérico para la respuesta, que puede ser la data (T) o un error
type GasApiResponse<T> = T | ApiError;

/**
 * 🔗 Función genérica para hacer fetch a los endpoints GAS
 * @param url URL base del GAS (sin el parámetro ?action)
 * @param action Acción GET esperada en el GAS ("getInvoices" o "getProducts")
 */
async function fetchGasData<T>(
  url: string,
  action: string
): Promise<GasApiResponse<T>> {
  const gasUrl = `${url}?action=${action}`;

  const response = await fetch(gasUrl, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    return {
      status: response.status,
      message: `Error al conectar con GAS: ${response.statusText}`,
    } as ApiError;
  }

  const text = await response.text();

  try {
    // Intentamos parsear el JSON
    const data = JSON.parse(text);

    // Verifica si la respuesta contiene un error reportado por GAS
    if (data.status === "error" && data.message) {
      throw new Error(data.message);
    }

    // Retorna la data tipada (T)
    return data as T;
  } catch (e) {
    // 🛑 CORREGIDO: Manejo de error sin 'any' (línea 36 original)
    const errorMessage =
      e instanceof Error ? e.message : "Error de formato JSON desconocido";
    return {
      status: 500,
      message: `Respuesta inválida de GAS: ${errorMessage}`,
    } as ApiError;
  }
}

/**
 * 🧩 Handler principal de Next.js (GET /api/data)
 * Combina datos de facturación y productos en una sola respuesta JSON
 */
export async function GET() {
  try {
    // Tipificamos los resultados esperados
    const [invoicesResult, productsResult] = await Promise.all([
      fetchGasData<unknown[]>(INVOICES_API_URL, "getInvoices"),
      fetchGasData<unknown[]>(PRODUCTS_API_URL, "getProducts"),
    ]);

    // Función de ayuda para verificar si el resultado es un error tipado
    const isApiError = (
      result: GasApiResponse<unknown[]>
    ): result is ApiError => {
      return (result as ApiError).status !== undefined;
    };

    // Si alguna de las llamadas falló, devolver el error correspondiente
    if (isApiError(invoicesResult)) {
      return new Response(JSON.stringify(invoicesResult), {
        status: invoicesResult.status,
      });
    }
    if (isApiError(productsResult)) {
      return new Response(JSON.stringify(productsResult), {
        status: productsResult.status,
      });
    }

    // ✅ Combinar resultados (Si llegamos aquí, sabemos que son datos válidos, no errores)
    return Response.json({
      facturas: invoicesResult,
      productos: productsResult,
    });
  } catch (e) {
    // 🛑 CORREGIDO: Manejo de error sin 'any' (línea 70 original)
    const errorMessage =
      e instanceof Error ? e.message : "Error de ejecución desconocido";
    return Response.json(
      { status: "error", message: errorMessage },
      { status: 500 }
    );
  }
}
