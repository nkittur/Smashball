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
