
(() => {
  const app = document.getElementById("playhub-app");

  if (!app) {
    console.error("PlayHub: #playhub-app container missing");
    return;
  }

  app.innerHTML = `
    <section id="lobby-view">
      <header class="ph-header">
        <h1>🎮 PlayHub</h1>
        <span>Discover your next game</span>
      </header>

      <div class="ph-heading">
        <h2>Discover Games</h2>
        <input id="ph-search" placeholder="Search games...">
      </div>

      <div id="ph-status">Finding games...</div>
      <div id="ph-games" class="ph-games"></div>
    </section>

    <section id="game-view" hidden>
      <div class="ph-game-header">
        <button id="ph-back">← Back to PlayHub</button>
        <span id="ph-game-title">Loading game...</span>
        <button id="ph-fullscreen">⛶ Fullscreen</button>
      </div>
      <div id="ph-game-container"></div>
    </section>
  `;

  const lobby = document.getElementById("lobby-view");
  const gameView = document.getElementById("game-view");
  const gamesElement = document.getElementById("ph-games");
  const status = document.getElementById("ph-status");
  const search = document.getElementById("ph-search");
  const container = document.getElementById("ph-game-container");

  let games = [];

  function render(list) {
    gamesElement.innerHTML = "";

    if (!list.length) {
      gamesElement.textContent = "No games found yet.";
      return;
    }

    for (const game of list) {
      const card = document.createElement("article");
      card.className = "ph-card";

      const image = document.createElement("img");
      image.src = game.thumbnail;
      image.alt = game.title;
      image.loading = "lazy";
      image.onerror = () => image.remove();

      const title = document.createElement("h3");
      title.textContent = game.title;

      const description = document.createElement("p");
      description.textContent = game.description;

      const play = document.createElement("button");
      play.textContent = "▶ Play";
      play.addEventListener("click", () => launch(game));

      card.append(image, title, description, play);
      gamesElement.appendChild(card);
    }
  }

  function launch(game) {
    lobby.hidden = true;
    gameView.hidden = false;

    document.getElementById("ph-game-title").textContent =
      game.title;

    try {
      window.PlayHubLoader.launch(game, container);
    } catch (error) {
      status.textContent = error.message;
      lobby.hidden = false;
      gameView.hidden = true;
    }
  }

  function goBack() {
    window.PlayHubLoader.close();
    gameView.hidden = true;
    lobby.hidden = false;
  }

  document.getElementById("ph-back").addEventListener("click", goBack);

  document.getElementById("ph-fullscreen").addEventListener("click", () => {
    const frame = container.querySelector("iframe");

    if (frame?.requestFullscreen) {
      frame.requestFullscreen().catch(console.error);
    }
  });

  search.addEventListener("input", () => {
    const term = search.value.toLowerCase();

    render(games.filter(game =>
      game.title.toLowerCase().includes(term) ||
      game.description.toLowerCase().includes(term) ||
      game.category.toLowerCase().includes(term)
    ));
  });

  window.PlayHubDiscovery.watch((found, error) => {
    if (error) {
      status.textContent = "Could not scan games. Check your connection.";
      console.error(error);
      return;
    }

    games = found;
    status.textContent = `${games.length} games discovered`;
    render(games);
  });
})();
