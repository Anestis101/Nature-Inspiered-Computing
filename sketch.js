

let colonies       = [];   
let pheromoneGrid  = null;
let colonyCount    = 10;
let deadAnts       = [];

// —– food‐patch settings —–
const FOOD_ZONE_COUNT = 5;
const FOOD_AMOUNT     = 2;   // each Food object starts with 2 units
const FOODS_PER_ZONE  = 100;

let foodZones      = [];   // current patches
let lastFoodZones  = [];   // previous patch for each slot


let foods          = [];   


let zoneFoods      = [];

function setup() {
  createCanvas(2000, 1000);
  pheromoneGrid = new PheromoneGrid(width, height, 10);

  // Initialization of  colonies
  let nests = generateNonOverlappingPositions(colonyCount, 80);
  for (let {x,y} of nests) {
    colonies.push(new Colony(x,y));
  }

  // Initialization of  patches and spawn
  for (let i = 0; i < FOOD_ZONE_COUNT; i++) {
    foodZones[i]     = null;
    lastFoodZones[i] = null;
    zoneFoods[i]     = [];
    _spawnNewPatch(i);
  }
}

function draw() {
  background(220);

  // Drawing  all food‐patch outlines
  noFill();
  stroke(0,150,0);
  strokeWeight(2);
  for (let z of foodZones) {
    rect(z.x, z.y, z.w, z.h);
  }

  // Dead‐ant X’s
  for (let i = deadAnts.length - 1; i >= 0; i--) {
    let d = deadAnts[i];
    push();
      stroke(100);
      strokeWeight(2);
      line(d.x - 5, d.y - 5, d.x + 5, d.y + 5);
      line(d.x - 5, d.y + 5, d.x + 5, d.y - 5);
    pop();
    if (--d.timer <= 0) deadAnts.splice(i,1);
  }

  
  pheromoneGrid.update();
  pheromoneGrid.display();

  
  for (let f of foods) {
    if (f.amount > 0) f.display();
  }

  // Respawn any zone whose entire group is depleted
  for (let i = 0; i < FOOD_ZONE_COUNT; i++) {
    if (zoneFoods[i].every(f => f.amount === 0)) {
      _spawnNewPatch(i);
    }
  }

  // Update & draw colonies
  for (let c of colonies) {
    c.update();
    c.display();
  }

  // Helpers & UI
  removeDeadColonies();
  drawScoreboard();
  drawExtendedGraphs();
  drawEnergyMeters();
  drawAgeTable();



  // Handle colony reproduction
  checkForNewColonies();

  if (frameCount % 600 === 0) {
    for (let c of colonies) {
      console.log(`Colony ${c.id} Fitness:`, c.computeFitnessMetrics());
    }
  }
}



function _spawnNewPatch(i) {
  
  if (zoneFoods[i].length > 0) {
    foods = foods.filter(f => !zoneFoods[i].includes(f));
  }

  
  lastFoodZones[i] = foodZones[i];

  // pick a new zone avoiding nests, other patches, and its own last zone
  let zone = _pickZone(i);
  foodZones[i] = zone;

  
  zoneFoods[i] = [];
  for (let k = 0; k < FOODS_PER_ZONE; k++) {
    let fx = random(zone.x, zone.x + zone.w);
    let fy = random(zone.y, zone.y + zone.h);
    let f  = new Food(fx, fy, zone, FOOD_AMOUNT);
    zoneFoods[i].push(f);
    foods.push(f);
  }
}



function _pickZone(i) {
  const margin       = 100;
  const w            = 200, h = 150;
  const minDistNest  = 200;
  const minDistPatch = 800;
  const minDistLast  = 800;

  let zone, attempts = 0;
  do {
    attempts++;
    zone = {
      x: random(margin, width - margin - w),
      y: random(margin, height - margin - h),
      w, h
    };
    let cx = zone.x + w/2, cy = zone.y + h/2;

    // 1) avoid nests
    let badNest = colonies.some(c =>
      dist(c.nest.x, c.nest.y, cx, cy) < minDistNest
    );

    // 2) avoid other active patches
    let badPatch = foodZones.some((z, j) =>
      j !== i && z && dist(z.x + z.w/2, z.y + z.h/2, cx, cy) < minDistPatch
    );

    // 3) avoid its own last spot
    let lastZ = lastFoodZones[i];
    let badLast = lastZ && dist(lastZ.x + lastZ.w/2, lastZ.y + lastZ.h/2, cx, cy) < minDistLast;

    if (!badNest && !badPatch && !badLast) break;
  } while (attempts < 1000);

  return zone;
}


// Nest position generator avoiding foodZones

function generateNonOverlappingPositions(count, minDist) {
  const buffer = 50;
  let positions = [];
  let attempts = 0;

  while (positions.length < count && attempts++ < 10000) {
    let x = random(100, width - 100);
    let y = random(100, height - 100);

    // avoid all current patches
    if (foodZones.some(z =>
        x >= z.x - buffer && x <= z.x + z.w + buffer &&
        y >= z.y - buffer && y <= z.y + z.h + buffer
    )) continue;

    // avoid existing nests
    if (positions.every(p => dist(p.x, p.y, x, y) >= minDist)) {
      positions.push({ x, y });
    }
  }
  return positions;
}

function checkForNewColonies() {
  const maxColonies    = 20;
  const minNestDist    = 100;
  const maxSpawnRadius = 200;
  const avoidFoodDist  = 50;
  const maxAttempts    = 100;

  for (let i = colonies.length - 1; i >= 0; i--) {
    let parent = colonies[i];
    if (parent.colonyResources >= 100 && colonies.length < maxColonies) {
      let attempts = 0, newX, newY;
      do {
        let theta = random(TWO_PI);
        let r     = random(minNestDist, maxSpawnRadius);
        newX = constrain(parent.nest.x + cos(theta)*r, 50, width-50);
        newY = constrain(parent.nest.y + sin(theta)*r, 50, height-50);
        attempts++;
      } while (
        attempts < maxAttempts &&
        (
          colonies.some(c => dist(c.nest.x, c.nest.y, newX, newY) < minNestDist) ||
          
          foods.some(f => dist(f.pos.x, f.pos.y, newX, newY) < avoidFoodDist)
        )
      );

      if (attempts < maxAttempts) {
        let child = new Colony(newX, newY, parent);
        
        child.colonyResources = 5;
        colonies.push(child);
        parent.colonyResources -= 80;
      }
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



function drawScoreboard() {
  push();
  textFont('Helvetica');
  textSize(14);
  textAlign(LEFT, CENTER);

  let rowHeight = 20;
  let paddingX = 15;
  let tableX = 10, tableY = 10;
  const colX = [0, 60, 120, 180, 260, 350];

  let numRows = colonies.length + 1;
  let scoreboardWidth = colX[colX.length - 1] + 100;
  let scoreboardHeight = rowHeight * numRows + 5;

  
  fill(255, 220);
  stroke(0);
  strokeWeight(1.2);
  rect(tableX, tableY, scoreboardWidth + paddingX * 2, scoreboardHeight, 6);

  // Header with shadowed text
  let headerY = tableY + rowHeight / 2;
  fill(0);
  noStroke();

  text("Colony",        tableX + colX[0] + paddingX, headerY);
  text("Score",         tableX + colX[1] + paddingX, headerY);
  text("Ants",          tableX + colX[2] + paddingX, headerY);
  text("Spawn",         tableX + colX[3] + paddingX, headerY);
  text("Trail Bias",    tableX + colX[4] + paddingX, headerY);
  text("Explore Bias",  tableX + colX[5] + paddingX, headerY);

  // Rows
  for (let i = 0; i < colonies.length; i++) {
    let c = colonies[i];
    let rowY = tableY + rowHeight * (i + 1) + rowHeight / 2;

    fill(c.color);
    text(c.id, tableX + colX[0] + paddingX, rowY);
    fill(0);
    text(nf(c.score, 1, 1), tableX + colX[1] + paddingX, rowY);
    text(c.ants.length, tableX + colX[2] + paddingX, rowY);
    text(c.genome.spawnRate, tableX + colX[3] + paddingX, rowY);
    text(nf(c.genome.trailFollowingBias, 1, 2), tableX + colX[4] + paddingX, rowY);
    text(nf(c.genome.explorationBias, 1, 2), tableX + colX[5] + paddingX, rowY);

    stroke(230);
    line(tableX + paddingX, rowY + rowHeight / 2 - 2, tableX + scoreboardWidth + paddingX, rowY + rowHeight / 2 - 2);
  }
  pop();
}

function drawExtendedGraphs() {
  push();

  const padding = 10;
  const graphWidth = 400;
  const graphHeight = 190;
  const graphX = padding;
  const graphY = height - graphHeight - padding;
  const maxPop = 50;
  const yPadding = 12;

  const graphTop = graphY + yPadding;
  const graphBottom = graphY + graphHeight - yPadding;

  // Font and style
  textFont('Helvetica');
  textSize(14);
  textAlign(LEFT, CENTER);

  // Background with rounded corners
  fill(255, 220);
  stroke(0);
  strokeWeight(1.2);
  rect(graphX, graphY, graphWidth, graphHeight, 6);

  
  let labelX = graphX + 14;      
  let labelY = graphY + -10;      

  textAlign(LEFT, CENTER);
  fill(0);
  text("Population", labelX, labelY);

  // Grid lines and Y-axis labels
  textAlign(LEFT, CENTER);
  for (let i = 0; i <= maxPop; i += 10) {
    const y = map(i, 0, maxPop, graphBottom, graphTop);
    stroke(230);
    line(graphX + padding, y, graphX + graphWidth - padding, y);
    noStroke();
    fill(80);
    text(i, graphX + 3, y);
  }

  // Clipping area
  drawingContext.save();
  drawingContext.beginPath();
  drawingContext.rect(graphX, graphY, graphWidth, graphHeight);
  drawingContext.clip();

  // Plot population curves
  for (let col of colonies) {
    stroke(col.color);
    noFill();
    beginShape();
    for (let j = 0; j < col.populationHistory.length; j++) {
      const x = map(j, 0, col.populationHistory.length - 1, graphX + padding, graphX + graphWidth - padding);
      const yVal = constrain(col.populationHistory[j], 0, maxPop); 
      const y = map(yVal, 0, maxPop, graphBottom, graphTop);
      curveVertex(x, y);
    }
    endShape();
  }

  drawingContext.restore();
  pop();
}

function drawEnergyMeters() {
  push();
  textFont('Helvetica');
  textSize(14);
  textAlign(LEFT, CENTER);

  let padding = 15;
  let startX = width - 250;
  let startY = 20;
  let rowHeight = 20;
  let boxWidth = 250;
  let boxHeight = colonies.length * rowHeight + 10;

  // Background with rounded corners
  fill(255, 220);
  stroke(0);
  strokeWeight(1.2);
  rect(startX - padding, startY - padding, boxWidth, boxHeight, 6);

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
    let energyBarWidth = constrain(map(energy, 0, 150, 0, 100), 0, 100);
    rect(startX + 90, y - 6, energyBarWidth, 10);

    // Colony resource bar
    fill(100);
    let resBarWidth = constrain(map(resources, 0, 100, 0, 100), 0, 100);
    rect(startX + 90, y + 6, resBarWidth, 5);

    fill(0);
    text(nf(resources, 1, 1), startX + 195, y + 6);

    stroke(230);
    line(startX - padding, y + rowHeight / 2 + 4, startX - padding + boxWidth, y + rowHeight / 2 + 4);
  }

  pop();
}
function drawAgeTable() {
  const padding     = 10;
  const colWidths   = [80, 60];               // ID col, Avg-Age col
  const tableWidth  = colWidths[0] + colWidths[1] + padding * 2;
  const numRows     = colonies.length + 1;    // +1 for header
  const availableH  = height - padding * 2;   // total vertical space
  let   rowH        = 20;                     // desired row height

  
  let tableH = numRows * rowH + padding;
  if (tableH > availableH) {
    rowH   = (availableH - padding) / numRows;
    tableH = availableH;
  }

  
  const tableX = width  - tableWidth  - padding;
  const tableY = height - tableH      - padding;

  push();
    // background
    fill(255, 220);  // slightly more opaque
    stroke(0);
    strokeWeight(1.2);
    rect(tableX, tableY, tableWidth, tableH, 6); // rounded corners

    // header (with shadowed text)
    noStroke();
    textFont('Helvetica');  // softer font
    textSize(14);
    textAlign(LEFT, CENTER);
    let y = tableY + rowH / 2 + padding / 2;

    // Drop shadow effect
    fill(0, 100);
    text("Colony ID", tableX + padding + 1, y + 1);
    text("Avg Age",   tableX + padding + colWidths[0] + 1, y + 1);

    fill(0);
    text("Colony ID", tableX + padding, y);
    text("Avg Age",   tableX + padding + colWidths[0], y);

    // rows
    for (let i = 0; i < colonies.length; i++) {
      const c = colonies[i];
      const avg = c.ants.length
        ? (c.ants.reduce((sum, a) => sum + a.age, 0) / c.ants.length).toFixed(1)
        : "0.0";
      const rowY = tableY + rowH * (i + 1) + rowH / 2 + padding / 2;

      fill(c.color);
      text(c.id,  tableX + padding, rowY);
      fill(0);
      text(avg,   tableX + padding + colWidths[0], rowY);

      
      stroke(230);
      line(tableX + padding, rowY + rowH / 2 - 2, tableX + tableWidth - padding, rowY + rowH / 2 - 2);
    }
  pop();
}
