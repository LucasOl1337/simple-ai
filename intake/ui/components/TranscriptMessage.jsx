export default function TranscriptMessage({ message }) {
  const isUser = message.role === "user";
  return (
    <article className={`transcript-message transcript-${message.role} ${message.isLive ? "is-live" : ""}`}>
      <span className="message-author">{isUser ? "Você" : "Simple"}</span>
      <p>{message.content}</p>
    </article>
  );
}
