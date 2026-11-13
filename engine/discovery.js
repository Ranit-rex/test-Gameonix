
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

  async function readMetadata(category, subcategory, slug) {
    try {
      const response = await fetch(
        `${RAW}/games/${category}/${subcategory}/${slug}/game.json`,
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

    const folders = new Map();
    for (const path of paths) {
      const match = path.match(/^games\/([^/]+)\/([^/]+)\/([^/]+)\/index\.html$/i);
      if (match) folders.set(match[3], { category: match[1], subcategory: match[2], slug: match[3] });
    }
    const games = await Promise.all(
      [...folders.values()].map(async ({ category, subcategory, slug }) => {
        const metadata = await readMetadata(category, subcategory, slug);
        const thumbnailCandidates = [metadata.thumbnail, "thumbnail.png", "cover.png", "thumbnail.svg", "cover.svg"].filter(Boolean);
        const thumbnail = thumbnailCandidates.map(path => {
          if (/^https?:\/\//i.test(path)) return path;
          return `${RAW}/games/${category}/${subcategory}/${slug}/${path.replace(/^\.?\//, "")}`;
        })[0];
        return {
          id: metadata.slug || slug,
          title: metadata.title || titleFromSlug(slug),
          description: metadata.description || "Discover and play this game on Playovia.",
          category: metadata.category || category,
          subcategory: metadata.subcategory || subcategory,
          thumbnail,
          url: `${PAGES}${category}/${subcategory}/${encodeURIComponent(slug)}/`,
          folder: `games/${category}/${subcategory}/${slug}/`,
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
