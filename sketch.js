// Global Variables
let colonies = [];         // Array holding multiple Colony objects
let pheromoneGrid;         // One pheromone grid for the entire canvas
let foods = [];            // Array to hold food objects
let colonyCount = 10;       // You can set this to any number between 2 and 5
let maxFood = 100;          // Maximum food items at any time

function setup() {
  createCanvas(1200, 700);
  pheromoneGrid = new PheromoneGrid(width, height, 10);

  // Generate non-overlapping nest positions
  let nestPositions = generateNonOverlappingPositions(colonyCount, 80); // 80 px min distance

  // Create multiple colonies at these positions
  colonies = [];
  for (let i = 0; i < nestPositions.length; i++) {
    let pos = nestPositions[i];
    colonies.push(new Colony(pos.x, pos.y));
  }

  // Create fewer food items
  foods = [];
  for (let i = 0; i < maxFood; i++) {
    foods.push(new Food(random(50, width - 50), random(50, height - 50)));
  }
}

function draw() {
  background(220);
  
  // Update and display pheromone grid, food, etc.
  pheromoneGrid.update(); 
  pheromoneGrid.display();
  
  for (let food of foods) {
    food.display();
  }
  
  // Update and display each colony
  for (let colony of colonies) {
    colony.update();
    colony.display();
  }
  
  // Remove colonies that are considered dead (no ants left)
  removeDeadColonies();

  // Draw the scoreboard, which now will only include living colonies
  drawScoreboard();
  drawExtendedGraphs();
  
  // Other functions: checkForNewColonies(), etc.
  checkForNewColonies();
  if (frameCount % 600 === 0) {
    for (let i = 0; i < colonies.length; i++) {
      let metrics = colonies[i].computeFitnessMetrics();
      console.log(`Colony ${i + 1} Fitness:`, metrics);
    }
  }
}



// Function to draw scoreboard
function drawScoreboard() {
  push();
  // Use Courier New for alignment if desired
  textFont('Courier New');
  textSize(12);
  textAlign(LEFT, CENTER);
  
  let rowHeight = 20;
  // Set the top-left corner of the scoreboard
  let tableX = 10;
  let tableY = 10;
  
  // Define fixed x-coordinates for each column (adjust as needed)
  // The columns: Colony, Score, Ants, Spawn, Trail Bias, Explore Bias, Resources
  const colX = [0, 50, 100, 150, 220, 300, 380];
  
  // The number of rows: header + one row per colony
  let numRows = colonies.length + 1;
  // Set scoreboard width and height based on the columns and rows
  let scoreboardWidth = colX[colX.length - 1] + 70;
  let scoreboardHeight = rowHeight * numRows + 10;
  
  // Draw the background for the scoreboard
  fill(255, 200);
  stroke(0);
  rect(tableX, tableY, scoreboardWidth, scoreboardHeight);
  
  // Draw header row text
  fill(0);
  noStroke();
  // The header row is vertically centered in the first row
  let headerY = tableY + rowHeight / 2;
  text("Colony",      tableX + colX[0], headerY);
  text("Score",       tableX + colX[1], headerY);
  text("Ants",        tableX + colX[2], headerY);
  text("Spawn",       tableX + colX[3], headerY);
  text("Trail Bias",  tableX + colX[4], headerY);
  text("Explore Bias",tableX + colX[5], headerY);
  text("Resources",   tableX + colX[6], headerY);
  
  // Draw data rows for each colony
  for (let i = 0; i < colonies.length; i++) {
    let c = colonies[i];
    let rowY = tableY + rowHeight * (i + 1) + rowHeight / 2;
    
    // Use the colony's own dark color for its row text
    fill(c.color);
    text(i + 1,                             tableX + colX[0], rowY);
    text(c.score,                           tableX + colX[1], rowY);
    text(c.ants.length,                     tableX + colX[2], rowY);
    text(c.genome.spawnRate,                tableX + colX[3], rowY);
    text(nf(c.genome.trailFollowingBias, 1, 2), tableX + colX[4], rowY);
    text(nf(c.genome.explorationBias, 1, 2),  tableX + colX[5], rowY);
    text(nf(c.colonyResources, 1, 2),         tableX + colX[6], rowY);
  }
  
  pop();
}

function generateNonOverlappingPositions(count, minDist) {
  const positions = [];
  let attempts = 0;
  const maxAttempts = 10000;

  while (positions.length < count && attempts < maxAttempts) {
    let x = random(100, width - 100);
    let y = random(100, height - 100);
    let good = true;
    for (let p of positions) {
      if (dist(p.x, p.y, x, y) < minDist) {
        good = false;
        break;
      }
    }
    if (good) {
      positions.push({ x, y });
    }
    attempts++;
  }

  if (positions.length < count) {
    console.warn("Could not place all colonies with non-overlapping constraints.");
  }
  return positions;
}

function checkForNewColonies() {
  let maxColonies = 20;           // Maximum number of colonies allowed
  let newColonyThreshold = 100;   // Score threshold to trigger a new colony spawn
  
  // Loop through each colony (using a copy of the array if needed)
  for (let i = 0; i < colonies.length; i++) {
    let c = colonies[i];
    // If this colony's score exceeds the threshold and we haven't reached the max colony count:
    if (c.score > newColonyThreshold && colonies.length < maxColonies) {
      // Create an offset vector to position the new colony near the parent's nest
      let offset = p5.Vector.random2D().mult(50); // 50 px away in a random direction
      let newX = constrain(c.nest.x + offset.x, 50, width - 50);
      let newY = constrain(c.nest.y + offset.y, 50, height - 50);
      
      // Create a new genome by cloning parent's genome with slight mutations
      let newGenome = Object.assign({}, c.genome);
      newGenome.antSpeed = constrain(newGenome.antSpeed + random(-0.1, 0.1), 0.5, 2.0);
      newGenome.pheromoneStrength = max(0.5, newGenome.pheromoneStrength + random(-0.2, 0.2));
      newGenome.spawnRate = constrain(newGenome.spawnRate + floor(random(-10, 10)), 30, 180);
      // You can also adjust explorationBias, trailFollowingBias, etc.
      
      // Create the new colony at the new position
      let newColony = new Colony(newX, newY);
      // Inherit the mutated genome from the parent colony
      newColony.genome = newGenome;
      
      // Optionally, set initial resources for the new colony (adjust as needed)
      newColony.colonyResources = 5;
      
      // Add the new colony to the global colonies array
      colonies.push(newColony);
      
      // Optionally, reduce the parent's score by the threshold amount to limit continuous spawning
      c.score -= newColonyThreshold;
      
      console.log("New colony spawned at", newX, newY, "with genome:", newGenome);
    }
  }
}

function removeDeadColonies() {
  // Loop backwards to safely remove elements from the array.
  for (let i = colonies.length - 1; i >= 0; i--) {
    // Define a colony as dead if it has zero ants.
    // You could add more conditions if needed, e.g., colony.colonyResources <= 0.
    if (colonies[i].ants.length === 0) {
      colonies.splice(i, 1);
    }
  }
}


function drawExtendedGraphs() {
  push();
  
  // Define graph area settings for bottom left corner
  let margin = 10;
  let graphWidth = 380;
  let graphHeight = 120;
  // Position the graph at the bottom left: x = margin, y = height - graphHeight - margin
  let graphX = margin;
  let graphY = height - graphHeight - margin;
  
  // Draw the background rectangle for the graph area
  fill(255, 200);
  stroke(0);
  rect(graphX, graphY, graphWidth, graphHeight);
  
  // For each colony, draw two lines: one for population (solid) and one for average energy (dashed or with transparency)
  for (let i = 0; i < colonies.length; i++) {
    let col = colonies[i];
    let popHistory = col.populationHistory;
    let energyHistory = col.energyHistory;
    
    // Draw population history line
    stroke(col.color);
    noFill();
    beginShape();
    for (let j = 0; j < popHistory.length; j++) {
      let x = map(j, 0, popHistory.length - 1, graphX, graphX + graphWidth);
      // Assuming max population is 50; adjust if needed.
      let y = map(popHistory[j], 0, 50, graphY + graphHeight, graphY);
      vertex(x, y);
    }
    endShape();
    
    // Draw average energy history, using the colony color with transparency
    stroke(red(col.color), green(col.color), blue(col.color), 150);
    beginShape();
    for (let j = 0; j < energyHistory.length; j++) {
      let x = map(j, 0, energyHistory.length - 1, graphX, graphX + graphWidth);
      // Assuming max energy is 150; adjust if needed.
      let y = map(energyHistory[j], 0, 150, graphY + graphHeight, graphY);
      vertex(x, y);
    }
    endShape();
  }
  
  pop();
}


