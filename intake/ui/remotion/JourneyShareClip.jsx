import { Player } from "@remotion/player";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const fallbackMessages = [
  { role: "assistant", content: "Me conta o que voce quer criar." },
  { role: "user", content: "Quero um site que venda minha ideia em minutos." },
  { role: "assistant", content: "Briefing entendido. Montando a primeira versao." },
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
          "radial-gradient(circle at 18% 18%, rgba(0,255,157,0.14), transparent 24%), #080808",
        color: "#f0f0f0",
        fontFamily: "Geist, sans-serif",
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
                      ? "rgba(0,255,157,0.1)"
                      : "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderLeft:
                    message.role === "user"
                      ? "3px solid #00ff9d"
                      : "3px solid rgba(255,255,255,0.2)",
                  borderRadius: 8,
                  maxWidth: "86%",
                  opacity,
                  padding: "12px 14px",
                  transform: `translateY(${y}px)`,
                }}
              >
                <div style={{ color: "#00ff9d", fontFamily: "JetBrains Mono, monospace", fontSize: 10 }}>
                  {message.role === "user" ? "VOCE" : "SIMPLE"}
                </div>
                <div style={{ fontSize: 18, lineHeight: 1.35 }}>{message.content}</div>
              </div>
            );
          })}
        </div>
        <div
          style={{
            alignSelf: "center",
            background: "rgba(255,255,255,0.045)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 10,
            boxShadow: "0 28px 90px rgba(0,0,0,0.55)",
            opacity: previewOpacity,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              alignItems: "center",
              background: "rgba(255,255,255,0.06)",
              display: "flex",
              gap: 8,
              height: 34,
              padding: "0 12px",
            }}
          >
            <span style={{ background: "#ff4444", borderRadius: 999, height: 8, width: 8 }} />
            <span style={{ background: "#f0c14b", borderRadius: 999, height: 8, width: 8 }} />
            <span style={{ background: "#00ff9d", borderRadius: 999, height: 8, width: 8 }} />
            <div
              style={{
                background: "rgba(0,0,0,0.4)",
                borderRadius: 999,
                color: "#666",
                flex: 1,
                fontFamily: "JetBrains Mono, monospace",
                fontSize: 10,
                marginLeft: 8,
                padding: "5px 10px",
              }}
            >
              {siteUrl || "simple-ai/generated-site"}
            </div>
          </div>
          <div style={{ display: "grid", gap: 18, padding: 28 }}>
            <div style={{ background: "#00ff9d", borderRadius: 3, height: 10, width: "34%" }} />
            <div style={{ color: "#f0f0f0", fontFamily: "JetBrains Mono, monospace", fontSize: 42, fontWeight: 700 }}>
              SITE LIVE
            </div>
            <div style={{ background: "rgba(255,255,255,0.09)", borderRadius: 4, height: 12, width: "82%" }} />
            <div style={{ background: "rgba(255,255,255,0.07)", borderRadius: 4, height: 12, width: "68%" }} />
            <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(3, 1fr)", marginTop: 10 }}>
              {[0, 1, 2].map((item) => (
                <div
                  key={item}
                  style={{
                    aspectRatio: "1.12",
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.08)",
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
          background: "rgba(0,255,157,0.13)",
          border: "1px solid #00ff9d",
          borderRadius: 8,
          bottom: 42,
          color: "#00ff9d",
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 18,
          fontWeight: 700,
          left: "50%",
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
