/**
 * PLAYING_STATE.JS - Main Gameplay State
 * Complete integration for all 4 levels with AI systems
 */

import LevelManager from '../gameplay/LevelManager.js';
import LevelManagerAdaptive from '../gameplay/LevelManagerAdaptive.js';
import LevelManagerStackelberg from '../gameplay/LevelManagerStackelberg.js';
import LevelManagerEconomic from '../gameplay/LevelManagerEconomic.js';
import AIAdvisor from '../gameplay/AIAdvisor.js';
import Tower from '../entities/Tower.js';
import Enemy from '../entities/Enemy.js';
import Graphics from '../utils/Graphics.js';
import Config from '../utils/Config.js';
import eventBus from '../core/EventBus.js';

export class PlayingState {
    constructor() {
        this.levelManager = null;
        this.settings = null;
        this.towers = [];
        this.enemies = [];
        this.selectedTowerType = null;
        this.hoveredNode = null;
        this.paused = false;
        this.aiAdvisor = new AIAdvisor();
        this.currentTip = null;
        this.towersLocked = false;

        // Bind event listeners
        this.onCanvasClick = this.handleCanvasClick.bind(this);
        this.onCanvasMouseMove = this.handleCanvasMouseMove.bind(this);
        this.onKeyDown = this.handleKeyDown.bind(this);
        this.onTogglePause = this.handleTogglePause.bind(this);
    }

    enter(data) {
        console.log('Entering Playing State', data);

        // Initialize level with appropriate manager based on aiType
        switch (data.level.aiType) {
            case 'GENIUS':
                // Level 2: Adaptive AI
                this.levelManager = new LevelManagerAdaptive(
                    data.level,
                    data.settings.gameplay.difficulty
                );
                console.log('Level 2: Genius AI enabled');
                break;

            case 'PERFECT':
                // Level 3: Stackelberg equilibrium
                this.levelManager = new LevelManagerStackelberg(
                    data.level,
                    data.settings.gameplay.difficulty
                );
                console.log('Level 3: Perfect AI enabled');
                // Start commitment phase
                if (this.levelManager.startCommitmentPhase) {
                    this.levelManager.startCommitmentPhase();
                }
                break;

            case 'ECONOMIC_RL':
                // Level 4: Economic RL
                this.levelManager = new LevelManagerEconomic(
                    data.level,
                    data.settings.gameplay.difficulty
                );
                console.log('Level 4: Economic RL enabled');
                break;

            default:
                // Level 1: Standard
                this.levelManager = new LevelManager(
                    data.level,
                    data.settings.gameplay.difficulty
                );
                break;
        }

        this.settings = data.settings;
        this.towers = [];
        this.enemies = [];
        this.selectedTowerType = null;
        this.paused = false;
        this.towersLocked = false;

        // Setup event listeners
        eventBus.on('canvasClick', this.onCanvasClick);
        eventBus.on('canvasMouseMove', this.onCanvasMouseMove);
        eventBus.on('keyDown', this.onKeyDown);
        eventBus.on('togglePause', this.onTogglePause);
        eventBus.on('aiTip', (tip) => this.showAITip(tip));

        // Level 2 events
        if (data.level.aiType === 'GENIUS') {
            eventBus.on('topologySwitch', (d) => this.handleTopologySwitch(d));
            eventBus.on('aiStrategyUpdate', (d) => this.handleAIStrategyUpdate(d));
        }

        // Level 3 events
        if (data.level.aiType === 'PERFECT') {
            eventBus.on('phaseChange', (d) => this.handlePhaseChange(d));
            eventBus.on('phaseTimerUpdate', (d) => this.handlePhaseTimer(d));
            eventBus.on('stackelbergComplete', (d) => this.handleStackelbergComplete(d));
        }

        // Level 4 events
        if (data.level.aiType === 'ECONOMIC_RL') {
            eventBus.on('economicTopologyRotation', (d) => this.handleEconomicRotation(d));
            eventBus.on('rlLearningUpdate', (d) => this.handleRLUpdate(d));
        }

        // Update HUD
        this.updateHUD();
        this.updateTowerMenu();

        console.log(`Level ${data.level.id} loaded: ${data.level.name}`);
    }

    exit() {
        console.log('Exiting Playing State');

        // Remove event listeners
        eventBus.off('canvasClick', this.onCanvasClick);
        eventBus.off('canvasMouseMove', this.onCanvasMouseMove);
        eventBus.off('keyDown', this.onKeyDown);
        eventBus.off('togglePause', this.onTogglePause);
        eventBus.off('aiTip');
        eventBus.off('topologySwitch');
        eventBus.off('aiStrategyUpdate');
        eventBus.off('phaseChange');
        eventBus.off('phaseTimerUpdate');
        eventBus.off('stackelbergComplete');
        eventBus.off('economicTopologyRotation');
        eventBus.off('rlLearningUpdate');
    }

    update(deltaTime) {
        if (this.paused) return;

        // Update phase timer for Level 3
        if (this.levelManager.updatePhase) {
            this.levelManager.updatePhase(deltaTime);
        }

        // Spawn enemies
        if (this.levelManager.shouldSpawnEnemy(deltaTime)) {
            this.spawnEnemy();
        }

        // Update towers
        this.towers.forEach(tower => {
            tower.update(deltaTime, this.enemies);
        });

        // Update enemies
        this.enemies = this.enemies.filter(enemy => {
            enemy.update(deltaTime);

            if (!enemy.isAlive()) {
                if (enemy.reachedGoal) {
                    this.levelManager.enemyReachedGoal(enemy);
                } else {
                    this.levelManager.enemyDestroyed(enemy);
                }
                return false;
            }

            return true;
        });

        // Update AI Advisor
        this.aiAdvisor.update({ levelManager: this.levelManager, towers: this.towers, enemies: this.enemies });

        // Check win/loss conditions
        this.levelManager.checkWinCondition();

        if (this.levelManager.levelComplete) {
            this.handleLevelComplete();
        } else if (this.levelManager.levelFailed) {
            this.handleLevelFailed();
        }

        // Update HUD periodically
        if (Math.random() < 0.1) {
            this.updateHUD();
        }
    }

    render(ctx) {
        // Draw network topology
        this.renderNetwork(ctx);

        // Draw towers
        this.towers.forEach(tower => tower.render(ctx));

        // Draw enemies
        this.enemies.forEach(enemy => enemy.render(ctx));

        // Draw placement preview
        if (this.selectedTowerType && this.hoveredNode !== null && !this.towersLocked) {
            this.renderPlacementPreview(ctx);
        }

        // Draw pause overlay
        if (this.paused) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        }
    }

    /**
     * Render network topology
     */
    renderNetwork(ctx) {
        const nodes = this.levelManager.nodes;
        const edges = this.levelManager.edges;
        const sources = this.levelManager.sources;
        const goals = this.levelManager.goals;
        const chokepoints = this.levelManager.chokepoints;

        // Draw edges
        edges.forEach(([from, to]) => {
            Graphics.drawLine(
                ctx,
                nodes[from].x, nodes[from].y,
                nodes[to].x, nodes[to].y,
                Config.COLORS.EDGE,
                Config.GRAPHICS.EDGE_WIDTH
            );
        });

        // Draw nodes
        nodes.forEach((node, index) => {
            let color = Config.COLORS.NODE_NORMAL;
            let radius = Config.GRAPHICS.NODE_RADIUS;

            if (sources.includes(index)) {
                color = Config.COLORS.NODE_SOURCE;
                radius = Config.GRAPHICS.NODE_SOURCE_RADIUS;
            } else if (goals.includes(index)) {
                color = Config.COLORS.NODE_GOAL;
                radius = Config.GRAPHICS.NODE_GOAL_RADIUS;
            } else if (chokepoints.includes(index)) {
                color = Config.COLORS.NODE_CHOKEPOINT;
                radius = Config.GRAPHICS.NODE_CHOKEPOINT_RADIUS;
            }

            // Highlight hovered node
            if (index === this.hoveredNode) {
                Graphics.drawGlowCircle(ctx, node.x, node.y, radius + 5, color, 10);
            }

            Graphics.drawCircle(ctx, node.x, node.y, radius, color);

            // Draw node number
            ctx.fillStyle = '#ffffff';
            ctx.font = '12px Inter';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(index.toString(), node.x, node.y);
        });
    }

    /**
     * Render tower placement preview
     */
    renderPlacementPreview(ctx) {
        if (this.hoveredNode === null) return;

        const node = this.levelManager.nodes[this.hoveredNode];
        const config = Config.TOWERS[this.selectedTowerType];

        // Check if can place here
        const canPlace = this.canPlaceTower(this.hoveredNode);

        // Draw range circle
        ctx.save();
        ctx.globalAlpha = 0.2;
        Graphics.drawCircle(ctx, node.x, node.y, config.range,
            canPlace ? config.color : '#ff0000');
        ctx.restore();

        // Draw tower preview
        Graphics.drawGlowCircle(ctx, node.x, node.y, 15,
            canPlace ? config.color : '#ff0000', 5);
    }

    /**
     * Spawn a new enemy
     */
    spawnEnemy() {
        const path = this.levelManager.getRandomPath();
        if (!path) return;

        const enemyType = this.levelManager.getEnemyType();
        const enemy = new Enemy(enemyType, path, this.levelManager.nodes);

        // Apply difficulty modifiers
        enemy.speed *= this.levelManager.difficultyMod.enemySpeedMultiplier;
        enemy.health *= this.levelManager.difficultyMod.enemyHealthMultiplier;
        enemy.maxHealth = enemy.health;

        this.enemies.push(enemy);
        this.levelManager.incrementPacketsSpawned();
    }

    /**
     * Handle canvas click
     */
    handleCanvasClick(data) {
        const { x, y } = data;

        // Check if clicked on tower menu
        if (x > window.innerWidth - 260) {
            return;
        }

        // Check if towers are locked (Level 3)
        if (this.towersLocked) {
            console.log('Towers locked - cannot place/remove');
            return;
        }

        // Try to place tower
        const nodeIndex = this.getNodeAtPosition(x, y);
        if (nodeIndex !== null) {
            if (this.selectedTowerType) {
                this.placeTower(nodeIndex);
            }
        }
    }

    /**
     * Handle mouse move
     */
    handleCanvasMouseMove(data) {
        const { x, y } = data;
        this.hoveredNode = this.getNodeAtPosition(x, y);
    }

    /**
     * Handle key press
     */
    handleKeyDown(data) {
        const { code } = data;

        // Tower hotkeys
        const towerHotkeys = {
            'KeyQ': 'Firewall',
            'KeyW': 'IDS',
            'KeyE': 'Honeypot'
        };

        if (towerHotkeys[code]) {
            this.selectedTowerType = towerHotkeys[code];
            this.updateTowerMenu();
        }

        // Pause
        if (code === 'Space') {
            this.handleTogglePause();
        }
    }

    /**
     * Handle pause toggle
     */
    handleTogglePause() {
        this.paused = !this.paused;

        // Show/hide dialog
        const dialog = document.getElementById('dialog-overlay');
        if (this.paused) {
            document.getElementById('dialog-title').textContent = 'Paused';
            document.getElementById('dialog-message').textContent = 'Game paused';
            dialog?.classList.remove('hidden');
        } else {
            dialog?.classList.add('hidden');
        }
    }

    /**
     * Get node at mouse position
     */
    getNodeAtPosition(x, y) {
        const nodes = this.levelManager.nodes;
        const radius = Config.GRAPHICS.NODE_RADIUS + 10;

        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            if (Graphics.pointInCircle(x, y, node.x, node.y, radius)) {
                return i;
            }
        }

        return null;
    }

    /**
     * Can place tower at node?
     */
    canPlaceTower(nodeIndex) {
        // Check if towers locked (Level 3)
        if (this.towersLocked) {
            return false;
        }

        // Check if chokepoint
        if (!this.levelManager.chokepoints.includes(nodeIndex)) {
            return false;
        }

        // Check if already occupied
        for (const tower of this.towers) {
            const node = this.levelManager.nodes[nodeIndex];
            if (tower.x === node.x && tower.y === node.y) {
                return false;
            }
        }

        // Check if have money
        const cost = Config.TOWERS[this.selectedTowerType].cost;
        if (this.levelManager.getMoney() < cost) {
            return false;
        }

        return true;
    }

    /**
     * Place tower at node
     */
    placeTower(nodeIndex) {
        if (!this.canPlaceTower(nodeIndex)) {
            console.log('Cannot place tower here');
            return;
        }

        const node = this.levelManager.nodes[nodeIndex];
        const cost = Config.TOWERS[this.selectedTowerType].cost;

        // Create tower
        const tower = new Tower(node.x, node.y, this.selectedTowerType);
        this.towers.push(tower);

        // Spend money
        this.levelManager.spendMoney(cost);

        // Update UI
        this.updateHUD();
        this.updateTowerMenu();

        console.log(`Placed ${this.selectedTowerType} at node ${nodeIndex}`);

        // AI feedback
        this.aiAdvisor.onTowerPlaced(tower);

        // For Level 3, commit towers
        if (this.levelManager.commitTowers) {
            this.levelManager.committedTowers = [...this.towers];
        }
    }

    /**
     * Update HUD display
     */
    updateHUD() {
        const lm = this.levelManager;

        document.getElementById('hud-level').textContent =
            `Level ${lm.level.id}: ${lm.level.name}`;

        document.getElementById('hud-money').textContent =
            `$${lm.getMoney()}`;

        document.getElementById('hud-health').textContent =
            `${lm.coreHealth}%`;

        document.getElementById('hud-wave').textContent =
            lm.level.mode === 'NORMAL'
                ? `${lm.packetsSpawned}/${lm.level.totalPackets}`
                : `Wave ${lm.wave}`;

        document.getElementById('hud-success').textContent =
            `${lm.calculateSuccessRate().toFixed(0)}%`;

        // Color code health
        const healthEl = document.getElementById('hud-health');
        healthEl.classList.remove('danger', 'warning');
        if (lm.coreHealth < 30) {
            healthEl.classList.add('danger');
        } else if (lm.coreHealth < 50) {
            healthEl.classList.add('warning');
        }
    }

    /**
     * Update tower menu
     */
    updateTowerMenu() {
        const menu = document.getElementById('tower-menu');
        if (!menu) return;

        const available = this.levelManager.level.towersAvailable;
        const money = this.levelManager.getMoney();

        menu.innerHTML = available.map((type, index) => {
            const config = Config.TOWERS[type];
            const canAfford = money >= config.cost;
            const selected = type === this.selectedTowerType;
            const hotkey = ['Q', 'W', 'E', 'R'][index];

            return `
                <button class="tower-btn ${selected ? 'selected' : ''} ${!canAfford || this.towersLocked ? 'disabled' : ''}"
                        data-tower="${type}">
                    <div class="tower-icon" style="background: ${config.color}">
                        ${type[0]}
                    </div>
                    <div class="tower-info">
                        <div class="tower-name">${type}</div>
                        <div class="tower-cost ${!canAfford ? 'too-expensive' : ''}">$${config.cost}</div>
                    </div>
                    <div class="tower-hotkey">${hotkey}</div>
                </button>
            `;
        }).join('');

        // Add click listeners
        menu.querySelectorAll('.tower-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (this.towersLocked) return;
                const type = btn.dataset.tower;
                this.selectedTowerType = type;
                this.updateTowerMenu();
            });
        });

        // Update stats
        document.getElementById('towers-placed').textContent = this.towers.length;
        document.getElementById('towers-max').textContent = this.levelManager.level.towerLimit || 12;

        const maintenanceCost = this.towers.reduce(
            (sum, tower) => sum + tower.getMaintenanceCost(), 0
        );
        document.getElementById('maintenance-cost').textContent = `$${maintenanceCost}`;
    }

    /**
     * Handle level complete
     */
    handleLevelComplete() {
        console.log('Level Complete!');
        this.paused = true;

        // Show completion dialog
        const dialog = document.getElementById('dialog-overlay');
        document.getElementById('dialog-title').textContent = 'Level Complete!';
        document.getElementById('dialog-message').textContent =
            `Success Rate: ${this.levelManager.calculateSuccessRate().toFixed(1)}%\nScore: ${this.levelManager.score}`;
        dialog?.classList.remove('hidden');

        eventBus.emit('levelComplete', {
            level: this.levelManager.level.id,
            score: this.levelManager.score,
            successRate: this.levelManager.calculateSuccessRate()
        });
    }

    /**
     * Handle level failed
     */
    handleLevelFailed() {
        console.log('Level Failed!');
        this.paused = true;

        // Show failure dialog
        const dialog = document.getElementById('dialog-overlay');
        document.getElementById('dialog-title').textContent = 'Core Breached!';
        document.getElementById('dialog-message').textContent =
            'Your network has been compromised. Try again!';
        dialog?.classList.remove('hidden');

        eventBus.emit('levelFailed', {
            level: this.levelManager.level.id
        });
    }

    /**
     * Show AI tip (Level 1+)
     */
    showAITip(message) {
        this.currentTip = message;
        const tipEl = document.getElementById('ai-tip');
        if (tipEl) {
            tipEl.textContent = message;
            tipEl.classList.remove('hidden');
            setTimeout(() => tipEl.classList.add('hidden'), 8000);
        }
    }

    /**
     * Handle topology switch (Level 2)
     */
    handleTopologySwitch(data) {
        console.log(`Topology switched: ${data.from} → ${data.to}`);
        console.log(`Reasoning: ${data.reasoning}`);

        // Could show notification popup here
        this.showAITip(`⚠️ Network reconfigured! ${data.reasoning}`);
    }

    /**
     * Handle AI strategy update (Level 2)
     */
    handleAIStrategyUpdate(data) {
        console.log('AI Strategy:', data.strategy?.reasoning);
    }

    /**
     * Handle phase change (Level 3)
     */
    handlePhaseChange(data) {
        console.log(`Phase: ${data.phase} - ${data.message}`);
        this.towersLocked = !data.canPlaceTowers;

        // Show phase notification
        this.showAITip(`Phase: ${data.phase.toUpperCase()} - ${data.message}`);
    }

    /**
     * Handle phase timer (Level 3)
     */
    handlePhaseTimer(data) {
        // Timer updates - could update UI element
        console.log(`Phase ${data.phase}: ${data.remaining}s remaining`);
    }

    /**
     * Handle Stackelberg complete (Level 3)
     */
    handleStackelbergComplete(data) {
        console.log('Stackelberg Complete:', data.score);
        const rating = '⭐'.repeat(data.defenseRating);

        this.paused = true;
        const dialog = document.getElementById('dialog-overlay');
        document.getElementById('dialog-title').textContent =
            data.survived ? 'Defense Successful!' : 'Core Breached';
        document.getElementById('dialog-message').textContent =
            `Rating: ${rating}\nScore: ${data.score}`;
        dialog?.classList.remove('hidden');
    }

    /**
     * Handle economic topology rotation (Level 4)
     */
    handleEconomicRotation(data) {
        console.log(`Economic rotation: ${data.topology} at wave ${data.wave}`);
        this.showAITip(`Topology rotated: ${data.topology}`);
    }

    /**
     * Handle RL learning update (Level 4)
     */
    handleRLUpdate(data) {
        console.log(`RL: State=${data.state}, Action=${data.action}, Reward=${data.reward}`);
    }
}

export default PlayingState;
