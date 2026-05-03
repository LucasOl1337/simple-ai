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
  const fullText = "construindo seu site...";
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
  const flashOpacity = interpolate(frame, [45, 48, 52], [0, 0.5, 0], {
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
        background: "linear-gradient(135deg, #f4ede0, #ebe0c9)",
        color: "#b86a4a",
        fontFamily: "Erode, serif",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 50% 45%, rgba(184,106,74,0.18), transparent 30%)",
        }}
      />
      <p
        style={{
          fontSize: 20,
          fontWeight: 600,
          letterSpacing: "0.02em",
          margin: 0,
          minHeight: 28,
          position: "relative",
        }}
      >
        {frame < 15 ? <span style={{ opacity: cursorOpacity }}>_</span> : visibleText}
      </p>
      <div
        style={{
          background: "rgba(58,49,39,0.1)",
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
            background: "#b86a4a",
            borderRadius: 1,
            boxShadow: "0 0 20px rgba(184,106,74,0.55)",
            height: "100%",
            width: `${progressWidth}%`,
          }}
        />
      </div>
      <AbsoluteFill
        style={{
          background: `rgba(254,251,242,${flashOpacity})`,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          background: "rgba(184,106,74,0.14)",
          border: "1px solid #b86a4a",
          borderRadius: 8,
          boxShadow: "0 0 42px rgba(184,106,74,0.32)",
          color: "#b86a4a",
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
