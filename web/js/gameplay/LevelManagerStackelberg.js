/**
 * LEVEL_MANAGER_STACKELBERG.JS - Level Manager for Level 3
 * Implements 4-phase Stackelberg game with commitment and perfect AI response
 */

import LevelManager from './LevelManager.js';
import PerfectAI from '../ai/PerfectAI.js';
import eventBus from '../core/EventBus.js';
import { TopologyGenerator } from '../utils/TopologyGenerator.js';

export class LevelManagerStackelberg extends LevelManager {
    constructor(levelConfig, difficulty = 'normal') {

        // Generate Dynamic Stackelberg Map
        const dynamicMap = TopologyGenerator.generateStackelbergMap();

        // Merge with config
        const finalConfig = {
            ...levelConfig,
            ...dynamicMap
        };

        super(finalConfig, difficulty);

        // Calculate optimal baseline for this topology
        this.optimalSuccessRate = Math.max(40, 100 - this.paths.length * 8 + this.chokepoints.length * 6);
        this.optimalHealthRetention = Math.max(50, 100 - this.paths.length * 5); // Expected health retention

        // Phase system
        this.phases = levelConfig.phases;
        this.currentPhase = 'commitment';
        this.phaseTimer = 0;
        this.phaseStartTime = 0;

        // AI
        this.perfectAI = new PerfectAI(this);
        this.aiAnalysis = null;

        // Tower lock
        this.towersLocked = false;
        this.committedTowers = [];

        // Battle active flag
        this.battleActive = false;
    }

    /**
     * Override spawn check to only allow spawning during battle phase
     */
    shouldSpawnEnemy(deltaTime) {
        if (this.currentPhase !== 'battle' || !this.battleActive) {
            return false;
        }
        return super.shouldSpawnEnemy(deltaTime);
    }

    /**
     * Update phase timer
     */
    updatePhase(deltaTime) {
        this.phaseTimer += deltaTime;

        const elapsed = Math.floor(this.phaseTimer / 1000);
        const remaining = this.getPhaseDuration() - elapsed;

        // Emit timer update
        eventBus.emit('phaseTimerUpdate', {
            phase: this.currentPhase,
            elapsed,
            remaining,
            total: this.getPhaseDuration()
        });

        // Check phase completion
        if (remaining <= 0) {
            this.advancePhase();
        }
    }

    /**
     * Get current phase duration in seconds
     */
    getPhaseDuration() {
        switch (this.currentPhase) {
            case 'commitment': return this.phases.commitment;
            case 'training': return this.phases.training;
            case 'battle': return this.phases.battle;
            default: return 0;
        }
    }

    /**
     * Advance to next phase
     */
    advancePhase() {
        switch (this.currentPhase) {
            case 'commitment':
                this.startTrainingPhase();
                break;
            case 'training':
                this.startBattlePhase();
                break;
            case 'battle':
                this.startScoringPhase();
                break;
        }
    }

    /**
     * Phase 1: Commitment - Player places towers
     */
    startCommitmentPhase() {
        this.currentPhase = 'commitment';
        this.phaseTimer = 0;
        this.phaseStartTime = Date.now();
        this.towersLocked = false;

        eventBus.emit('phaseChange', {
            phase: 'commitment',
            message: 'Place your towers! You have 30 seconds.',
            canPlaceTowers: true
        });
    }

    /**
     * Phase 2: Training - AI analyzes
     */
    startTrainingPhase() {
        this.currentPhase = 'training';
        this.phaseTimer = 0;

        // Lock towers
        this.towersLocked = true;
        this.committedTowers = [...this.committedTowers]; // Snapshot

        // Run AI analysis
        setTimeout(() => {
            this.aiAnalysis = this.perfectAI.analyzeAndGenerate(this.committedTowers);

            eventBus.emit('aiAnalysisComplete', {
                analysis: this.aiAnalysis,
                weaknesses: this.aiAnalysis.weaknesses
            });
        }, 3000); // Show progress for 3 seconds

        eventBus.emit('phaseChange', {
            phase: 'training',
            message: 'AI analyzing your defense...',
            canPlaceTowers: false
        });
    }

    /**
     * Phase 3: Battle - Perfect counter-attack
     */
    startBattlePhase() {
        this.currentPhase = 'battle';
        this.phaseTimer = 0;

        eventBus.emit('phaseChange', {
            phase: 'battle',
            message: 'Perfect counter-attack incoming!',
            canPlaceTowers: false
        });

        // Start spawning enemies
        this.battleActive = true;
    }

    /**
     * Phase 4: Scoring - Results
     */
    startScoringPhase() {
        this.currentPhase = 'scoring';
        this.battleActive = false;

        // Calculate results
        const score = this.calculateStackelbergScore();

        eventBus.emit('phaseChange', {
            phase: 'scoring',
            message: 'Battle complete. Analyzing results...',
            canPlaceTowers: false
        });

        eventBus.emit('stackelbergComplete', {
            score,
            analysis: this.aiAnalysis,
            survived: this.coreHealth > 0,
            defenseRating: this.getDefenseRating()
        });

        // Show optimal strategy for this topology
        const optimalStrategy = this.generateOptimalStrategyDescription();
        eventBus.emit('aiTip', optimalStrategy);
    }

    /**
     * Calculate Stackelberg game score
     */
    calculateStackelbergScore() {
        const defenseValue = this.aiAnalysis?.analysis.defenseValue || 0;
        const survivability = (this.coreHealth / this.optimalHealthRetention) * 50; // Normalized by topology difficulty
        const successRate = (this.calculateSuccessRate() / this.optimalSuccessRate) * 100; // Normalized by best possible

        return Math.floor(Math.min(100, defenseValue * 0.3 + Math.max(0, survivability) + successRate * 0.5));
    }

    /**
     * Get defense rating (stars)
     */
    getDefenseRating() {
        const score = this.calculateStackelbergScore();

        if (score >= 80) return 3;
        if (score >= 60) return 2;
        if (score >= 40) return 1;
        return 0;
    }

    /**
     * Get enemy type using Perfect AI strategy
     */
    getEnemyType() {
        if (!this.aiAnalysis || !this.battleActive) {
            return 'BASIC';
        }

        // Choose path first
        const pathIndex = this.selectOptimalPath();
        return this.perfectAI.getEnemyTypeForPath(pathIndex);
    }

    /**
     * Select optimal path for spawning
     */
    selectOptimalPath() {
        if (!this.aiAnalysis) return 0;

        const pathScores = this.aiAnalysis.analysis.pathAnalysis;

        // Weighted random selection (prioritize weak paths)
        const totalPriority = pathScores.reduce((sum, p) => sum + (10 - p.totalDamage / 10), 0);
        let roll = Math.random() * totalPriority;

        for (let i = 0; i < pathScores.length; i++) {
            const priority = 10 - pathScores[i].totalDamage / 10;
            roll -= priority;
            if (roll <= 0) {
                return pathScores[i].pathIndex;
            }
        }

        return 0;
    }

    /**
     * Lock towers after commitment phase
     */
    commitTowers(towers) {
        this.committedTowers = towers.map(t => ({ ...t }));
        this.towersLocked = true;
    }
    /**
     * Handle wave completion (Level 3)
     */
    onWaveComplete(towers, waveResult) {
        // Level 3 specific logic if needed
        console.log('Wave complete in Stackelberg mode');

        // Check win condition if wave limit reached (though Level 3 is usually time/phase based)
        if (this.currentPhase === 'battle' && this.battleActive) {
            // Provide feedback or logic update
            eventBus.emit('aiTip', 'Perfect AI is recalculating...');
        }
    }
    /**
     * Analyze cost efficiency of the player's defense
     */
    analyzeCostEfficiency() {
        if (!this.committedTowers || this.committedTowers.length === 0) {
            return {
                rating: 'POOR',
                message: 'No defense placed. Funds unutilized.',
                efficiency: 0
            };
        }

        let totalCost = 0;
        let effectivenessScore = 0;

        // Analyze each tower
        this.committedTowers.forEach(tower => {
            const towerConfig = tower.config; // Assuming config is accessible via tower instance or lookup
            totalCost += towerConfig.cost;

            // Check positioning efficiently
            const nodeIndex = this.nodes.findIndex(n => n.x === tower.x && n.y === tower.y);
            const isChokepoint = this.chokepoints.includes(nodeIndex);

            // Heuristic for value
            let value = 0;

            if (tower.type === 'Firewall') {
                // High damage, good on chokepoints
                value = isChokepoint ? 1.5 : 0.8;
            } else if (tower.type === 'IDS') {
                // Support, good coverage needed but cheap
                value = isChokepoint ? 1.2 : 0.9;
            } else if (tower.type === 'Honeypot') {
                // Distraction, good near core or split paths
                value = 1.0;
            }

            effectivenessScore += (towerConfig.cost * value);
        });

        const efficiencyRatio = effectivenessScore / totalCost;
        let efficiencyRating = 'POOR';
        let feedbackMsg = '';

        if (efficiencyRatio > 1.2) {
            efficiencyRating = 'EXCELLENT';
            feedbackMsg = 'Great value! Strategic placement maximized your budget.';
        } else if (efficiencyRatio > 1.0) {
            efficiencyRating = 'GOOD';
            feedbackMsg = 'Solid defense, but some placements could be more optimal.';
        } else {
            efficiencyRating = 'FAIR';
            feedbackMsg = 'Consider using cheaper towers on non-critical nodes or prioritizing chokepoints.';
        }

        return {
            rating: efficiencyRating,
            message: feedbackMsg,
            efficiency: efficiencyRatio,
            totalSpent: totalCost
        };
    }

    /**
     * Calculate optimal placement using graph theory (minimax)
     * Finds the weakest path and recommends specific nodes to reinforce
     */
    calculateOptimalPlacement() {
        // Find all simple paths from source to goal
        const paths = this.findAllPaths(0, this.goals[0]);

        if (paths.length === 0) return { message: "No clear path analysis available." };

        // Calculate current resistance for each path
        const pathAnalysis = paths.map((path, index) => {
            let resistance = 0;
            let defenseValue = 0;
            let nodes = [];

            path.forEach(nodeId => {
                nodes.push(nodeId);
                // Base resistance (distance)
                resistance += 1;

                // Defense resistance
                const tower = this.towers.find(t => {
                    const node = this.nodes[nodeId];
                    return node && t.x === node.x && t.y === node.y;
                });

                if (tower) {
                    defenseValue += tower.config.damage * 10; // Simple heuristic
                    resistance += 5; // Towers add virtual distance/cost to attacker
                }
            });

            return { index, nodes, resistance, defenseValue };
        });

        // Find Weakest Path (lowest resistance + defense)
        pathAnalysis.sort((a, b) => (a.resistance + a.defenseValue) - (b.resistance + b.defenseValue));
        const weakest = pathAnalysis[0];
        const strongest = pathAnalysis[pathAnalysis.length - 1];

        // Recommendation Logic
        let recommendation = "";

        if (strongest.defenseValue - weakest.defenseValue > 50) {
            // Imbalance detected
            const targetNode = weakest.nodes.find(nid =>
                this.chokepoints.includes(nid) && !this.isNodeOccupied(nid)
            ) || weakest.nodes[Math.floor(weakest.nodes.length / 2)];

            recommendation = `The AI exploited the weakest path (Resistance: ${weakest.resistance}). Optimal strategy: Place a Firewall at Node ${targetNode} to equalize defense.`;
        } else if (weakest.defenseValue === 0) {
            const targetNode = weakest.nodes.find(nid => this.chokepoints.includes(nid)) || weakest.nodes[2];
            recommendation = `You left a path completely open! The AI will always choose the path of least resistance. Reinforce Node ${targetNode}.`;
        } else {
            recommendation = "Defenses are well-balanced. Ensure you have enough raw damage output (DPS) to stop the wave.";
        }

        return {
            weakestPath: weakest.nodes,
            recommendation: recommendation
        };
    }

    // Helper: DFS for pathfinding
    findAllPaths(start, end, path = [], visited = new Set()) {
        path.push(start);
        visited.add(start);

        if (start === end) {
            return [path]; // Found one path
        }

        let allPaths = [];
        const neighbors = [];

        this.edges.forEach(edge => {
            if (edge[0] === start) neighbors.push(edge[1]);
            else if (edge[1] === start) neighbors.push(edge[0]);
        });

        for (const neighbor of neighbors) {
            if (!visited.has(neighbor)) {
                // Clone visited for branching
                const newVisited = new Set(visited);
                const newPaths = this.findAllPaths(neighbor, end, [...path], newVisited);
                allPaths = allPaths.concat(newPaths);
            }
        }

        return allPaths;
    }

    isNodeOccupied(nodeId) {
        const node = this.nodes[nodeId];
        return this.towers.some(t => t.x === node.x && t.y === node.y);
    }

    /**
     * Generate description of optimal strategy for this topology
     */
    generateOptimalStrategyDescription() {
        const numPaths = this.paths.length;
        const numChokepoints = this.chokepoints.length;
        const hasMultiplePaths = numPaths > 3;

        let strategy = "Optimal Defense Strategy for this topology:\n\n";

        // Specific tower placements
        if (numChokepoints > 0) {
            strategy += "• Recommended Mix: 2 Firewalls, 1 IDS, 1 Honeypot (Total: 880 credits)\n";
            strategy += "  (This balanced setup is more cost-effective than 3 Firewalls)\n\n";
            strategy += "• Place Firewalls at key chokepoints: " + this.chokepoints.slice(0, 2).join(', ') + "\n";
            strategy += "  (Secure the most critical bottlenecks first)\n\n";
        } else {
            strategy += "• Place Firewalls at central nodes: " + Math.floor(this.nodes.length / 2) + ", " + (Math.floor(this.nodes.length / 2) + 1) + "\n";
        }

        strategy += "• Place IDS towers at nodes: " + (this.sources[0] + 1) + ", " + (this.goals[0] - 1) + "\n";
        strategy += "  (Early detection and slowing of STEALTH/ENCRYPTED threats)\n\n";

        strategy += "• Place Honeypots at nodes: " + (this.sources[0] + 2) + ", " + (this.goals[0] - 2) + "\n";
        strategy += "  (Distract enemies and create decoys near entry/exit points)\n\n";

        strategy += "Reasoning: " + (hasMultiplePaths ?
            "This " + numPaths + "-path topology requires a mixed approach. A pure Firewall strategy is expensive and lacks utility vs variety." :
            "This " + numPaths + "-path layout allows focused defense at key junctions.");

        return strategy;
    }
}

export default LevelManagerStackelberg;
