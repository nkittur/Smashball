# Training Mode Rendering Fix

## Problem
Training mode was showing a black/empty canvas instead of the game scene when clicking the "Training Mode" button from the main menu.

## Root Cause
The issue was related to the render loop and scene initialization timing. When the management overlay was hidden and training mode started, the canvas would remain black even though:
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
        console.error('[RENDER] ERROR in scene.render():', e);
    }
});
```

### 2. Engine Resize on Training Mode Start
When entering training mode, `engine.resize()` must be called to ensure the canvas dimensions are synchronized:

```javascript
function startTrainingMode() {
    // ... hide overlay, setup game state ...

    // Force engine resize - CRITICAL for rendering to work
    engine.resize();
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
