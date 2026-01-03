# Canvas Rendering Fix (Training Mode & Play Game)

## Problem
When transitioning from the management overlay to the game canvas (either Training Mode or Play Game), the canvas would show black/empty instead of the game scene.

## Root Cause
The issue was related to Babylon.js render target dimensions. When the management overlay was hidden, the canvas would remain black even though:
- The scene existed with 126+ meshes
- The camera was properly configured
- The WebGL context was valid
- The render loop was running

## The Fix
The fix requires two components:

### 1. Render Loop with Try/Catch
The render loop must wrap `scene.render()` in a try/catch block:

```javascript
engine.runRenderLoop(() => {
    try {
        scene.render();
    } catch (e) {
        console.error('Render error:', e);
    }
});
```

### 2. Engine Resize When Showing Game Canvas
When transitioning from overlay to game view, `engine.resize()` must be called:

**In `showScreen('game')`:**
```javascript
if (screenName === 'game') {
    overlay.classList.add('hidden');
    // ... other setup ...
    engine.resize();  // CRITICAL
}
```

**In `startTrainingMode()`:**
```javascript
function startTrainingMode() {
    // ... hide overlay, setup game state ...
    engine.resize();  // CRITICAL
}
```

## What Did NOT Fix It
- Creating temporary meshes to "wake up" the GPU
- Marking materials as dirty
- Calling `scene.render()` directly
- Calling `camera.update()`
- Setting `scene.clearColor`

## Why This Works
The combination of:
1. Try/catch in render loop prevents silent failures from stopping the render loop
2. `engine.resize()` forces Babylon.js to recalculate internal render target dimensions after the overlay (which may have affected layout) is hidden

## Important Notes
- Do NOT simplify the render loop to just `scene.render()` without try/catch
- Always call `engine.resize()` when transitioning from overlay-covered to visible canvas
- The canvas verification and camera logging can be removed - they were just for debugging

---

# Linemen Render Error Fix (Play Game Only)

## Problem
Play Game mode showed a black screen with continuous render errors:
```
Render error: TypeError: Attempted to assign to readonly property
```

Training Mode worked fine, but Play Game (arcade mode) failed.

## Root Cause
The O-line and D-line mesh creation was overwriting Babylon.js's `position` property:

```javascript
// WRONG - This breaks Babylon.js!
oLineman.position = 'OL';  // Overwrites Vector3 with string
dLineman.position = 'DL';  // Overwrites Vector3 with string
```

In Babylon.js, `TransformNode.position` is a `Vector3` used for 3D positioning. By setting it to a string like `'OL'`, the mesh could no longer be positioned. When Babylon.js tried to update the position during rendering (e.g., `this.position.x = ...`), it failed because strings are immutable/readonly.

## Why Training Mode Worked
Training mode disables linemen via `lineman.setEnabled(false)`, so Babylon.js never tried to render/update their positions. Arcade mode enables them, triggering the error.

## The Fix
Renamed the property to avoid conflicting with Babylon.js:

```javascript
// CORRECT - Use a different property name
oLineman.positionType = 'OL';  // For ability calculations
dLineman.positionType = 'DL';  // For ability calculations
```

Also updated `calculateAbilities()` to check both properties:
```javascript
const pos = player.positionType || player.position;
```

## Key Lesson: Reserved Property Names in Babylon.js

**NEVER overwrite these properties on Babylon.js nodes:**
- `position` - Vector3 for 3D position
- `rotation` - Vector3 for Euler rotation
- `scaling` - Vector3 for scale
- `rotationQuaternion` - Quaternion for rotation
- `parent` - Parent node reference
- `name` - Node name (string, but used by Babylon.js)

If you need to store game-specific data on a mesh/node, use custom property names that don't conflict:
- ✅ `positionType`, `positionLabel`, `gamePosition`
- ✅ `playerName`, `displayName`
- ✅ `stats`, `coreAttributes`, `playerId`
- ❌ `position`, `rotation`, `scaling`
