/**
 * LEVEL_MANAGER.JS - Level State Management
 * Manages level data, topology, and progression
 */

import Config from '../utils/Config.js';
import Pathfinding from '../utils/Pathfinding.js';

export class LevelManager {
    constructor(levelConfig, difficulty = 'normal') {
        this.level = levelConfig;
        this.difficulty = difficulty;
        this.difficultyMod = Config.DIFFICULTY[difficulty.toUpperCase()];

        // Load topology
        this.loadTopology();

        // Game state
        this.money = this.calculateStartingMoney();
        this.credits = levelConfig.startingCredits || 0;
        this.coreHealth = this.calculateStartingHealth();
        this.score = 0;
        this.wave = 0;
        this.packetsSpawned = 0;
        this.packetsBlocked = 0;
        this.packetsLeaked = 0;

        // Timing
        this.spawnTimer = 0;
        this.spawnInterval = levelConfig.spawnInterval || 3000;

        // Status
        this.levelComplete = false;
        this.levelFailed = false;
        this.paused = false;
    }

    /**
     * Load network topology
     */
    loadTopology() {
        const topoName = this.level.topology || 'level1';
        const topology = Config.TOPOLOGIES[topoName];

        if (!topology) {
            console.error(`Topology "${topoName}" not found!`);
            return;
        }

        this.nodes = topology.nodes;
        this.edges = topology.edges;
        this.sources = topology.sources;
        this.goals = topology.goals;
        this.chokepoints = topology.chokepoints || [];

        // Calculate paths from each source to each goal
        this.calculatePaths();
    }

    /**
     * Calculate all paths for enemies
     */
    calculatePaths() {
        this.paths = [];

        for (const source of this.sources) {
            for (const goal of this.goals) {
                const path = Pathfinding.findPath(
                    this.nodes,
                    this.edges,
                    source,
                    goal,
                    true // Enable randomization
                );
                if (path.length > 0) {
                    this.paths.push(path);
                }
            }
        }

        console.log(`Calculated ${this.paths.length} paths`);
    }

    /**
     * Get random path for enemy
     */
    getRandomPath() {
        if (this.paths.length === 0) return null;
        return this.paths[Math.floor(Math.random() * this.paths.length)];
    }

    /**
     * Calculate starting money based on difficulty
     */
    calculateStartingMoney() {
        const base = this.level.startingMoney || 500;
        return Math.floor(base * this.difficultyMod.moneyMultiplier);
    }

    /**
     * Calculate starting health based on difficulty
     */
    calculateStartingHealth() {
        const base = this.level.coreHealth || 100;
        return Math.floor(base * this.difficultyMod.healthMultiplier);
    }

    /**
     * Add money/credits
     */
    addMoney(amount) {
        if (this.level.mode === 'ECONOMIC_ENDLESS') {
            this.credits += amount;
        } else {
            this.money += amount;
        }
    }

    /**
     * Spend money/credits
     */
    spendMoney(amount) {
        if (this.level.mode === 'ECONOMIC_ENDLESS') {
            if (this.credits >= amount) {
                this.credits -= amount;
                return true;
            }
        } else {
            if (this.money >= amount) {
                this.money -= amount;
                return true;
            }
        }
        return false;
    }

    /**
     * Get current money/credits
     */
    getMoney() {
        return this.level.mode === 'ECONOMIC_ENDLESS' ? this.credits : this.money;
    }

    /**
     * Take damage to core
     */
    takeDamage(amount) {
        this.coreHealth -= amount;
        if (this.coreHealth <= 0) {
            this.coreHealth = 0;
            this.levelFailed = true;
        }
    }

    /**
     * Enemy destroyed
     */
    enemyDestroyed(enemy) {
        this.packetsBlocked++;
        this.score += enemy.getReward();
        this.addMoney(enemy.getReward());
    }

    /**
     * Enemy reached goal
     */
    enemyReachedGoal(enemy) {
        if (enemy.config.legitimate) {
            // Legitimate traffic should pass - no penalty
            return;
        }

        this.packetsLeaked++;
        this.takeDamage(10);
    }

    /**
     * Check win condition
     */
    checkWinCondition() {
        if (this.levelComplete || this.levelFailed) return;

        const mode = this.level.mode;

        if (mode === 'ENDLESS') {
            // Endless modes check wave count
            if (this.wave >= this.level.waves) {
                this.levelComplete = true;
            }
        } else if (mode === 'NORMAL') {
            // Normal mode checks packet count and success rate
            if (this.packetsSpawned >= this.level.totalPackets) {
                const successRate = this.calculateSuccessRate();
                if (successRate >= this.level.successThreshold) {
                    this.levelComplete = true;
                } else if (this.coreHealth <= 0) {
                    this.levelFailed = true;
                }
            }
        }
    }

    /**
     * Calculate success rate
     */
    calculateSuccessRate() {
        const total = this.packetsBlocked + this.packetsLeaked;
        if (total === 0) return 0;
        return (this.packetsBlocked / total) * 100;
    }

    /**
     * Should spawn enemy now?
     */
    shouldSpawnEnemy(deltaTime) {
        this.spawnTimer += deltaTime;

        if (this.spawnTimer >= this.spawnInterval) {
            this.spawnTimer = 0;

            // Check if we should spawn more
            if (this.level.mode === 'NORMAL' && this.packetsSpawned >= this.level.totalPackets) {
                return false;
            }

            return true;
        }

        return false;
    }

    /**
     * Get random enemy type
     */
    getEnemyType() {
        const types = this.level.enemyTypes;
        const legitimateRatio = this.level.legitimateRatio || 0;

        // Chance for legitimate traffic
        if (legitimateRatio > 0 && Math.random() < legitimateRatio) {
            return 'LEGITIMATE';
        }

        // Filter out legitimate
        const threats = types.filter(t => t !== 'LEGITIMATE');
        return threats[Math.floor(Math.random() * threats.length)];
    }

    /**
     * Increment packet spawned count
     */
    incrementPacketsSpawned() {
        this.packetsSpawned++;
    }

    /**
     * Get defense rating (stars)
     */
    getDefenseRating() {
        // User Request: If they win (survive), they get 3 stars regardless of health/success %
        if (this.coreHealth > 0) return 3;

        const successRate = this.calculateSuccessRate();
        if (successRate >= 85) return 3;
        if (successRate >= 70) return 2;
        if (successRate >= 55) return 1;
        return 0;
    }

    /**
     * Start a new wave (for endless modes)
     * Base implementation - can be overridden by subclasses
     */
    startWave() {
        // Increment wave only if starting first wave (wave === 0)
        // For subsequent waves, onWaveComplete() already incremented it
        if (this.wave === 0) {
            this.wave++;
        }

        // Reset spawn timer for new wave
        this.spawnTimer = 0;

        console.log(`[Wave] Starting wave ${this.wave}, spawnTimer reset to 0`);
    }

    /**
     * Called when a wave completes (for endless modes)
     * Base implementation - can be overridden by subclasses
     */
    onWaveComplete() {
        this.wave++;
        console.log(`[Wave] Wave ${this.wave - 1} complete. Starting wave ${this.wave}`);
    }
}

export default LevelManager;
