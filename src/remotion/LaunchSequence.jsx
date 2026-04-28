import { Player } from "@remotion/player";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export function LaunchSequence() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fullText = "> building site...";
  const charsToShow = Math.floor(
    interpolate(frame, [15, 30], [0, fullText.length], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );
  const visibleText = fullText.slice(0, charsToShow);
  const progressWidth = interpolate(frame, [30, 45], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const flashOpacity = interpolate(frame, [45, 48, 52], [0, 0.62, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const badgeScale =
    frame >= 52
      ? spring({ frame: frame - 52, fps, config: { stiffness: 200, damping: 14 } })
      : 0;
  const cursorOpacity = frame < 15 && Math.floor(frame / 5) % 2 === 0 ? 1 : 0;

  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        background: "#080808",
        color: "#E5A55B",
        fontFamily: "JetBrains Mono, monospace",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 50% 45%, rgba(229,165,91,0.14), transparent 28%)",
        }}
      />
      <p
        style={{
          fontSize: 18,
          letterSpacing: "0.05em",
          margin: 0,
          minHeight: 28,
          position: "relative",
        }}
      >
        {frame < 15 ? <span style={{ opacity: cursorOpacity }}>_</span> : visibleText}
      </p>
      <div
        style={{
          background: "rgba(255,255,255,0.1)",
          borderRadius: 1,
          height: 2,
          marginTop: 24,
          overflow: "hidden",
          position: "relative",
          width: 320,
        }}
      >
        <div
          style={{
            background: "#E5A55B",
            borderRadius: 1,
            boxShadow: "0 0 20px rgba(229,165,91,0.7)",
            height: "100%",
            width: `${progressWidth}%`,
          }}
        />
      </div>
      <AbsoluteFill
        style={{
          background: `rgba(255,255,255,${flashOpacity})`,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          background: "rgba(229,165,91,0.12)",
          border: "1px solid #E5A55B",
          borderRadius: 8,
          boxShadow: "0 0 42px rgba(229,165,91,0.34)",
          color: "#E5A55B",
          fontSize: 22,
          fontWeight: 700,
          letterSpacing: "0.1em",
          padding: "10px 28px",
          position: "absolute",
          transform: `scale(${badgeScale})`,
        }}
      >
        ● LIVE
      </div>
    </AbsoluteFill>
  );
}

export default function LaunchSequencePlayer({ onEnded }) {
  return (
    <Player
      acknowledgeRemotionLicense
      autoPlay
      component={LaunchSequence}
      compositionHeight={400}
      compositionWidth={800}
      controls={false}
      durationInFrames={60}
      fps={30}
      onEnded={onEnded}
      style={{ borderRadius: 12, overflow: "hidden", width: "100%" }}
    />
  );
}
