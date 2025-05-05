// sketch.js

let colonies = [];         // Array holding multiple Colony objects
let pheromoneGrid;         // One pheromone grid for the entire canvas
let foods = [];            // Array to hold food objects
let colonyCount = 10;       
let maxFood = 100;          // Maximum food items at any time
let deadAnts = [];


let foodZones = [
  { x: 1000, y:  80, w: 150, h: 100, count: 50 },
  { x: 1400, y: 100, w: 130, h: 120, count: 60 },
  { x: 600, y:  50, w: 120, h: 100, count: 55 },
  { x: 500, y: 600, w: 160, h:  90, count: 50 },
  { x: 600, y: 350, w: 140, h: 110, count: 60 }
];

function setup() {
  createCanvas(2000, 1000);
  pheromoneGrid = new PheromoneGrid(width, height, 10);

  // Generate non-overlapping nest positions
  let nestPositions = generateNonOverlappingPositions(colonyCount, 80);

  // Create initial colonies
  colonies = [];
  for (let i = 0; i < nestPositions.length; i++) {
    let pos = nestPositions[i];
    colonies.push(new Colony(pos.x, pos.y));
  }

  // Populate initial food items
  foods = [];
  for (let zone of foodZones) {
    for (let i = 0; i < zone.count; i++) {
      let fx = random(zone.x, zone.x + zone.w);
      let fy = random(zone.y, zone.y + zone.h);
      foods.push(new Food(fx, fy));
    }
  }
}

function draw() {
  background(220);

  // Draw food zones
  noFill();
  stroke(0, 150, 0);
  strokeWeight(2);
  for (let z of foodZones) {
    rect(z.x, z.y, z.w, z.h);
  }
  
  // Display dead ant markers
  for (let i = deadAnts.length - 1; i >= 0; i--) {
    let d = deadAnts[i];
    push();
    stroke(100);
    strokeWeight(2);
    line(d.x - 5, d.y - 5, d.x + 5, d.y + 5);
    line(d.x - 5, d.y + 5, d.x + 5, d.y - 5);
    pop();

    d.timer--;
    if (d.timer <= 0) {
      deadAnts.splice(i, 1);
    }
  }


  // Update and display pheromone grid
  pheromoneGrid.update();
  pheromoneGrid.display();

  // Display all food
  for (let food of foods) {
    food.display();
  }

  // Update and display all colonies
  for (let colony of colonies) {
    colony.update();
    colony.display();
  }

  

  // Remove any extinct colonies
  removeDeadColonies();

  // Draw stats table and graphs
  drawScoreboard();
  drawExtendedGraphs();
  drawEnergyMeters();


  // Handle colony reproduction
  checkForNewColonies();

  // Debug log of fitness every 600 frames
  if (frameCount % 600 === 0) {
    for (let c of colonies) {
      let metrics = c.computeFitnessMetrics();
      console.log(`Colony ${c.id} Fitness:`, metrics);
    }
  }
}

function drawEnergyMeters() {
  push();
  textFont('Courier New');
  textSize(12);
  textAlign(LEFT, CENTER);

  let startX = width - 250;
  let startY = 10;
  let rowHeight = 20;

  fill(255, 220);
  stroke(0);
  rect(startX - 10, startY - 10, 240, colonies.length * rowHeight + 30);

  for (let i = 0; i < colonies.length; i++) {
    let c = colonies[i];
    let y = startY + i * rowHeight;

    let energy = c.energyHistory[c.energyHistory.length - 1] || 0;
    let resources = c.colonyResources;

    fill(0);
    noStroke();
    text(`Colony ${c.id}`, startX, y);
    
    // Energy bar
    fill(100);
    rect(startX + 90, y - 6, 100, 10);
    fill(0, 200, 0);
    rect(startX + 90, y - 6, map(energy, 0, 100, 0, 100), 10);

    // Colony resource bar
    fill(100);
    let resBarWidth = constrain(map(resources, 0, 100, 0, 100), 0, 100);
    rect(startX + 90, y + 6, resBarWidth, 5);
    fill(0);
    text(nf(resources, 1, 1), startX + 195, y + 6);

  }

  pop();
}


function drawScoreboard() {
  push();
  textFont('Courier New');
  textSize(12);
  textAlign(LEFT, CENTER);

  let rowHeight = 20;
  let tableX = 10, tableY = 10;
  const colX = [0, 60, 120, 180, 260, 350]; // Removed last column

  let numRows = colonies.length + 1;
  let scoreboardWidth = colX[colX.length - 1] + 80; // Adjusted width
  let scoreboardHeight = rowHeight * numRows + 10;

  // Background
  fill(255, 200);
  stroke(0);
  rect(tableX, tableY, scoreboardWidth, scoreboardHeight);

  // Header
  fill(0);
  noStroke();
  let headerY = tableY + rowHeight / 2;
  text("Colony ID",    tableX + colX[0], headerY);
  text("Score",        tableX + colX[1], headerY);
  text("Ants",         tableX + colX[2], headerY);
  text("Spawn",        tableX + colX[3], headerY);
  text("Trail Bias",   tableX + colX[4], headerY);
  text("Explore Bias", tableX + colX[5], headerY);

  // Rows
  for (let i = 0; i < colonies.length; i++) {
    let c = colonies[i];
    let rowY = tableY + rowHeight * (i + 1) + rowHeight / 2;

    fill(c.color);
    text(c.id,                             tableX + colX[0], rowY);
    text(nf(c.score, 1, 1), tableX + colX[1], rowY);
    text(c.ants.length,                    tableX + colX[2], rowY);
    text(c.genome.spawnRate,               tableX + colX[3], rowY);
    text(nf(c.genome.trailFollowingBias, 1, 2), tableX + colX[4], rowY);
    text(nf(c.genome.explorationBias,   1, 2), tableX + colX[5], rowY);
  }

  pop();
}

function generateNonOverlappingPositions(count, minDist) {
  const buffer = 50;
  const positions = [];
  let attempts = 0, maxAttempts = 10000;

  while (positions.length < count && attempts < maxAttempts) {
    attempts++;
    let x = random(100, width - 100);
    let y = random(100, height - 100);

    // Avoid food zones
    if (foodZones.some(z =>
        x >= z.x - buffer && x <= z.x + z.w + buffer &&
        y >= z.y - buffer && y <= z.y + z.h + buffer
    )) continue;

    // Avoid other nests
    let ok = positions.every(p =>
      dist(p.x, p.y, x, y) >= minDist
    );
    if (ok) positions.push({ x, y });
  }

  return positions;
}

// sketch.js

function checkForNewColonies() {
  const maxColonies        = 20;
  const spawnThreshold     = 100;   // score needed to bud
  const minNestDist        = 100;   // min distance between any two nests
  const maxSpawnRadius     = 200;   // how far from parent it can bud
  const avoidFoodDist      = 50;    // min distance from any food
  const maxAttempts        = 100;

  for (let i = colonies.length - 1; i >= 0; i--) {
    let parent = colonies[i];
    if (parent.score > spawnThreshold && colonies.length < maxColonies) {
      let newX, newY, attempts = 0;

      // Try up to maxAttempts to find a valid spot
      do {
        let theta = random(0, TWO_PI);
        let r     = random(minNestDist, maxSpawnRadius);
        newX = constrain(parent.nest.x + cos(theta) * r, 50, width - 50);
        newY = constrain(parent.nest.y + sin(theta) * r, 50, height - 50);
        attempts++;
      }
      while (
        attempts < maxAttempts &&
        (
          // too close to any existing nest?
          colonies.some(c => dist(c.nest.x, c.nest.y, newX, newY) < minNestDist)
          ||
          // too close to any food?
          foods.some(f => dist(f.pos.x, f.pos.y, newX, newY) < avoidFoodDist)
        )
      );

      // Only actually spawn if we found a good spot
      if (attempts < maxAttempts) {
        let child = new Colony(newX, newY, parent);
        // inherit & mutate genome as before…
        child.genome = {
          ...parent.genome,
          antSpeed:          constrain(parent.genome.antSpeed          + random(-0.1, 0.1), 0.5, 2.0),
          pheromoneStrength: max(0.5, parent.genome.pheromoneStrength + random(-0.2, 0.2)),
          spawnRate:         constrain(parent.genome.spawnRate         + floor(random(-10, 10)), 30, 180)
        };
        child.colonyResources = 5;
        colonies.push(child);
        parent.score -= spawnThreshold;
      }
      // otherwise give up this frame and wait until next time
    }
  }
}

function removeDeadColonies() {
  for (let i = colonies.length - 1; i >= 0; i--) {
    if (colonies[i].ants.length === 0 && !colonies[i].aggressive) {
      colonies.splice(i, 1);
    }
  }
}

function drawExtendedGraphs() {
  push();

  let margin      = 10;
  let graphWidth  = 380;
  let graphHeight = 120;
  let graphX      = margin;
  let graphY      = height - graphHeight - margin;

  // Background
  fill(255, 200);
  stroke(0);
  rect(graphX, graphY, graphWidth, graphHeight);

  // Clip to our graph area
  drawingContext.save();
  drawingContext.beginPath();
  drawingContext.rect(graphX, graphY, graphWidth, graphHeight);
  drawingContext.clip();

  // Draw lines
  for (let i = 0; i < colonies.length; i++) {
    let col           = colonies[i];
    let popHistory    = col.populationHistory;
    let energyHistory = col.energyHistory;

    // Population (solid)
    stroke(col.color);
    noFill();
    beginShape();
    for (let j = 0; j < popHistory.length; j++) {
      let x = map(j, 0, popHistory.length - 1, graphX, graphX + graphWidth);
      let y = map(popHistory[j], 0, 50, graphY + graphHeight, graphY);
      vertex(x, y);
    }
    endShape();

    // Energy (transparent)
    stroke(red(col.color), green(col.color), blue(col.color), 150);
    beginShape();
    for (let j = 0; j < energyHistory.length; j++) {
      let x = map(j, 0, energyHistory.length - 1, graphX, graphX + graphWidth);
      let y = map(energyHistory[j], 0, 150, graphY + graphHeight, graphY);
      vertex(x, y);
    }
    endShape();
  }

  // Restore so future drawing isn’t clipped
  drawingContext.restore();

  pop();
}
