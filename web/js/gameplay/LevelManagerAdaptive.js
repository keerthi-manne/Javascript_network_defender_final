/**
 * LEVEL_MANAGER_ADAPTIVE.JS - Extended Level Manager for Level 2+
 * Adds topology switching and AI integration
 */

import LevelManager from './LevelManager.js';
import GeniusAI from '../ai/GeniusAI.js';
import Config from '../utils/Config.js';
import eventBus from '../core/EventBus.js';

export class LevelManagerAdaptive extends LevelManager {
    constructor(levelConfig, difficulty = 'normal') {
        super(levelConfig, difficulty);

        // AI system
        this.geniusAI = levelConfig.aiType === 'GENIUS' ? new GeniusAI(this) : null;
        if (this.geniusAI) {
            this.geniusAI.currentTopology = this.level.topology;
        }
        this.currentStrategy = null;

        // Maintenance
        this.maintenanceDue = 0;
        this.hasMaintenancede = levelConfig.maintenance || false;

        // Wave tracking for topology switching
        this.wavesSinceSwitch = 0;
        this.topologySwitchInterval = levelConfig.topologySwitchInterval || 2;
    }

    /**
     * Switch to a new topology (for adaptive levels)
     */
    switchTopology(newTopologyName, towers) {
        const topology = Config.TOPOLOGIES[newTopologyName];
        if (!topology) {
            console.error(`Topology ${newTopologyName} not found`);
            return false;
        }

        // Store old topology for smooth transition
        const oldTopology = this.level.topology;

        // Update topology
        this.nodes = topology.nodes;
        this.edges = topology.edges;
        this.sources = topology.sources;
        this.goals = topology.goals;
        this.chokepoints = topology.chokepoints;
        this.level.topology = newTopologyName;

        // Recalculate paths
        this.calculatePaths();

        // Reset wave counter
        this.wavesSinceSwitch = 0;

        // Notify player
        eventBus.emit('topologySwitch', {
            from: oldTopology,
            to: newTopologyName,
            reasoning: this.geniusAI?.towerAnalysis?.strategy || 'Adaptive change'
        });

        console.log(`Topology switched: ${oldTopology} → ${newTopologyName}`);
        return true;
    }

    /**
     * Start new wave (for endless mode)
     * Increments wave if it's the first wave (wave === 0), otherwise wave was already incremented in onWaveComplete()
     */
    startWave() {
        // Increment wave only if starting first wave (wave === 0)
        // For subsequent waves, onWaveComplete() already incremented it
        if (this.wave === 0) {
            this.wave++;
        }
        
        // Don't increment wavesSinceSwitch here - it's already incremented in onWaveComplete()
        // this.wavesSinceSwitch++; // REMOVED - already incremented in onWaveComplete()

        // Reset spawn timer for new wave
        this.spawnTimer = 0;
        
        console.log(`[Wave] Starting wave ${this.wave}, spawnTimer reset to 0`);

        // AI analysis at start of wave (analyze current tower setup)
        // This allows AI to adapt during the wave, not just after
        if (this.geniusAI) {
            // Analyze towers if available
            if (this.currentTowers && this.currentTowers.length > 0) {
                this.geniusAI.analyzeTowers(this.currentTowers);
                this.currentStrategy = this.geniusAI.generateCounterStrategy();
                
                console.log(`[AI] Wave ${this.wave} Strategy:`, this.currentStrategy.reasoning);
                console.log(`[AI] Enemy Mix:`, this.currentStrategy.enemyMix);
                
                // Emit AI strategy update
                eventBus.emit('aiStrategyUpdate', {
                    strategy: this.currentStrategy,
                    analysis: this.geniusAI.towerAnalysis
                });
            } else {
                // No towers yet, use default strategy
                this.currentStrategy = this.geniusAI.getDefaultStrategy();
                console.log(`[AI] Wave ${this.wave} - No towers yet, using default strategy`);
            }
        }

        // Emit wave start event
        eventBus.emit('waveStart', {
            wave: this.wave,
            strategy: this.currentStrategy,
            topology: this.level.topology
        });

        console.log(`Wave ${this.wave} starting - Spawn timer reset`);
    }

    /**
     * Update for wave (with AI analysis)
     */
    onWaveComplete(towers, waveResult) {
        this.wave++;
        this.wavesSinceSwitch++;

        // AI analysis
        if (this.geniusAI) {
            this.geniusAI.analyzeTowers(towers);
            this.currentStrategy = this.geniusAI.generateCounterStrategy();

            // Check topology switch
            if (this.geniusAI.shouldSwitchTopology() && this.wavesSinceSwitch >= this.topologySwitchInterval) {
                const nextTopology = this.geniusAI.selectNextTopology(towers);
                this.switchTopology(nextTopology, towers);
            }

            // Update learning
            this.geniusAI.updateLearning(waveResult);

            // Emit AI update for HUD
            eventBus.emit('aiStrategyUpdate', {
                strategy: this.currentStrategy,
                analysis: this.geniusAI.towerAnalysis
            });
        }

        // Calculate maintenance
        if (this.hasMaintenancede && this.wave % this.topologySwitchInterval === 0) {
            this.calculateMaintenance(towers);
        }
    }

    /**
     * Calculate and deduct maintenance costs
     */
    calculateMaintenance(towers) {
        let totalMaintenance = 0;
        towers.forEach(tower => {
            totalMaintenance += tower.getMaintenanceCost();
        });

        this.maintenanceDue = totalMaintenance;

        if (this.getMoney() >= totalMaintenance) {
            this.spendMoney(totalMaintenance);
            eventBus.emit('maintenancePaid', {
                amount: totalMaintenance,
                remaining: this.getMoney()
            });
        } else {
            // Can't afford maintenance - penalty
            const deficit = totalMaintenance - this.getMoney();
            this.spendMoney(this.getMoney()); // Spend all remaining

            eventBus.emit('maintenanceDeficit', {
                deficit,
                penalty: 'Resource shortage warning'
            });
        }

        return totalMaintenance;
    }

    /**
     * Get enemy type using AI strategy
     */
    getEnemyType() {
        // Check for legitimate traffic first
        const legitimateRatio = this.level.legitimateRatio || 0;
        if (legitimateRatio > 0 && Math.random() < legitimateRatio) {
            return 'LEGITIMATE';
        }

        // Use AI strategy if available
        if (this.geniusAI && this.currentStrategy && this.currentStrategy.enemyMix) {
            const enemyType = this.geniusAI.getEnemyType(this.currentStrategy);
            return enemyType;
        }

        // Fallback to random from available types
        const types = this.level.enemyTypes.filter(t => t !== 'LEGITIMATE');
        return types[Math.floor(Math.random() * types.length)];
    }

    /**
     * Get spawn path using AI strategy
     */
    getRandomPath() {
        if (this.geniusAI && this.currentStrategy && this.currentStrategy.preferredPaths) {
            const path = this.geniusAI.getPreferredPath(this.currentStrategy);
            if (path) {
                return path;
            }
        }

        return super.getRandomPath();
    }

    /**
     * Update towers reference for AI analysis
     */
    updateTowers(towers) {
        this.currentTowers = towers;
        
        // If AI is active and we have towers, analyze them
        if (this.geniusAI && towers && towers.length > 0) {
            this.geniusAI.analyzeTowers(towers);
            this.currentStrategy = this.geniusAI.generateCounterStrategy();
        }
    }
}

export default LevelManagerAdaptive;
