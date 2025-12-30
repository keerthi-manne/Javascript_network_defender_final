/**
 * GENIUS_AI.JS - Adaptive AI for Level 2
 * Analyzes player tower strategies and generates counter-attacks
 */

import Config from '../utils/Config.js';
import Graphics from '../utils/Graphics.js';

export class GeniusAI {
    constructor(levelManager) {
        this.levelManager = levelManager;
        this.currentWave = 0;
        this.towerAnalysis = null;
        this.weakPaths = [];
        this.strategyHistory = [];
        this.currentTopology = 'adaptive1';
        this.topologyOptions = ['adaptive1', 'adaptive2', 'adaptive3'];
    }

    /**
     * Analyze player tower placement and composition
     */
    analyzeTowers(towers) {
        if (towers.length === 0) {
            return {
                coverage: {},
                weaknesses: 'No towers placed',
                towerTypes: {},
                totalValue: 0
            };
        }

        const analysis = {
            coverage: {},
            towerTypes: { Firewall: 0, IDS: 0, Honeypot: 0 },
            totalValue: 0,
            positions: []
        };

        // Analyze tower composition
        towers.forEach(tower => {
            analysis.towerTypes[tower.type]++;
            analysis.totalValue += tower.getCost();
            analysis.positions.push({ x: tower.x, y: tower.y, type: tower.type, range: tower.range });
        });

        // Find weak paths (least covered)
        this.weakPaths = this.findWeakPaths(towers);

        // Determine strategy
        const strategy = this.identifyStrategy(analysis.towerTypes);

        this.towerAnalysis = {
            ...analysis,
            strategy,
            weakPaths: this.weakPaths
        };

        return this.towerAnalysis;
    }

    /**
     * Identify player's defensive strategy
     */
    identifyStrategy(towerTypes) {
        const total = towerTypes.Firewall + towerTypes.IDS + towerTypes.Honeypot;
        if (total === 0) return 'NONE';

        const firewallRatio = towerTypes.Firewall / total;
        const idsRatio = towerTypes.IDS / total;

        if (firewallRatio > 0.6) return 'FIREWALL_HEAVY';
        if (idsRatio > 0.6) return 'IDS_HEAVY';
        if (firewallRatio < 0.3 && idsRatio < 0.3) return 'HONEYPOT_FOCUS';
        return 'BALANCED';
    }

    /**
     * Find paths with weakest tower coverage
     */
    findWeakPaths(towers) {
        const paths = this.levelManager.paths;
        const pathScores = [];

        paths.forEach((path, index) => {
            let coverage = 0;

            // Calculate coverage for this path
            path.forEach(nodeIndex => {
                const node = this.levelManager.nodes[nodeIndex];

                // Check how many towers can hit this node
                towers.forEach(tower => {
                    const dist = Graphics.distance(tower.x, tower.y, node.x, node.y);
                    if (dist <= tower.range) {
                        coverage += tower.damage;
                    }
                });
            });

            pathScores.push({ pathIndex: index, coverage, path });
        });

        // Sort by coverage (lowest first = weakest)
        pathScores.sort((a, b) => a.coverage - b.coverage);

        return pathScores.slice(0, 2); // Return 2 weakest paths
    }

    /**
     * Generate counter-strategy based on analysis
     */
    generateCounterStrategy() {
        if (!this.towerAnalysis) return this.getDefaultStrategy();

        const strategy = this.towerAnalysis.strategy;
        const counterStrategy = {
            enemyMix: {},
            preferredPaths: this.weakPaths.map(w => w.pathIndex),
            reasoning: ''
        };

        // Counter based on player strategy
        switch (strategy) {
            case 'FIREWALL_HEAVY':
                // Send fast enemies to overwhelm, stealth to bypass
                counterStrategy.enemyMix = {
                    FAST: 0.4,
                    STEALTH: 0.3,
                    BASIC: 0.2,
                    ADAPTIVE: 0.1
                };
                counterStrategy.reasoning = 'Firewall-heavy defense. Sending FAST and STEALTH to bypass.';
                break;

            case 'IDS_HEAVY':
                // Send tanks and encrypted (high HP to withstand detection)
                counterStrategy.enemyMix = {
                    TANK: 0.3,
                    ENCRYPTED: 0.3,
                    BASIC: 0.3,
                    ADAPTIVE: 0.1
                };
                counterStrategy.reasoning = 'IDS-heavy defense. Sending TANK and ENCRYPTED to absorb damage.';
                break;

            case 'HONEYPOT_FOCUS':
                // Overwhelming numbers
                counterStrategy.enemyMix = {
                    FAST: 0.5,
                    BASIC: 0.4,
                    ADAPTIVE: 0.1
                };
                counterStrategy.reasoning = 'Weak tower coverage. Overwhelming with numbers.';
                break;

            default: // BALANCED or NONE
                counterStrategy.enemyMix = {
                    BASIC: 0.3,
                    FAST: 0.25,
                    TANK: 0.2,
                    STEALTH: 0.15,
                    ADAPTIVE: 0.1
                };
                counterStrategy.reasoning = 'Balanced mix for adaptive pressure.';
        }

        return counterStrategy;
    }

    /**
     * Get default strategy for early waves
     */
    getDefaultStrategy() {
        return {
            enemyMix: {
                BASIC: 0.5,
                FAST: 0.3,
                TANK: 0.2
            },
            preferredPaths: [0, 1],
            reasoning: 'Early game: Basic threat assessment.'
        };
    }

    /**
     * Select next topology to exploit weaknesses
     */
    selectNextTopology(towers) {
        // Analyze tower positions
        const centerX = 600; // Middle of canvas
        const centerY = 350;

        let avgX = 0, avgY = 0;
        towers.forEach(t => {
            avgX += t.x;
            avgY += t.y;
        });

        if (towers.length > 0) {
            avgX /= towers.length;
            avgY /= towers.length;
        }

        // Randomly select next topology (ensuring it's different from current)
        let nextIndex;
        do {
            nextIndex = Math.floor(Math.random() * this.topologyOptions.length);
        } while (this.topologyOptions[nextIndex] === this.currentTopology);

        this.currentTopology = this.topologyOptions[nextIndex];
        return this.currentTopology;
    }

    /**
     * Get enemy type based on counter-strategy
     */
    getEnemyType(counterStrategy) {
        if (!counterStrategy || !counterStrategy.enemyMix) {
            return 'BASIC'; // Fallback if no strategy
        }

        const roll = Math.random();
        let cumulative = 0;

        for (const [type, probability] of Object.entries(counterStrategy.enemyMix)) {
            cumulative += probability;
            if (roll <= cumulative) {
                return type;
            }
        }

        return 'BASIC'; // Fallback
    }

    /**
     * Get preferred path for spawning
     */
    getPreferredPath(counterStrategy) {
        if (!counterStrategy || !counterStrategy.preferredPaths || counterStrategy.preferredPaths.length === 0) {
            return this.levelManager.getRandomPath();
        }

        const pathIndex = counterStrategy.preferredPaths[
            Math.floor(Math.random() * counterStrategy.preferredPaths.length)
        ];
        
        if (this.levelManager.paths && this.levelManager.paths[pathIndex]) {
            return this.levelManager.paths[pathIndex];
        }

        return this.levelManager.getRandomPath();
    }

    /**
     * Update AI learning based on wave results
     */
    updateLearning(waveResult) {
        this.strategyHistory.push({
            wave: this.currentWave,
            analysis: this.towerAnalysis,
            result: waveResult
        });

        // Keep last 5 waves of history
        if (this.strategyHistory.length > 5) {
            this.strategyHistory.shift();
        }

        this.currentWave++;
    }

    /**
     * Should switch topology?
     */
    shouldSwitchTopology() {
        return this.currentWave > 0 && this.currentWave % 2 === 0;
    }
}

export default GeniusAI;
