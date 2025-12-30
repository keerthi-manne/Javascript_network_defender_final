/**
 * MENU_STATE.JS - Main Menu State
 * Handles menu rendering and particle background
 */

import Graphics from '../utils/Graphics.js';

export class MenuState {
    constructor() {
        this.particles = [];
        this.particleCount = 50;
        this.connections = [];
    }

    enter() {
        console.log('Entering Menu State');
        this.initParticles();
    }

    exit() {
        console.log('Exiting Menu State');
    }

    initParticles() {
        this.particles = [];
        for (let i = 0; i < this.particleCount; i++) {
            this.particles.push({
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                size: Math.random() * 3 + 1
            });
        }
    }

    update(deltaTime) {
        // Update particles
        this.particles.forEach(p => {
            p.x += p.vx * (deltaTime / 16);
            p.y += p.vy * (deltaTime / 16);

            // Wrap around screen
            if (p.x < 0) p.x = window.innerWidth;
            if (p.x > window.innerWidth) p.x = 0;
            if (p.y < 0) p.y = window.innerHeight;
            if (p.y > window.innerHeight) p.y = 0;
        });

        // Update connections
        this.updateConnections();
    }

    updateConnections() {
        this.connections = [];
        const maxDist = 150;

        for (let i = 0; i < this.particles.length; i++) {
            for (let j = i + 1; j < this.particles.length; j++) {
                const p1 = this.particles[i];
                const p2 = this.particles[j];
                const dist = Graphics.distance(p1.x, p1.y, p2.x, p2.y);

                if (dist < maxDist) {
                    this.connections.push({
                        p1, p2,
                        opacity: 1 - (dist / maxDist)
                    });
                }
            }
        }
    }

    render(ctx) {
        // Draw connections
        this.connections.forEach(conn => {
            ctx.strokeStyle = `rgba(76, 158, 255, ${conn.opacity * 0.3})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(conn.p1.x, conn.p1.y);
            ctx.lineTo(conn.p2.x, conn.p2.y);
            ctx.stroke();
        });

        // Draw particles
        this.particles.forEach(p => {
            Graphics.drawCircle(ctx, p.x, p.y, p.size, 'rgba(76, 158, 255, 0.6)');
        });

        // Draw Version
        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = '14px Inter';
        ctx.textAlign = 'right';
        ctx.fillText('v1.2 - Branching Topologies', ctx.canvas.width - 20, ctx.canvas.height - 20);
        ctx.restore();
    }
}

export default MenuState;
