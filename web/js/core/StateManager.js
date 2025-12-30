/**
 * STATE_MANAGER.JS - Game State Machine
 * Manages transitions between game states (Menu, Playing, Paused, etc.)
 */

import eventBus from './EventBus.js';

export class StateManager {
    constructor() {
        this.states = new Map();
        this.currentState = null;
        this.previousState = null;
    }

    /**
     * Register a state
     * @param {string} name - State name
     * @param {Object} state - State object with enter, update, render, exit methods
     */
    register(name, state) {
        this.states.set(name, state);
    }

    /**
     * Switch to a new state
     * @param {string} name - State name
     * @param {Object} data - Data to pass to new state
     */
    setState(name, data = {}) {
        if (!this.states.has(name)) {
            console.error(`State "${name}" not found!`);
            return;
        }

        // Exit current state
        if (this.currentState) {
            this.currentState.exit?.();
            this.previousState = this.currentState;
        }

        // Enter new state
        this.currentState = this.states.get(name);
        this.currentState.name = name;
        this.currentState.enter?.(data);

        // Emit state change event
        eventBus.emit('stateChanged', { from: this.previousState?.name, to: name, data });

        console.log(`State changed: ${this.previousState?.name || 'none'} → ${name}`);
    }

    /**
     * Return to previous state
     */
    back() {
        if (this.previousState) {
            const prevName = this.previousState.name;
            this.setState(prevName);
        }
    }

    /**
     * Update current state
     * @param {number} deltaTime - Time since last update (ms)
     */
    update(deltaTime) {
        if (this.currentState) {
            this.currentState.update?.(deltaTime);
        }
    }

    /**
     * Render current state
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     */
    render(ctx) {
        if (this.currentState) {
            this.currentState.render?.(ctx);
        }
    }

    /**
     * Get current state name
     * @returns {string}
     */
    getCurrentStateName() {
        return this.currentState?.name || null;
    }
}

export default StateManager;
