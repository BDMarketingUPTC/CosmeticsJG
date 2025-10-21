import type { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const res = await fetch(
      "https://script.google.com/macros/s/AKfycbxQnfaFiZ621OoD1yWFl254ckuI_Fsm2Xd8dUYg8jHTXoWc929oOOX3byibBFrpCosP/exec",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );

    const text = await res.text();
    return new Response(text, {
      status: res.status,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        message: "Error interno del proxy",
        error: error,
      }),
      { status: 500 }
    );
  }
}
