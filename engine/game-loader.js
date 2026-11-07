
window.PlayHubLoader = {
  activeFrame: null,

  launch(game, container) {
    this.close();

    const frame = document.createElement("iframe");

    frame.src = game.url;
    frame.title = game.title || "Playovia Game";

    frame.allow = [
      "fullscreen",
      "autoplay",
      "gamepad",
      "accelerometer",
      "gyroscope",
      "clipboard-read",
      "clipboard-write"
    ].join("; ");

    frame.allowFullscreen = true;
    frame.style.cssText = `
      width: 100%;
      height: 100%;
      border: none;
      display: block;
      background: #000;
    `;

    frame.onload = () => {
      console.log("Playovia game loaded:", game.title);
    };

    frame.onerror = () => {
      console.error("Game failed to load:", game.url);
    };

    container.replaceChildren(frame);
    this.activeFrame = frame;

    window.dispatchEvent(
      new CustomEvent("playhub:game-launched", {
        detail: game
      })
    );
  },

  close() {
    if (this.activeFrame) {
      this.activeFrame.src = "about:blank";
      this.activeFrame.remove();
      this.activeFrame = null;
    }

    window.dispatchEvent(
      new CustomEvent("playhub:game-closed")
    );
  },

  getActiveGame() {
    return this.activeFrame;
  }
};
