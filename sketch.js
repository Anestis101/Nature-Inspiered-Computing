
let colonies = [];         // Array holding multiple Colony objects
let pheromoneGrid;         // One pheromone grid for the entire canvas
let foods = [];            // Array to hold food objects
let colonyCount = 10;       
let maxFood = 100;          // Maximum food items at any time


let foodZones = [
  { x: 100, y:  80, w: 150, h: 100, count: 50 },
  { x: 400, y: 100, w: 130, h: 120, count: 60 },
  { x: 700, y:  50, w: 120, h: 100, count: 55 },
  { x: 200, y: 400, w: 160, h:  90, count: 50 },
  { x: 600, y: 350, w: 140, h: 110, count: 60 }
];


function setup() {
  createCanvas(1200, 700);
  pheromoneGrid = new PheromoneGrid(width, height, 10);

  
  let nestPositions = generateNonOverlappingPositions(colonyCount, 80); 

  
  colonies = [];
  for (let i = 0; i < nestPositions.length; i++) {
    let pos = nestPositions[i];
    colonies.push(new Colony(pos.x, pos.y));
  }

  
  const gridCols = 12;
const gridRows = 8;
const margin   = 50;

// Compute cell size so they fill the area neatly:
const cellW = (width  - 2 * margin) / gridCols;
const cellH = (height - 2 * margin) / gridRows;

foods = [];
for (let zone of foodZones) {
  for (let i = 0; i < zone.count; i++) {
    let fx = random(zone.x,           zone.x + zone.w);
    let fy = random(zone.y,           zone.y + zone.h);
    foods.push(new Food(fx, fy));
  }
}
}

function draw() {
  background(220);

  noFill();
stroke(0, 150, 0);
strokeWeight(2);
for (let z of foodZones) {
  rect(z.x, z.y, z.w, z.h);
}
  
  pheromoneGrid.update(); 
  pheromoneGrid.display();
  
  for (let food of foods) {
    food.display();
  }
  
  
  for (let colony of colonies) {
    colony.update();
    colony.display();
  }
  
  
  removeDeadColonies();

  
  drawScoreboard();
  drawExtendedGraphs();
  
  
  checkForNewColonies();
  if (frameCount % 600 === 0) {
    for (let i = 0; i < colonies.length; i++) {
      let metrics = colonies[i].computeFitnessMetrics();
      console.log(`Colony ${i + 1} Fitness:`, metrics);
    }
  }
}




function drawScoreboard() {
  push();
  
  textFont('Courier New');
  textSize(12);
  textAlign(LEFT, CENTER);
  
  let rowHeight = 20;
  
  let tableX = 10;
  let tableY = 10;
  
 
  const colX = [0, 50, 100, 150, 220, 300, 380];
  
  
  let numRows = colonies.length + 1;
  
  let scoreboardWidth = colX[colX.length - 1] + 70;
  let scoreboardHeight = rowHeight * numRows + 10;
  
  
  fill(255, 200);
  stroke(0);
  rect(tableX, tableY, scoreboardWidth, scoreboardHeight);
  
  
  fill(0);
  noStroke();
  
  let headerY = tableY + rowHeight / 2;
  text("Colony",      tableX + colX[0], headerY);
  text("Score",       tableX + colX[1], headerY);
  text("Ants",        tableX + colX[2], headerY);
  text("Spawn",       tableX + colX[3], headerY);
  text("Trail Bias",  tableX + colX[4], headerY);
  text("Explore Bias",tableX + colX[5], headerY);
  text("Resources",   tableX + colX[6], headerY);
  
  
  for (let i = 0; i < colonies.length; i++) {
    let c = colonies[i];
    let rowY = tableY + rowHeight * (i + 1) + rowHeight / 2;
    
    
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
  const buffer = 50;    // how far nests must stay clear of any cube
  const positions = [];
  let attempts = 0, maxAttempts = 10000;

  while (positions.length < count && attempts < maxAttempts) {
    attempts++;
    let x = random(100, width - 100);
    let y = random(100, height - 100);

    // 1) skip if within any zone + buffer
    if (foodZones.some(z =>
        x >= z.x - buffer &&
        x <= z.x + z.w + buffer &&
        y >= z.y - buffer &&
        y <= z.y + z.h + buffer
    )) continue;

    // 2) your existing “no two nests too close” test
    let ok = positions.every(p =>
      dist(p.x,p.y,x,y) >= minDist
    );
    if (ok) positions.push({ x, y });
  }
  return positions;
}


  


  function checkForNewColonies() {
    let maxColonies = 20,
        newColonyThreshold = 100;
  
    for (let i = 0; i < colonies.length; i++) {
      let c = colonies[i];
      if (c.score > newColonyThreshold && colonies.length < maxColonies) {
  
        // find a new nest spot OUTSIDE all foodZones
        let newX, newY;
        do {
          let offset = p5.Vector.random2D().mult(50);
          newX = constrain(c.nest.x + offset.x, 50, width - 50);
          newY = constrain(c.nest.y + offset.y, 50, height - 50);
        } while ( foodZones.some(z =>
          newX >= z.x && newX <= z.x + z.w &&
          newY >= z.y && newY <= z.y + z.h
        ));
  
        // now we can safely create the new colony
        let newColony = new Colony(newX, newY);
        // …inherit & mutate genome, reset resources, etc…
        newColony.genome = { ...c.genome,
          antSpeed:          constrain(c.genome.antSpeed          + random(-0.1,0.1), 0.5, 2.0),
          pheromoneStrength: max(0.5, c.genome.pheromoneStrength + random(-0.2,0.2)),
          spawnRate:         constrain(c.genome.spawnRate         + floor(random(-10,10)), 30, 180)
        };
        newColony.colonyResources = 5;
        colonies.push(newColony);
        c.score -= newColonyThreshold;
      }
    }
  }
  

  function removeDeadColonies() {
    // Now we only delete a colony if it has no ants AND is not in aggressive mode
    for (let i = colonies.length - 1; i >= 0; i--) {
      if (colonies[i].ants.length === 0 && !colonies[i].aggressive) {
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


