/**
 * MAIN.JS - Application Entry Point
 * Initializes game engine, loads assets, sets up UI
 */

import GameEngine from './core/GameEngine.js';
import StateManager from './core/StateManager.js';
import eventBus from './core/EventBus.js';
import Storage from './utils/Storage.js';
import Config from './utils/Config.js';

// Main.js initialized


// Import states (will be created)
import MenuState from './states/MenuState.js';
import LevelSelectState from './states/LevelSelectState.js';
import PlayingState from './states/PlayingState.js';
import TutorialState from './states/TutorialStateV2.js';

class Game {
    constructor() {
        this.engine = null;
        this.settings = null;
        this.saveData = null;
        this.loadingProgress = 0;
    }

    /**
     * Initialize the game
     */
    async init() {
        console.log('%c🎮 Network Defender - Initializing...', 'color: #4c9eff; font-size:  16px; font-weight: bold;');

        try {
            // Show loading screen
            this.showLoadingScreen();

            // Load settings
            this.loadSettings();
            this.updateProgress(20);

            // Load save data
            this.loadSaveData();
            this.updateProgress(40);

            // Initialize game engine
            this.engine = new GameEngine();
            this.updateProgress(60);

            // Register states
            this.registerStates();
            this.updateProgress(80);

            // Setup UI event listeners
            this.setupUIListeners();
            this.updateProgress(90);

            // Apply settings
            this.applySettings();
            this.updateProgress(100);

            // Hide loading, show menu
            await this.delay(500);
            this.hideLoadingScreen();
            this.showMainMenu();

            // Start engine
            this.engine.start();

            console.log('%c✅ Game initialized successfully!', 'color: #00ff88; font-weight: bold;');
        } catch (error) {
            console.error('Initialization error:', error);
            this.showError('Failed to initialize game. Please refresh the page.');
        }
    }

    /**
     * Register all game states
     */
    registerStates() {
        this.engine.stateManager.register('menu', new MenuState());
        this.engine.stateManager.register('levelSelect', new LevelSelectState());
        this.engine.stateManager.register('playing', new PlayingState());
        this.engine.stateManager.register('tutorial', new TutorialState());

        // Start in menu state
        this.engine.stateManager.setState('menu');
    }

    /**
     * Setup UI button listeners
     */
    setupUIListeners() {
        // Main Menu buttons
        document.getElementById('btn-start')?.addEventListener('click', () => {
            this.showLevelSelect();
        });

        document.getElementById('btn-tutorial')?.addEventListener('click', () => {
            this.startTutorial();
        });

        document.getElementById('btn-endless')?.addEventListener('click', () => {
            this.showEndlessSelect();
        });

        document.getElementById('btn-settings')?.addEventListener('click', () => {
            this.showSettings();
        });

        document.getElementById('btn-credits')?.addEventListener('click', () => {
            this.showCredits();
        });

        // Level Select back button
        document.getElementById('btn-back-menu')?.addEventListener('click', () => {
            this.showMainMenu();
        });

        // Endless mode buttons
        document.getElementById('endless-classic')?.addEventListener('click', () => {
            this.startMode('CLASSIC');
        });

        document.getElementById('endless-economic')?.addEventListener('click', () => {
            this.startMode('ECONOMIC');
        });

        document.getElementById('endless-time')?.addEventListener('click', () => {
            this.startMode('TIME_ATTACK');
        });

        // Settings back button
        document.getElementById('btn-back-settings')?.addEventListener('click', () => {
            this.saveSettings();
            this.showMainMenu();
        });

        // Credits back button
        document.getElementById('btn-back-credits')?.addEventListener('click', () => {
            this.showMainMenu();
        });

        // Settings controls
        this.setupSettingsControls();

        // Pause/Resume
        document.getElementById('btn-pause')?.addEventListener('click', () => {
            this.togglePause();
        });

        document.getElementById('btn-resume')?.addEventListener('click', () => {
            this.togglePause();
        });

        // Dialog buttons
        document.getElementById('btn-restart')?.addEventListener('click', () => {
            this.restartLevel();
        });

        document.getElementById('btn-quit')?.addEventListener('click', () => {
            this.quitToMenu();
        });

        // Event bus listeners
        eventBus.on('levelSelected', (levelId) => this.startLevel(levelId));
        eventBus.on('levelComplete', (data) => this.handleLevelComplete(data));
        eventBus.on('stackelbergComplete', (data) => this.handleLevelComplete(data));
    }

    /**
     * Setup settings controls
     */
    setupSettingsControls() {
        // Volume sliders
        ['master', 'music', 'sfx'].forEach(type => {
            const slider = document.getElementById(`volume-${type}`);
            const display = document.getElementById(`volume-${type}-val`);

            if (slider && display) {
                slider.addEventListener('input', (e) => {
                    display.textContent = `${e.target.value}%`;
                    this.settings.audio[type] = parseInt(e.target.value);
                });
            }
        });

        // Checkboxes and selects
        const settingInputs = document.querySelectorAll('#settings-screen input, #settings-screen select');
        settingInputs.forEach(input => {
            input.addEventListener('change', () => {
                this.updateSettings();
            });
        });
    }

    /**
     * Load settings from storage
     */
    loadSettings() {
        this.settings = Storage.load(Config.STORAGE_KEYS.SETTINGS, {
            audio: {
                master: 70,
                music: 50,
                sfx: 70,
                muted: false
            },
            visual: {
                particles: true,
                colorblindMode: 'none',
                highContrast: false,
                reduceMotion: false
            },
            gameplay: {
                difficulty: 'normal',
                showPaths: 'hover',
                tutorialHints: true
            }
        });

        console.log('Settings loaded:', this.settings);
    }

    /**
     * Save settings to storage
     */
    saveSettings() {
        Storage.save(Config.STORAGE_KEYS.SETTINGS, this.settings);
        this.applySettings();
        console.log('Settings saved');
    }

    /**
     * Update settings from UI
     */
    updateSettings() {
        // Read from UI and update settings object
        this.settings.audio.master = parseInt(document.getElementById('volume-master')?.value || 70);
        this.settings.audio.music = parseInt(document.getElementById('volume-music')?.value || 50);
        this.settings.audio.sfx = parseInt(document.getElementById('volume-sfx')?.value || 70);
        this.settings.audio.muted = document.getElementById('mute-all')?.checked || false;

        this.settings.visual.particles = document.getElementById('particles-enabled')?.checked || true;
        this.settings.visual.colorblindMode = document.getElementById('colorblind-mode')?.value || 'none';
        this.settings.visual.highContrast = document.getElementById('high-contrast')?.checked || false;
        this.settings.visual.reduceMotion = document.getElementById('reduce-motion')?.checked || false;

        this.settings.gameplay.difficulty = document.getElementById('difficulty')?.value || 'normal';
        this.settings.gameplay.showPaths = document.getElementById('show-paths')?.value || 'hover';
        this.settings.gameplay.tutorialHints = document.getElementById('tutorial-hints')?.checked || true;

        this.applySettings();
    }

    /**
     * Apply settings to game
     */
    applySettings() {
        // Apply visual settings to body
        document.body.classList.toggle('high-contrast', this.settings.visual.highContrast);
        document.body.classList.toggle('reduce-motion', this.settings.visual.reduceMotion);

        // Emit settings changed event
        eventBus.emit('settingsChanged', this.settings);
    }

    /**
     * Load save data from storage
     */
    loadSaveData() {
        this.saveData = Storage.load(Config.STORAGE_KEYS.SAVE_DATA, {
            levelsCompleted: [],
            bestScores: {},
            stars: {},
            totalPlayTime: 0,
            achievements: []
        });

        console.log('Save data loaded:', this.saveData);
    }

    /**
     * Save game progress
     */
    saveProgress() {
        Storage.save(Config.STORAGE_KEYS.SAVE_DATA, this.saveData);
        console.log('Progress saved');
    }

    /**
     * Show/hide screens
     */
    showLoadingScreen() {
        document.getElementById('loading-screen')?.classList.remove('hidden');
    }

    hideLoadingScreen() {
        document.getElementById('loading-screen')?.classList.add('hidden');
    }

    showMainMenu() {
        this.hideAllScreens();
        document.getElementById('main-menu')?.classList.remove('hidden');
        document.getElementById('game-container')?.classList.add('hidden');
    }

    showLevelSelect() {
        this.hideAllScreens();
        document.getElementById('level-select')?.classList.remove('hidden');
        this.populateLevelCards();
    }

    showSettings() {
        this.hideAllScreens();
        document.getElementById('settings-screen')?.classList.remove('hidden');
        this.populateSettingsUI();
    }

    hideAllScreens() {
        document.querySelectorAll('.menu-screen').forEach(screen => {
            screen.classList.add('hidden');
        });
    }

    /**
     * Populate level cards
     */
    populateLevelCards() {
        const levelGrid = document.querySelector('.level-grid');
        if (!levelGrid) return;

        levelGrid.innerHTML = '';

        Config.LEVELS.forEach(level => {
            const card = this.createLevelCard(level);
            levelGrid.appendChild(card);
        });
    }

    /**
     * Create a level card element
     */
    createLevelCard(level) {
        const isCompleted = this.saveData.levelsCompleted.includes(level.id);
        const card = document.createElement('button');
        // Temporarily unlock all levels for testing
        // const isLocked = level.id > 1 && !this.saveData.levelsCompleted.includes(level.id - 1);
        const isLocked = false;

        const stars = this.saveData.stars[level.id] || 0;
        const bestScore = this.saveData.bestScores[level.id] || 0;

        card.className = `level-card ${isLocked ? 'locked' : ''}`;
        card.innerHTML = `
            <div class="level-number">Level ${level.id}</div>
            <div class="level-name">${level.name}</div>
            <div class="level-description">${level.description}</div>
            <div class="level-preview">Network Preview</div>
            <div class="level-stats">
                <div class="level-stars">
                    ${this.renderStars(stars)}
                </div>
                <div class="level-best">Best: ${bestScore}</div>
            </div>
            ${isLocked ? '<div class="lock-icon">🔒</div>' : ''}
        `;

        // Always attach listener
        card.addEventListener('click', () => {
            eventBus.emit('levelSelected', level.id);
        });

        return card;
    }

    /**
     * Render star rating
     */
    renderStars(count) {
        let html = '';
        for (let i = 0; i < 3; i++) {
            html += `<span class="star ${i < count ? '' : 'empty'}">⭐</span>`;
        }
        return html;
    }

    /**
     * Populate settings UI with current values
     */
    populateSettingsUI() {
        document.getElementById('volume-master').value = this.settings.audio.master;
        document.getElementById('volume-master-val').textContent = `${this.settings.audio.master}%`;

        document.getElementById('volume-music').value = this.settings.audio.music;
        document.getElementById('volume-music-val').textContent = `${this.settings.audio.music}%`;

        document.getElementById('volume-sfx').value = this.settings.audio.sfx;
        document.getElementById('volume-sfx-val').textContent = `${this.settings.audio.sfx}%`;

        document.getElementById('mute-all').checked = this.settings.audio.muted;
        document.getElementById('particles-enabled').checked = this.settings.visual.particles;
        document.getElementById('colorblind-mode').value = this.settings.visual.colorblindMode;
        document.getElementById('high-contrast').checked = this.settings.visual.highContrast;
        document.getElementById('reduce-motion').checked = this.settings.visual.reduceMotion;
        document.getElementById('difficulty').value = this.settings.gameplay.difficulty;
        document.getElementById('show-paths').value = this.settings.gameplay.showPaths;
        document.getElementById('tutorial-hints').checked = this.settings.gameplay.tutorialHints;
    }

    /**
     * Start a level
     */
    startLevel(levelId) {
        console.log(`Starting level ${levelId}`);
        this.hideAllScreens();
        document.getElementById('game-container')?.classList.remove('hidden');

        // Fix canvas size (was 0x0 when initialized while hidden)
        this.engine.handleResize();

        const levelConfig = Config.LEVELS.find(l => l.id === levelId);
        this.engine.stateManager.setState('playing', { level: levelConfig, settings: this.settings });
    }

    /**
     * Start a specific mode (Endless variants)
     */
    startMode(modeKey) {
        const modeConfig = Config.ENDLESS_MODES[modeKey];
        console.log(`Starting ${modeConfig.name} mode`, modeConfig);

        this.hideAllScreens();
        document.getElementById('game-container')?.classList.remove('hidden');
        this.engine.handleResize();

        this.engine.stateManager.setState('playing', {
            level: modeConfig,
            settings: this.settings
        });
    }

    /**
     * Start tutorial
     */
    startTutorial() {
        console.log('Starting tutorial');
        this.hideAllScreens();
        document.getElementById('game-container')?.classList.remove('hidden');

        // Fix canvas size (was 0x0 when initialized while hidden)
        this.engine.handleResize();

        this.engine.stateManager.setState('tutorial');
    }

    /**
     * Show endless mode selection
     */
    showEndlessSelect() {
        this.showLevelSelect();
        // Scroll to endless modes section
        setTimeout(() => {
            const endlessSection = document.querySelector('.endless-modes');
            if (endlessSection) {
                endlessSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 100);
    }

    /**
     * Show credits screen
     */
    showCredits() {
        this.hideAllScreens();
        const creditsScreen = document.getElementById('credits-screen');
        if (creditsScreen) {
            creditsScreen.classList.remove('hidden');
        } else {
            // Create credits screen if it doesn't exist
            this.createCreditsScreen();
        }
    }

    /**
     * Handle level complete
     */
    handleLevelComplete(data) {
        console.log('Level complete!', data);

        // Update save data
        if (!this.saveData.levelsCompleted.includes(data.level)) {
            this.saveData.levelsCompleted.push(data.level);
        }

        // Update score if better
        if (!this.saveData.bestScores[data.level] || data.score > this.saveData.bestScores[data.level]) {
            this.saveData.bestScores[data.level] = data.score;
        }

        // Calculate stars
        const stars = data.rating || Math.min(3, Math.ceil(data.successRate / 33));
        if (!this.saveData.stars[data.level] || stars > this.saveData.stars[data.level]) {
            this.saveData.stars[data.level] = stars;
        }

        this.saveProgress();
    }

    /**
     * Handle level failed
     */
    handleLevelFailed(data) {
        console.log('Level failed!', data);
    }

    /**
     * Toggle pause
     */
    togglePause() {
        eventBus.emit('togglePause');
    }

    /**
     * Restart current level
     */
    restartLevel() {
        eventBus.emit('restartLevel');
    }

    /**
     * Quit to main menu
     */
    quitToMenu() {
        // Hide any open dialogs
        document.getElementById('dialog-overlay')?.classList.add('hidden');
        this.showLevelSelect();
        this.engine.stateManager.setState('levelSelect');
    }

    /**
     * Update loading progress
     */
    updateProgress(percent) {
        this.loadingProgress = percent;
        const progressBar = document.getElementById('loading-progress');
        if (progressBar) {
            progressBar.style.width = `${percent}%`;
        }
    }

    /**
     * Show error message
     */
    showError(message) {
        alert(message); // TODO: Better error UI
    }

    /**
     * Delay helper
     */

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize game when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        const game = new Game();
        window.game = game;
        game.init();
    });
} else {
    const game = new Game();
    window.game = game;
    game.init();
}
