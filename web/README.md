# Network Defender - Web Edition

A modern, web-based tower defense game featuring advanced AI opponents and economic game theory mechanics.

## 🎮 Current Status: Phase 1 - Foundation Complete!

### ✅ Completed
- **Project Structure**: Full web application architecture
- **Core Engine**: Game loop, state machine, event system
- **UI/UX Foundation**: HTML structure, CSS styling (glassmorphism, animations)
- **Utilities**: Config system, storage wrapper, graphics library
- **Main Menu**: Working menu with animated particle background

### 🚧 In Progress
- Game states (Playing, Tutorial)
- Gameplay mechanics

### 📋 Next Up
- Network graph rendering
- Tower system
- Enemy system
- Level 1 implementation

## 🚀 Quick Start

1. **Open the game**: Simply open `index.html` in a modern web browser
   - Chrome, Firefox, Safari, or Edge recommended
   - No build step or dependencies required!

2. **For local development** (optional):
   ```bash
   # Use a simple HTTP server to avoid CORS issues
   # Python 3:
   python -m http.server 8000
   
   # OR Node.js:
   npx http-server
   ```
   Then open http://localhost:8000

## 📁 Project Structure

```
web/
├── index.html              # Entry point
├── css/
│   ├── main.css           # Core styles & design system
│   ├── menu.css           # Menu screens
│   ├── game.css           # In-game HUD
│   └── animations.css     # Keyframe animations
├── js/
│   ├── main.js            # Application entry
│   ├── core/
│   │   ├── GameEngine.js  # Game loop & canvas
│   │   ├── StateManager.js # State machine
│   │   └── EventBus.js    # Event system
│   ├── states/
│   │   ├── MenuState.js   # Main menu
│   │   ├── LevelSelectState.js
│   │   ├── PlayingState.js
│   │   └── TutorialState.js
│   └── utils/
│       ├── Config.js      # Game constants
│       ├── Storage.js     # LocalStorage wrapper
│       └── Graphics.js    # Canvas utilities
└── assets/ (to be added)
```

## 🎯 Features

### Game Modes
1. **Level 1**: Basic Defense - Learn tower placement
2. **Level 2**: Adaptive AI - AI learns your strategy
3. **Level 3**: Perfect AI Commitment - Stackelberg equilibrium
4. **Level 4**: Economic Endless - Budget + RL warfare
5. **Tutorial Mode**: Interactive step-by-step guide
6. **Endless Modes**: Classic, Economic, Time Attack

### AI Systems
- **Genius AI** (Level 2): Analyzes tower composition, spawns counters
- **Perfect AI** (Level 3): Calculates optimal attack after commitment phase
- **Economic RL** (Level 4): Q-learning agent adapts to your economy

### Tower Types
- **Firewall**: High damage, good vs FAST enemies
- **IDS**: Reveals STEALTH, applies slow effect
- **Honeypot**: Attracts and distracts enemies

### Visual Features
- Glassmorphism UI design
- Particle effects
- Smooth animations
- Dark mode theme
- Accessibility options (colorblind modes, high contrast, reduced motion)

## 🎨 Design Philosophy

- **Premium Aesthetics**: Glassmorphism, gradients, glowing effects
- **Intuitive UX**: Clear visual feedback, tooltips, guided tutorial
- **Accessibility First**: Multiple colorblind modes, keyboard navigation
- **Educational**: Teaches AI concepts (adaptive learning, game theory, RL)

## 🛠️ Technical Stack

- **Frontend**: Vanilla HTML5, CSS3, JavaScript (ES6+)
- **Graphics**: Canvas 2D API
- **Storage**: LocalStorage for saves and settings
- **Architecture**: State machine pattern, pub/sub events

## 🎓 Learning Objectives

Players learn about:
- **Machine Learning**: Reinforcement learning (Q-learning)
- **Game Theory**: Stackelberg equilibrium, Nash equilibrium
- **Economics**: Cournot/Bertrand competition models
- **Cybersecurity**: Network defense strategies

## 📝 Development Log

**Day 1 - Foundation**
- ✅ Project structure
- ✅ HTML/CSS complete
- ✅ Core game engine
- ✅ Main menu with animated background
- ✅ Settings system
- ✅ Save/load infrastructure

**Next Session**
- Network rendering
- Tower placement system
- Enemy movement
- Level 1 implementation

## 🤝 Contributing

This is an educational project showcasing AI integration in tower defense games.

## 📄 License

Educational project - all rights reserved.

## 🙏 Acknowledgments

Built with modern web technologies and inspired by classic tower defense games with an educational twist on AI and game theory.

---

**Status**: Active Development | **Version**: 0.1.0-alpha | **Last Updated**: Dec 25, 2024
