/**
 * PERFECT_AI.JS - Perfect AI for Level 3 (Stackelberg Equilibrium)
 * Analyzes committed tower defense and generates optimal counter-attack
 */

import Config from '../utils/Config.js';
import Graphics from '../utils/Graphics.js';

export class PerfectAI {
    constructor(levelManager) {
        this.levelManager = levelManager;
        this.analysis = null;
        this.perfectStrategy = null;
    }

    /**
     * Analyze tower coverage across entire network
     */
    analyzeTowerCoverage(towers) {
        const coverage = {};
        const nodes = this.levelManager.nodes;

        // Calculate damage potential at each node
        nodes.forEach((node, index) => {
            let totalDamage = 0;
            let firepower = { Firewall: 0, IDS: 0, Honeypot: 0 };

            towers.forEach(tower => {
                const dist = Graphics.distance(tower.x, tower.y, node.x, node.y);
                if (dist <= tower.range) {
                    totalDamage += tower.damage * (1 / (tower.cooldownMax / 1000)); // DPS
                    firepower[tower.type] += tower.damage;
                }
            });

            coverage[index] = {
                damagePerSecond: totalDamage,
                firepower,
                isCovered: totalDamage > 0
            };
        });

        return coverage;
    }

    /**
     * Find weakest paths through the network
     */
    findWeakestPaths(coverage) {
        const paths = this.levelManager.paths;
        const pathAnalysis = [];

        paths.forEach((path, index) => {
            let totalDamage = 0;
            let minDamage = Infinity;
            let weakestNode = null;

            path.forEach(nodeIndex => {
                const nodeCoverage = coverage[nodeIndex];
                totalDamage += nodeCoverage.damagePerSecond;

                if (nodeCoverage.damagePerSecond < minDamage) {
                    minDamage = nodeCoverage.damagePerSecond;
                    weakestNode = nodeIndex;
                }
            });

            pathAnalysis.push({
                pathIndex: index,
                path,
                totalDamage,
                weakestNode,
                minDamage,
                avgDamagePerNode: totalDamage / path.length
            });
        });

        // Sort by total damage (lowest = best for attackers)
        pathAnalysis.sort((a, b) => a.totalDamage - b.totalDamage);

        return pathAnalysis;
    }

    /**
     * Calculate optimal attack using 7x3 Payoff Matrix logic
     * Rows: BASIC, FAST, TANK, STEALTH, ENCRYPTED, ADAPTIVE, LEGITIMATE
     * Columns: FIREWALL_HEAVY, IDS_HEAVY, BALANCED
     */
    calculateOptimalAttack(coverage, pathAnalysis) {
        // Define the 7x3 Payoff Matrix (Attacker Score)
        // Values represent attacker success probability (0.0 to 1.0)
        const payoffMatrix = {
            'BASIC': { 'FW_HEAVY': 0.2, 'IDS_HEAVY': 0.7, 'BALANCED': 0.4 },
            'FAST': { 'FW_HEAVY': 0.1, 'IDS_HEAVY': 0.8, 'BALANCED': 0.5 },
            'TANK': { 'FW_HEAVY': 0.6, 'IDS_HEAVY': 0.3, 'BALANCED': 0.4 },
            'STEALTH': { 'FW_HEAVY': 0.9, 'IDS_HEAVY': 0.2, 'BALANCED': 0.4 },
            'ENCRYPTED': { 'FW_HEAVY': 0.8, 'IDS_HEAVY': 0.4, 'BALANCED': 0.5 },
            'ADAPTIVE': { 'FW_HEAVY': 0.7, 'IDS_HEAVY': 0.6, 'BALANCED': 0.8 },
            'LEGITIMATE': { 'FW_HEAVY': 1.0, 'IDS_HEAVY': 1.0, 'BALANCED': 1.0 } // Always passes
        };

        const strategy = {};
        const towers = this.levelManager.committedTowers || [];

        // Determine Defender Posture (Column)
        const fCount = towers.filter(t => t.type === 'Firewall').length;
        const iCount = towers.filter(t => t.type === 'IDS').length;
        const posture = fCount > iCount * 1.5 ? 'FW_HEAVY' : (iCount > fCount ? 'IDS_HEAVY' : 'BALANCED');

        console.log(`[Stackelberg] Defender Posture: ${posture}`);

        pathAnalysis.forEach(pathInfo => {
            const pathId = pathInfo.pathIndex;

            // Calculate mixed strategy for this path
            // We want to send enemies that have high payoff against the current posture
            const enemyMix = {};
            const candidates = Object.keys(payoffMatrix).filter(t => t !== 'LEGITIMATE');

            // Calculate weights based on payoff + path weakness
            let totalWeight = 0;
            const weights = {};

            candidates.forEach(type => {
                // Heuristic: Payoff * (1 / PathResistance)
                const payoff = payoffMatrix[type][posture];
                const pathWeakness = 100 / (pathInfo.totalDamage + 1);
                weights[type] = payoff * pathWeakness;
                totalWeight += weights[type];
            });

            // Normalize weights into probabilities
            candidates.forEach(type => {
                enemyMix[type] = weights[type] / totalWeight;
            });

            strategy[pathId] = {
                priority: pathInfo.totalDamage < 20 ? 5 : 2,
                enemyMix,
                spawnRate: Math.max(0.4, 1.2 - (pathInfo.totalDamage / 50))
            };
        });

        this.postureUsed = posture;
        return strategy;
    }

    /**
     * Analyze committed defense and generate perfect counter
     */
    analyzeAndGenerate(towers) {
        // Step 1: Coverage analysis
        const coverage = this.analyzeTowerCoverage(towers);

        // Step 2: Path weakness analysis
        const pathAnalysis = this.findWeakestPaths(coverage);

        // Step 3: Generate optimal attack
        const optimalAttack = this.calculateOptimalAttack(coverage, pathAnalysis);

        // Calculate Stackelberg equilibrium value
        const defenseValue = this.calculateDefenseValue(coverage);
        const attackValue = this.calculateAttackValue(optimalAttack);

        this.analysis = {
            coverage,
            pathAnalysis,
            defenseValue,
            attackValue,
            equilibrium: {
                defenderUtility: defenseValue,
                attackerUtility: attackValue,
                isOptimal: true
            }
        };

        this.perfectStrategy = optimalAttack;

        return {
            strategy: optimalAttack,
            analysis: this.analysis,
            weaknesses: this.summarizeWeaknesses(pathAnalysis)
        };
    }

    /**
     * Calculate defense value (utility)
     */
    calculateDefenseValue(coverage) {
        let total = 0;
        Object.values(coverage).forEach(node => {
            total += node.damagePerSecond;
        });
        return Math.min(100, total);
    }

    /**
     * Calculate attack value (expected success)
     */
    calculateAttackValue(strategy) {
        let total = 0;
        Object.values(strategy).forEach(pathStrat => {
            total += pathStrat.priority * pathStrat.spawnRate;
        });
        return Math.min(100, total * 10);
    }

    /**
     * Summarize weaknesses for player feedback
     */
    summarizeWeaknesses(pathAnalysis) {
        const weaknesses = [];

        pathAnalysis.slice(0, 3).forEach((path, index) => {
            weaknesses.push({
                severity: index === 0 ? 'CRITICAL' : index === 1 ? 'HIGH' : 'MEDIUM',
                description: `Path ${path.pathIndex}: Node ${path.weakestNode} severely under-defended`,
                avgDPS: path.avgDamagePerNode.toFixed(1)
            });
        });

        return weaknesses;
    }

    /**
     * Get enemy type for a specific path using perfect strategy
     */
    getEnemyTypeForPath(pathIndex) {
        if (!this.perfectStrategy || !this.perfectStrategy[pathIndex]) {
            return 'BASIC';
        }

        const strategy = this.perfectStrategy[pathIndex];
        const roll = Math.random();
        let cumulative = 0;

        for (const [type, probability] of Object.entries(strategy.enemyMix)) {
            cumulative += probability;
            if (roll <= cumulative) {
                return type;
            }
        }

        return 'BASIC';
    }
}

export default PerfectAI;
