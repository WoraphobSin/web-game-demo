# Mythic Bastion

A browser-based tower-defense game built with native JavaScript modules. No build step or package installation is required.

## Run locally

From the project directory, start a static server:

```powershell
python -m http.server 8765
```

Open [http://localhost:8765](http://localhost:8765) in a browser. Use a local server rather than opening `index.html` directly so the browser can load JavaScript modules.

## Project structure

- `index.html` contains the game shell and accessible UI anchors.
- `style.css` contains layout and visual styling.
- `src/config.js` is the game catalog and balance configuration: board, road, tower definitions, enemy definitions, and wave composition.
- `src/map.js` contains board-cell and road helpers.
- `src/entities.js` creates towers, enemies, projectiles, and particles.
- `src/simulation.js` handles wave spawning, movement, targeting, attacks, damage, and rewards.
- `src/renderer.js` draws the board and game entities on the canvas.
- `src/ui.js` renders catalog-driven controls and game status.
- `src/audio.js` provides optional sound effects.
- `src/main.js` connects input, simulation, rendering, UI, and audio.

## Adding content

To add a tower, add its cost, combat values, colors, and display symbol to `TOWERS` in `src/config.js`. The selection card and placement behavior are generated from that catalog; the simulation and renderer read the same definition.

To add an enemy, add its stats and visual shape to `ENEMIES` in `src/config.js`, then include its type and count in `getWaveComposition` when it should appear. Enemy creation, health bars, movement, rewards, and score are driven by that catalog.
