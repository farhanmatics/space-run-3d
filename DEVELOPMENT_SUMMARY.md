# Space Run 3D - Development Summary & Game Structure

## Development Summary

This project started from a lane-based endless runner and was reskinned into a space-themed version while preserving the original game feel (controls, lane logic, collisions, progression).

### Key changes completed

- **Theme reskin**
  - UI/title updated to Space Run.
  - Scene palette moved to deep-space tones.
  - Runner replaced with a **spaceship-style player model**.

- **Gameplay preserved**
  - 3-lane movement (`-1, 0, 1`) remains unchanged.
  - Jump/roll/fly/hover state logic remains intact.
  - Obstacle collision behavior remains equivalent.

- **Space obstacle naming pass**
  - Train-like obstacle flow now uses space naming (`CRUISER`, `ASTEROID`, `LASER_GATE`) in logic/comments.

- **Speed system cleanup**
  - Top speed now follows config-based cap:
    - `maxMultiplier = CONFIG.maxSpeed / CONFIG.playerSpeed`
  - Main loop uses `Math.min(CONFIG.maxSpeed, CONFIG.playerSpeed * speedMultiplier)`.

- **Runway/road visual pass**
  - Switched to clean neon runway style.
  - Added side approach lights (airport-like bulbs) with pulse + motion loop.
  - Tuned bulb density and bulb size for readability.
  - Surface tone blended so runway base does not look like a separate road block.

- **Environment pass**
  - Decorative side trees were replaced with **floating crystal clusters** (purple/cyan/neon green) with shimmer on the crystal meshes.
  - Save keys separated from old game naming (`spaceRun*` localStorage keys).

- **Repository setup**
  - `space-run` was initialized as its own git repository and pushed to:
  - `https://github.com/farhanmatics/space-run-3d.git`


## Game Structure

The game is a **single-file Three.js application** (`index.html`) with clear system sections.

### Files

- `index.html` - full game client (UI, rendering, logic, systems)
- `audio.mp3` - soundtrack used by the game


### High-level flow

1. `init()` bootstraps systems:
   - UI/setup
   - save-data load
   - Three.js scene/camera/renderer
   - asset/material creation
   - player creation
   - input binding
   - starts animation loop

2. `startGame()` resets run state:
   - score/coins/speedMultiplier
   - world manager reset
   - player reset

3. `animate()` main loop:
   - computes `dt`
   - updates player and world
   - applies camera FOV adaptation
   - scrolls textures for speed illusion
   - advances score and speed
   - renders frame


### Core systems

- **Config (`CONFIG`)**
  - Gameplay constants (lane width, jump force, gravity, speed/accel, power-up durations).

- **Player (`class Player`)**
  - Manages spaceship model, movement state, physics, power-up visuals, and collision response.
  - Key states:
    - `isJumping`, `isRolling`, `isFlying`, `isHovering`
    - `isMagnetActive`, `isSuperSneakersActive`, `invincibleTimer`

- **World (`class WorldManager`)**
  - Owns runtime entities:
    - `obstacles`, `coins`, `powerups`, `mysteryBoxes`, `buildings`, `trees`, `bushes`, `runwayLights`
  - Handles:
    - spawning patterns
    - movement toward player (`z += moveDist`)
    - cleanup
    - power-up and collision checks
    - runway side-light generation and pulsing

- **Input system**
  - Keyboard:
    - left/right lane change
    - jump, roll
    - hoverboard activation shortcut
  - Touch:
    - swipe left/right/up/down
    - double tap hook for hoverboard

- **Game state/UI**
  - HUD score/coins
  - start/menu/shop/game-over panels
  - persistent data:
    - high score
    - coins
    - upgrades
    - inventory


### Collision model

- Uses `THREE.Box3` intersection test as the base collision gate.
- Applies obstacle-type exception logic (state-based safety rules) after AABB overlap.
- Coins/power-ups use simpler positional threshold checks.


## Game Controls (Detailed)

### Desktop keyboard

- `ArrowLeft` / `A` - shift to left lane
- `ArrowRight` / `D` - shift to right lane
- `ArrowUp` / `W` / `Space` - jump (or upward boost action)
- `ArrowDown` / `S` - roll/dive
- `E` - activate hoverboard (when available)

### Mobile touch

- Swipe left - shift left lane
- Swipe right - shift right lane
- Swipe up - jump
- Swipe down - roll/dive
- Double tap - hoverboard activation trigger

### Input handling notes

- Inputs are ignored unless `gameActive === true`.
- Lane movement is constrained to 3 lanes (`-1`, `0`, `1`).
- Swipe threshold prevents accidental taps from triggering movement.
- Audio context is initialized on first user interaction for browser compatibility.


## Collision Structure (Detailed)

Collision behavior follows a layered rule set:

1. **Broad/primary check**
   - `playerBox.intersectsBox(obstacleBox)` using `THREE.Box3`.
   - If no intersection, collision is ignored.

2. **Obstacle-specific safe exceptions**
   - `CRUISER`:
     - safe if player is on top (high enough Y).
   - `LASER_GATE`:
     - safe while rolling.
   - `ASTEROID`:
     - safe if jump height clears obstacle height.

3. **Protection override**
   - If hoverboard is active, a crash can be absorbed (temporary save/invincibility behavior).

4. **Fail state**
   - If no safe condition applies and no protection remains, game over is triggered.

### Non-obstacle collection checks

- **Coins**:
  - proximity checks on `x`, `y`, `z` thresholds.
  - magnet power-up pulls nearby coins toward player before collection.
- **Power-ups / mystery boxes**:
  - simpler threshold checks (`x` and `z` proximity).


## Work Summary Log

This is a chronological summary of the development work completed in this session:

1. **Codebase analysis**
   - Mapped controls, lane/physics flow, spawn logic, and collision constraints from the original runner.

2. **Space-run setup**
   - Created `space-run` folder and ported the game entry (`index.html`) as the base.

3. **Phase 1 reskin**
   - Updated UI labels/theme and scene color language to space style.
   - Kept gameplay behavior unchanged.

4. **Phase 2 naming + systems cleanup**
   - Renamed obstacle semantics to space terms (`CRUISER`, `ASTEROID`, `LASER_GATE`).
   - Removed chaser entity (police/drone) from active gameplay.
   - Standardized top-speed cap to config-based max speed logic.

5. **Player redesign**
   - Replaced humanoid with spaceship model.
   - Adjusted animation states (banking, pitch, thrust pulse) to match ship behavior.
   - Corrected model facing direction.

6. **Runway visual redesign**
   - Replaced rail look with neon runway styling.
   - Tuned line density/visibility and later simplified for cleaner look.
   - Added side runway bulbs (airport-approach style) with animation and spacing/size tuning.

7. **Environment redesign**
   - Reworked side decoration toward floating crystal aesthetic.
   - Introduced neon crystal materials (purple/cyan/neon green) and shimmer-driven visuals.

8. **Project publishing**
   - Initialized git inside `space-run`.
   - Committed and pushed to:
     - `https://github.com/farhanmatics/space-run-3d.git`


### Spawning overview

- Obstacle patterns generated at dynamic interval based on speed.
- Decorative environment spawned probabilistically:
  - buildings
  - floating crystal clusters (`spawnTree`)
  - side props (`spawnBush`)
- Runway side bulbs are pre-created and looped in-place.


## Notes for future development

- Consider extracting systems into separate modules/files for maintainability (`player.js`, `world.js`, `ui.js`).
- Add a debug panel for tuning:
  - spawn rates
  - lane spacing
  - speed/acceleration
  - crystal shimmer intensity
- Add lightweight test hooks for:
  - collision invariants
  - spawn distribution sanity checks
  - save/load key integrity.
