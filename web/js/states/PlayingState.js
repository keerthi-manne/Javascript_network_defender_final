/**
 * PLAYING_STATE.JS - Main Gameplay State
 * Complete integration for all 4 levels with AI systems
 */

import LevelManager from '../gameplay/LevelManager.js';
import LevelManagerAdaptive from '../gameplay/LevelManagerAdaptive.js';
import LevelManagerStackelberg from '../gameplay/LevelManagerStackelberg.js';
import LevelManagerEconomic from '../gameplay/LevelManagerEconomic.js';
import LevelManagerTimeAttack from '../gameplay/LevelManagerTimeAttack.js';
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
                // Start first wave for endless mode
                if (data.level.mode === 'ENDLESS' && this.levelManager.startWave) {
                    this.levelManager.startWave();
                }
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
                // Show optimal strategy at start
                if (this.levelManager.generateOptimalStrategyDescription) {
                    eventBus.emit('aiTip', this.levelManager.generateOptimalStrategyDescription());
                }
                break;

            case 'ECONOMIC_RL':
                // Level 4: Economic RL
                this.levelManager = new LevelManagerEconomic(
                    data.level,
                    data.settings.gameplay.difficulty
                );
                console.log('Level 4: Economic RL enabled');
                // Start first wave
                this.levelManager.startWave();
                break;

            case 'TIME_ATTACK':
                // Time Attack mode
                this.levelManager = new LevelManagerTimeAttack(
                    data.level,
                    data.settings.gameplay.difficulty
                );
                console.log('Time Attack mode enabled');
                this.levelManager.startWave();
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
        this.packetsInWave = 0;
        this.waveTransitioning = false; // Flag to prevent multiple wave transitions

        // Setup event listeners
        eventBus.on('canvasClick', this.onCanvasClick);
        eventBus.on('canvasMouseMove', this.onCanvasMouseMove);
        eventBus.on('keyDown', this.onKeyDown);
        eventBus.on('togglePause', this.onTogglePause);

        // Bind restart handler
        this.onRestart = this.handleRestart.bind(this);
        eventBus.on('restartLevel', this.onRestart);

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

        // Reset UI state
        document.getElementById('dialog-overlay')?.classList.add('hidden');
        const resumeBtn = document.getElementById('btn-resume');
        if (resumeBtn) resumeBtn.style.display = 'block';

        console.log(`Level ${data.level.id} loaded: ${data.level.name}`);
    }

    exit() {
        console.log('Exiting Playing State');

        // Remove event listeners
        eventBus.off('canvasClick', this.onCanvasClick);
        eventBus.off('canvasMouseMove', this.onCanvasMouseMove);
        eventBus.off('keyDown', this.onKeyDown);
        eventBus.off('togglePause', this.onTogglePause);
        if (this.onRestart) eventBus.off('restartLevel', this.onRestart);
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
        // Spawn enemies
        const isEndless = this.levelManager.level.mode === 'ENDLESS' || this.levelManager.level.mode === 'ECONOMIC_ENDLESS';
        const waveLimit = 15; // Enemies per wave for endless modes

        if (isEndless) {
            // For endless mode, spawn enemies until wave limit is reached
            if (this.packetsInWave < waveLimit) {
                // Still spawning enemies for current wave
                if (this.levelManager.shouldSpawnEnemy(deltaTime)) {
                    this.spawnEnemy();
                    console.log(`[Spawn] Spawned enemy ${this.packetsInWave}/${waveLimit} for wave ${this.levelManager.wave}`);
                }
            } else if (this.packetsInWave >= waveLimit) {
                // Wave limit reached, wait for all enemies to be cleared
                if (this.enemies.length === 0 && !this.levelManager.levelComplete && !this.levelManager.levelFailed && !this.waveTransitioning) {
                    // Prevent multiple transitions
                    this.waveTransitioning = true;

                    const currentWave = this.levelManager.wave;
                    console.log(`[Wave] Wave ${currentWave} complete. packetsInWave=${this.packetsInWave}, enemies=${this.enemies.length}`);

                    // Wave complete - process completion first (this increments the wave)
                    this.onWaveComplete();

                    // Update level manager with current towers before starting next wave
                    if (this.levelManager.updateTowers) {
                        this.levelManager.updateTowers(this.towers);
                    }

                    // Start next wave (this resets spawn timer and prepares AI)
                    this.levelManager.startWave();

                    // Reset wave counter for next wave - MUST be after startWave()
                    this.packetsInWave = 0;

                    // Update HUD to show new wave number
                    this.updateHUD();

                    // Allow next wave to spawn immediately
                    this.waveTransitioning = false;

                    console.log(`[Wave] Wave ${this.levelManager.wave} started. packetsInWave=${this.packetsInWave}, spawnTimer=${this.levelManager.spawnTimer}`);
                    console.log(`[Wave] Next frame should spawn: packetsInWave=${this.packetsInWave} < ${waveLimit} = ${this.packetsInWave < waveLimit}`);
                    this.showAITip(`Wave ${this.levelManager.wave} starting!`);
                } else if (this.enemies.length > 0) {
                    // Still waiting for enemies to be cleared
                    if (Math.random() < 0.01) { // Log occasionally to avoid spam
                        console.log(`[Wave] Waiting for ${this.enemies.length} enemies to be cleared before starting next wave`);
                    }
                }
            }
        } else {
            // Normal mode spawning
            if (this.levelManager.shouldSpawnEnemy(deltaTime)) {
                this.spawnEnemy();
            }
        }

        // Check win/fail conditions
        this.levelManager.checkWinCondition();

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
        const enemy = new Enemy(enemyType, path, this.levelManager.nodes, this.levelManager.edges);

        // Apply difficulty modifiers
        enemy.speed *= this.levelManager.difficultyMod.enemySpeedMultiplier;
        enemy.health *= this.levelManager.difficultyMod.enemyHealthMultiplier;
        enemy.maxHealth = enemy.health;

        this.enemies.push(enemy);
        this.levelManager.incrementPacketsSpawned();
        this.packetsInWave++;
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

            // Ensure resume button is shown for normal pause
            const resumeBtn = document.getElementById('btn-resume');
            if (resumeBtn) resumeBtn.style.display = 'block';

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
        const tower = new Tower(node.x, node.y, this.selectedTowerType, this.levelManager.nodes);
        this.towers.push(tower);

        // Spend money
        this.levelManager.spendMoney(cost);

        // Update UI
        this.updateHUD();
        this.updateTowerMenu();

        console.log(`Placed ${this.selectedTowerType} at node ${nodeIndex}`);

        // AI feedback
        this.aiAdvisor.onTowerPlaced(tower);

        // Update level manager with current towers (for adaptive AI)
        if (this.levelManager.updateTowers) {
            this.levelManager.updateTowers(this.towers);
        }

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
                : lm.getModeInfo ? `${lm.getModeInfo()} | Wave ${lm.wave}` : `Wave ${lm.wave}`;

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

        // Special handling for level 3
        if (this.levelManager.level.aiType === 'PERFECT') {
            this.handleStackelbergComplete({
                score: this.levelManager.score,
                analysis: this.levelManager.aiAnalysis,
                survived: this.coreHealth > 0,
                defenseRating: this.levelManager.getDefenseRating(),
                level: this.levelManager.level.id
            });
            return;
        }

        const rating = this.levelManager.getDefenseRating();
        const stars = '⭐'.repeat(rating);
        const bestRating = this.getBestStars(this.levelManager.level.id);
        const bestStars = '⭐'.repeat(bestRating);

        // Save if better
        this.saveBestStars(this.levelManager.level.id, rating);

        // Show completion dialog
        const dialog = document.getElementById('dialog-overlay');
        document.getElementById('dialog-title').textContent = 'Level Complete!';
        document.getElementById('dialog-message').innerHTML =
            `<div style="font-size: 1.4em; margin-bottom: 10px;">${stars}</div>` +
            `<div style="margin-bottom: 10px;">Best: ${bestStars}</div>` +
            `Success Rate: ${this.levelManager.calculateSuccessRate().toFixed(1)}%<br>` +
            `Score: ${this.levelManager.score}`;

        // Hide resume button for completion
        const resumeBtn = document.getElementById('btn-resume');
        if (resumeBtn) resumeBtn.style.display = 'none';

        dialog?.classList.remove('hidden');

        eventBus.emit('levelComplete', {
            level: this.levelManager.level.id,
            score: this.levelManager.score,
            successRate: this.levelManager.calculateSuccessRate(),
            rating: rating
        });
    }

    /**
     * Handle level failed
     */
    handleLevelFailed() {
        console.log('Level Failed!');

        // Special handling for Stackelberg (Level 3) to show feedback even on failure
        if (this.levelManager instanceof LevelManagerStackelberg) {
            // Trigger the detailed analysis view instead of generic failure
            this.handleStackelbergComplete({
                score: this.levelManager.calculateStackelbergScore(),
                analysis: this.levelManager.aiAnalysis,
                survived: false,
                defenseRating: this.levelManager.getDefenseRating(),
                level: this.levelManager.level.id
            });
            return;
        }

        this.paused = true;

        // Show failure dialog
        const dialog = document.getElementById('dialog-overlay');
        document.getElementById('dialog-title').textContent = 'Core Breached!';
        document.getElementById('dialog-message').textContent =
            'Your network has been compromised. Try again!';

        // Hide resume button for game over
        const resumeBtn = document.getElementById('btn-resume');
        if (resumeBtn) resumeBtn.style.display = 'none';

        dialog?.classList.remove('hidden');

        eventBus.emit('levelFailed', {
            level: this.levelManager.level.id
        });
    }

    /**
     * Handle level restart
     */
    handleRestart() {
        console.log('Restarting level...');
        // Trigger complete level reload via main.js
        eventBus.emit('levelSelected', this.levelManager.level.id);
    }

    /**
     * Show AI tip (Level 1+)
     */
    showAITip(message) {
        if (!message) return;
        this.currentTip = message;
        const tipEl = document.getElementById('ai-tip');
        if (tipEl) {
            // Clear existing timeout if any
            if (this.tipTimeout) clearTimeout(this.tipTimeout);

            tipEl.textContent = message;
            tipEl.classList.remove('hidden');

            this.tipTimeout = setTimeout(() => {
                tipEl.classList.add('hidden');
                this.tipTimeout = null;
            }, 8000);
        }
    }

    /**
     * Handle topology switch (Level 2)
     */
    handleTopologySwitch(data) {
        console.log(`Topology switched: ${data.from} → ${data.to}`);

        // Show notification to player
        const notification = document.createElement('div');
        notification.className = 'topology-switch-notification';
        notification.innerHTML = `
            <h3>⚠️ Network Reconfigured!</h3>
            <p>AI Reasoning: ${data.reasoning}</p>
            <p>Topology: ${data.to}</p>
        `;

        // Refund all towers
        let refundAmount = 0;
        this.towers.forEach(tower => {
            // Get sell value or default to full cost if not strictly defined (though Tower.js has getSellValue)
            refundAmount += tower.getSellValue ? tower.getSellValue() : tower.config.cost * 0.7;
        });

        if (refundAmount > 0) {
            this.levelManager.addMoney(refundAmount);
            // Append refund info to notification
            const refundMsg = document.createElement('p');
            refundMsg.style.color = '#4c9eff'; // Success/Info color
            refundMsg.innerText = `Assets liquidated: +$${Math.floor(refundAmount)} refunded`;
            notification.appendChild(refundMsg);

            console.log(`Refunded ${this.towers.length} towers for $${refundAmount}`);
        }

        // Clear towers
        this.towers = [];

        document.getElementById('game-container').appendChild(notification);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            notification.remove();
        }, 5000);

        this.showAITip(`⚠️ Network reconfigured! ${data.reasoning}`);

        // Update HUD in case stats changed
        this.updateHUD();
    }

    /**
     * Override wave complete for adaptive levels
     */
    onWaveComplete() {
        if (!this.levelManager) return;

        const waveResult = {
            blocked: this.levelManager.packetsBlocked,
            leaked: this.levelManager.packetsLeaked,
            successRate: this.levelManager.calculateSuccessRate()
        };

        console.log(`[Wave] Wave ${this.levelManager.wave} complete. Blocked: ${waveResult.blocked}, Leaked: ${waveResult.leaked}`);

        // Call adaptive manager's wave complete (this increments the wave)
        if (this.levelManager.onWaveComplete) {
            this.levelManager.onWaveComplete(this.towers, waveResult);
        }

        console.log(`[Wave] After onWaveComplete, wave is now ${this.levelManager.wave}`);
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
        this.paused = true;
        const dialog = document.getElementById('dialog-overlay');
        document.getElementById('dialog-title').textContent =
            data.survived ? 'Defense Successful!' : 'Core Breached';

        // Format analysis feedback
        const rating = '⭐'.repeat(data.defenseRating);
        const bestRating = this.getBestStars(this.levelManager.level.id);
        this.saveBestStars(this.levelManager.level.id, data.defenseRating);

        let analysisHtml = `<div style="margin-bottom: 25px; font-size: 1.2em;">Rating: ${rating}</div>`;
        analysisHtml += `<div style="margin-bottom: 15px; font-size: 1.1em;">Best: ${'⭐'.repeat(bestRating)}</div>`;

        // Vulnerability Report
        if (data.analysis && data.analysis.weaknesses && data.analysis.weaknesses.length > 0) {
            analysisHtml += '<div style="background: rgba(180, 40, 40, 0.2); padding: 15px; border-radius: 8px; margin-bottom: 20px; text-align: left; border-left: 4px solid #ff6b6b;">';
            analysisHtml += '<h4 style="margin: 0 0 10px 0; color: #ffadad;">🛡️ Vulnerability Analysis:</h4>';
            analysisHtml += '<ul style="margin: 0; padding-left: 20px;">';

            data.analysis.weaknesses.forEach(w => {
                analysisHtml += `<li style="margin-bottom: 8px;">
                    <strong>${w.severity}:</strong> ${w.description} 
                </li>`;
            });
            analysisHtml += '</ul></div>';
        }

        // Cost Efficiency Report (NEW)
        if (this.levelManager.analyzeCostEfficiency) {
            const costData = this.levelManager.analyzeCostEfficiency();
            let color = '#a0aec0'; // Default gray
            if (costData.rating === 'EXCELLENT') color = '#68d391'; // Green
            else if (costData.rating === 'GOOD') color = '#63b3ed'; // Blue
            else if (costData.rating === 'POOR') color = '#f6ad55'; // Orange

            analysisHtml += `<div style="background: rgba(40, 180, 100, 0.1); padding: 15px; border-radius: 8px; margin-bottom: 20px; text-align: left; border-left: 4px solid ${color};">`;
            analysisHtml += `<h4 style="margin: 0 0 10px 0; color: ${color};">💰 Cost Efficiency: ${costData.rating}</h4>`;
            analysisHtml += `<p style="margin: 0; font-size: 0.95em;">${costData.message}</p>`;
            if (costData.efficiency) {
                analysisHtml += `<div style="margin-top: 5px; font-size: 0.8em; opacity: 0.7;">Efficiency Rating: ${(costData.efficiency * 100).toFixed(0)}%</div>`;
            }
            analysisHtml += '</div>';
        }

        // Optimal Strategy for Next Attempt
        if (this.levelManager.generateOptimalStrategyDescription) {
            const optimalStrategy = this.levelManager.generateOptimalStrategyDescription();
            analysisHtml += '<div style="background: rgba(100, 150, 255, 0.1); padding: 15px; border-radius: 8px; margin-bottom: 20px; text-align: left; border-left: 4px solid #63b3ed;">';
            analysisHtml += '<h4 style="margin: 0 0 10px 0; color: #63b3ed;">🎯 Optimal Strategy for This Topology:</h4>';
            analysisHtml += '<div style="font-size: 0.9em; line-height: 1.4; white-space: pre-line;">' + optimalStrategy.replace('Optimal Defense Strategy for this topology:\n\n', '') + '</div>';
            analysisHtml += '</div>';
        }

        analysisHtml += `<div style="margin-top: 15px; font-weight: bold; font-size: 1.4em;">Score: ${data.score}</div>`;

        document.getElementById('dialog-message').innerHTML = analysisHtml;
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

    /**
     * Save best stars for a level
     */
    saveBestStars(levelId, stars) {
        const key = `bestStars_level${levelId}`;
        const current = parseInt(localStorage.getItem(key)) || 0;
        if (stars > current) {
            localStorage.setItem(key, stars);
        }
    }

    /**
     * Get best stars for a level
     */
    getBestStars(levelId) {
        return parseInt(localStorage.getItem(`bestStars_level${levelId}`)) || 0;
    }
}

export default PlayingState;
