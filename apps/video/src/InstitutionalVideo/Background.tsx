import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

export const VideoBackground: React.FC<{
  accentColor?: string;
  secondaryColor?: string;
}> = ({ accentColor = "#10B981", secondaryColor = "#0EA5E9" }) => {
  const frame = useCurrentFrame();

  // Subtle floating background light orbs
  const orb1X = interpolate(Math.sin(frame / 60), [-1, 1], [-100, 100]);
  const orb1Y = interpolate(Math.cos(frame / 70), [-1, 1], [-80, 80]);
  const orb2X = interpolate(Math.cos(frame / 80), [-1, 1], [100, -100]);
  const orb2Y = interpolate(Math.sin(frame / 65), [-1, 1], [80, -80]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#030712",
        overflow: "hidden",
      }}
    >
      {/* Deep gradient base */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 50% 30%, #061e18 0%, #030712 70%, #010409 100%)",
        }}
      />

      {/* Floating ambient glowing orbs */}
      <div
        style={{
          position: "absolute",
          top: "15%",
          left: "20%",
          width: 650,
          height: 650,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${accentColor}25 0%, transparent 70%)`,
          filter: "blur(90px)",
          transform: `translate(${orb1X}px, ${orb1Y}px)`,
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "absolute",
          bottom: "10%",
          right: "15%",
          width: 750,
          height: 750,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${secondaryColor}20 0%, transparent 70%)`,
          filter: "blur(110px)",
          transform: `translate(${orb2X}px, ${orb2Y}px)`,
          pointerEvents: "none",
        }}
      />

      {/* Subtle modern tech grid overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `
            linear-gradient(to right, rgba(255, 255, 255, 0.025) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.025) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
          maskImage:
            "radial-gradient(ellipse at center, black 40%, transparent 90%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at center, black 40%, transparent 90%)",
        }}
      />

      {/* Vignette */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          boxShadow: "inset 0 0 160px rgba(0, 0, 0, 0.8)",
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};
