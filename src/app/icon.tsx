import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#163300",
          color: "#9fe870",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 340,
          fontWeight: 900,
          letterSpacing: -20,
        }}
      >
        s.
      </div>
    ),
    size,
  );
}
