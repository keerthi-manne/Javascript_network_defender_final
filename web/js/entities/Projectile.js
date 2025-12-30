/**
 * PROJECTILE.JS - Projectile Entity
 * Bullets fired by towers at enemies
 */

import Graphics from '../utils/Graphics.js';

export class Projectile {
    constructor(x, y, target, damage, speed, color, effect = 'none', slowFactor = 1.0, duration = 0, originX = 0, originY = 0) {
        this.x = x;
        this.y = y;
        this.target = target;
        this.damage = damage;
        this.speed = speed;
        this.color = color;
        this.effect = effect;
        this.slowFactor = slowFactor;
        this.duration = duration;

        // Origin of projectile (usually tower position) for attraction
        this.originX = originX;
        this.originY = originY;

        this.active = true;
        this.size = 4;
    }

    /**
     * Update projectile position
     */
    update(deltaTime, enemies) {
        if (!this.active || !this.target || !this.target.isAlive()) {
            this.active = false;
            return;
        }

        // Move towards target
        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        const moveSpeed = this.speed * (deltaTime / 16);

        if (distance < moveSpeed) {
            // Hit target
            this.hitTarget();
            this.active = false;
        } else {
            // Move closer
            this.x += (dx / distance) * moveSpeed;
            this.y += (dy / distance) * moveSpeed;
        }
    }

    /**
     * Apply damage and effects to target
     */
    hitTarget() {
        if (!this.target || !this.target.isAlive()) return;

        // Apply damage
        this.target.takeDamage(this.damage);

        // Apply effect
        if (this.effect === 'slow') {
            this.target.applySlow(this.slowFactor, this.duration);
        } else if (this.effect === 'attract') {
            console.log('Projectil Hit: applying attraction towards', this.originX, this.originY);
            // Pass origin coordinates for attraction
            this.target.applyAttraction(this.duration, this.originX, this.originY);
        }
    }

    /**
     * Render projectile
     */
    render(ctx) {
        if (!this.active) return;

        // Draw projectile with glow
        Graphics.drawGlowCircle(ctx, this.x, this.y, this.size, this.color, 3);

        // Draw trail
        ctx.save();
        ctx.globalAlpha = 0.3;
        Graphics.drawCircle(ctx, this.x, this.y, this.size * 1.5, this.color);
        ctx.restore();
    }
}

export default Projectile;
