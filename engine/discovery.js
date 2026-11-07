
const PlayHubDiscovery = (() => {
  const CONFIG = {
    owner: "Ranit-rex",
    repo: "test-Gameonix",
    branch: "main",
    scanInterval: 30000
  };

  const API =
    `https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repo}/git/trees/${CONFIG.branch}?recursive=1`;

  const RAW =
    `https://raw.githubusercontent.com/${CONFIG.owner}/${CONFIG.repo}/${CONFIG.branch}`;

  const PAGES =
    `/${CONFIG.repo}/games/`;

  function titleFromSlug(slug) {
    return slug
      .replace(/[-_]+/g, " ")
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  async function readMetadata(slug) {
    try {
      const response = await fetch(
        `${RAW}/games/${slug}/game.json`,
        { cache: "no-store" }
      );

      if (!response.ok) return {};

      return await response.json();
    } catch {
      return {};
    }
  }

  async function discoverGames() {
    const response = await fetch(API, {
      cache: "no-store",
      headers: { Accept: "application/vnd.github+json" }
    });

    if (!response.ok) {
      throw new Error(
        `GitHub scan failed: ${response.status}`
      );
    }

    const data = await response.json();

    if (data.truncated) {
      throw new Error("Repository tree is too large to scan completely.");
    }

    const paths = new Set(
      data.tree
        .filter(item => item.type === "blob")
        .map(item => item.path)
    );

    const folders = new Set();

    for (const path of paths) {
      const match = path.match(/^games\/([^/]+)\/index\.html$/i);

      if (match) folders.add(match[1]);
    }

    const games = await Promise.all(
      [...folders].map(async slug => {
        const metadata = await readMetadata(slug);

        const thumbnailCandidates = [
          metadata.thumbnail,
          "thumbnail.png",
          "cover.png",
          "assets/thumbnail.png",
          "assets/cover.png"
        ].filter(Boolean);

        const thumbnail = thumbnailCandidates
          .map(path => {
            if (/^https?:\/\//i.test(path)) return path;

            return `${RAW}/games/${slug}/${path.replace(/^\.?\//, "")}`;
          })[0];

        return {
          id: slug,
          title: metadata.title || titleFromSlug(slug),
          description: metadata.description || "Discover and play this game on Playbrix.",
          category: metadata.category || "Games",
          thumbnail,
          url: `${PAGES}${encodeURIComponent(slug)}/`,
          folder: `games/${slug}/`,
          status: metadata.status || "published"
        };
      })
    );

    return games
      .filter(game => game.status !== "hidden")
      .sort((a, b) => a.title.localeCompare(b.title));
  }

  function watch(callback) {
    let stopped = false;
    let timer;

    async function scan() {
      try {
        const games = await discoverGames();

        if (!stopped) callback(games, null);
      } catch (error) {
        if (!stopped) callback([], error);
      }

      if (!stopped) {
        timer = setTimeout(scan, CONFIG.scanInterval);
      }
    }

    scan();

    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }

  return {
    discoverGames,
    watch
  };
})();

window.PlayHubDiscovery = PlayHubDiscovery;
