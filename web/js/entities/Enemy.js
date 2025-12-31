/**
 * ENEMY.JS - Enemy Entity Class
 * Represents network threats that move along paths
 */

import Graphics from '../utils/Graphics.js';
import Config from '../utils/Config.js';
import Pathfinding from '../utils/Pathfinding.js';

export class Enemy {
    constructor(type, path, nodes, edges = null) {
        this.type = type;
        this.config = Config.ENEMIES[type];

        // Position and movement
        this.path = path; // Array of node indices
        this.nodes = nodes; // Reference to node positions
        this.edges = edges; // Reference to edges for pathfinding
        this.currentPathIndex = 0;
        this.x = nodes[path[0]].x;
        this.y = nodes[path[0]].y;
        this.targetX = nodes[path[1]].x;
        this.targetY = nodes[path[1]].y;

        // Stats
        this.health = this.config.health;
        this.maxHealth = this.config.health;
        this.speed = this.config.speed;
        this.baseSpeed = this.config.speed;

        // State
        this.alive = true;
        this.reachedGoal = false;
        this.slowFactor = 1.0;
        this.slowTimer = 0;

        // Attraction State
        this.attractionTimer = 0;
        this.attractionX = 0;
        this.attractionY = 0;
        this.attractedToNode = null; // Track which node is attracting this enemy
        this.originalPath = null; // Store original path for restoration
        this.distractionPauseTimer = 0; // Pause at honeypot
        this.processedHoneypots = new Set(); // Track visited honeypots to prevent re-attraction

        this.distractionTimer = 0; // Legacy support
        this.revealed = !this.config.stealthy;

        // Visual Jitter for path diversity
        this.offsetX = (Math.random() * 20) - 10;
        this.offsetY = (Math.random() * 20) - 10;

        this.size = this.config.size * Config.GRAPHICS.ENEMY_SIZE_MULTIPLIER;
        this.color = this.config.color;
    }

    /**
     * Update enemy position
     */
    update(deltaTime) {
        if (!this.alive || this.reachedGoal) return;

        // Update Status Effects
        if (this.attractionTimer > 0) {
            this.attractionTimer -= deltaTime;
            // User requested NO slow down when attracted
            // this.slowFactor = 0.5; 
        } else {
            this.slowFactor = 1.0;
        }

        if (this.slowTimer > 0) {
            this.slowTimer -= deltaTime;
            if (this.slowTimer <= 0) {
                this.slowFactor = 1.0;
            }
        }

        // Move towards target node
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Apply speed (with slow effect)
        const effectiveSpeed = this.speed * this.slowFactor * (deltaTime / 16);

        if (distance < effectiveSpeed) {
            // Reached target node, move to next
            this.currentPathIndex++;

            if (this.currentPathIndex >= this.path.length) {
                // Reached final goal
                this.reachedGoal = true;
                return;
            }

            const nextNodeIndex = this.path[this.currentPathIndex];
            this.x = this.nodes[nextNodeIndex].x;
            this.y = this.nodes[nextNodeIndex].y;

            // If we just reached the honeypot node:
            // User requested NO stopping/pausing at the honeypot node.
            if (nextNodeIndex === this.attractedToNode) {
                // this.distractionPauseTimer = 1000; // Removed stopping
                console.log(`[Honeypot] Enemy ${this.type} passed through honeypot node ${this.attractedToNode}`);

                // Mark this honeypot as processed so we don't get attracted again
                this.processedHoneypots.add(this.attractedToNode);
                this.attractedToNode = null; // Resume normal behavior (clears the 'Drag Back' trap)
            }

            if (this.currentPathIndex < this.path.length - 1) {
                const targetNodeIndex = this.path[this.currentPathIndex + 1];
                this.targetX = this.nodes[targetNodeIndex].x;
                this.targetY = this.nodes[targetNodeIndex].y;
            }
        } else {
            // Move towards target
            this.x += (dx / distance) * effectiveSpeed;
            this.y += (dy / distance) * effectiveSpeed;
        }
    }

    /**
     * Take damage
     */
    takeDamage(amount) {
        if (this.config.legitimate) {
            // Legitimate traffic should not be damaged
            return;
        }

        this.health -= amount;
        if (this.health <= 0) {
            this.alive = false;
        }
    }

    /**
     * Apply slow effect
     */
    applySlow(factor, duration = 1000) {
        this.slowFactor = Math.min(this.slowFactor, factor);
        this.slowTimer = Math.max(this.slowTimer, duration);
    }

    /**
     * Apply attraction (Honeypot effect)
     */
    applyAttraction(duration, targetX, targetY) {
        this.attractionTimer = Math.max(this.attractionTimer, duration);
        this.attractionX = targetX;
        this.attractionY = targetY;
    }

    /**
     * Reroute path to go through a specific node (Honeypot attraction)
     * @param {number} nodeId - The node ID to route through
     */
    rerouteToNode(nodeId) {
        try {
            // IGNORE if we have already been attracted to this honeypot once
            if (this.processedHoneypots.has(nodeId)) return;

            // IGNORE if we are ALREADY currently attracted to a defined node
            // This satisfies "go to either of the one... need not mandatorily go to all"
            // by preventing a second honeypot from hijacking the first's attraction.
            if (this.attractedToNode !== null && this.attractedToNode !== nodeId) return;

            // Only reroute if not already attracted to this node
            // EXCEPTION: If we are currently AT the honeypot node (prevNode == nodeId) and moving away,
            // we should allow a re-route to "drag" us back if we are still in range.
            const isLeavingHoneypot = this.path && this.path[this.currentPathIndex] === nodeId;
            if (this.attractedToNode === nodeId && !isLeavingHoneypot) return;

            // Validate current state
            if (!this.path || this.path.length === 0) return;
            if (this.currentPathIndex >= this.path.length - 1) return; // Must have a next node

            // Save original path if this is the first reroute
            if (!this.originalPath) {
                this.originalPath = [...this.path];
            }

            this.attractedToNode = nodeId;

            // Current Edge: prevNode -> nextNode
            const prevNodeId = this.path[this.currentPathIndex];
            const nextNodeId = this.path[this.currentPathIndex + 1];
            const goalNodeId = this.path[this.path.length - 1];

            if (prevNodeId === undefined || nextNodeId === undefined) return;

            // 1. Calculate path from Prev Node (Reversing)
            // We need a path: prev -> ... -> HP
            const pathFromPrev = Pathfinding.findPath(this.nodes, this.edges, prevNodeId, nodeId, false);

            // 2. Calculate path from Next Node (Continuing)
            // We need a path: next -> ... -> HP
            const pathFromNext = Pathfinding.findPath(this.nodes, this.edges, nextNodeId, nodeId, false);

            // Path from HP to Goal (standard)
            const pathHpToGoal = Pathfinding.findPath(this.nodes, this.edges, nodeId, goalNodeId, false);

            if (pathHpToGoal.length === 0) {
                console.log('[Honeypot] No path from HP to Goal');
                return;
            }

            // Determine best route:
            // Calculate physical distances
            const distToPrev = Graphics.distance(this.x, this.y, this.nodes[prevNodeId].x, this.nodes[prevNodeId].y);
            const distToNext = Graphics.distance(this.x, this.y, this.nodes[nextNodeId].x, this.nodes[nextNodeId].y);

            let useNext = true;

            // If reversing is possible (path exists)
            if (pathFromPrev.length > 0) {
                // SPECIAL CASE: If we are leaving the honeypot, GO BACK!
                if (prevNodeId === nodeId) {
                    useNext = false;
                } else if (pathFromNext.length === 0) {
                    useNext = false;
                } else {
                    // Compare total physical distance roughly
                    // Simple heuristic: hops * 100px (average edge)
                    const costPrev = distToPrev + (pathFromPrev.length * 100);
                    const costNext = distToNext + (pathFromNext.length * 100);

                    if (costPrev < costNext * 1.1) { // Slight bias towards reversing to favor attraction
                        useNext = false;
                    }
                }
            } else if (pathFromNext.length === 0) {
                // Both dead ends?
                return;
            }

            // Construct Path
            let pathToHp = [];

            if (useNext) {
                // Moving Forward: [prev, next, ... to HP]
                // We keep 'prev' as index 0 because that's just consistent with being on the 'prev->next' edge
                // So path should start with [prev, ...pathFromNext]
                // pathFromNext includes 'next' as the first element.
                pathToHp = [prevNodeId, ...pathFromNext];
            } else {
                // Reversing: [next, prev, ... to HP]
                // We are physically on the edge, so we can traverse back.
                // We set the path to start at 'next' so index 0 is 'next'.
                // Index 1 is 'prev' (target).
                pathToHp = [nextNodeId, ...pathFromPrev];
            }

            // Combine with Goal Path
            // pathToHp ends with HP. pathHpToGoal starts with HP.
            const fullPath = [...pathToHp, ...pathHpToGoal.slice(1)];

            // Apply
            console.log(`[Honeypot] Rerouting via ${useNext ? 'Next' : 'Prev'} node. Path: ${fullPath.join('->')}`);
            this.path = fullPath;
            this.currentPathIndex = 0;

            // USER REQUEST: Snap enemy to the current node position
            const startNodeId = this.path[0];
            if (this.nodes[startNodeId]) {
                this.x = this.nodes[startNodeId].x;
                this.y = this.nodes[startNodeId].y;
            }

            // Update immediate target
            if (this.path.length > 1) {
                const targetId = this.path[1];
                this.targetX = this.nodes[targetId].x;
                this.targetY = this.nodes[targetId].y;
            }

        } catch (e) {
            console.error(`[Honeypot] Error in rerouteToNode:`, e);
        }
    }

    /**
     * Restore original path (when attraction ends)
     */
    restoreOriginalPath() {
        if (!this.originalPath) return;

        this.attractedToNode = null;
        this.path = [...this.originalPath];
        this.originalPath = null;

        // Update target to next node in restored path
        if (this.currentPathIndex < this.path.length - 1) {
            const nextNodeIndex = this.path[this.currentPathIndex + 1];
            this.targetX = this.nodes[nextNodeIndex].x;
            this.targetY = this.nodes[nextNodeIndex].y;
        }
    }

    /**
     * Reveal (for STEALTH enemies)
     */
    reveal() {
        this.revealed = true;
    }

    /**
     * Render enemy
     */
    render(ctx) {
        if (!this.alive) return;

        // Apply visual jitter
        const drawX = this.x + this.offsetX;
        const drawY = this.y + this.offsetY;

        // Don't render if stealthy and not revealed
        if (this.config.stealthy && !this.revealed) {
            // Draw faint outline
            Graphics.drawCircle(ctx, drawX, drawY, this.size,
                'rgba(100, 100, 100, 0.2)', false);
            return;
        }

        // Legitimate traffic gets special rendering
        if (this.config.legitimate) {
            Graphics.drawGlowCircle(ctx, drawX, drawY, this.size,
                this.color, 5);

            // Draw checkmark
            ctx.fillStyle = '#ffffff';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('✓', drawX, drawY);
        } else {
            // Normal enemy
            Graphics.drawCircle(ctx, drawX, drawY, this.size, this.color);
        }

        // Status Effects
        if (this.attractionTimer > 0) {
            // Attracted (Honeypot) - Magnet
            ctx.fillStyle = '#FFD700'; // Gold
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🧲', drawX, drawY - this.size - 5);
        } else if (this.slowTimer > 0) {
            // Slowed (IDS) - Ice icon or blue tint override
            // Draw a small snowflake or just blue circle overlay
            ctx.save();
            ctx.globalAlpha = 0.5;
            ctx.fillStyle = '#00FFFF';
            ctx.beginPath();
            ctx.arc(drawX, drawY, this.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Health bar
        if (this.health < this.maxHealth && !this.config.legitimate) {
            const healthPercent = (this.health / this.maxHealth) * 100;
            const barWidth = this.size * 2;
            const barHeight = 3;
            const barX = drawX - barWidth / 2;
            const barY = drawY - this.size - 8;

            Graphics.drawHealthBar(ctx, barX, barY, barWidth, barHeight,
                healthPercent, '#333333', '#00ff00');
        }
    }

    /**
     * Get reward for destroying this enemy
     */
    getReward() {
        return this.config.reward;
    }

    /**
     * Check if enemy is at goal
     */
    isAtGoal() {
        return this.reachedGoal;
    }

    /**
     * Check if enemy is alive
     */
    isAlive() {
        return this.alive && !this.reachedGoal;
    }
}

export default Enemy;
