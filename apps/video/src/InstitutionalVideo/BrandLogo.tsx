import React from "react";
import { Img, staticFile } from "remotion";

export const VideoBrandLogo: React.FC<{
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
}> = ({ size = "md", showTagline = true }) => {
  const config = {
    sm: {
      iconSize: 36,
      fontSize: 26,
      taglineSize: 11,
      gap: 12,
    },
    md: {
      iconSize: 52,
      fontSize: 38,
      taglineSize: 13,
      gap: 16,
    },
    lg: {
      iconSize: 76,
      fontSize: 58,
      taglineSize: 16,
      gap: 22,
    },
  }[size];

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: config.gap,
        userSelect: "none",
      }}
    >
      {/* Brain & Solar Icon */}
      <div
        style={{
          width: config.iconSize,
          height: config.iconSize,
          borderRadius: 14,
          background: "rgba(15, 23, 42, 0.8)",
          border: "1px solid rgba(16, 185, 129, 0.4)",
          padding: 6,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 0 20px rgba(16, 185, 129, 0.3)",
        }}
      >
        <Img
          src={staticFile("favicon-light.png")}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
          }}
        />
      </div>

      {/* Brand Text */}
      <div
        style={{ display: "flex", flexDirection: "column", textAlign: "left" }}
      >
        <div
          style={{
            fontSize: config.fontSize,
            fontWeight: 900,
            letterSpacing: "-0.03em",
            lineHeight: 1,
            display: "flex",
            alignItems: "baseline",
          }}
        >
          <span style={{ color: "#FFFFFF" }}>Energi</span>
          <span style={{ color: "#10B981" }}>v</span>
          <span
            style={{
              background: "linear-gradient(135deg, #10B981 0%, #38BDF8 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            IA
          </span>
        </div>

        {showTagline && (
          <span
            style={{
              fontSize: config.taglineSize,
              color: "#94A3B8",
              fontWeight: 500,
              letterSpacing: "0.08em",
              marginTop: 4,
              textTransform: "lowercase",
            }}
          >
            o seu parceiro via i.a.
          </span>
        )}
      </div>
    </div>
  );
};
