# Arcade Game vs Training Mode Comparison

## The Problem
Training mode canvas renders correctly. Arcade game (Play Game) shows black canvas.
Both use similar code patterns but only training works.

## Flow Comparison

### Training Mode Flow (WORKS)
1. User on `mainMenuScreen` (inside managementOverlay)
2. Clicks "Training Mode" button
3. `startTrainingMode()` called directly
4. Canvas renders correctly

### Arcade Game Flow (BROKEN)
1. User on `hubScreen` (inside managementOverlay)
2. Clicks "Play Game" button
3. `showPreGame(game.opponent)` called → shows `pre_game` screen
4. User on `preGameScreen` (inside managementOverlay)
5. Clicks "Start Game" button
6. `startMatch()` called
7. `startArcadeGame()` called
8. Canvas is BLACK

## Key Difference: Pre-game Screen
Arcade game goes through an EXTRA screen (pre_game) before starting.
Training mode goes directly from main menu to game.

## Function Call Differences

| Aspect | Training Mode | Arcade Game |
|--------|--------------|-------------|
| Prior screen | mainMenuScreen | preGameScreen |
| Intermediate call | None | startMatch() |
| Sets trainingMode | true | false |
| viewButtons | hidden | shown |
| trainingModeUI | shown | hidden |
| catchDisplay | hidden | shown (empty string) |
| Lines | setEnabled(false) | setEnabled(true) |
| Calls updateGamePlayersFromRoster | No | Yes |
| Calls gameStats.reset() | No | Yes |

## Things Already Tried (FAILED)
1. ✗ engine.resize() at end of function
2. ✗ Matching DOM manipulation pattern exactly
3. ✗ Adding updateDownDistance()
4. ✗ Setting trainingMode = false explicitly
5. ✗ Re-enabling offensive/defensive lines
6. ✗ setTimeout for engine.resize()

## Things To Try Next
1. [ ] Call startArcadeGame from main menu (skip pre_game) to test if pre_game is the issue
2. [ ] Check if startMatch() does something that breaks rendering
3. [ ] Check if showPreGame() does something that breaks rendering
4. [ ] Try calling engine.resize() BEFORE hiding overlay
5. [ ] Check canvas dimensions at various points
6. [ ] Check if there's a second canvas or render target being created
