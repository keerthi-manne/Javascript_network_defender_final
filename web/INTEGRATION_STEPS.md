# CRITICAL - Manual Integration Steps

Due to file editing limitations, please manually apply these changes:

## 1. Add to Config.js (line ~261, before `tutorial`)

```javascript
adaptive2: {
    name: 'Diamond Pattern',
    nodes: [
        { id: 0, x: 150, y: 350, type: 'source' },
        { id: 1, x: 350, y: 200, type: 'chokepoint' },
        { id: 2, x: 350, y: 350, type: 'chokepoint' },
        { id: 3, x: 350, y: 500, type: 'chokepoint' },
        { id: 4, x: 600, y: 150, type: 'normal' },
        { id: 5, x: 600, y: 350, type: 'normal' },
        { id: 6, x: 600, y: 550, type: 'normal' },
        { id: 7, x: 850, y: 250, type: 'chokepoint' },
        { id: 8, x: 850, y: 450, type: 'chokepoint' },
        { id: 9, x: 1050, y: 350, type: 'goal' }
    ],
    edges: [
        [0, 1], [0, 2], [0, 3],
        [1, 4], [2, 5], [3, 6],
        [4, 7], [5, 7], [5, 8], [6, 8],
        [7, 9], [8, 9]
    ],
    sources: [0],
    goals: [9],
    chokepoints: [1, 2, 3, 7, 8]
},
adaptive3: {
    name: 'Y-Junction Network',
    nodes: [
        { id: 0, x: 150, y: 350, type: 'source' },
        { id: 1, x: 350, y: 350, type: 'normal' },
        { id: 2, x: 500, y: 250, type: 'chokepoint' },
        { id: 3, x: 500, y: 450, type: 'chokepoint' },
        { id: 4, x: 700, y: 150, type: 'normal' },
        { id: 5, x: 700, y: 350, type: 'normal' },
        { id: 6, x: 700, y: 550, type: 'normal' },
        { id: 7, x: 900, y: 250, type: 'chokepoint' },
        { id: 8, x: 900, y: 450, type: 'chokepoint' },
        { id: 9, x: 1050, y: 350, type: 'goal' }
    ],
    edges: [
        [0, 1], [1, 2], [1, 3],
        [2, 4], [2, 5], [3, 5], [3, 6],
        [4, 7], [5, 7], [5, 8], [6, 8],
        [7, 9], [8, 9]
    ],
    sources: [0],
    goals: [9],
    chokepoints: [2, 3, 7, 8]
},
```

## 2. Update PlayingState.js imports (top of file)

Add these imports after line 6:
```javascript
import LevelManagerAdaptive from '../gameplay/LevelManagerAdaptive.js';
import LevelManagerStackelberg from '../gameplay/LevelManagerStackelberg.js';
```

## 3. Replace PlayingState.enter() method (lines 33-56)

See integration_guide.md Step 3 for complete replacement code.

## 4. Add to PlayingState.js (add these new methods at end before export)

```javascript
showAITip(message) {
    const tipEl = document.getElementById('ai-tip');
    if (tipEl) {
        tipEl.textContent = message;
        tipEl.classList.remove('hidden');
        setTimeout(() => tipEl.classList.add('hidden'), 8000);
    }
}

handleTopologySwitch(data) {
    console.log(`Topology: ${data.to}, Reason: ${data.reasoning}`);
}

handleAIStrategyUpdate(data) {
    console.log('AI Strategy:', data.strategy?.reasoning);
}

handlePhaseChange(data) {
    console.log(`Phase: ${data.phase}`);
    this.towersLocked = !data.canPlaceTowers;
}

handlePhaseTimer(data) {
    // Timer update handled by HUD
}

handleStackelbergComplete(data) {
    console.log('Stackelberg Complete',data.score);
    this.paused = true;
}
```

## All AI files are already created:
- ✅ GeniusAI.js
- ✅ LevelManagerAdaptive.js  
- ✅ PerfectAI.js
- ✅ LevelManagerStackelberg.js

Now building Level 4...
