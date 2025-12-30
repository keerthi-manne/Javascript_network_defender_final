/**
 * AI_ADVISOR.JS - AI Feedback System
 * Provides strategic hints and tips to the player
 */

import eventBus from '../core/EventBus.js';

export class AIAdvisor {
    constructor() {
        this.messageQueue = [];
        this.lastMessageTime = 0;
        this.messageDelay = 8000; // 8 seconds between messages
        this.tips = {
            welcome: "Welcome, Commander! I'll provide strategic guidance. Click yellow nodes to place towers.",
            firstTower: "Good! Your first tower is active. Try placing more to create overlapping fire zones.",
            economy: "Money is tight. Focus on cost-effective IDS towers ($200) early game.",
            enemyLeak: "⚠️ Enemies are leaking through! Reinforce your weak points.",
            lowHealth: "🚨 CRITICAL: Core health below 50%! Prioritize defense over saving money.",
            goodDefense: "✓ Excellent! Your success rate is high. Keep up the pressure!",
            waveMidpoint: "Halfway through! Check your economy and upgrade weak spots.",
            fastEnemy: "FAST enemies detected! Firewall towers deal high burst damage.",
            tankEnemy: "TANK incoming! Focus multiple towers on this threat.",
            stealthEnemy: "STEALTH detected! Only IDS towers can reveal them.",
            noTowers: "You haven't placed any towers yet. Start with chokepoints in the middle.",
            wrongPlacement: "❌ Can only place towers on yellow chokepoint nodes.",
            noMoney: "Insufficient funds. Destroy more enemies to earn money.",
            efficiency: "Tip: Place towers where they cover multiple path segments.",
            nearVictory: "🎯 Almost there! Just a few more packets to block.",
            strongStart: "Great opening! Early towers are key to controlling the battlefield."
        };

        this.shownTips = new Set();
    }

    /**
     * Analyze game state and provide feedback
     */
    update(gameState) {
        const now = Date.now();
        if (now - this.lastMessageTime < this.messageDelay) return;

        const lm = gameState.levelManager;
        const towers = gameState.towers;
        const enemies = gameState.enemies;

        // Check various conditions and queue appropriate tip
        if (towers.length === 0 && lm.packetsSpawned > 3) {
            this.queueTip('noTowers');
        } else if (towers.length === 1 && !this.shownTips.has('firstTower')) {
            this.queueTip('firstTower');
        } else if (lm.coreHealth < 50 && lm.coreHealth > 0) {
            this.queueTip('lowHealth');
        } else if (lm.packetsLeaked > 0 && lm.packetsLeaked % 2 === 0) {
            this.queueTip('enemyLeak');
        } else if (lm.calculateSuccessRate() > 80 && lm.packetsSpawned > 10) {
            this.queueTip('goodDefense');
        } else if (lm.packetsSpawned === 10) {
            this.queueTip('waveMidpoint');
        } else if (lm.packetsSpawned === 18) {
            this.queueTip('nearVictory');
        } else if (enemies.some(e => e.type === 'FAST')) {
            this.queueTip('fastEnemy');
        } else if (enemies.some(e => e.type === 'TANK')) {
            this.queueTip('tankEnemy');
        } else if (enemies.some(e => e.type === 'STEALTH')) {
            this.queueTip('stealthEnemy');
        }

        // Show queued tip
        if (this.messageQueue.length > 0) {
            const tip = this.messageQueue.shift();
            this.showTip(tip);
            this.lastMessageTime = now;
        }
    }

    /**
     * Queue a tip to be shown
     */
    queueTip(tipKey) {
        if (this.shownTips.has(tipKey)) return;

        const tipText = this.tips[tipKey];
        if (tipText && !this.messageQueue.includes(tipText)) {
            this.messageQueue.push(tipText);
            this.shownTips.add(tipKey);
        }
    }

    /**
     * Show tip immediately (for events)
     */
    showTip(message) {
        // Emit event for UI to display
        eventBus.emit('aiTip', message);

        // Also log to console
        console.log(`🤖 AI Advisor: ${message}`);
    }

    /**
     * Handle specific events
     */
    onTowerPlaced(tower) {
        const tips = [
            `${tower.type} tower placed! Range: ${tower.range}px, Damage: ${tower.damage}`,
            "Strategic placement! This position covers multiple enemy paths.",
            "Tower active. It will auto-target enemies in range."
        ];
        this.showTip(tips[Math.floor(Math.random() * tips.length)]);
    }

    onTowerPlacementFailed() {
        this.showTip(this.tips.wrongPlacement);
    }

    onInsufficientFunds(cost) {
        this.showTip(`${this.tips.noMoney} Need $${cost}.`);
    }

    onEnemyDestroyed(enemy) {
        if (Math.random() < 0.15) { // 15% chance
            const messages = [
                `+$${enemy.getReward()} Threat eliminated!`,
                "Nice! Keep blocking those packets.",
                `${enemy.type} destroyed. Defense holding strong.`
            ];
            this.showTip(messages[Math.floor(Math.random() * messages.length)]);
        }
    }

    onWaveStart(waveNum) {
        if (waveNum === 1) {
            this.showTip(this.tips.welcome);
        } else if (waveNum === 5) {
            this.showTip(this.tips.strongStart);
        }
    }

    /**
     * Reset for new game
     */
    reset() {
        this.messageQueue = [];
        this.shownTips.clear();
        this.lastMessageTime = 0;
    }
}

export default AIAdvisor;
