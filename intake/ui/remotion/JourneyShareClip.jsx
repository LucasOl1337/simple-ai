import { Player } from "@remotion/player";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const fallbackMessages = [
  { role: "assistant", content: "Me conta o que você quer criar." },
  { role: "user", content: "Quero um site que venda minha ideia em minutos." },
  { role: "assistant", content: "Briefing entendido. Montando a primeira versão." },
];

export function JourneyShareClip({ messages = fallbackMessages, siteUrl = "" }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const visibleMessages = messages.slice(-5);
  const previewOpacity = interpolate(frame, [90, 150], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const badgeY = interpolate(frame, [150, 210], [36, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const badgeScale = spring({
    frame: Math.max(0, frame - 150),
    fps,
    config: { stiffness: 130, damping: 18 },
  });

  return (
    <AbsoluteFill
      style={{
        background:
          "radial-gradient(circle at 18% 18%, rgba(184,106,74,0.16), transparent 26%), linear-gradient(135deg, #f4ede0, #ebe0c9)",
        color: "#3a3127",
        fontFamily: "Erode, serif",
        padding: 48,
      }}
    >
      <div style={{ display: "grid", gap: 28, gridTemplateColumns: "0.88fr 1.12fr", height: "100%" }}>
        <div style={{ alignSelf: "center", display: "grid", gap: 14 }}>
          {visibleMessages.map((message, index) => {
            const start = index * 16;
            const opacity = interpolate(frame, [start, start + 12], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            const y = interpolate(frame, [start, start + 12], [22, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            return (
              <div
                key={`${message.role}-${index}`}
                style={{
                  alignSelf: message.role === "user" ? "end" : "start",
                  background:
                    message.role === "user"
                      ? "rgba(184,106,74,0.12)"
                      : "rgba(254,251,242,0.86)",
                  border: "1px solid rgba(58,49,39,0.12)",
                  borderLeft:
                    message.role === "user"
                      ? "3px solid #b86a4a"
                      : "3px solid rgba(58,49,39,0.2)",
                  borderRadius: 8,
                  maxWidth: "86%",
                  opacity,
                  padding: "12px 14px",
                  transform: `translateY(${y}px)`,
                }}
              >
                <div style={{ color: "#b86a4a", fontFamily: "Erode, serif", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em" }}>
                  {message.role === "user" ? "VOCÊ" : "SIMPLE"}
                </div>
                <div style={{ fontSize: 18, fontWeight: 400, lineHeight: 1.4 }}>{message.content}</div>
              </div>
            );
          })}
        </div>
        <div
          style={{
            alignSelf: "center",
            background: "rgba(254,251,242,0.94)",
            border: "1px solid rgba(58,49,39,0.12)",
            borderRadius: 10,
            boxShadow: "0 28px 90px rgba(58,49,39,0.18)",
            opacity: previewOpacity,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              alignItems: "center",
              background: "rgba(58,49,39,0.06)",
              display: "flex",
              gap: 8,
              height: 34,
              padding: "0 12px",
            }}
          >
            <span style={{ background: "#b3432a", borderRadius: 999, height: 8, width: 8 }} />
            <span style={{ background: "#b07c1a", borderRadius: 999, height: 8, width: 8 }} />
            <span style={{ background: "#b86a4a", borderRadius: 999, height: 8, width: 8 }} />
            <div
              style={{
                background: "rgba(254,251,242,0.7)",
                borderRadius: 999,
                color: "#7a6e5e",
                flex: 1,
                fontFamily: "Erode, serif",
                fontSize: 11,
                fontWeight: 500,
                marginLeft: 8,
                padding: "5px 10px",
              }}
            >
              {siteUrl || "simple-ai/generated-site"}
            </div>
          </div>
          <div style={{ display: "grid", gap: 18, padding: 28 }}>
            <div style={{ background: "#b86a4a", borderRadius: 3, height: 10, width: "34%" }} />
            <div style={{ color: "#3a3127", fontFamily: "Erode, serif", fontSize: 42, fontWeight: 700, letterSpacing: "-0.01em" }}>
              SITE LIVE
            </div>
            <div style={{ background: "rgba(58,49,39,0.12)", borderRadius: 4, height: 12, width: "82%" }} />
            <div style={{ background: "rgba(58,49,39,0.08)", borderRadius: 4, height: 12, width: "68%" }} />
            <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(3, 1fr)", marginTop: 10 }}>
              {[0, 1, 2].map((item) => (
                <div
                  key={item}
                  style={{
                    aspectRatio: "1.12",
                    background: "rgba(58,49,39,0.06)",
                    border: "1px solid rgba(58,49,39,0.1)",
                    borderRadius: 8,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
      <div
        style={{
          background: "rgba(184,106,74,0.16)",
          border: "1px solid #b86a4a",
          borderRadius: 8,
          bottom: 42,
          color: "#b86a4a",
          fontFamily: "Erode, serif",
          fontSize: 18,
          fontWeight: 700,
          left: "50%",
          letterSpacing: "0.04em",
          padding: "12px 22px",
          position: "absolute",
          transform: `translate(-50%, ${badgeY}px) scale(${badgeScale})`,
        }}
      >
        Criado em minutos com Simple-AI
      </div>
    </AbsoluteFill>
  );
}

export default function JourneyShareClipPlayer({ messages, siteUrl }) {
  return (
    <Player
      acknowledgeRemotionLicense
      autoPlay
      component={JourneyShareClip}
      compositionHeight={720}
      compositionWidth={1280}
      durationInFrames={450}
      fps={30}
      inputProps={{ messages, siteUrl }}
      loop
      style={{ borderRadius: 8, overflow: "hidden", width: "100%" }}
    />
  );
}
