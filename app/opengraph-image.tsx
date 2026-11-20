import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 24,
          padding: 96,
          background: "#5B3DF5",
        }}
      >
        <div
          style={{
            display: "flex",
            width: 72,
            height: 72,
            borderRadius: 20,
            background: "#FFC53D",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Check dibujado con bordes (no un glifo de fuente): Satori no
              siempre tiene el carácter ✓ disponible y lo renderiza como tofu. */}
          <div
            style={{
              display: "flex",
              width: 26,
              height: 14,
              marginTop: -4,
              borderLeft: "6px solid #17121F",
              borderBottom: "6px solid #17121F",
              transform: "rotate(-45deg)",
            }}
          />
        </div>
        <div style={{ display: "flex", fontSize: 88, fontWeight: 700, color: "#FFFFFF" }}>
          AgendaYa
        </div>
        <div style={{ display: "flex", fontSize: 36, color: "rgba(255,255,255,0.85)", maxWidth: 820 }}>
          Reserva tu cita en lo que tardas en escribir un WhatsApp.
        </div>
      </div>
    ),
    { ...size }
  );
}
