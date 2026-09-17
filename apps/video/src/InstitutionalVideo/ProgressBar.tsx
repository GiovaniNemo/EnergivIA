import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";

export const ProgressBar: React.FC<{
  scenes: string[];
  activeSceneIndex: number;
}> = ({ scenes, activeSceneIndex }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const progressPercent = Math.min(
    100,
    Math.max(0, (frame / durationInFrames) * 100),
  );

  return (
    <div
      style={{
        position: "absolute",
        bottom: 36,
        left: 60,
        right: 60,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        zIndex: 50,
      }}
    >
      {/* Scene indicator pills */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
        }}
      >
        {scenes.map((scene, idx) => {
          const isActive = idx === activeSceneIndex;
          const isPassed = idx < activeSceneIndex;

          return (
            <div
              key={scene}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                gap: 8,
                opacity: isActive ? 1 : isPassed ? 0.65 : 0.35,
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  backgroundColor: isActive
                    ? "#10B981"
                    : isPassed
                      ? "#34D399"
                      : "rgba(255, 255, 255, 0.4)",
                  boxShadow: isActive ? "0 0 10px #10B981" : "none",
                }}
              />
              <span
                style={{
                  fontSize: 13,
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? "#F8FAFC" : "#94A3B8",
                  whiteSpace: "nowrap",
                  textOverflow: "ellipsis",
                  overflow: "hidden",
                }}
              >
                {scene}
              </span>
            </div>
          );
        })}
      </div>

      {/* Progress track */}
      <div
        style={{
          width: "100%",
          height: 4,
          backgroundColor: "rgba(255, 255, 255, 0.1)",
          borderRadius: 99,
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: `${progressPercent}%`,
            background: "linear-gradient(90deg, #10B981, #0EA5E9)",
            borderRadius: 99,
            boxShadow: "0 0 12px rgba(16, 185, 129, 0.8)",
          }}
        />
      </div>
    </div>
  );
};
