/**
 * TOWER.JS - Tower Defense Entity
 * Represents defense towers that attack enemies
 */

import Graphics from '../utils/Graphics.js';
import Config from '../utils/Config.js';
import Projectile from './Projectile.js';

export class Tower {
    constructor(x, y, type, nodes = null) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.config = Config.TOWERS[type];

        // Combat
        this.damage = this.config.damage;
        this.range = this.config.range;
        this.cooldown = 0;
        this.cooldownMax = this.config.cooldown;
        this.target = null;

        // Visual
        this.size = Config.GRAPHICS.TOWER_SIZE;
        this.color = this.config.color;

        // Projectiles fired by this tower
        this.projectiles = [];

        // For Honeypot: find the nearest node
        this.nearestNodeId = null;
        if (this.type === 'Honeypot' && nodes) {
            this.nearestNodeId = this.findNearestNode(nodes);
        }

        // Cache for Honeypot rendering
        this.enemiesInRange = [];
    }

    /**
     * Update tower (cooldown, targeting, shooting)
     */
    update(deltaTime, enemies) {
        // Honeypot works differently - it passively attracts enemies
        if (this.type === 'Honeypot') {
            this.updateHoneypot(deltaTime, enemies);
            return;
        }

        // Update cooldown
        if (this.cooldown > 0) {
            this.cooldown -= deltaTime;
        }

        // Update projectiles
        this.projectiles = this.projectiles.filter(p => {
            p.update(deltaTime, enemies);
            return p.active;
        });

        // Find and shoot at target
        if (this.cooldown <= 0) {
            this.target = this.findTarget(enemies);
            if (this.target) {
                this.shoot(this.target);
                this.cooldown = this.cooldownMax;
            }
        }
    }

    /**
     * Honeypot passive attraction - works like real-life honeypots
     * Continuously attracts enemies within range without shooting
     */
    updateHoneypot(deltaTime, enemies) {
        // Update cooldown for secondary effects (like damage/logging)
        if (this.cooldown > 0) {
            this.cooldown -= deltaTime;
        }

        // Honeypots attract every frame - no cooldown for the "pull"
        const enemiesInRange = [];
        for (const enemy of enemies) {
            if (!enemy.isAlive()) continue;
            if (enemy.config.legitimate) continue;

            const distance = Graphics.distance(this.x, this.y, enemy.x, enemy.y);
            if (distance <= this.range) {
                enemiesInRange.push(enemy);

                // Reroute enemy to pass through honeypot node
                if (this.nearestNodeId !== null) {
                    // console.log(`[Honeypot] Attracting enemy ${enemy.type} to node ${this.nearestNodeId}`);
                    enemy.rerouteToNode(this.nearestNodeId);
                } else {
                    console.warn('[Honeypot] No nearest node found for rerouting!');
                }

                // Apply visual attraction effect and stay duration
                enemy.applyAttraction(
                    this.config.distractDuration,
                    this.x,
                    this.y
                );

                // Apply damage over time
                enemy.takeDamage(this.damage * (deltaTime / 1000));
            }
        }

        // Set visual target for lines/glow
        this.target = enemiesInRange.length > 0 ? enemiesInRange[0] : null;

        // Cache enemies in range for rendering to prevent ReferenceError
        this.enemiesInRange = enemiesInRange;

        // Pulse effect reset for secondary logic if needed
        if (this.cooldown <= 0) {
            this.cooldown = this.cooldownMax;
        }
    }

    /**
     * Find best target in range
     */
    findTarget(enemies) {
        let bestTarget = null;
        let bestDistance = Infinity;

        for (const enemy of enemies) {
            if (!enemy.isAlive()) continue;

            // IDS can see STEALTH, others cannot
            if (enemy.config.stealthy && !enemy.revealed) {
                if (this.type !== 'IDS') {
                    continue;
                }
            }

            const distance = Graphics.distance(this.x, this.y, enemy.x, enemy.y);

            if (distance <= this.range && distance < bestDistance) {
                bestTarget = enemy;
                bestDistance = distance;
            }
        }

        return bestTarget;
    }

    /**
     * Shoot at target
     */
    shoot(target) {
        const damage = this.getDamageForEnemy(target);
        const projectile = new Projectile(
            this.x, this.y,
            target,
            damage,
            this.config.projectileSpeed,
            this.config.projectileColor,
            this.config.effect,
            this.config.slowFactor,
            this.config.effect === 'slow' ? this.config.slowDuration :
                this.config.effect === 'attract' ? this.config.distractDuration : 0,
            this.x, this.y // Pass origin for attraction
        );

        this.projectiles.push(projectile);

        // IDS reveals STEALTH enemies
        if (this.type === 'IDS' && target.config.stealthy) {
            target.reveal();
        }
    }

    /**
     * Get damage for specific enemy type based on tower behavior
     */
    getDamageForEnemy(enemy) {
        if (this.type === 'Firewall') {
            // Firewall blocks all except stealth
            return enemy.config.stealthy ? 0 : this.damage;
        } else if (this.type === 'IDS') {
            // IDS blocks stealth effectively, less effective for others
            return enemy.config.stealthy ? 10 : 2;
        } else {
            return this.damage;
        }
    }

    /**
     * Render tower and its projectiles
     */
    render(ctx) {
        // Honeypot has special rendering - pulsing attraction field
        if (this.type === 'Honeypot') {
            this.renderHoneypot(ctx);
            return;
        }

        // Draw range circle (more subtle)
        ctx.save();
        ctx.globalAlpha = 0.08;
        Graphics.drawCircle(ctx, this.x, this.y, this.range, this.color);
        ctx.restore();

        // Draw tower with distinct colored circle
        const towerRadius = this.size / 1.5;

        // Outer glow
        Graphics.drawGlowCircle(ctx, this.x, this.y, towerRadius + 4, this.color, 8);

        // Tower body (solid colored circle)
        Graphics.drawCircle(ctx, this.x, this.y, towerRadius, this.color);

        // Inner darker circle for depth
        const darkerColor = this.getDarkerColor(this.color);
        Graphics.drawCircle(ctx, this.x, this.y, towerRadius - 3, darkerColor);

        // Draw tower type symbol
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px Inter';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 3;

        const symbol = this.getSymbol();
        ctx.fillText(symbol, this.x, this.y);
        ctx.restore();

        // Draw projectiles
        this.projectiles.forEach(p => p.render(ctx));

        // Draw targeting line
        if (this.target && this.target.isAlive()) {
            ctx.save();
            ctx.globalAlpha = 0.2;
            Graphics.drawLine(ctx, this.x, this.y, this.target.x, this.target.y,
                this.color, 2);
            ctx.restore();
        }
    }

    /**
     * Render Honeypot with pulsing attraction field
     */
    renderHoneypot(ctx) {
        // Pulsing attraction field (animated)
        const pulsePhase = (Date.now() % 2000) / 2000; // 0 to 1
        const pulseRadius = this.range * (0.7 + Math.sin(pulsePhase * Math.PI * 2) * 0.3);

        ctx.save();
        ctx.globalAlpha = 0.15 + Math.sin(pulsePhase * Math.PI * 2) * 0.05;
        Graphics.drawCircle(ctx, this.x, this.y, pulseRadius, this.color);
        ctx.restore();

        // Secondary pulse ring
        ctx.save();
        ctx.globalAlpha = 0.1;
        Graphics.drawCircle(ctx, this.x, this.y, this.range, this.color, false);
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.range, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // Draw tower with distinct colored circle
        const towerRadius = this.size / 1.5;

        // Outer glow (stronger for honeypot)
        Graphics.drawGlowCircle(ctx, this.x, this.y, towerRadius + 6, this.color, 12);

        // Tower body (solid colored circle)
        Graphics.drawCircle(ctx, this.x, this.y, towerRadius, this.color);

        // Inner darker circle for depth
        const darkerColor = this.getDarkerColor(this.color);
        Graphics.drawCircle(ctx, this.x, this.y, towerRadius - 3, darkerColor);

        // Draw honeypot symbol
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px Inter';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 3;
        ctx.fillText('🍯', this.x, this.y);
        ctx.restore();

        // Draw attraction lines to enemies in range
        // Draw attraction lines to enemies in range
        this.projectiles = [];
        if (this.enemiesInRange) {
            for (const enemy of this.enemiesInRange) {
                if (!enemy.isAlive() || enemy.config.legitimate) continue;
                // Double check distance to be safe, or just trust the cache
                ctx.save();
                ctx.globalAlpha = 0.3;
                Graphics.drawDashedLine(ctx, this.x, this.y, enemy.x, enemy.y, this.color, 2, [5, 5]);
                ctx.restore();
            }
        }
    }

    /**
     * Find the nearest node to this tower (for Honeypot path rerouting)
     */
    findNearestNode(nodes) {
        let nearestId = null;
        let nearestDistance = Infinity;

        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            const distance = Graphics.distance(this.x, this.y, node.x, node.y);

            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestId = i; // Use index as ID to be safe
            }
        }

        return nearestId;
    }

    /**
     * Get darker version of color for depth effect
     */
    getDarkerColor(hexColor) {
        const rgb = Graphics.hexToRgb(hexColor);
        if (!rgb) return hexColor;

        const r = Math.max(0, rgb.r - 40);
        const g = Math.max(0, rgb.g - 40);
        const b = Math.max(0, rgb.b - 40);

        return Graphics.rgbToHex(r, g, b);
    }

    /**
     * Get visual symbol for tower type
     */
    getSymbol() {
        switch (this.type) {
            case 'Firewall': return '🛡';
            case 'IDS': return '📡';
            case 'Honeypot': return '🍯';
            default: return 'T';
        }
    }

    /**
     * Get cost of this tower
     */
    getCost() {
        return this.config.cost;
    }

    /**
     * Get maintenance cost
     */
    getMaintenanceCost() {
        return this.config.maintenance;
    }

    /**
     * Get sell value (70% of cost)
     */
    getSellValue() {
        return Math.floor(this.config.cost * 0.7);
    }
}

export default Tower;
