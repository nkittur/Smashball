# Training Mode Debug Investigation

## Problem
Training mode shows black/empty canvas instead of the game scene.

## Confirmed Facts
| Check | Result |
|-------|--------|
| Render loop running | YES (1 frame confirmed) |
| WebGL context lost | NO |
| Engine disposed | NO |
| Scene exists | YES |
| gameState.scene === scene | YES (same object) |
| QB mesh exists & enabled | YES |
| Receivers exist & enabled | YES (3 receivers) |
| Camera exists | YES |
| Canvas dimensions | 960x1557 internal, 320x519 CSS |
| Overlay hidden | YES (display: none) |
| Issue on different browser | YES (not browser-specific) |
| createScene function unchanged | YES (diff shows no changes) |
| No new full-screen overlays | YES (only managementOverlay, which is hidden) |

## What SHOULD happen but DOESN'T
- Setting `scene.clearColor = red` - should show red background, shows BLACK
- Setting `canvas.style.background = blue` - should show blue, shows BLACK

## Investigation Progress

### Ruled Out:
1. ~~Save/localStorage corruption~~ - Happens on fresh browser
2. ~~WebGL context issues~~ - Context valid, not lost
3. ~~Engine/render loop issues~~ - Loop running, engine not disposed
4. ~~Scene identity mismatch~~ - gameState.scene === scene confirmed
5. ~~Mesh visibility~~ - All meshes enabled with valid positions
6. ~~Camera configuration~~ - Camera has valid target/position

### Current Test:
Added immediate scene.render() right after createScene() with green background.
This tests whether the scene CAN render at all, before any overlays are shown.

### Next Steps:
1. If green shows briefly at startup - problem is with how overlay hiding works
2. If green never shows - problem is with scene creation itself
