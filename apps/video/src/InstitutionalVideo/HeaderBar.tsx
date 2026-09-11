import React from "react";
import { Sparkles } from "lucide-react";
import { VideoBrandLogo } from "./BrandLogo";

export const HeaderBar: React.FC<{
  currentScene: string;
  stepNumber: number;
  totalSteps: number;
}> = ({ currentScene, stepNumber, totalSteps }) => {
  return (
    <div
      style={{
        position: "absolute",
        top: 40,
        left: 60,
        right: 60,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        zIndex: 50,
      }}
    >
      {/* Brand logo & tag */}
      <VideoBrandLogo size="sm" showTagline={true} />

      {/* Current phase badge */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "8px 18px",
          borderRadius: 999,
          background: "rgba(15, 23, 42, 0.65)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(16, 185, 129, 0.25)",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
        }}
      >
        <Sparkles size={16} color="#34d399" />
        <span
          style={{
            color: "#f8fafc",
            fontSize: 15,
            fontWeight: 600,
            letterSpacing: "0.02em",
          }}
        >
          {currentScene}
        </span>
        <span
          style={{
            color: "#34d399",
            fontSize: 13,
            fontWeight: 700,
            backgroundColor: "rgba(16, 185, 129, 0.15)",
            padding: "2px 8px",
            borderRadius: 6,
          }}
        >
          {stepNumber}/{totalSteps}
        </span>
      </div>
    </div>
  );
};
