# Research: Ant Colony Optimization (ACO) in DiEtalase

This document analyzes the implementation of the Ant Colony Optimization (ACO) algorithm within the DiEtalase backend, specifically used for the "Multi-Stop Shopping List" feature.

## 1. Objective
The goal of the ACO implementation is to solve a variation of the **Traveling Salesperson Problem (TSP)** combined with the **Set Cover Problem**. 
Specifically: Find the shortest physical route that visits enough stores to acquire all items on a user's multi-product shopping list.

## 2. Theoretical Architecture
The implementation follows the standard ACO meta-heuristic:
1.  **Initialization**: Create a pheromone matrix between all relevant store nodes.
2.  **Ant Construction**: A group of simulated ants traverse the graph.
3.  **Heuristic Decision**: Ants choose the next store based on:
    *   **Pheromone Level**: Past "successful" paths.
    *   **Heuristic Desirability**: How close the store is AND how many *new* items it provides.
4.  **Pheromone Update**: Successful ants (those who found all items) leave trails; pheromones on poor paths evaporate over time.

---

## 3. Implementation Workflow

### Phase A: Inventory Mapping (Data Preparation)
Before the algorithm runs, the system must identify which stores carry which items.

```javascript
const {
  storeInventory,   // Map<sid, Set<item_name>>
  allStoreIds,      // Set<sid>
  itemProductMap,   // Map<item_name, {pid, sid}[]>
} = await buildInventoryMaps(items);
```
**Logic:**
- For each item, a **Hybrid Search** is performed:
    1.  **Keyword Match**: Highest priority.
    2.  **Semantic Search (Vector)**: Finds similar products if names aren't identical.
- A threshold (`SEMANTIC_DISTANCE_THRESHOLD`) is applied to filter irrelevant results.

### Phase B: Graph Construction
The "nodes" in the graph consist of:
1.  **User Node**: Starting point (Latitude/Longitude).
2.  **Store Nodes**: All stores stocking at least one item from the list.

A **Distance Matrix** is pre-computed using the **Haversine Formula** to calculate the distance between every pair of nodes in kilometers.

---

## 4. The ACO Algorithm Core
Located in `services/shoppingListService.js`, the algorithm is controlled by these parameters:

| Parameter | Value | Description |
| :--- | :--- | :--- |
| `numAnts` | 30 | Number of ants per iteration. |
| `iterations` | 50 | How many times the group resets and learns. |
| `alpha` | 1.0 | Importance of Pheromones (Memory). |
| `beta` | 2.0 | Importance of Heuristics (Proximity + Reward). |
| `evaporation` | 0.1 | Rate at which old paths are forgotten. |

### Decision Logic (Probability)
The probability of an ant moving from `node I` to `node J` is calculated as:
$P_{ij} \propto (\text{pheromone}_{ij})^\alpha \times (\text{heuristic}_{ij})^\beta$

**Custom Heuristic:**
The DiEtalase implementation uses a specialized heuristic to prioritize stores that have more "missing" items:
```javascript
const heuristic = (1.0 / distance) * (1.0 + newItemsCount * 2);
```
*   `distance`: Shorter distance = higher desirability.
*   `newItemsCount`: Number of items on the user's list that this store has, but the ant hasn't collected yet. It is weighted by **2x** to encourage "one-stop" efficiency.

### Pheromone Update
After all ants in an iteration finish:
1.  **Evaporation**: All trails fade by 10%.
2.  **Deposit**: Only paths from ants who successfully found **all** items receive new pheromones.
    *   `pheromoneDeposit = Q / totalDistance` (Shorter total paths deposit more).

---

## 5. Optimization Scenarios

The service handles three distinct outcomes:

1.  **ONE_STOP_SHOP**: 
    - Found during Phase A. 
    - If a single store has 100% of the items, the algorithm returns immediately with that store to minimize complexity.

2.  **MULTI_STOP_ROUTE**:
    - The result of a successful ACO run.
    - Returns a sequence of `stops`, each containing:
        *   Store details (name, address, location).
        *   The specific items to buy at that particular stop.

3.  **NO_SOLUTION**:
    - Returned if items are not found in the database or no efficient route can be constructed.

---

## 6. Full Code Implementation
The following code is taken from [`services/shoppingListService.js`](file:///home/petrachristalbert/Development/Nodejs/DiEtalase-Nodejs/services/shoppingListService.js) and represents the complete backend logic for the ACO-based shopping list solver.

```javascript
// services/shoppingListService.js
const knex = require("../db/knex");
const logger = require("../config/logger");
const { generateEmbedding } = require("./embeddingService");
const vectorCache = require("./vectorCacheService");

// --- ACO Configuration ---
const ACO_CONFIG = {
  numAnts: 30,
  iterations: 50,
  alpha: 1.0,
  beta: 2.0,
  evaporation: 0.1,
  q: 100,
};

/**
 * Main Function: findShoppingListSolution
 * Called by chatController to calculate the best route for multiple items.
 */
const findShoppingListSolution = async (items, userLat, userLng) => {
  const numItemsRequired = items.length;
  
  // 1. Build Inventory Maps (find which stores have which items)
  const {
    storeInventory,
    allStoreIds,
    itemProductMap,
    productStoreMap,
  } = await buildInventoryMaps(items);

  if (allStoreIds.size === 0) {
    return {
      responseText: "Saya tidak dapat menemukan toko yang menjual barang-barang tersebut.",
      resultData: { mode: "NO_SOLUTION" },
    };
  }

  // 2. Check for One-Stop Shop (Efficiency shortcut)
  const oneStopShops = [];
  for (const [sid, stockedItems] of storeInventory.entries()) {
    if (stockedItems.size === numItemsRequired) {
      oneStopShops.push(sid);
    }
  }

  if (oneStopShops.length > 0) {
    const closestStore = await findClosestStore(oneStopShops, userLat, userLng);
    const itemsToBuy = await getProductDetailsForOneStopShop(closestStore.sid, items, itemProductMap);
    return {
      responseText: `Kabar baik! Semua ${numItemsRequired} barang ada di satu toko: ${closestStore.name}.`,
      resultData: {
        mode: "ONE_STOP_SHOP",
        totalItemsFound: numItemsRequired,
        store: { ...closestStore, itemsToBuy },
      },
    };
  }

  // 3. Multi-Stop Route Planning via ACO
  const { nodes, distanceMatrix, nodeInventory, nodeItemProductMap } =
    await buildNodeListAndMatrix(Array.from(allStoreIds), userLat, userLng, storeInventory, productStoreMap);

  const { bestPath, bestDistance, bestShoppingBag } = runACO(
    nodes, distanceMatrix, nodeInventory, nodeItemProductMap, numItemsRequired
  );

  if (!bestPath || bestPath.length === 0) {
    return {
      responseText: "Saya tidak dapat menemukan rute yang efisien.",
      resultData: { mode: "NO_SOLUTION" },
    };
  }

  return await buildMultiStopResponse(bestPath, bestDistance, bestShoppingBag, numItemsRequired);
};

/**
 * Core Algorithm: runACO
 */
const runACO = (nodes, distanceMatrix, nodeInventory, nodeItemProductMap, numItemsRequired) => {
  const numNodes = nodes.length;
  let pheromones = Array(numNodes).fill(0).map(() => Array(numNodes).fill(1.0));
  let bestPath = [];
  let bestDistance = Infinity;
  let bestShoppingBag = new Map();

  for (let i = 0; i < ACO_CONFIG.iterations; i++) {
    let allAntPaths = [];
    for (let ant = 0; ant < ACO_CONFIG.numAnts; ant++) {
      const antPath = buildAntPath(nodes, distanceMatrix, pheromones, nodeInventory, nodeItemProductMap, numItemsRequired);
      allAntPaths.push(antPath);

      if (antPath.distance < bestDistance) {
        bestDistance = antPath.distance;
        bestPath = antPath.path;
        bestShoppingBag = antPath.shoppingBag;
      }
    }

    // Evaporation
    for (let row = 0; row < numNodes; row++) {
      for (let col = 0; col < numNodes; col++) {
        pheromones[row][col] *= (1.0 - ACO_CONFIG.evaporation);
      }
    }
    // Pheromone Deposit
    allAntPaths.forEach(ant => {
      if (ant.path.length > 1) {
        const deposit = ACO_CONFIG.q / ant.distance;
        for (let j = 0; j < ant.path.length - 1; j++) {
          pheromones[ant.path[j]][ant.path[j+1]] += deposit;
          pheromones[ant.path[j+1]][ant.path[j]] += deposit;
        }
      }
    });
  }

  const storeIdPath = bestPath.filter(idx => nodes[idx].type === "store").map(idx => nodes[idx].id);
  return { bestPath: storeIdPath, bestDistance, bestShoppingBag };
};

/**
 * Ant Brain: buildAntPath
 */
const buildAntPath = (nodes, distanceMatrix, pheromones, nodeInventory, nodeItemProductMap, numItemsRequired) => {
  let path = [0]; // User start
  let visited = new Set([0]);
  let collectedItems = new Set();
  let currentDistance = 0;
  let currentNode = 0;
  let shoppingBag = new Map();

  while (collectedItems.size < numItemsRequired) {
    const nextNode = selectNextNode(currentNode, visited, collectedItems, nodes, distanceMatrix, pheromones, nodeInventory);
    if (nextNode === -1) break;

    const itemsAtNode = nodeInventory.get(nextNode) || new Set();
    const productsAtNode = nodeItemProductMap.get(nextNode) || new Map();
    let pickedPids = [];

    itemsAtNode.forEach(item => {
      if (!collectedItems.has(item)) {
        collectedItems.add(item);
        if (productsAtNode.has(item)) pickedPids.push(productsAtNode.get(item)[0]);
      }
    });

    visited.add(nextNode);
    path.push(nextNode);
    currentDistance += distanceMatrix[currentNode][nextNode];
    if (pickedPids.length > 0) shoppingBag.set(nodes[nextNode].id, pickedPids);
    currentNode = nextNode;
  }

  return collectedItems.size === numItemsRequired 
    ? { path, distance: currentDistance, shoppingBag } 
    : { path: [], distance: Infinity, shoppingBag: new Map() };
};

/**
 * Probabilistic Selection: selectNextNode
 */
const selectNextNode = (currentNode, visited, collectedItems, nodes, distanceMatrix, pheromones, nodeInventory) => {
  const probabilities = [];
  let totalProb = 0;

  for (let nextNode = 1; nextNode < nodes.length; nextNode++) {
    if (visited.has(nextNode)) continue;

    const distance = distanceMatrix[currentNode][nextNode];
    if (distance === 0) continue;

    const pheromone = pheromones[currentNode][nextNode];
    const itemsAtNode = nodeInventory.get(nextNode) || new Set();
    let newItemsCount = 0;
    itemsAtNode.forEach(item => { if (!collectedItems.has(item)) newItemsCount++; });

    const heuristic = (1.0 / distance) * (1.0 + newItemsCount * 2);
    const prob = Math.pow(pheromone, ACO_CONFIG.alpha) * Math.pow(heuristic, ACO_CONFIG.beta);

    probabilities.push({ node: nextNode, prob });
    totalProb += prob;
  }

  if (totalProb === 0) return -1;
  const rand = Math.random() * totalProb;
  let cumulative = 0;
  for (const p of probabilities) {
    cumulative += p.prob;
    if (rand <= cumulative) return p.node;
  }
  return -1;
};
```

## 7. Integration with Gemini
The ACO doesn't work in isolation. **Gemini Flash** acts as the Natural Language interface:
1.  **Parser**: Gemini extracts raw items from a user's text.
2.  **Orchestrator**: Gemini decides to call the `findShoppingListSolution` tool.
3.  **Presenter**: Once ACO returns the JSON route, Gemini explains the choice.
