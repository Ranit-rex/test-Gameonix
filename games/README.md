# Playovia game library

Every playable game lives under a category, a subcategory, and a kebab-case game folder.

```text
games/
├── action/
│   ├── adventure/dungeon-hunter/
│   ├── horror/ashgrave/
│   ├── horror/last-lantern/
│   └── survival/antarctic-the-last-signal/
├── party/
│   └── arena/bomb-tag/
├── puzzle/
│   ├── guessing/
│   │   ├── capital-quest/
│   │   ├── currency-clash/
│   │   ├── flag-frenzy/
│   │   ├── landmark-legends/
│   │   ├── logo-rush/
│   │   ├── map-masters/
│   │   ├── wild-nations/
│   │   └── word-wonders/
│   └── logic/riftbound/
└── runner/
    ├── endless/city-rush/
    └── parkour/
        ├── extreme-parkour/
        └── obby-rush/
```

## Add a game

1. Choose the closest category and subcategory.
2. Create a kebab-case game folder inside it.
3. Add `index.html` and `game.json`; include a `cover.svg` or `thumbnail.svg`.
4. Keep game assets beside the game or in its own `assets/` or `images/` folder.
5. The homepage and discovery engine scan the three-level folder structure. Update the homepage catalogue metadata and `sitemap.xml` when publishing a new game.
6. Nested games must use `../../../../shared/multiplayer.js` to load the shared multiplayer helper from the repository root.

Do not put unrelated site pages, admin tools, or shared engines in this directory.
