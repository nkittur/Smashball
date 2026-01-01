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

### Current Debug Code (commit 623363e):
1. **startTrainingMode()** now logs:
   - Before/after overlay hide - display and z-index values
   - Canvas position and z-index
   - All visible body children with their position, display, and z-index
   - Final checks: scene exists, active render loops
   - Delayed (500ms) framebuffer pixel check

2. **Render loop** now logs:
   - Every ~1 second (60 frames) ONLY when training mode is active
   - Scene exists, mesh count, camera status

### Key Insight:
If `canvas.style.background = blue` shows BLACK, something is DEFINITELY covering the canvas.
This is a pure CSS issue, not WebGL. Need to identify what element is on top.

### Next Steps:
1. Check console logs when clicking Training Mode
2. Look for any visible body children that shouldn't be there
3. Check the delayed framebuffer pixel result
4. Verify render loop logs appear every second during training mode
