
const PlayHubLoader = (() => {
  let activeFrame = null;
  let activeGame = null;

  function launch(game, container) {
    if (!game || !game.url || !container) {
      throw new Error("Game or container missing");
    }

    close();

    const frame = document.createElement("iframe");

    frame.src = game.url;
    frame.title = game.title || "PlayHub Game";
    frame.allow = "fullscreen; autoplay; gamepad";
    frame.allowFullscreen = true;

    Object.assign(frame.style, {
      width: "100%",
      height: "100%",
      border: "0",
      display: "block",
      background: "#080e18"
    });

    container.replaceChildren(frame);

    activeFrame = frame;
    activeGame = game;

    container.style.display = "block";

    window.dispatchEvent(new CustomEvent(
      "playhub:game-launched",
      { detail: game }
    ));

    return frame;
  }

  function close() {
    if (activeFrame) {
      activeFrame.src = "about:blank";
      activeFrame.remove();
    }

    activeFrame = null;

    const previousGame = activeGame;
    activeGame = null;

    window.dispatchEvent(new CustomEvent(
      "playhub:game-closed",
      { detail: previousGame }
    ));
  }

  function getActiveGame() {
    return activeGame;
  }

  return {
    launch,
    close,
    getActiveGame
  };
})();

window.PlayHubLoader = PlayHubLoader;
