import { Component } from "react";

export default class AppShellErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    if (typeof this.props.onError === "function") {
      this.props.onError(error, info);
    }
  }

  handleRetry = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="whiteboard-shell">
          <section
            className="build-card build-card-error"
            style={{ margin: "80px auto", position: "relative" }}
          >
            <span className="build-card-eyebrow">interface pausada</span>
            <h3>Algo travou no carregamento</h3>
            <p>
              A interface principal encontrou um erro ao montar. Recarregue para tentar de novo.
            </p>
            <div className="build-actions">
              <button className="build-cta" onClick={this.handleRetry} type="button">
                recarregar
              </button>
            </div>
          </section>
        </div>
      );
    }
    return this.props.children;
  }
}
