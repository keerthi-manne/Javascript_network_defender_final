import LevelManager from '../gameplay/LevelManager.js';
import Tower from '../entities/Tower.js';
import Enemy from '../entities/Enemy.js';
import Graphics from '../utils/Graphics.js';
import Config from '../utils/Config.js';
import eventBus from '../core/EventBus.js';

export class TutorialState {
    constructor() {
        this.levelManager = null;
        this.towers = [];
        this.enemies = [];
        this.selectedTowerType = null;
        this.hoveredNode = null;
        this.currentStep = 0;

        this.steps = [
            {
                title: "Welcome to Network Defender",
                message: "Learn to defend your network against cyber threats! Click on yellow chokepoint nodes to place towers.",
                condition: () => this.towers.length > 0,
                hint: "Select 'Firewall' and click a yellow node."
            },
            {
                title: "Asset Protection",
                message: "Great! Your firewall blocks standard packets. Now, let's watch enemies enter the network.",
                condition: () => this.enemies.length > 0,
                hint: "Wait for calibration..."
            },
            {
                title: "Stealth Threats",
                message: "Watch out! STEALTH packets are invisible to standard Firewalls. You need an IDS (Intrusion Detection System).",
                condition: () => this.towers.some(t => t.type === 'IDS'),
                hint: "Place an IDS tower to reveal stealth packets."
            },
            {
                title: "Strategic Diversion",
                message: "Sometimes you need to buy time. Honeypots attract all nearby traffic, diverting them from critical goals.",
                condition: () => this.towers.some(t => t.type === 'Honeypot'),
                hint: "Place a Honeypot to divert traffic."
            },
            {
                title: "Mastery Complete",
                message: "You're ready! Protect the goal at all costs. Good luck, Commander.",
                condition: () => this.levelManager && this.levelManager.packetsSpawned > 15,
                hint: "Survive the final wave!"
            }
        ];

        this.onCanvasClick = this.handleCanvasClick.bind(this);
        this.onCanvasMouseMove = this.handleCanvasMouseMove.bind(this);
    }

    enter() {
        console.log('Entering Tutorial State (V2)');
        const tutConfig = Config.LEVELS.find(l => l.id === 'tutorial');
        this.levelManager = new LevelManager(tutConfig);
        this.towers = [];
        this.enemies = [];
        this.currentStep = 0;
        this.selectedTowerType = 'Firewall';

        eventBus.on('canvasClick', this.onCanvasClick);
        eventBus.on('canvasMouseMove', this.onCanvasMouseMove);

        // Update HUD
        this.updateHUD();
        this.updateTowerMenu();

        // Show overlay
        const overlay = document.getElementById('tutorial-overlay');
        if (overlay) overlay.classList.remove('hidden');

        this.showCurrentStep();
    }

    exit() {
        console.log('Exiting Tutorial State');
        eventBus.off('canvasClick', this.onCanvasClick);
        eventBus.off('canvasMouseMove', this.onCanvasMouseMove);

        // Hide overlay
        const overlay = document.getElementById('tutorial-overlay');
        if (overlay) overlay.classList.add('hidden');
    }

    update(deltaTime) {
        if (!this.levelManager) return;

        // Update level manager
        if (this.currentStep >= 1) {
            if (this.levelManager.shouldSpawnEnemy(deltaTime)) {
                this.spawnEnemy();
            }
        }

        // Check step progression
        if (this.currentStep < this.steps.length) {
            if (this.steps[this.currentStep].condition()) {
                this.currentStep++;
                if (this.currentStep < this.steps.length) {
                    this.showCurrentStep();
                } else {
                    eventBus.emit('aiTip', "Tutorial Complete! Returning to menu...");
                    setTimeout(() => {
                        window.location.reload();
                    }, 3000);
                }
            }
        }

        // Update towers
        this.towers.forEach(t => t.update(deltaTime, this.enemies));

        // Update enemies
        this.enemies = this.enemies.filter(e => {
            e.update(deltaTime);
            if (!e.isAlive()) {
                if (e.reachedGoal) this.levelManager.enemyReachedGoal(e);
                else this.levelManager.enemyDestroyed(e);
                return false;
            }
            return true;
        });

        this.levelManager.checkWinCondition();

        // Check for defeat
        if (this.levelManager.levelFailed) {
            this.handleCoreBreach();
            return;
        }

        // Update HUD every frame
        this.updateHUD();
    }

    handleCoreBreach() {
        if (this.coreBreachTriggered) return;
        this.coreBreachTriggered = true;

        // Show failure message using overlay
        const titleEl = document.getElementById('tutorial-title');
        const contentEl = document.getElementById('tutorial-content');
        const hintEl = document.getElementById('tutorial-hint');
        const dotsEl = document.getElementById('tutorial-dots');

        if (titleEl) {
            titleEl.textContent = "CORE BREACHED!";
            titleEl.style.color = Config.COLORS.NODE_GOAL; // Red color
        }
        if (contentEl) contentEl.textContent = "Malicious packets have compromised the system. Defense failed.";
        if (hintEl) {
            hintEl.textContent = "System rebooting...";
            document.querySelector('.hint-icon').textContent = '⚠️';
        }
        if (dotsEl) dotsEl.innerHTML = ''; // Clear progress dots

        // Restart tutorial after delay
        setTimeout(() => {
            window.location.reload();
        }, 4000);
    }

    updateHUD() {
        const lm = this.levelManager;
        const levelTitle = document.getElementById('hud-level');
        if (levelTitle) levelTitle.textContent = 'Tutorial: Network Defense Basics';

        const moneyEl = document.getElementById('hud-money');
        if (moneyEl) moneyEl.textContent = `$${lm.getMoney()}`;

        const healthEl = document.getElementById('hud-health');
        if (healthEl) healthEl.textContent = `${lm.coreHealth}%`;

        const waveEl = document.getElementById('hud-wave');
        if (waveEl) waveEl.textContent = `Tutorial | Step ${this.currentStep + 1}/5`;

        const successEl = document.getElementById('hud-success');
        if (successEl) successEl.textContent = `${lm.calculateSuccessRate().toFixed(0)}%`;
    }

    updateTowerMenu() {
        const menu = document.getElementById('tower-menu');
        if (!menu) return;

        const available = ['Firewall', 'IDS', 'Honeypot'];
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
                // In tutorial, we might want to restrict selection based on step, 
                // but let's allow it if they want to explore.
                this.selectedTowerType = type;
                this.updateTowerMenu();
            });
        });
    }

    showCurrentStep() {
        const step = this.steps[this.currentStep];

        // Update DOM
        const titleEl = document.getElementById('tutorial-title');
        const contentEl = document.getElementById('tutorial-content');
        const hintEl = document.getElementById('tutorial-hint');
        const dotsEl = document.getElementById('tutorial-dots');

        if (titleEl) titleEl.textContent = step.title;
        if (contentEl) contentEl.textContent = step.message;
        if (hintEl) hintEl.textContent = step.hint;

        // Update dots
        if (dotsEl) {
            dotsEl.innerHTML = '';
            this.steps.forEach((_, index) => {
                const dot = document.createElement('div');
                dot.className = `dot ${index === this.currentStep ? 'active' : ''}`;
                dotsEl.appendChild(dot);
            });
        }

        console.log(`Tutorial Step ${this.currentStep}: ${step.title}`);
    }

    render(ctx) {
        if (!this.levelManager) return;

        // Draw background
        ctx.fillStyle = Config.COLORS.BACKGROUND;
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        // Render network
        this.renderNetwork(ctx);

        // Render towers/enemies
        this.towers.forEach(t => t.render(ctx));
        this.enemies.forEach(e => e.render(ctx));

        // Placement preview
        if (this.selectedTowerType && this.hoveredNode !== null) {
            this.renderPlacementPreview(ctx);
        }
    }

    renderNetwork(ctx) {
        const nodes = this.levelManager.nodes;
        const edges = this.levelManager.edges;

        edges.forEach(([from, to]) => {
            Graphics.drawLine(ctx, nodes[from].x, nodes[from].y, nodes[to].x, nodes[to].y, Config.COLORS.EDGE, 4);
        });

        nodes.forEach((node, i) => {
            let color = Config.COLORS.NODE_NORMAL;
            if (this.levelManager.sources.includes(i)) color = Config.COLORS.NODE_SOURCE;
            else if (this.levelManager.goals.includes(i)) color = Config.COLORS.NODE_GOAL;
            else if (this.levelManager.chokepoints.includes(i)) color = Config.COLORS.NODE_CHOKEPOINT;

            if (i === this.hoveredNode) Graphics.drawGlowCircle(ctx, node.x, node.y, 25, color, 10);
            Graphics.drawCircle(ctx, node.x, node.y, 22, color);

            ctx.fillStyle = '#fff';
            ctx.font = '12px Inter';
            ctx.textAlign = 'center';
            ctx.fillText(i, node.x, node.y + 5);
        });
    }

    renderPlacementPreview(ctx) {
        const node = this.levelManager.nodes[this.hoveredNode];
        const config = Config.TOWERS[this.selectedTowerType];
        const canPlace = this.levelManager.chokepoints.includes(this.hoveredNode);

        ctx.save();
        ctx.globalAlpha = 0.3;
        Graphics.drawCircle(ctx, node.x, node.y, config.range, canPlace ? config.color : '#f00');
        ctx.restore();
    }

    handleCanvasClick(data) {
        if (this.hoveredNode !== null && this.levelManager.chokepoints.includes(this.hoveredNode)) {
            // Check if already occupied
            const node = this.levelManager.nodes[this.hoveredNode];
            if (this.towers.some(t => Math.hypot(t.x - node.x, t.y - node.y) < 10)) return;

            const tower = new Tower(node.x, node.y, this.selectedTowerType, this.levelManager.nodes);
            this.towers.push(tower);

            // Spend money
            this.levelManager.spendMoney(Config.TOWERS[this.selectedTowerType].cost);
            this.updateHUD();
            this.updateTowerMenu();

            // Cycle tower types for tutorial steps
            if (this.currentStep === 0) this.currentStep = 1;
            if (this.currentStep === 2) this.selectedTowerType = 'IDS';
            if (this.currentStep === 3) this.selectedTowerType = 'Honeypot';

            this.updateTowerMenu();
        }
    }

    handleCanvasMouseMove(data) {
        const nodes = this.levelManager.nodes;
        this.hoveredNode = null;
        for (let i = 0; i < nodes.length; i++) {
            if (Math.hypot(data.x - nodes[i].x, data.y - nodes[i].y) < 30) {
                this.hoveredNode = i;
                break;
            }
        }
    }

    spawnEnemy() {
        const types = this.currentStep >= 3 ? ['BASIC', 'STEALTH'] : ['BASIC'];
        const type = types[Math.floor(Math.random() * types.length)];
        const path = this.levelManager.getRandomPath();
        if (path) {
            this.enemies.push(new Enemy(type, path, this.levelManager.nodes, this.levelManager.edges));
            this.levelManager.incrementPacketsSpawned();
        }
    }
}

export default TutorialState;
