import React from "react";
import { useCurrentFrame, interpolate } from "remotion";

interface TerminalPromptProps {
  prefix?: string;
  command: string;
  startFrame?: number;
  charsPerFrame?: number;
  statusLines?: Array<{
    type?: "success" | "info" | "warning" | "accent";
    text: string;
    delayFrames?: number;
  }>;
  className?: string;
}

export const TerminalPrompt: React.FC<TerminalPromptProps> = ({
  prefix = ">",
  command,
  startFrame = 10,
  charsPerFrame = 1.2,
  statusLines = [],
  className = "",
}) => {
  const frame = useCurrentFrame();

  const activeFrame = Math.max(0, frame - startFrame);
  const charsShown = Math.min(
    command.length,
    Math.floor(activeFrame * charsPerFrame),
  );
  const typedText = command.slice(0, charsShown);

  const isTypingDone = charsShown >= command.length;
  const cursorBlink = Math.floor(frame / 12) % 2 === 0;

  return (
    <div
      className={`rounded-xl border border-slate-800 bg-[#0A0E17]/95 shadow-2xl backdrop-blur-md overflow-hidden ${className}`}
    >
      {/* Terminal Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 px-4 py-3 bg-[#0D1322]">
        <div className="flex items-center space-x-2">
          <div className="h-3 w-3 rounded-full bg-rose-500/80" />
          <div className="h-3 w-3 rounded-full bg-amber-500/80" />
          <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
          <span className="ml-3 text-xs font-mono text-slate-400">
            energiv-ia-engine v2.6.0
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-950/60 text-emerald-400 border border-emerald-800/50">
            ● ONLINE
          </span>
        </div>
      </div>

      {/* Terminal Body */}
      <div className="p-6 font-mono text-sm leading-relaxed space-y-3">
        <div className="flex items-center space-x-2 text-slate-100">
          <span className="text-emerald-400 font-bold select-none">
            {prefix}
          </span>
          <span className="text-slate-100 font-medium tracking-wide">
            {typedText}
          </span>
          {(!isTypingDone || cursorBlink) && (
            <span className="inline-block h-4 w-2 bg-emerald-400 animate-pulse" />
          )}
        </div>

        {/* Status lines appearing in sequence */}
        {statusLines.map((line, idx) => {
          const lineDelay = line.delayFrames ?? 25 + idx * 18;
          if (activeFrame < lineDelay) return null;

          const opacity = interpolate(
            activeFrame,
            [lineDelay, lineDelay + 10],
            [0, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
          );

          let badgeColor =
            "text-emerald-400 border-emerald-800/60 bg-emerald-950/30";
          let symbol = "[✓]";

          if (line.type === "info") {
            badgeColor = "text-sky-400 border-sky-800/60 bg-sky-950/30";
            symbol = "[ℹ]";
          } else if (line.type === "warning") {
            badgeColor = "text-amber-400 border-amber-800/60 bg-amber-950/30";
            symbol = "[!]";
          } else if (line.type === "accent") {
            badgeColor =
              "text-purple-400 border-purple-800/60 bg-purple-950/30";
            symbol = "[⚡]";
          }

          return (
            <div
              key={idx}
              style={{ opacity }}
              className="flex items-start space-x-3 text-xs pl-4 py-0.5"
            >
              <span className={`font-semibold ${badgeColor}`}>{symbol}</span>
              <span className="text-slate-300 font-mono">{line.text}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
