/**
 * LEVEL_SELECT_STATE.JS - Level Selection State
 */

export class LevelSelectState {
    enter() {
        console.log('Entering Level Select State');
        // Best stars are handled by main.js populateLevelCards
    }

    exit() {
        console.log('Exiting Level Select State');
    }

    updateBestStars() {
        // Update level buttons with best stars
        for (let i = 1; i <= 4; i++) {
            const button = document.getElementById(`level${i}`);
            if (button) {
                const bestStars = this.getBestStars(i);
                const starsHtml = '⭐'.repeat(bestStars);
                // Remove existing stars if any
                const existingStars = button.querySelector('.best-stars');
                if (existingStars) {
                    existingStars.remove();
                }
                // Add new stars
                const starsDiv = document.createElement('div');
                starsDiv.className = 'best-stars';
                starsDiv.style.fontSize = '1.2em';
                starsDiv.style.marginTop = '5px';
                starsDiv.textContent = bestStars > 0 ? `Best: ${starsHtml}` : 'Not played';
                button.appendChild(starsDiv);
            }
        }
    }

    getBestStars(levelId) {
        return parseInt(localStorage.getItem(`bestStars_level${levelId}`)) || 0;
    }

    update(deltaTime) {
        // No update needed for static menu
    }

    render(ctx) {
        // Rendering handled by HTML/CSS
    }
}

export default LevelSelectState;
