/**
 * PLAYING_STATE.JS - Main Gameplay State
 * Fully functional tower defense gameplay
 */

import LevelManager from '../gameplay/LevelManager.js';
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

        // Bind event listeners
        this.onCanvasClick = this.handleCanvasClick.bind(this);
        this.onCanvasMouseMove = this.handleCanvasMouseMove.bind(this);
        this.onKeyDown = this.handleKeyDown.bind(this);
        this.onTogglePause = this.handleTogglePause.bind(this);
    }

    enter(data) {
        console.log('Entering Playing State', data);

        // Initialize level
        this.levelManager = new LevelManager(
            data.level,
            data.settings.gameplay.difficulty
        );
        this.settings = data.settings;
        this.towers = [];
        this.enemies = [];
        this.selectedTowerType = null;
        this.paused = false;

        // Setup event listeners
        eventBus.on('canvasClick', this.onCanvasClick);
        eventBus.on('canvasMouseMove', this.onCanvasMouseMove);
        eventBus.on('keyDown', this.onKeyDown);
        eventBus.on('togglePause', this.onTogglePause);
        eventBus.on('aiTip', (tip) => this.showAITip(tip));

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
    }

    update(deltaTime) {
        if (this.paused) return;

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

        // Check win/loss conditions
        this.levelManager.checkWinCondition();

        if (this.levelManager.levelComplete) {
            this.handleLevelComplete();
        } else if (this.levelManager.levelFailed) {
            this.handleLevelFailed();
        }

        // Update AI Advisor
        this.aiAdvisor.update({ levelManager: this.levelManager, towers: this.towers, enemies: this.enemies });

        // Update HUD periodically
        if (Math.random() < 0.1) { // 10% chance each frame (~6 times per second)
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
        if (this.selectedTowerType && this.hoveredNode !== null) {
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

        // Check if clicked on tower menu (handled by HTML)
        if (x > window.innerWidth - 260) {
            return;
        }

        // Try to place/remove tower
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
                <button class="tower-btn ${selected ? 'selected' : ''} ${!canAfford ? 'disabled' : ''}"
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
}

export default PlayingState;
