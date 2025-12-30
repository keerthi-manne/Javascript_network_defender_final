/**
 * PATHFINDING.JS - A* Pathfinding Algorithm
 * Finds optimal paths through network topology
 */

import Graphics from './Graphics.js';

export class Pathfinding {
    /**
     * Find path from source to goal using A* algorithm
     * @param {Array} nodes - Array of node positions [{x, y}, ...]
     * @param {Array} edges - Array of edge connections [[0,1], [1,2], ...]
     * @param {number} start - Start node index
     * @param {number} goal - Goal node index
     * @returns {Array} Path as array of node indices
     */
    static findPath(nodes, edges, start, goal, randomize = false) {
        if (start === goal) return [start];

        // Build adjacency list
        const graph = this.buildGraph(edges, nodes.length);

        // A* algorithm
        const openSet = new Set([start]);
        const cameFrom = new Map();
        const gScore = new Map();
        const fScore = new Map();

        // Initialize scores
        for (let i = 0; i < nodes.length; i++) {
            gScore.set(i, Infinity);
            fScore.set(i, Infinity);
        }
        gScore.set(start, 0);
        fScore.set(start, this.heuristic(nodes[start], nodes[goal]));

        while (openSet.size > 0) {
            // Get node with lowest fScore
            let current = null;
            let lowestF = Infinity;
            for (const node of openSet) {
                const f = fScore.get(node);
                if (f < lowestF) {
                    lowestF = f;
                    current = node;
                }
            }

            // Goal reached
            if (current === goal) {
                return this.reconstructPath(cameFrom, current);
            }

            openSet.delete(current);

            // Check neighbors
            const neighbors = graph.get(current) || [];
            for (const neighbor of neighbors) {
                let cost = Graphics.distance(nodes[current].x, nodes[current].y, nodes[neighbor].x, nodes[neighbor].y);

                // Add noise to cost if randomize is true
                // This encourages path diversity among equal or near-equal paths
                if (randomize) {
                    cost *= (1 + (Math.random() * 0.4 - 0.2)); // +/- 20% variation
                }

                const tentativeGScore = gScore.get(current) + cost;

                if (tentativeGScore < gScore.get(neighbor)) {
                    cameFrom.set(neighbor, current);
                    gScore.set(neighbor, tentativeGScore);
                    fScore.set(neighbor, tentativeGScore +
                        this.heuristic(nodes[neighbor], nodes[goal]));
                    openSet.add(neighbor);
                }
            }
        }

        // No path found
        return [];
    }

    /**
     * Build adjacency list from edges
     */
    static buildGraph(edges, nodeCount) {
        const graph = new Map();
        for (let i = 0; i < nodeCount; i++) {
            graph.set(i, []);
        }

        for (const [from, to] of edges) {
            graph.get(from).push(to);
            // Bidirectional
            graph.get(to).push(from);
        }

        return graph;
    }

    /**
     * Reconstruct path from cameFrom map
     */
    static reconstructPath(cameFrom, current) {
        const path = [current];
        while (cameFrom.has(current)) {
            current = cameFrom.get(current);
            path.unshift(current);
        }
        return path;
    }

    /**
     * Heuristic function (Euclidean distance)
     */
    static heuristic(nodeA, nodeB) {
        return Graphics.distance(nodeA.x, nodeA.y, nodeB.x, nodeB.y);
    }

    /**
     * Check if an edge between two nodes is on the perimeter
     */
    static isPerimeterEdge(nodeA, nodeB) {
        const avgX = (nodeA.x + nodeB.x) / 2;
        const avgY = (nodeA.y + nodeB.y) / 2;
        
        // Perimeter thresholds (approximate for 1200x700 canvas with margins)
        const leftThreshold = 200;
        const rightThreshold = 1000;
        const topThreshold = 200;
        const bottomThreshold = 500;
        
        return avgX < leftThreshold || avgX > rightThreshold || 
               avgY < topThreshold || avgY > bottomThreshold;
    }
}

export default Pathfinding;
