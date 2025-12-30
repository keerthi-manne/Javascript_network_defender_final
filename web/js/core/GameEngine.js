/**
 * GAME_ENGINE.JS - Main Game Engine
 * Core game loop, canvas management, and system coordination
 */

import StateManager from './StateManager.js';
import eventBus from './EventBus.js';
import Config from '../utils/Config.js';

export class GameEngine {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.stateManager = new StateManager();

        this.running = false;
        this.lastTime = 0;
        this.deltaTime = 0;
        this.fps = 0;
        this.frameCount = 0;
        this.fpsUpdateTime = 0;

        this.setupCanvas();
        this.setupEventListeners();
    }

    /**
     * Setup canvas with proper resolution
     */
    setupCanvas() {
        // Get device pixel ratio for crisp rendering
        const dpr = window.devicePixelRatio || 1;

        // Get container dimensions
        const container = this.canvas.parentElement;
        const containerRect = container.getBoundingClientRect();
        
        // Design dimensions (from Config)
        const designWidth = 1200;
        const designHeight = 700;
        const aspectRatio = designWidth / designHeight;
        
        // Calculate available space (accounting for sidebars ~520px total width, top bar ~80px height)
        // Left sidebar: 220px + 20px margin = 240px, Right sidebar: 240px + 20px margin = 260px
        const sidebarWidth = 260 + 260; // Both sidebars with margins
        const topBarHeight = 80;
        const bottomMargin = 20;
        const availableWidth = containerRect.width - sidebarWidth;
        const availableHeight = containerRect.height - topBarHeight - bottomMargin;
        
        // Calculate scale to fit available space while maintaining aspect ratio
        const scaleX = availableWidth / designWidth;
        const scaleY = availableHeight / designHeight;
        const scale = Math.min(scaleX, scaleY, 1); // Don't scale up beyond design size
        
        // Calculate display dimensions
        const displayWidth = Math.floor(designWidth * scale);
        const displayHeight = Math.floor(designHeight * scale);

        // Set display size (centered)
        this.canvas.style.width = `${displayWidth}px`;
        this.canvas.style.height = `${displayHeight}px`;
        this.canvas.style.margin = 'auto';

        // Get actual display size
        const rect = this.canvas.getBoundingClientRect();

        // Set actual size in memory (scaled for DPR)
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;

        // Scale context
        this.ctx.scale(dpr, dpr);

        // Store logical size and scale factor
        this.width = rect.width;
        this.height = rect.height;
        this.scaleFactor = scale;

        console.log(`Canvas initialized: ${this.width}x${this.height} (DPR: ${dpr}, Scale: ${scale.toFixed(2)})`);
    }

    /**
     * Setup window and canvas event listeners
     */
    setupEventListeners() {
        // Window resize
        window.addEventListener('resize', () => this.handleResize());

        // Canvas click
        this.canvas.addEventListener('click', (e) => this.handleClick(e));

        // Canvas mouse move
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));

        // Keyboard
        window.addEventListener('keydown', (e) => this.handleKeyDown(e));
        window.addEventListener('keyup', (e) => this.handleKeyUp(e));

        // Visibility change (pause when tab not visible)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                eventBus.emit('windowBlurred');
            } else {
                eventBus.emit('windowFocused');
            }
        });
    }

    /**
     * Handle window resize
     */
    handleResize() {
        this.setupCanvas();
        eventBus.emit('canvasResized', { width: this.width, height: this.height });
    }

    /**
     * Handle canvas click
     */
    handleClick(event) {
        const rect = this.canvas.getBoundingClientRect();
        let x = event.clientX - rect.left;
        let y = event.clientY - rect.top;
        
        // Convert to design coordinates (1200x700 space)
        const designWidth = 1200;
        const designHeight = 700;
        x = (x / this.width) * designWidth;
        y = (y / this.height) * designHeight;

        eventBus.emit('canvasClick', { x, y, event });
    }

    /**
     * Handle mouse move
     */
    handleMouseMove(event) {
        const rect = this.canvas.getBoundingClientRect();
        let x = event.clientX - rect.left;
        let y = event.clientY - rect.top;
        
        // Convert to design coordinates (1200x700 space)
        const designWidth = 1200;
        const designHeight = 700;
        x = (x / this.width) * designWidth;
        y = (y / this.height) * designHeight;

        eventBus.emit('canvasMouseMove', { x, y, event });
    }

    /**
     * Handle key down
     */
    handleKeyDown(event) {
        eventBus.emit('keyDown', { key: event.key, code: event.code, event });

        // Prevent default for game keys
        const gameKeys = ['Space', 'Escape', 'KeyQ', 'KeyW', 'KeyE', 'KeyR'];
        if (gameKeys.includes(event.code)) {
            event.preventDefault();
        }
    }

    /**
     * Handle key up
     */
    handleKeyUp(event) {
        eventBus.emit('keyUp', { key: event.key, code: event.code, event });
    }

    /**
     * Start the game loop
     */
    start() {
        if (this.running) return;

        this.running = true;
        this.lastTime = performance.now();
        this.fpsUpdateTime = this.lastTime;

        requestAnimationFrame((time) => this.gameLoop(time));

        console.log('Game engine started');
        eventBus.emit('engineStarted');
    }

    /**
     * Stop the game loop
     */
    stop() {
        this.running = false;
        console.log('Game engine stopped');
        eventBus.emit('engineStopped');
    }

    /**
     * Main game loop
     */
    gameLoop(currentTime) {
        if (!this.running) return;

        // Calculate delta time
        this.deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;

        // Cap delta time to prevent huge jumps
        if (this.deltaTime > 100) {
            this.deltaTime = 100;
        }

        // Update FPS counter
        this.frameCount++;
        if (currentTime - this.fpsUpdateTime >= 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.fpsUpdateTime = currentTime;
            eventBus.emit('fpsUpdated', this.fps);
        }

        // Update game state
        this.update(this.deltaTime);

        // Render game state
        this.render();

        // Continue loop
        requestAnimationFrame((time) => this.gameLoop(time));
    }

    /**
     * Update game logic
     */
    update(deltaTime) {
        this.stateManager.update(deltaTime);
    }

    /**
     * Render game graphics
     */
    render() {
        // Clear canvas (in logical coordinates, DPR already accounted for)
        this.ctx.fillStyle = Config.COLORS.BACKGROUND;
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Save context state
        this.ctx.save();
        
        // Scale context to match design dimensions (1200x700)
        // This ensures node positions work correctly regardless of actual canvas size
        const designWidth = 1200;
        const designHeight = 700;
        const scaleX = this.width / designWidth;
        const scaleY = this.height / designHeight;
        this.ctx.scale(scaleX, scaleY);

        // Render current state (coordinates will be in design space: 1200x700)
        this.stateManager.render(this.ctx);
        
        // Restore context state
        this.ctx.restore();
    }

    /**
     * Get mouse position relative to canvas
     */
    getMousePosition(event) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
        };
    }
}

export default GameEngine;
