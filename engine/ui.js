
(() => {
  const app = document.getElementById("playhub-app");
  if (!app) return;

  app.innerHTML = `
    <div class="ph-layout">
      <aside class="ph-sidebar">
        <div class="ph-brand">
          <div class="ph-logo">P</div>
          <span class="ph-brand-name">Playovia</span>
        </div>

        <div class="ph-side-label">MENU</div>
        <button class="ph-nav active" data-section="home">
          <span class="ph-nav-icon">⌂</span>
          <span class="ph-nav-text">Home</span>
        </button>
        <button class="ph-nav" data-section="discover">
          <span class="ph-nav-icon">◈</span>
          <span class="ph-nav-text">Discover</span>
        </button>
        <button class="ph-nav" data-section="categories">
          <span class="ph-nav-icon">▦</span>
          <span class="ph-nav-text">Categories</span>
        </button>

        <div class="ph-sidebar-bottom">
          <div class="ph-side-label">PLAYOVIA</div>
          <button class="ph-nav">
            <span class="ph-nav-icon">⚙</span>
            <span class="ph-nav-text">Settings</span>
          </button>
          <button class="ph-nav">
            <span class="ph-nav-icon">ⓘ</span>
            <span class="ph-nav-text">About</span>
          </button>
        </div>
      </aside>

      <main class="ph-main" id="ph-lobby">
        <header class="ph-topbar">
          <div class="ph-search">
            <span class="ph-search-icon">⌕</span>
            <input id="ph-search" placeholder="Search games...">
          </div>
          <div class="ph-top-right">
            <span class="ph-online">● PLAYOVIA ONLINE</span>
            <div class="ph-avatar">P</div>
          </div>
        </header>

        <div class="ph-content">
          <section class="ph-welcome">
            <div class="ph-eyebrow">YOUR GAMING UNIVERSE</div>
            <h1>Ready to play?</h1>
            <p>Discover games, explore new worlds and have fun.</p>
          </section>

          <section class="ph-hero">
            <div class="ph-hero-content">
              <span class="ph-hero-tag">✦ WELCOME TO PLAYOVIA</span>
              <h2>One platform.<br>Endless adventures.</h2>
              <p>Your next favourite game is waiting. Explore the collection and jump right in.</p>
              <button id="ph-explore">Explore games ↓</button>
            </div>
            <div class="ph-hero-art">🎮</div>
          </section>

          <section class="ph-section" id="ph-discover">
            <div class="ph-section-head">
              <div>
                <h2>Explore Games</h2>
                <div class="ph-section-sub">Games discovered automatically from the games folder</div>
              </div>
              <span class="ph-count" id="ph-count">0 GAMES</span>
            </div>

            <div class="ph-categories" id="ph-categories">
              <button class="ph-category active" data-category="All">All Games</button>
            </div>

            <div class="ph-status" id="ph-status">Discovering games...</div>
            <div class="ph-games" id="ph-games"></div>
          </section>

          <footer class="ph-footer">
            © 2026 Playovia · Play Beyond Limits
          </footer>
        </div>
      </main>

      <section class="ph-game-view" id="ph-game-view" hidden>
        <header class="ph-game-bar">
          <button id="ph-back">← Back to Playovia</button>
          <strong id="ph-game-title">Loading game...</strong>
          <button id="ph-fullscreen">⛶ Fullscreen</button>
        </header>
        <div class="ph-game-container" id="ph-game-container"></div>
      </section>
    </div>
  `;

  const lobby = document.getElementById("ph-lobby");
  const gameView = document.getElementById("ph-game-view");
  const container = document.getElementById("ph-game-container");
  const gameList = document.getElementById("ph-games");
  const status = document.getElementById("ph-status");
  const search = document.getElementById("ph-search");
  const count = document.getElementById("ph-count");
  const categories = document.getElementById("ph-categories");

  let games = [];
  let selectedCategory = "All";

  function renderCategories() {
    const names = [
      "All",
      ...new Set(games.map(g => g.category || "Games"))
    ];

    categories.innerHTML = "";

    names.forEach(name => {
      const button = document.createElement("button");
      button.className =
        "ph-category" +
        (selectedCategory === name ? " active" : "");

      button.textContent = name === "All" ? "All Games" : name;

      button.addEventListener("click", () => {
        selectedCategory = name;
        renderCategories();
        renderGames();
      });

      categories.appendChild(button);
    });
  }

  function renderGames() {
    const term = search.value.trim().toLowerCase();

    const filtered = games.filter(game => {
      const matchesSearch =
        game.title.toLowerCase().includes(term) ||
        game.description.toLowerCase().includes(term) ||
        game.category.toLowerCase().includes(term);

      const matchesCategory =
        selectedCategory === "All" ||
        game.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });

    gameList.innerHTML = "";
    count.textContent = `${filtered.length} GAMES`;

    if (!filtered.length) {
      gameList.innerHTML =
        '<div class="ph-empty">🎮 No games found. Add a game inside the games folder!</div>';
      return;
    }

    filtered.forEach(game => {
      const card = document.createElement("article");
      card.className = "ph-card";

      const cover = document.createElement("div");
      cover.className = "ph-cover";

      const fallback = document.createElement("span");
      fallback.className = "ph-cover-fallback";
      fallback.textContent = "🎮";
      cover.appendChild(fallback);

      if (game.thumbnail) {
        const img = document.createElement("img");
        img.src = game.thumbnail;
        img.alt = game.title;
        img.loading = "lazy";
        img.onerror = () => img.remove();
        cover.appendChild(img);
      }

      const body = document.createElement("div");
      body.className = "ph-card-body";

      const top = document.createElement("div");
      top.className = "ph-card-top";

      const title = document.createElement("h3");
      title.textContent = game.title;

      const tag = document.createElement("span");
      tag.className = "ph-tag";
      tag.textContent = game.category || "GAME";

      top.append(title, tag);

      const description = document.createElement("p");
      description.textContent = game.description;

      const play = document.createElement("button");
      play.className = "ph-play";
      play.textContent = "▶  PLAY NOW";
      play.addEventListener("click", () => launchGame(game));

      body.append(top, description, play);
      card.append(cover, body);
      gameList.appendChild(card);
    });
  }

  function launchGame(game) {
    lobby.hidden = true;
    gameView.hidden = false;
    document.getElementById("ph-game-title").textContent = game.title;

    try {
      window.PlayHubLoader.launch(game, container);
    } catch (error) {
      console.error(error);
      gameView.hidden = true;
      lobby.hidden = false;
      status.textContent = "Could not launch this game.";
    }
  }

  function closeGame() {
    window.PlayHubLoader.close();
    gameView.hidden = true;
    lobby.hidden = false;
  }

  document.getElementById("ph-back").addEventListener("click", closeGame);

  document.getElementById("ph-fullscreen").addEventListener("click", () => {
    const frame = container.querySelector("iframe");
    if (frame) {
      frame.requestFullscreen?.().catch(console.error);
    }
  });

  document.getElementById("ph-explore").addEventListener("click", () => {
    document.getElementById("ph-discover").scrollIntoView({
      behavior: "smooth"
    });
  });

  document.querySelectorAll(".ph-nav[data-section]").forEach(button => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".ph-nav").forEach(nav =>
        nav.classList.remove("active")
      );
      button.classList.add("active");

      document.getElementById("ph-discover").scrollIntoView({
        behavior: "smooth"
      });
    });
  });

  search.addEventListener("input", renderGames);

  if (!window.PlayHubDiscovery || !window.PlayHubLoader) {
    status.textContent = "Engine files could not load. Check engine folder.";
    return;
  }

  window.PlayHubDiscovery.watch((found, error) => {
    if (error) {
      status.textContent =
        "Game discovery failed. Please check your internet connection.";
      console.error("Playovia discovery:", error);
      return;
    }

    games = found;
    status.textContent =
      games.length
        ? `${games.length} games ready to play`
        : "No games found yet. Add a game folder with index.html.";

    renderCategories();
    renderGames();
  });
})();
