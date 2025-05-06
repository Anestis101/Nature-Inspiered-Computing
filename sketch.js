// sketch.js

let colonies       = [];   // your Colony objects
let pheromoneGrid  = null;
let colonyCount    = 10;
let deadAnts       = [];

// —– food‐patch settings —–
const FOOD_ZONE_COUNT = 5;
const FOOD_AMOUNT     = 2;   // each Food object starts with 5 units
const FOODS_PER_ZONE  = 100;

let foodZones      = [];   // current patches
let lastFoodZones  = [];   // previous patch for each slot

// foods is flat so ant.js still sees it as before
let foods          = [];   

// zoneFoods[i] holds exactly the 5 Food objects for patch i
let zoneFoods      = [];

function setup() {
  createCanvas(2000, 1000);
  pheromoneGrid = new PheromoneGrid(width, height, 10);

  // Initialize colonies
  let nests = generateNonOverlappingPositions(colonyCount, 80);
  for (let {x,y} of nests) {
    colonies.push(new Colony(x,y));
  }

  // Initialize patches and spawn
  for (let i = 0; i < FOOD_ZONE_COUNT; i++) {
    foodZones[i]     = null;
    lastFoodZones[i] = null;
    zoneFoods[i]     = [];
    _spawnNewPatch(i);
  }
}

function draw() {
  background(220);

  // Draw all food‐patch outlines
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

  // Update & draw pheromones
  pheromoneGrid.update();
  pheromoneGrid.display();

  // Display all foods (flat array)
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

// ———————————————————————————————————
// INTERNAL: choose a new patch for index i

function _spawnNewPatch(i) {
  // remove old foods for this zone from the flat list
  if (zoneFoods[i].length > 0) {
    foods = foods.filter(f => !zoneFoods[i].includes(f));
  }

  // remember old patch for this slot
  lastFoodZones[i] = foodZones[i];

  // pick a new zone avoiding nests, other patches, and its own last zone
  let zone = _pickZone(i);
  foodZones[i] = zone;

  // create and register five Food objects in this zone
  zoneFoods[i] = [];
  for (let k = 0; k < FOODS_PER_ZONE; k++) {
    let fx = random(zone.x, zone.x + zone.w);
    let fy = random(zone.y, zone.y + zone.h);
    let f  = new Food(fx, fy, zone, FOOD_AMOUNT);
    zoneFoods[i].push(f);
    foods.push(f);
  }
}

// ———————————————————————————————————
// pick a zone for patch i

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

// ———————————————————————————————————
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
          // <-- here: test every single Food in the flat array:
          foods.some(f => dist(f.pos.x, f.pos.y, newX, newY) < avoidFoodDist)
        )
      );

      if (attempts < maxAttempts) {
        let child = new Colony(newX, newY, parent);
        // … genome tweak …
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

// (Include your drawScoreboard, drawExtendedGraphs, drawEnergyMeters here)

function drawScoreboard() {
  push();
    textFont('Courier New');
    textSize(12);
    textAlign(LEFT, CENTER);
    let rowH = 20, x = 10, y = 10;
    let cols = [0, 60, 120, 180, 260, 350];
    fill(255,200); stroke(0);
    rect(x, y, cols[cols.length-1]+80, rowH*(colonies.length+1)+10);
    noStroke(); fill(0);
    text("Colony", x+cols[0], y+rowH/2);
    text("Ants",   x+cols[2], y+rowH/2);
    text("Spawn",  x+cols[3], y+rowH/2);
    text("Trail Bias",   x+cols[4], y+rowH/2);
    text("Explore Bias", x+cols[5], y+rowH/2);
    for (let i=0; i<colonies.length; i++) {
      let c = colonies[i];
      let ry = y + rowH*(i+1) + rowH/2;
      fill(c.color);
      text(c.id, x+cols[0], ry);
      text(c.ants.length, x+cols[2], ry);
      text(c.genome.spawnRate, x+cols[3], ry);
      text(nf(c.genome.trailFollowingBias,1,2), x+cols[4], ry);
      text(nf(c.genome.explorationBias,1,2), x+cols[5], ry);
    }
  pop();
}

function drawExtendedGraphs() {
  push();
    let m=10, w=380, h=120, gx=m, gy=height-h-m;
    fill(255,200); stroke(0);
    rect(gx, gy, w, h);
    drawingContext.save();
    drawingContext.beginPath();
    drawingContext.rect(gx, gy, w, h);
    drawingContext.clip();
    for (let c of colonies) {
      // population history
      stroke(c.color); noFill();
      beginShape();
      for (let j=0; j<c.populationHistory.length; j++) {
        let x = map(j, 0, c.populationHistory.length-1, gx, gx+w);
        let y = map(c.populationHistory[j], 0, 50, gy+h, gy);
        vertex(x, y);
      }
      endShape();
      // energy history
      stroke(red(c.color), green(c.color), blue(c.color), 150);
      beginShape();
      for (let j=0; j<c.energyHistory.length; j++) {
        let x = map(j, 0, c.energyHistory.length-1, gx, gx+w);
        let y = map(c.energyHistory[j], 0, 150, gy+h, gy);
        vertex(x, y);
      }
      endShape();
    }
    drawingContext.restore();
  pop();
}

function drawEnergyMeters() {
  push();
    textFont('Courier New');
    textSize(12);
    textAlign(LEFT, CENTER);
    let startX = width - 250, startY = 10, rowH = 20;
    fill(255,220); stroke(0);
    rect(startX-10, startY-10, 240, colonies.length*rowH+30);
    noStroke(); fill(0);
    for (let i=0; i<colonies.length; i++) {
      let c = colonies[i], y = startY + i*rowH;
      let energy    = c.energyHistory.slice(-1)[0] || 0;
      let resources = c.colonyResources;
      text(`Colony ${c.id}`, startX, y);
      // energy bar
      fill(100);
      rect(startX+90, y-6, 100, 10);
      fill(0,200,0);
      let ebw = constrain(map(energy,0,150,0,100),0,100);
      rect(startX+90, y-6, ebw, 10);
      // resources bar
      fill(100);
      let rbw = constrain(map(resources,0,100,0,100),0,100);
      rect(startX+90, y+6, rbw, 5);
      fill(0);
      text(nf(resources,1,1), startX+195, y+6);
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

  // if table would overflow, shrink rowH to fit
  let tableH = numRows * rowH + padding;
  if (tableH > availableH) {
    rowH   = (availableH - padding) / numRows;
    tableH = availableH;
  }

  // anchor to bottom-right
  const tableX = width  - tableWidth  - padding;
  const tableY = height - tableH      - padding;

  push();
    // background
    fill(255, 200);
    stroke(0);
    rect(tableX, tableY, tableWidth, tableH);

    // header
    noStroke();
    fill(0);
    textFont('Courier New');
    textSize(rowH * 0.6);
    textAlign(LEFT, CENTER);
    let y = tableY + rowH / 2 + padding / 2;
    text("Colony ID", tableX + padding,       y);
    text("Avg Age",   tableX + padding + colWidths[0], y);

    // rows
    for (let i = 0; i < colonies.length; i++) {
      const c = colonies[i];
      const avg = c.ants.length
        ? (c.ants.reduce((sum, a) => sum + a.age, 0) / c.ants.length).toFixed(1)
        : "0.0";
      const rowY = tableY + rowH * (i + 1) + rowH / 2 + padding / 2;

      fill(c.color);
      text(c.id,  tableX + padding,             rowY);
      text(avg,   tableX + padding + colWidths[0], rowY);
    }
  pop();
}
