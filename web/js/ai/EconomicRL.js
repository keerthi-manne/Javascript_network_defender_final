/**
 * ECONOMIC_RL.JS - Q-Learning AI for Level 4
 * Reinforcement Learning agent that learns optimal attack strategies
 */

import eventBus from '../core/EventBus.js';
import Config from '../utils/Config.js';
import Graphics from '../utils/Graphics.js';
import { TopologyGenerator } from '../utils/TopologyGenerator.js';

export class EconomicRL {
    constructor(levelManager) {
        this.levelManager = levelManager;

        // State/Action space (MUST be defined before Q-table initialization)
        this.states = ['LOW_CREDITS', 'MEDIUM_CREDITS', 'HIGH_CREDITS'];
        this.actions = ['AGGRESSIVE', 'BALANCED', 'DEFENSIVE'];

        // Q-Learning parameters from Config
        const params = Config.RL_PARAMS;
        this.epsilon = params.epsilon;
        this.alpha = params.alpha;
        this.gamma = params.gamma;

        // Q-table: Q[state][action] = expected value
        this.Q = this.loadQTable() || this.initializeQTable();

        // Episode tracking
        this.currentState = null;
        this.currentAction = null;
        this.episodeReward = 0;
        this.totalEpisodes = 0;
    }

    /**
     * Initialize Q-table lazily (state keys are dynamic now)
     */
    initializeQTable() {
        return {};
    }

    /**
     * Get 12-dimensional state representation
     * (Discretized into categories: credits, chokepoint density, tower ratio, path success)
     */
    getState() {
        const lm = this.levelManager;

        // 1. Credit state (3 levels)
        const creditState = lm.credits < 500 ? 'LOW' : (lm.credits < 1500 ? 'MED' : 'HIGH');

        // 2. Chokepoint density (2 levels: Sparse vs Dense)
        const densityState = lm.chokepoints.length / lm.nodes.length > 0.2 ? 'DENSE' : 'SPARSE';

        // 3. Tower Ratio (Proxy for defender strategy)
        const towers = this.levelManager.currentTowers || [];
        const fCount = towers.filter(t => t.type === 'Firewall').length;
        const iCount = towers.filter(t => t.type === 'IDS').length;
        const towerRatio = fCount > iCount * 1.5 ? 'FW_HEAVY' : (iCount > fCount ? 'IDS_HEAVY' : 'BALANCED');

        // 4. Path Success (How well is the attacker doing?)
        const successRate = lm.calculateSuccessRate();
        const performanceState = successRate > 70 ? 'DEFENDER_STRONG' : 'ATTACKER_STRONG';

        // Combined "12D" State Key
        return `${creditState}_${densityState}_${towerRatio}_${performanceState}`;
    }

    /**
     * Select action using ε-greedy policy
     */
    selectAction(state) {
        // Exploration vs Exploitation
        if (Math.random() < this.epsilon) {
            // Explore: random action
            return this.actions[Math.floor(Math.random() * this.actions.length)];
        } else {
            // Exploit: best action from Q-table
            return this.getBestAction(state);
        }
    }

    /**
     * Get best action for a state
     */
    getBestAction(state) {
        // Initialize state in Q-table if missing
        if (!this.Q[state]) {
            this.Q[state] = {};
            this.actions.forEach(a => this.Q[state][a] = Math.random() * 2);
        }

        const qValues = this.Q[state];
        let bestAction = this.actions[0];
        let bestValue = qValues[bestAction];

        this.actions.forEach(action => {
            if (qValues[action] > bestValue) {
                bestValue = qValues[action];
                bestAction = action;
            }
        });

        return bestAction;
    }

    /**
     * Get enemy mix based on action
     */
    getEnemyMix(action) {
        switch (action) {
            case 'AGGRESSIVE':
                // High risk, high reward
                return {
                    TANK: 0.4,
                    ENCRYPTED: 0.3,
                    ADAPTIVE: 0.2,
                    FAST: 0.1
                };

            case 'BALANCED':
                // Mixed approach
                return {
                    BASIC: 0.25,
                    FAST: 0.25,
                    TANK: 0.25,
                    STEALTH: 0.15,
                    ENCRYPTED: 0.1
                };

            case 'DEFENSIVE':
                // Cheap, wear down
                return {
                    BASIC: 0.5,
                    FAST: 0.4,
                    STEALTH: 0.1
                };

            default:
                return { BASIC: 1.0 };
        }
    }

    /**
     * Update Q-table based on wave result
     */
    updateQTable(waveResult) {
        if (!this.currentState || !this.currentAction) return;

        // Calculate reward
        const reward = this.calculateReward(waveResult);
        this.episodeReward += reward;

        // Get next state
        const nextState = this.getState();

        // Q-Learning update: Q(s,a) ← Q(s,a) + α[r + γ·max Q(s',a') - Q(s,a)]
        const currentQ = this.Q[this.currentState][this.currentAction];
        const maxNextQ = Math.max(...this.actions.map(a => this.Q[nextState][a]));

        const newQ = currentQ + this.alpha * (
            reward + this.gamma * maxNextQ - currentQ
        );

        this.Q[this.currentState][this.currentAction] = newQ;

        // Save Q-table periodically
        if (Math.random() < 0.1) {
            this.saveQTable();
        }

        // Emit learning update
        eventBus.emit('rlLearningUpdate', {
            state: this.currentState,
            action: this.currentAction,
            reward,
            qValue: newQ,
            episodeReward: this.episodeReward
        });
    }

    /**
     * Calculate reward for this wave
     */
    calculateReward(waveResult) {
        let reward = 0;

        // Reward for enemies reaching goal
        reward += waveResult.leaked * 10;

        // Penalty for enemies destroyed
        reward -= waveResult.blocked * 5;

        // Bonus if player ran out of money
        if (this.levelManager.credits <= 0) {
            reward += 50;
        }

        // Penalty if player has too much money (not challenging enough)
        if (this.levelManager.credits > 2000) {
            reward -= 20;
        }

        return reward;
    }

    /**
     * Start new episode (wave)
     */
    startEpisode() {
        this.currentState = this.getState();
        this.currentAction = this.selectAction(this.currentState);
        this.totalEpisodes++;

        console.log(`RL Episode ${this.totalEpisodes}: State=${this.currentState}, Action=${this.currentAction}`);

        return this.currentAction;
    }

    /**
     * Get enemy type using current strategy
     */
    getEnemyType() {
        if (!this.currentAction) return 'BASIC';

        const mix = this.getEnemyMix(this.currentAction);
        const roll = Math.random();
        let cumulative = 0;

        for (const [type, probability] of Object.entries(mix)) {
            cumulative += probability;
            if (roll <= cumulative) {
                return type;
            }
        }

        return 'BASIC';
    }

    /**
     * Save Q-table to localStorage
     */
    saveQTable() {
        try {
            localStorage.setItem('networkdefender_qtable', JSON.stringify({
                Q: this.Q,
                episodes: this.totalEpisodes,
                epsilon: this.epsilon
            }));
        } catch (e) {
            console.error('Failed to save Q-table:', e);
        }
    }

    /**
     * Load Q-table from localStorage
     */
    loadQTable() {
        try {
            const saved = localStorage.getItem('networkdefender_qtable');
            if (saved) {
                const data = JSON.parse(saved);
                this.totalEpisodes = data.episodes || 0;
                this.epsilon = Math.max(0.1, data.epsilon * 0.995); // Decay epsilon
                return data.Q;
            }
        } catch (e) {
            console.error('Failed to load Q-table:', e);
        }
        return null;
    }

    /**
     * Reset Q-table (for new learning session)
     */
    reset() {
        this.Q = this.initializeQTable();
        this.totalEpisodes = 0;
        this.epsilon = 0.3;
        this.episodeReward = 0;
        localStorage.removeItem('networkdefender_qtable');
    }

    /**
     * Generate dynamic topology based on RL Action and Player Strategy
     */
    generateDynamicTopology(towers) {
        console.log('Generating dynamic topology...');

        // 1. Analyze Player Strategy
        let strategy = 'BALANCED';
        if (towers && towers.length > 0) {
            const counts = { Firewall: 0, IDS: 0, Honeypot: 0 };
            towers.forEach(t => { if (counts[t.type] !== undefined) counts[t.type]++; });

            const total = towers.length;
            if (counts.Firewall / total > 0.5) strategy = 'FIREWALL_HEAVY';
            else if (counts.IDS / total > 0.4) strategy = 'IDS_FOCUSED';
            else if (counts.Honeypot / total > 0.3) strategy = 'HONEYPOT_TRAP';
        }

        console.log(`RL Action: ${this.currentAction}, Player Strategy: ${strategy}`);

        // 2. Determine Topology Type
        let topoType = 'BALANCED';

        if (this.currentAction === 'AGGRESSIVE') {
            topoType = 'DIRECT';
        } else if (this.currentAction === 'DEFENSIVE') {
            if (strategy === 'FIREWALL_HEAVY') {
                topoType = 'SPREAD';
            } else if (strategy === 'IDS_FOCUSED') {
                topoType = 'EVASIVE';
            } else {
                topoType = 'EVASIVE';
            }
        }

        // Use new TopologyGenerator
        return TopologyGenerator.generateRLTopology(topoType, this.currentAction, strategy);
    }

    /**
     * Find cheapest path using Dijkstra
     */
    findCheapestPath(nodes, edges, nodeCosts, startId, endId) {
        const distances = {};
        const previous = {};
        const queue = [];

        nodes.forEach(node => {
            distances[node.id] = Infinity;
            queue.push(node.id);
        });

        distances[startId] = 0;

        while (queue.length > 0) {
            // Pick node with smallest distance
            let u = null;
            let minDist = Infinity;

            queue.forEach(nodeId => {
                if (distances[nodeId] < minDist) {
                    minDist = distances[nodeId];
                    u = nodeId;
                }
            });

            if (u === null || u === endId) break;

            // Remove u from queue
            const index = queue.indexOf(u);
            queue.splice(index, 1);

            // Find neighbors
            const neighbors = [];
            edges.forEach(edge => {
                if (edge[0] === u) neighbors.push(edge[1]);
                if (edge[1] === u) neighbors.push(edge[0]);
            });

            neighbors.forEach(v => {
                if (queue.includes(v)) {
                    const alt = distances[u] + nodeCosts[v];
                    if (alt < distances[v]) {
                        distances[v] = alt;
                        previous[v] = u;
                    }
                }
            });
        }

        // Reconstruct path
        const path = [];
        let curr = endId;
        if (previous[curr] !== undefined || curr === startId) {
            while (curr !== undefined) {
                path.unshift(curr);
                curr = previous[curr];
            }
        }
        return path;
    }

    /**
     * Get Q-table for visualization
     */
    getQTableForDisplay() {
        const display = [];
        this.states.forEach(state => {
            const row = { state };
            this.actions.forEach(action => {
                row[action] = this.Q[state][action].toFixed(2);
            });
            display.push(row);
        });
        return display;
    }
}

export default EconomicRL;
