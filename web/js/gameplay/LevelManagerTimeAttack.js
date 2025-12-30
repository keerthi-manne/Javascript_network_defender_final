/**
 * LEVEL_MANAGER_TIME_ATTACK.JS - Time Attack Mode Manager
 * Specialized logic for time-based wave spawning and scoring
 */

import LevelManager from './LevelManager.js';

export class LevelManagerTimeAttack extends LevelManager {
    constructor(levelConfig, difficulty = 'normal') {
        super(levelConfig, difficulty);
        this.waveTimeLimit = levelConfig.waveTimeLimit || 60;
        this.waveTimer = 0;
        this.totalGameTimer = 0;
    }

    updatePhase(deltaTime) {
        if (this.levelComplete || this.levelFailed) return;

        this.waveTimer += deltaTime / 1000; // in seconds
        this.totalGameTimer += deltaTime / 1000;

        if (this.waveTimer >= this.waveTimeLimit) {
            this.handleTimeOut();
        }
    }

    handleTimeOut() {
        console.log(`Time up for wave ${this.wave}!`);
        // If not enough enemies blocked by now, damage core based on remaining
        this.takeDamage(10); // Penalty for slow clearing
        this.startWave();
    }

    startWave() {
        this.wave++;
        this.waveTimer = 0;
        this.spawnTimer = 0;
        // Increase difficulty slightly each wave
        this.spawnInterval = Math.max(500, this.spawnInterval * 0.9);
        console.log(`[Time Attack] Starting wave ${this.wave}. New spawn interval: ${this.spawnInterval.toFixed(0)}ms`);
    }

    checkWinCondition() {
        // Time attack is endless but has a high target wave
        if (this.wave >= 20) {
            this.levelComplete = true;
        }
    }

    getModeInfo() {
        return `Wave Timer: ${Math.ceil(this.waveTimeLimit - this.waveTimer)}s`;
    }
}

export default LevelManagerTimeAttack;
