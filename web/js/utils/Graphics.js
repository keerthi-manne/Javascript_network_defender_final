/**
 * GRAPHICS.JS - Canvas Utilities & Effects
 * Helper functions for drawing and visual effects
 */

export class Graphics {
    /**
     * Draw a circle
     */
    static drawCircle(ctx, x, y, radius, color, filled = true) {
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        if (filled) {
            ctx.fillStyle = color;
            ctx.fill();
        } else {
            ctx.strokeStyle = color;
            ctx.stroke();
        }
    }

    /**
     * Draw a line
     */
    static drawLine(ctx, x1, y1, x2, y2, color, width = 1) {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.stroke();
    }

    /**
     * Draw text with shadow
     */
    static drawText(ctx, text, x, y, options = {}) {
        const {
            font = '16px Inter',
            color = '#ffffff',
            align = 'left',
            baseline = 'top',
            shadow = false,
            shadowColor = 'rgba(0,0,0,0.5)',
            shadowBlur = 4,
            shadowOffsetX = 2,
            shadowOffsetY = 2
        } = options;

        ctx.font = font;
        ctx.fillStyle = color;
        ctx.textAlign = align;
        ctx.textBaseline = baseline;

        if (shadow) {
            ctx.shadowColor = shadowColor;
            ctx.shadowBlur = shadowBlur;
            ctx.shadowOffsetX = shadowOffsetX;
            ctx.shadowOffsetY = shadowOffsetY;
        }

        ctx.fillText(text, x, y);

        // Reset shadow
        if (shadow) {
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
        }
    }

    /**
     * Draw gradient circle
     */
    static drawGradientCircle(ctx, x, y, radius, innerColor, outerColor) {
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, innerColor);
        gradient.addColorStop(1, outerColor);

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
    }

    /**
     * Draw glowing circle
     */
    static drawGlowCircle(ctx, x, y, radius, color, glowSize = 10) {
        ctx.save();
        ctx.shadowColor = color;
        ctx.shadowBlur = glowSize;
        this.drawCircle(ctx, x, y, radius, color);
        ctx.restore();
    }

    /**
     * Draw arrow
     */
    static drawArrow(ctx, x1, y1, x2, y2, color, width = 2, headSize = 10) {
        const angle = Math.atan2(y2 - y1, x2 - x1);

        // Line
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.stroke();

        // Arrow head
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(
            x2 - headSize * Math.cos(angle - Math.PI / 6),
            y2 - headSize * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
            x2 - headSize * Math.cos(angle + Math.PI / 6),
            y2 - headSize * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
    }

    /**
     * Draw dashed line
     */
    static drawDashedLine(ctx, x1, y1, x2, y2, color, width = 1, dashPattern = [5, 5]) {
        ctx.save();
        ctx.setLineDash(dashPattern);
        this.drawLine(ctx, x1, y1, x2, y2, color, width);
        ctx.setLineDash([]);
        ctx.restore();
    }

    /**
     * Draw rounded rectangle
     */
    static drawRoundedRect(ctx, x, y, width, height, radius, color, filled = true) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();

        if (filled) {
            ctx.fillStyle = color;
            ctx.fill();
        } else {
            ctx.strokeStyle = color;
            ctx.stroke();
        }
    }

    /**
     * Draw health bar
     */
    static drawHealthBar(ctx, x, y, width, height, healthPercent, bgColor = '#333', fgColor = '#0f0') {
        // Background
        this.drawRoundedRect(ctx, x, y, width, height, height / 2, bgColor, true);

        // Foreground
        const fillWidth = width * (healthPercent / 100);
        if (fillWidth > 0) {
            this.drawRoundedRect(ctx, x, y, fillWidth, height, height / 2, fgColor, true);
        }
    }

    /**
     * Calculate distance between two points
     */
    static distance(x1, y1, x2, y2) {
        return Math.hypot(x2 - x1, y2 - y1);
    }

    /**
     * Calculate angle between two points
     */
    static angle(x1, y1, x2, y2) {
        return Math.atan2(y2 - y1, x2 - x1);
    }

    /**
     * Lerp (linear interpolation)
     */
    static lerp(start, end, t) {
        return start + (end - start) * t;
    }

    /**
     * Clamp value between min and max
     */
    static clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    /**
     * Check circle-circle collision
     */
    static circleCollision(x1, y1, r1, x2, y2, r2) {
        return this.distance(x1, y1, x2, y2) < (r1 + r2);
    }

    /**
     * Check point-in-circle collision
     */
    static pointInCircle(px, py, cx, cy, radius) {
        return this.distance(px, py, cx, cy) < radius;
    }

    /**
     * Hex to RGB
     */
    static hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    /**
     * RGB to Hex
     */
    static rgbToHex(r, g, b) {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }
}

export default Graphics;
