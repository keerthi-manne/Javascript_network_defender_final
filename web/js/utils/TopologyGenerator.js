/**
 * TOPOLOGY_GENERATOR.JS
 * Procedural generation for network maps
 */

export class TopologyGenerator {
    /**
     * Linear Congruential Generator for seeded randomness
     */
    static lcg() {
        const a = 1664525;
        const c = 1013904223;
        const m = Math.pow(2, 32);
        this.seed = (a * this.seed + c) % m;
        return this.seed / m;
    }

    /**
     * Identify Chokepoints using Path Betweenness Centrality
     * More robust than simple degree counting: identifies nodes that bottleneck the most paths
     */
    static identifyChokepoints(nodes, edges, sources, goals) {
        const nodeScore = new Array(nodes.length).fill(0);
        const adj = new Array(nodes.length).fill(0).map(() => []);
        edges.forEach(([u, v]) => {
            adj[u].push(v);
            adj[v].push(u);
        });

        // Sample 50 random paths to calculate betweenness (empirical)
        for (let i = 0; i < 50; i++) {
            sources.forEach(source => {
                goals.forEach(goal => {
                    const path = this.simpleBFS(adj, source, goal, true);
                    if (path) {
                        path.forEach(nodeId => {
                            if (nodeId !== source && nodeId !== goal) {
                                nodeScore[nodeId]++;
                            }
                        });
                    }
                });
            });
        }

        // Normalize scores and find top bottlenecks
        const maxScore = Math.max(...nodeScore);
        if (maxScore === 0) return [];

        const chokepoints = [];
        nodeScore.forEach((score, i) => {
            // A node is a chokepoint if it's on more than 40% of all paths
            // AND it's a junction (degree >= 3)
            const degree = adj[i].length;
            if (score / maxScore > 0.4 && degree >= 3) {
                chokepoints.push(i);
            }
        });

        return chokepoints;
    }

    /**
     * Simple BFS with optional randomization for path diversity
     */
    static simpleBFS(adj, start, goal, randomize = false) {
        const queue = [start];
        const prev = new Map();
        const visited = new Set([start]);

        while (queue.length > 0) {
            let curr = queue.shift();
            if (curr === goal) break;

            let neighbors = [...adj[curr]];
            if (randomize) neighbors.sort(() => Math.random() - 0.5);

            for (const neighbor of neighbors) {
                if (!visited.has(neighbor)) {
                    visited.add(neighbor);
                    prev.set(neighbor, curr);
                    queue.push(neighbor);
                }
            }
        }

        if (!prev.has(goal)) return null;

        const path = [];
        let curr = goal;
        while (curr !== undefined) {
            path.unshift(curr);
            curr = prev.get(curr);
        }
        return path;
    }

    /**
     * Generate a Stackelberg Mesh map
     * Optimized for Level 3: Multiple paths with cross-connections to allow complex routing
     */
    static generateStackelbergMap() {
        // Use high-precision timestamp as seed
        this.seed = Math.floor((Date.now() + performance.now()) * 10000) + Math.floor(Math.random() * 10000000);
        const random = () => this.lcg();
        const width = 1200;
        const height = 700;
        const marginX = 150;
        const marginY = 150;

        const nodes = [];
        const edges = [];
        const chokepoints = [];

        // Source and Goal
        nodes.push({ id: 0, x: marginX, y: height / 2, type: 'source' });
        const goalId = 99; // Temporary ID

        // Randomize number of main paths (2-4)
        const numPaths = 2 + Math.floor(random() * 3);
        const paths = [];
        for (let i = 0; i < numPaths; i++) {
            const y = marginY + (i * (height - 2 * marginY) / (numPaths - 1));
            paths.push({ y, name: `Path${i + 1}` });
        }

        let nodeId = 1;

        // Path Layers (randomize 2-4)
        const layers = 2 + Math.floor(random() * 3);
        const layerWidth = (width - 2 * marginX - 100) / (layers + 1);

        const nodeGrid = []; // [pathIndex][layerIndex] -> nodeId

        for (let p = 0; p < paths.length; p++) {
            nodeGrid[p] = [];
            for (let l = 1; l <= layers; l++) {
                const x = marginX + l * layerWidth + (random() - 0.5) * 80;
                let y = paths[p].y + (random() - 0.5) * 100;

                // Determine type
                // Middle layer usually chokepoints
                let type = 'normal';
                if (l === 2 || random() < 0.3) {
                    type = 'chokepoint';
                }

                nodes.push({ id: nodeId, x: Math.floor(x), y: Math.floor(y), type });
                if (type === 'chokepoint') chokepoints.push(nodeId);

                nodeGrid[p].push(nodeId);
                nodeId++;
            }
        }

        // Add Goal
        nodes.push({ id: goalId, x: width - marginX, y: height / 2, type: 'goal' });

        // edges: Source -> Layer 1
        for (let p = 0; p < paths.length; p++) {
            edges.push([0, nodeGrid[p][0]]);
        }

        // edges: Layer -> Layer (Horizontal)
        for (let p = 0; p < paths.length; p++) {
            for (let l = 0; l < layers - 1; l++) {
                edges.push([nodeGrid[p][l], nodeGrid[p][l + 1]]);
            }
        }

        // edges: Last Layer -> Goal
        for (let p = 0; p < paths.length; p++) {
            edges.push([nodeGrid[p][layers - 1], goalId]);
        }

        // edges: Vertical/Cross connections (The Mesh)
        // Connect adjacent paths at random layers
        const crossProb = 0.5 + random() * 0.3; // 0.5-0.8
        for (let l = 0; l < layers; l++) {
            for (let p = 0; p < paths.length - 1; p++) {
                if (random() < crossProb) {
                    edges.push([nodeGrid[p][l], nodeGrid[p + 1][l]]);
                }
            }
            // Occasional long jump (skip one path)
            if (paths.length >= 3 && l === Math.floor(layers / 2) && random() < 0.2) {
                const skip = Math.floor(random() * (paths.length - 2)) + 1;
                edges.push([nodeGrid[0][l], nodeGrid[skip + 1][l]]);
            }
        }

        // Fix IDs to be sequential for safety
        // (Our logic mostly kept them sequential but goalId is 99)
        const finalNodes = nodes.map((n, idx) => ({ ...n, id: idx }));

        // Remap edges
        const idMap = {};
        nodes.forEach((n, idx) => idMap[n.id] = idx);

        const finalEdges = edges.map(e => [idMap[e[0]], idMap[e[1]]]);

        // Center the topology on screen
        const xs = finalNodes.map(n => n.x);
        const ys = finalNodes.map(n => n.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        const offsetX = 600 - centerX;
        const offsetY = 350 - centerY;

        finalNodes.forEach(n => {
            n.x += offsetX;
            n.y += offsetY;
        });

        // Use the new Betweenness Centrality identification
        const finalChokepoints = this.identifyChokepoints(finalNodes, finalEdges, [0], [finalNodes.length - 1]);

        // Update node types
        finalNodes.forEach((node, i) => {
            if (finalChokepoints.includes(i)) {
                node.type = 'chokepoint';
            } else if (node.type === 'chokepoint') {
                node.type = 'normal';
            }
        });

        return {
            name: 'Stackelberg Mesh ' + Math.floor(random() * 1000),
            nodes: finalNodes,
            edges: finalEdges,
            sources: [0],
            goals: [finalNodes.length - 1],
            chokepoints: finalChokepoints
        };
    }

    /**
     * Generate Procedural Map for RL (ported from EconomicRL.js)
     */
    static generateRLTopology(type, currentAction, strategy) {
        console.log(`Building procedural topology: ${type}`);

        const width = 1200;
        const height = 700;
        const marginX = 100;
        const marginY = 100;
        const usableWidth = width - 2 * marginX - 250;
        const usableHeight = height - 2 * marginY;

        const nodes = [];
        const edges = [];
        const chokepoints = [];

        // Source
        nodes.push({ id: 0, x: marginX, y: height / 2, type: 'source' });

        // Config
        let numLayers = 3;
        let nodesPerLayer = 2;
        let randomness = 0;

        if (type === 'DIRECT') {
            numLayers = 3;
            nodesPerLayer = 2;
            randomness = 0.1;
        } else if (type === 'EVASIVE') {
            numLayers = 5;
            nodesPerLayer = 3;
            randomness = 0.4;
        } else if (type === 'SPREAD') {
            numLayers = 4;
            nodesPerLayer = 2;
            randomness = 0.8;
        } else { // BALANCED
            numLayers = 4;
            nodesPerLayer = 2;
            randomness = 0.3;
        }

        // Generate Grid Layers
        const layerWidth = usableWidth / (numLayers + 1);
        const layerIndices = [];
        let currentIndex = 1;

        for (let i = 1; i <= numLayers; i++) {
            const layerX = marginX + i * layerWidth;
            const currentLayer = [];

            let count = nodesPerLayer;
            if (type === 'EVASIVE' && i % 2 === 0) count++;

            const spacing = usableHeight / (count + 1);

            for (let j = 0; j < count; j++) {
                let y = marginY + (j + 1) * spacing;

                if (type === 'SPREAD') {
                    if (j === 0) y = marginY + 50;
                    if (j === count - 1) y = height - marginY - 50;
                }

                y += (Math.random() - 0.5) * 100 * randomness;
                const x = layerX + (Math.random() - 0.5) * 60 * randomness;

                y = Math.max(50, Math.min(height - 50, y));

                let nodeType = 'normal';
                if (Math.random() < 0.3 || (type === 'BALANCED' && j === 0)) {
                    nodeType = 'chokepoint';
                }

                nodes.push({ id: currentIndex, x: Math.floor(x), y: Math.floor(y), type: nodeType });
                currentLayer.push(currentIndex);
                if (nodeType === 'chokepoint') chokepoints.push(currentIndex);
                currentIndex++;
            }
            layerIndices.push(currentLayer);
        }

        // Goal
        const goalIndex = currentIndex;
        nodes.push({ id: goalIndex, x: width - 250 - marginX, y: height / 2, type: 'goal' });

        // Edges: Source -> Layer 1
        layerIndices[0].forEach(idx => edges.push([0, idx]));

        // Edges: Layer -> Layer
        for (let i = 0; i < layerIndices.length - 1; i++) {
            const current = layerIndices[i];
            const next = layerIndices[i + 1];

            if (type === 'DIRECT') {
                current.forEach(u => next.forEach(v => edges.push([u, v])));
            } else {
                current.forEach(u => {
                    const target = next[Math.floor(Math.random() * next.length)];
                    edges.push([u, target]);
                    if (Math.random() < 0.5) {
                        const target2 = next[Math.floor(Math.random() * next.length)];
                        if (target !== target2) edges.push([u, target2]);
                    }
                });
                next.forEach(v => {
                    const hasInput = edges.some(e => e[1] === v);
                    if (!hasInput) {
                        const source = current[Math.floor(Math.random() * current.length)];
                        edges.push([source, v]);
                    }
                });
            }
        }

        // Edges: Last Layer -> Goal
        layerIndices[layerIndices.length - 1].forEach(idx => edges.push([idx, goalIndex]));

        // Cross connections
        if (type !== 'DIRECT' && type !== 'SPREAD') {
            for (let i = 0; i < layerIndices.length; i++) {
                const layer = layerIndices[i];
                if (layer.length > 1) {
                    for (let k = 0; k < layer.length - 1; k++) {
                        if (Math.random() < 0.3) {
                            edges.push([layer[k], layer[k + 1]]);
                        }
                    }
                }
            }
        }

        // Use robust chokepoint identification
        const identifiedChokepoints = this.identifyChokepoints(nodes, edges, [0], [goalIndex]);

        nodes.forEach((node, i) => {
            if (identifiedChokepoints.includes(i)) {
                node.type = 'chokepoint';
            }
        });

        return {
            name: `Smart ${type} (${currentAction})`,
            nodes: nodes,
            edges: edges,
            sources: [0],
            goals: [goalIndex],
            chokepoints: identifiedChokepoints,
            aiReasoning: this.getReasoning(type, strategy)
        };
    }

    static getReasoning(topoType, playerStrategy) {
        if (topoType === 'DIRECT') return "Detected weakness to speed. Rushing core with direct paths.";
        if (topoType === 'SPREAD') return "Firewall concentration detected. Spreading nodes to minimize AOE impact.";
        if (topoType === 'EVASIVE') return "IDS heavy defense detected. Using evasive routing to delay detection.";
        return "Balanced approach for general testing.";
    }
}
