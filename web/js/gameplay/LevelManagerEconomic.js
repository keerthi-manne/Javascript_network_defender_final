/**
 * LEVEL_MANAGER_ECONOMIC.JS - Level Manager for Level 4
 * Economic endless mode with RL AI and maintenance costs
 */

import LevelManager from './LevelManager.js';
import EconomicRL from '../ai/EconomicRL.js';
import Config from '../utils/Config.js';
import eventBus from '../core/EventBus.js';

export class LevelManagerEconomic extends LevelManager {
    constructor(levelConfig, difficulty = 'normal') {
        super(levelConfig, difficulty);

        // Economic system
        this.credits = levelConfig.startingCredits || 1500;
        this.maintenanceInterval = levelConfig.maintenanceInterval || 10;
        this.maintenanceFee = 0;

        // RL AI
        this.economicRL = new EconomicRL(this);
        this.currentStrategy = null;

        // Topology rotation
        this.topologyVariants = ['level1', 'adaptive1', 'adaptive2', 'adaptive3'];
        this.topologySwitchInterval = levelConfig.topologySwitchInterval || 10;
        this.wavesSinceSwitch = 0;

        // Target
        this.targetWaves = levelConfig.targetWaves || 50;
    }

    /**
     * Override money to use credits
     */
    getMoney() {
        return this.credits;
    }

    /**
     * Add credits
     */
    addMoney(amount) {
        this.credits += amount;
        console.log(`+$${amount} credits (Total: $${this.credits})`);
    }

    /**
     * Spend credits
     */
    spendMoney(amount) {
        this.credits = Math.max(0, this.credits - amount);
        console.log(`-$${amount} credits (Remaining: $${this.credits})`);
    }

    /**
     * Start new wave with RL episode
     */
    startWave() {
        this.wave++;
        this.wavesSinceSwitch++;

        // Start RL episode
        this.currentStrategy = this.economicRL.startEpisode(this.credits);

        // Check topology rotation
        if (this.wavesSinceSwitch >= this.topologySwitchInterval) {
            this.rotateTopology();
        }

        // Check maintenance
        if (this.wave % this.maintenanceInterval === 0) {
            this.applyMaintenance();
        }

        eventBus.emit('waveStart', {
            wave: this.wave,
            strategy: this.currentStrategy,
            credits: this.credits
        });
    }

    /**
     * Complete wave and update RL
     */
    completeWave(towers) {
        const waveResult = {
            blocked: this.packetsBlocked,
            leaked: this.packetsLeaked,
            credits: this.credits
        };

        // Update Q-learning
        this.economicRL.updateQTable(waveResult);

        // Check win condition
        if (this.wave >= this.targetWaves) {
            this.levelComplete = true;
        }

        // Check failure
        if (this.credits <= 0 && towers.length === 0) {
            this.levelFailed = true;
        }
    }

    /**
     * Alias for PlayingState compatibility
     */
    onWaveComplete(towers, waveResult) {
        this.completeWave(towers);
    }

    /**
     * Rotate to new topology
     */
    rotateTopology(towers) {
        let topologyData = null;
        let topologyName = '';

        // Try dynamic generation first
        if (this.economicRL && this.economicRL.generateDynamicTopology && towers) {
            const generated = this.economicRL.generateDynamicTopology(towers);
            if (typeof generated === 'object') {
                topologyData = generated;
                topologyName = generated.name;
            } else {
                topologyName = generated; // Fallback string
            }
        }

        // Fallback to random variant if dynamic failed or returned string
        if (!topologyData) {
            if (!topologyName) {
                let nextIndex;
                do {
                    nextIndex = Math.floor(Math.random() * this.topologyVariants.length);
                } while (this.topologyVariants[nextIndex] === this.level.topology);
                topologyName = this.topologyVariants[nextIndex];
            }
            topologyData = Config.TOPOLOGIES[topologyName];
        }

        if (!topologyData) return;

        // Update topology
        this.nodes = topologyData.nodes;
        this.edges = topologyData.edges;
        this.sources = topologyData.sources;
        this.goals = topologyData.goals;
        this.chokepoints = topologyData.chokepoints;
        this.level.topology = topologyName;

        // Recalculate paths
        this.calculatePaths();
        this.wavesSinceSwitch = 0;

        eventBus.emit('economicTopologyRotation', {
            topology: topologyName,
            wave: this.wave
        });

        console.log(`Topology rotated to: ${topologyName}`);
    }

    /**
     * Apply maintenance costs
     */
    applyMaintenance(towers) {
        let totalMaintenance = 0;

        if (towers && towers.length > 0) {
            towers.forEach(tower => {
                totalMaintenance += tower.getMaintenanceCost();
            });
        }

        this.maintenanceFee = Math.floor(totalMaintenance * 0.3); // 30% of tower costs

        if (this.credits >= this.maintenanceFee) {
            this.spendMoney(this.maintenanceFee);
            eventBus.emit('maintenancePaid', {
                amount: this.maintenanceFee,
                remaining: this.credits
            });
        } else {
            // Can't afford - penalty
            const deficit = this.maintenanceFee - this.credits;
            this.spendMoney(this.credits); // Spend all

            eventBus.emit('maintenanceDeficit', {
                deficit,
                penalty: 'Critical budget shortage!'
            });

            // Lose a tower if can't pay
            if (towers && towers.length > 0) {
                const lostTower = towers[Math.floor(Math.random() * towers.length)];
                eventBus.emit('towerLostToMaintenance', { tower: lostTower });
            }
        }

        return this.maintenanceFee;
    }

    /**
     * Get enemy type using RL
     */
    getEnemyType() {
        // Check for legitimate traffic
        const legitimateRatio = this.level.legitimateRatio || 0;
        if (legitimateRatio > 0 && Math.random() < legitimateRatio) {
            return 'LEGITIMATE';
        }

        // Use RL agent
        if (this.economicRL && this.currentStrategy) {
            return this.economicRL.getEnemyType();
        }

        // Fallback
        const types = this.level.enemyTypes.filter(t => t !== 'LEGITIMATE');
        return types[Math.floor(Math.random() * types.length)];
    }

    /**
     * Calculate economic efficiency
     */
    calculateEfficiency() {
        const targetEfficiency = this.level.economicEfficiencyTarget || 75;
        const currentEfficiency = (this.credits / (this.wave * 50)) * 100;

        return {
            current: Math.min(100, currentEfficiency),
            target: targetEfficiency,
            rating: currentEfficiency >= targetEfficiency ? 'EXCELLENT' :
                currentEfficiency >= targetEfficiency * 0.8 ? 'GOOD' : 'POOR'
        };
    }
}

export default LevelManagerEconomic;
