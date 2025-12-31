/**
 * CONFIG.JS - Game Configuration & Constants
 * Contains all game balance, tower stats, enemy configs, and level definitions
 */

// Debug log
// Debug log removed to fix TDZ error

export const Config = {
    // Screen Settings
    CANVAS_WIDTH: 1200,
    CANVAS_HEIGHT: 700,
    FPS: 60,

    // Difficulty Modifiers
    DIFFICULTY: {
        EASY: {
            moneyMultiplier: 1.5,
            healthMultiplier: 1.5,
            enemySpeedMultiplier: 0.8,
            enemyHealthMultiplier: 0.75
        },
        NORMAL: {
            moneyMultiplier: 1.0,
            healthMultiplier: 1.0,
            enemySpeedMultiplier: 1.0,
            enemyHealthMultiplier: 1.0
        },
        HARD: {
            moneyMultiplier: 0.75,
            healthMultiplier: 1.0,
            enemySpeedMultiplier: 1.3,
            enemyHealthMultiplier: 1.5
        }
    },

    // Tower Configurations
    TOWERS: {
        Firewall: {
            cost: 300,
            damage: 18,
            range: 120,
            cooldown: 750, // milliseconds
            maintenance: 10,
            color: '#50aaff',
            description: 'Blocks enemy packets except STEALTH',
            effect: 'none',
            projectileSpeed: 8,
            projectileColor: '#50aaff'
        },
        IDS: {
            cost: 140,
            damage: 4,
            range: 150,
            cooldown: 500,
            maintenance: 5,
            color: '#ffc832',
            description: 'Blocks STEALTH \u0026 slows others',
            effect: 'slow',
            slowFactor: 0.6,
            slowDuration: 2000,
            projectileSpeed: 10,
            projectileColor: '#ffc832'
        },
        Honeypot: {
            cost: 140,
            damage: 1, // Minimal damage - honeypot analyzes threats slowly
            range: 250, // Larger range to attract more enemies
            cooldown: 200, // Frequent pulses for continuous attraction
            maintenance: 3,
            color: '#00d9ff',
            description: 'Pseudo goal - all packets take its path',
            effect: 'attract',
            distractDuration: 3000, // Longer distraction time
            projectileSpeed: 0, // No projectiles
            projectileColor: '#00d9ff'
        }
    },

    // Enemy Configurations
    ENEMIES: {
        BASIC: {
            health: 20,
            speed: 1.5,
            color: '#ff3232',
            size: 8,
            reward: 15,
            description: 'Standard threat'
        },
        FAST: {
            health: 12,
            speed: 4.0,
            color: '#ff9632',
            size: 7,
            reward: 20,
            description: 'Quick mover'
        },
        TANK: {
            health: 50,
            speed: 0.8,
            color: '#d32f2f',
            size: 12,
            reward: 35,
            description: 'Heavy armor'
        },
        STEALTH: {
            health: 18,
            speed: 2.5,
            color: '#646464',
            size: 7,
            reward: 30,
            description: 'Invisible to most towers',
            stealthy: true
        },
        ENCRYPTED: {
            health: 25,
            speed: 1.8,
            color: '#0078c8',
            size: 9,
            reward: 25,
            description: 'Resistant to damage'
        },
        ADAPTIVE: {
            health: 30,
            speed: 2.0,
            color: '#00bcd4',
            size: 10,
            reward: 40,
            description: 'Learns and adapts'
        },
        LEGITIMATE: {
            health: Infinity,
            speed: 1.5,
            color: '#32ff32',
            size: 8,
            reward: -50, // Penalty for blocking
            description: 'DO NOT BLOCK!',
            legitimate: true
        }
    },

    // Level Definitions
    LEVELS: [
        {
            id: 1,
            name: 'Basic Defense',
            description: 'Learn tower placement and enemy types',
            concept: 'Defense in Depth',
            mode: 'NORMAL',
            startingMoney: 900,
            coreHealth: 100,
            totalPackets: 20,
            spawnInterval: 3000,
            successThreshold: 75,
            towersAvailable: ['Firewall', 'IDS', 'Honeypot'],
            towerLimit: 12,
            enemyTypes: ['BASIC', 'FAST', 'TANK'],
            legitimateRatio: 0,
            topology: 'adaptive1' // Changed from linear to branching per user request
        },
        {
            id: 2,
            name: 'Adaptive AI Challenge',
            description: 'AI learns and counters your strategy',
            concept: 'AI-Driven Adaptive Defense',
            mode: 'ENDLESS',
            startingMoney: 1200,
            coreHealth: 100,
            waves: 2,
            spawnInterval: 1200, // Faster waves
            towersAvailable: ['Firewall', 'IDS', 'Honeypot'],
            towerLimit: 12,
            enemyTypes: ['BASIC', 'FAST', 'TANK', 'STEALTH', 'ENCRYPTED', 'ADAPTIVE'],
            legitimateRatio: 0.3,
            aiType: 'GENIUS',
            dynamicTopology: true,
            topology: 'adaptive1', // Start with Branching Network
            topologySwitchInterval: 2, // Every 2 waves
            maintenance: true
        },
        {
            id: 3,
            name: 'Perfect AI Commitment',
            description: 'Fixed defense vs perfect counter-attack',
            concept: 'Stackelberg Equilibrium',
            mode: 'PERFECT_AI',
            startingMoney: 1200,
            coreHealth: 100,
            towersAvailable: ['Firewall', 'IDS', 'Honeypot'],
            towerLimit: 8,
            enemyTypes: ['FAST', 'STEALTH', 'LEGITIMATE'],
            legitimateRatio: 0.2,
            topology: 'stackelberg_mesh', // New complex topology
            phases: {
                commitment: 30, // 30 seconds as requested
                training: 5,    // 5 seconds for analysis
                battle: 30,     // 30 seconds battle
                scoring: null   // Results display
            },
            successThreshold: 75,
            aiType: 'PERFECT'
        },
        {
            id: 4,
            name: 'Economic Endless',
            description: 'Budget management + RL warfare',
            concept: 'Economic Game Theory + RL',
            mode: 'ECONOMIC_ENDLESS',
            startingCredits: 1500,
            coreHealth: 100,
            targetWaves: 50,
            spawnInterval: 2200,
            towersAvailable: ['Firewall', 'IDS', 'Honeypot'],
            towerLimit: 15,
            enemyTypes: ['BASIC', 'FAST', 'TANK', 'STEALTH', 'ENCRYPTED'],
            legitimateRatio: 0.25,
            aiType: 'ECONOMIC_RL',
            dynamicTopology: true,
            topologySwitchInterval: 2, // Every 2 waves for faster rotation
            maintenance: true,
            maintenanceInterval: 10,
            economicEfficiencyTarget: 75
        },
        {
            id: 'tutorial',
            name: 'Network Security Tutorial',
            description: 'Learn the fundamentals of defense',
            concept: 'Educational Onboarding',
            mode: 'TUTORIAL',
            startingMoney: 1000,
            coreHealth: 100,
            towersAvailable: ['Firewall', 'IDS', 'Honeypot'],
            towerLimit: 12,
            enemyTypes: ['BASIC', 'STEALTH'],
            legitimateRatio: 0,
            topology: 'adaptive1'
        }
    ],

    // Specific configurations for Endless Modes
    ENDLESS_MODES: {
        CLASSIC: {
            id: 'endless_classic',
            name: 'Classic Endless',
            description: 'Adaptive survival vs evolving threats',
            mode: 'ENDLESS',
            aiType: 'GENIUS',
            startingMoney: 1200,
            topology: 'adaptive1',
            dynamicTopology: true,
            topologySwitchInterval: 3,
            enemyTypes: ['BASIC', 'FAST', 'TANK', 'STEALTH', 'ENCRYPTED', 'ADAPTIVE'],
            legitimateRatio: 0.3
        },
        ECONOMIC: {
            id: 'endless_economic',
            name: 'Economic Warfare',
            description: 'Maximizing efficiency under budget pressure',
            mode: 'ECONOMIC_ENDLESS',
            aiType: 'ECONOMIC_RL',
            startingCredits: 2000,
            topology: 'dynamic_mesh',
            maintenance: true,
            maintenanceInterval: 5,
            enemyTypes: ['BASIC', 'FAST', 'TANK', 'STEALTH', 'ENCRYPTED'],
            legitimateRatio: 0.3
        },
        TIME_ATTACK: {
            id: 'endless_time',
            name: 'Time Attack',
            description: 'Clear waves before the timer runs out',
            mode: 'TIME_ATTACK',
            aiType: 'GENIUS',
            startingMoney: 1500,
            topology: 'adaptive3',
            waveTimeLimit: 60, // 60 seconds per wave
            enemyTypes: ['BASIC', 'FAST', 'STEALTH']
        }
    },

    // Network Topologies
    TOPOLOGIES: {
        level1: {
            // Keeping distinct generic definition but making it branch slightly
            name: 'basic_branch',
            nodes: [
                { id: 0, x: 225, y: 350, type: 'source' },
                { id: 1, x: 375, y: 350, type: 'normal' },
                { id: 2, x: 525, y: 250, type: 'chokepoint' },
                { id: 3, x: 525, y: 450, type: 'chokepoint' },
                { id: 4, x: 675, y: 350, type: 'normal' },
                { id: 5, x: 825, y: 350, type: 'chokepoint' },
                { id: 6, x: 975, y: 350, type: 'goal' }
            ],
            edges: [
                [0, 1], [1, 2], [1, 3], [2, 4], [3, 4], [4, 5], [5, 6]
            ],
            sources: [0],
            goals: [6],
            chokepoints: [2, 3, 5]
        },
        adaptive1: {
            name: 'Branching Network',
            nodes: [
                { id: 0, x: 225, y: 350, type: 'source' },
                { id: 1, x: 375, y: 200, type: 'normal' },
                { id: 2, x: 375, y: 500, type: 'normal' },
                { id: 3, x: 525, y: 150, type: 'normal' },
                { id: 4, x: 525, y: 350, type: 'normal' },
                { id: 5, x: 525, y: 550, type: 'normal' },
                { id: 6, x: 675, y: 200, type: 'normal' },
                { id: 7, x: 675, y: 500, type: 'normal' },
                { id: 8, x: 825, y: 350, type: 'normal' },
                { id: 9, x: 975, y: 350, type: 'goal' }
            ],
            edges: [
                [0, 1], [0, 2], [1, 3], [1, 4], [2, 4], [2, 5],
                [3, 6], [4, 6], [4, 7], [5, 7], [6, 8], [7, 8], [8, 9]
            ],
            sources: [0],
            goals: [9],
            chokepoints: [1, 2, 4, 6, 7, 8]
        },

        adaptive2: {
            name: 'Diamond Pattern',
            nodes: [
                { id: 0, x: 150, y: 350, type: 'source' },
                { id: 1, x: 350, y: 200, type: 'chokepoint' },
                { id: 2, x: 350, y: 350, type: 'chokepoint' },
                { id: 3, x: 350, y: 500, type: 'chokepoint' },
                { id: 4, x: 600, y: 150, type: 'normal' },
                { id: 5, x: 600, y: 350, type: 'normal' },
                { id: 6, x: 600, y: 550, type: 'normal' },
                { id: 7, x: 850, y: 250, type: 'chokepoint' },
                { id: 8, x: 850, y: 450, type: 'chokepoint' },
                { id: 9, x: 1050, y: 350, type: 'goal' }
            ],
            edges: [
                [0, 1], [0, 2], [0, 3],
                [1, 4], [2, 5], [3, 6],
                [4, 7], [5, 7], [5, 8], [6, 8],
                [7, 9], [8, 9]
            ],
            sources: [0],
            goals: [9],
            chokepoints: [1, 2, 3, 7, 8]
        },
        adaptive3: {
            name: 'Y-Junction Network',
            nodes: [
                { id: 0, x: 150, y: 350, type: 'source' },
                { id: 1, x: 350, y: 350, type: 'normal' },
                { id: 2, x: 500, y: 250, type: 'chokepoint' },
                { id: 3, x: 500, y: 450, type: 'chokepoint' },
                { id: 4, x: 700, y: 150, type: 'normal' },
                { id: 5, x: 700, y: 350, type: 'normal' },
                { id: 6, x: 700, y: 550, type: 'normal' },
                { id: 7, x: 900, y: 250, type: 'chokepoint' },
                { id: 8, x: 900, y: 450, type: 'chokepoint' },
                { id: 9, x: 1050, y: 350, type: 'goal' }
            ],
            edges: [
                [0, 1], [1, 2], [1, 3],
                [2, 4], [2, 5], [3, 5], [3, 6],
                [4, 7], [5, 7], [5, 8], [6, 8],
                [7, 9], [8, 9]
            ],
            sources: [0],
            goals: [9],
            chokepoints: [2, 3, 7, 8]
        },

        stackelberg_mesh: {
            name: 'Stackelberg Mesh',
            nodes: [
                { id: 0, x: 300, y: 350, type: 'source' },
                // Upper path
                { id: 1, x: 450, y: 200, type: 'chokepoint' },
                { id: 2, x: 600, y: 200, type: 'normal' },
                { id: 3, x: 750, y: 200, type: 'chokepoint' },
                // Middle path
                { id: 4, x: 450, y: 350, type: 'normal' },
                { id: 5, x: 600, y: 350, type: 'chokepoint' },
                { id: 6, x: 750, y: 350, type: 'normal' },
                // Lower path
                { id: 7, x: 450, y: 500, type: 'chokepoint' },
                { id: 8, x: 600, y: 500, type: 'normal' },
                { id: 9, x: 750, y: 500, type: 'chokepoint' },
                // Goal
                { id: 10, x: 900, y: 350, type: 'goal' }
            ],
            edges: [
                // Primary horizontal
                [0, 1], [1, 2], [2, 3], [3, 10],
                [0, 4], [4, 5], [5, 6], [6, 10],
                [0, 7], [7, 8], [8, 9], [9, 10],
                // Cross connections (Mesh)
                [1, 5], [4, 2],
                [4, 8], [7, 5],
                [2, 6], [5, 3],
                [5, 9], [8, 6]
            ],
            sources: [0],
            goals: [10],
            chokepoints: [1, 3, 5, 7, 9]
        },

        dynamic_mesh: {
            name: 'Dynamic Grid',
            // 3x5 Grid + Source/Goal
            nodes: [
                { id: 0, x: 50, y: 350, type: 'source' },
                // Col 1
                { id: 1, x: 200, y: 200, type: 'normal' },
                { id: 2, x: 200, y: 350, type: 'normal' },
                { id: 3, x: 200, y: 500, type: 'normal' },
                // Col 2
                { id: 4, x: 400, y: 200, type: 'normal' },
                { id: 5, x: 400, y: 350, type: 'chokepoint' },
                { id: 6, x: 400, y: 500, type: 'normal' },
                // Col 3
                { id: 7, x: 600, y: 200, type: 'chokepoint' },
                { id: 8, x: 600, y: 350, type: 'chokepoint' },
                { id: 9, x: 600, y: 500, type: 'chokepoint' },
                // Col 4
                { id: 10, x: 800, y: 200, type: 'normal' },
                { id: 11, x: 800, y: 350, type: 'chokepoint' },
                { id: 12, x: 800, y: 500, type: 'normal' },
                // Col 5
                { id: 13, x: 1000, y: 200, type: 'normal' },
                { id: 14, x: 1000, y: 350, type: 'normal' },
                { id: 15, x: 1000, y: 500, type: 'normal' },
                // Goal
                { id: 16, x: 1150, y: 350, type: 'goal' }
            ],
            // All possible connections
            edges: [
                // Source to Col 1
                [0, 1], [0, 2], [0, 3],
                // Col 1 vertical
                [1, 2], [2, 3],
                // Col 1 to Col 2
                [1, 4], [2, 5], [3, 6], [1, 5], [2, 4], [2, 6], [3, 5],
                // Col 2 vertical
                [4, 5], [5, 6],
                // Col 2 to Col 3
                [4, 7], [5, 8], [6, 9], [4, 8], [6, 8],
                // Col 3 vertical
                [7, 8], [8, 9],
                // Col 3 to Col 4
                [7, 10], [8, 11], [9, 12], [8, 10], [8, 12],
                // Col 4 vertical
                [10, 11], [11, 12],
                // Col 4 to Col 5
                [10, 13], [11, 14], [12, 15],
                // Col 5 to Goal
                [13, 16], [14, 16], [15, 16]
            ],
            sources: [0],
            goals: [16],
            chokepoints: [5, 7, 8, 9, 11]
        }
    },

    // Graphics Settings
    GRAPHICS: {
        NODE_RADIUS: 22,
        NODE_SOURCE_RADIUS: 28,
        NODE_GOAL_RADIUS: 28,
        NODE_CHOKEPOINT_RADIUS: 26,
        EDGE_WIDTH: 4,
        TOWER_SIZE: 30,
        ENEMY_SIZE_MULTIPLIER: 1.0,
        PROJECTILE_SIZE: 4,
        PARTICLE_MAX: 500
    },

    // Colors - Softer Professional Palette
    COLORS: {
        NODE_SOURCE: '#6fba82',        // Soft green source
        NODE_GOAL: '#d86c6c',          // Soft red goal  
        NODE_NORMAL: '#4a5568',        // Medium gray intermediate
        NODE_CHOKEPOINT: '#e8a75e',    // Soft amber chokepoints
        NODE_WEAKEST: '#f5c675',
        EDGE: '#353a47',               // Medium dark edges
        BACKGROUND: '#1a1d2e'          // Comfortable dark bg
    },

    // Particle Settings
    PARTICLES: {
        TOWER_PLACEMENT: {
            count: 20,
            lifetime: 600,
            speed: 2,
            size: 3
        },
        ENEMY_DEATH: {
            count: 15,
            lifetime: 400,
            speed: 3,
            size: 4
        },
        PROJECTILE_TRAIL: {
            count: 3,
            lifetime: 200,
            speed: 0,
            size: 2
        }
    },

    // Economic RL Parameters
    RL_PARAMS: {
        epsilon: 0.1,     // Exploration rate
        alpha: 0.1,       // Learning rate
        gamma: 0.95,      // Discount factor
        epsilonDecay: 0.995,
        minEpsilon: 0.05
    },

    // Storage Keys
    STORAGE_KEYS: {
        SAVE_DATA: 'networkdefender_save',
        SETTINGS: 'networkdefender_settings',
        AI_LEARNING: 'networkdefender_ai'
    }
};


export default Config;
