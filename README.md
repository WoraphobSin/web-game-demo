# Mythic Bastion

A browser-based tower-defense game built with native JavaScript modules. No build step or package installation is required.

## Run locally

From the project directory, start a static server:

```powershell
python -m http.server 8765
```

Open [http://localhost:8765](http://localhost:8765) in a browser. Use a local server rather than opening `index.html` directly so the browser can load JavaScript modules.

## Project structure

- `index.html` contains the landing page, main menu, settings, field guide, and accessible game shell.
- `style.css` contains layout and visual styling.
- `src/config.js` is the game catalog and balance configuration: board, road, tower definitions, enemy definitions, and wave composition.
- `src/map.js` contains board-cell and road helpers.
- `src/entities.js` creates towers, enemies, projectiles, and particles.
- `src/simulation.js` handles wave spawning, movement, targeting, attacks, damage, and rewards.
- `src/renderer.js` draws the board and game entities on the canvas.
- `src/ui.js` renders catalog-driven controls and game status.
- `src/audio.js` plays optional background music and sound effects; each can be toggled independently in the game or settings. Music pauses when gameplay is paused or over.
- `assets/audio/` contains the CC0 music and sound effects. Sources and license details are in `ASSET-CREDITS.txt` and `KENNEY-LICENSE.txt`.
- `src/main.js` connects input, simulation, rendering, UI, and audio.

## Menu flow

The game opens on the landing page, then proceeds to the main menu. Choose **Play** to select Easy, Medium, Hard, or Expert before starting a new defense. All four settings are tuned for a tougher challenge: enemy wave size, health, and speed increase, while starting gold, gold earned from kills and cleared waves, and each wave's clear deadline are reduced compared with the previous balance. Waves start automatically after a short break; failing to clear a wave before its countdown ends loses the defense. From the main menu, you can also continue a paused defense, open settings, or read the field guide. The in-game menu pauses the simulation; settings opened from the pause menu return to the paused game.

Guardian details are shown in the workshop below the battlefield. Click an empty tile to place the selected guardian, then click a placed guardian to inspect and upgrade it. Guardians can be upgraded twice; upgrades increase damage, range, and attack speed, with area radius also increasing for the Stone Warden. Each wave has a visible clear deadline; after a wave is defeated, the next begins automatically following an eight-second reprieve.

Background music, guardian shots/placement/upgrade, enemy defeat, and life-lost sounds use locally bundled, CC0-licensed audio. Toggle music and sound effects independently in the game header or settings; background music stops while the game is paused or after the defense ends. Use **Continue defense** from the main menu to return to a paused game.

## Adding content

To add a tower, add its cost, combat values, colors, and display symbol to `TOWERS` in `src/config.js`. The selection card and placement behavior are generated from that catalog; the simulation and renderer read the same definition.

To add an enemy, add its stats and visual shape to `ENEMIES` in `src/config.js`, then include its type and count in `getWaveComposition` when it should appear. Enemy creation, health bars, movement, rewards, and score are driven by that catalog.
