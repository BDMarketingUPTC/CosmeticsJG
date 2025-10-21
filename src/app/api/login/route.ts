export async function POST(req: Request) {
  try {
    // Leer los datos enviados desde el frontend
    const body = await req.json();

    // Tu endpoint de Google Apps Script
    const GAS_AUTH_ENDPOINT =
      "https://script.google.com/macros/s/AKfycbxQnfaFiZ621OoD1yWFl254ckuI_Fsm2Xd8dUYg8jHTXoWc929oOOX3byibBFrpCosP/exec";

    // Reenviar la solicitud al GAS (proxy)
    const response = await fetch(GAS_AUTH_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    // Leer texto crudo (por si GAS no responde JSON válido)
    const text = await response.text();

    return new Response(text, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("❌ Error en el proxy:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: "Error al comunicar con el servidor remoto.",
      }),
      { status: 500 }
    );
  }
}
