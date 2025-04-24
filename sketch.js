// sketch.js

// Global Variables
let colonies      = [];       // Array of Colony objects
let pheromoneGrid;            // Shared pheromone grid
let foods         = [];       // Array of Food objects
let spawnZones    = [];       // Array of p5.Vector centers for food patches
let zoneRadius    = 60;       // Radius of each food-spawn circle
let colonyCount   = 10;       // Number of colonies
let maxFood       = 100;      // Total number of food items

function setup() {
  createCanvas(1200, 700);
  pheromoneGrid = new PheromoneGrid(width, height, 10);

  // 1) Nest positions & colonies
  let nestPositions = generateNonOverlappingPositions(colonyCount, 80);
  colonies = nestPositions.map(p => new Colony(p.x, p.y));

  // 2) Six orange spawn-zones, far from nests and each other
  const zoneCount           = 6;
  const minDistFromNest     = zoneRadius + 100;
  const minDistBetweenZones = zoneRadius * 2 + 20;
  let attempts = 0, maxAttempts = 5000;
  while (spawnZones.length < zoneCount && attempts < maxAttempts) {
    attempts++;
    let cand = createVector(
      random(100, width  - 100),
      random(100, height - 100)
    );
    // far from every nest?
    let ok = !colonies.some(c =>
      dist(cand.x, cand.y, c.nest.x, c.nest.y) < minDistFromNest
    );
    // and far from existing zones?
    if (ok) {
      ok = !spawnZones.some(z =>
        dist(cand.x, cand.y, z.x, z.y) < minDistBetweenZones
      );
    }
    if (ok) spawnZones.push(cand);
  }
  if (spawnZones.length < zoneCount) {
    console.warn(`Only placed ${spawnZones.length}/${zoneCount} spawn zones`);
  }

  // 3) Scatter initial food only inside those zones
  foods = [];
  let baseCount = floor(maxFood / spawnZones.length);
  let extra     = maxFood % spawnZones.length;
  for (let i = 0; i < spawnZones.length; i++) {
    let count = baseCount + (i < extra ? 1 : 0);
    for (let j = 0; j < count; j++) {
      let angle = random(TWO_PI);
      let r     = random() * zoneRadius;
      let x     = spawnZones[i].x + cos(angle) * r;
      let y     = spawnZones[i].y + sin(angle) * r;
      x = constrain(x, 50, width  - 50);
      y = constrain(y, 50, height - 50);
      foods.push(new Food(x, y));
    }
  }
}

function draw() {
  background(220);

  // Draw orange spawn-zones
  noFill();
  stroke(255, 165, 0);
  strokeWeight(2);
  for (let z of spawnZones) {
    ellipse(z.x, z.y, zoneRadius * 2, zoneRadius * 2);
  }
  strokeWeight(1);

  // Update & display pheromone grid
  pheromoneGrid.update();
  pheromoneGrid.display();

  // Display all food
  for (let f of foods) {
    f.display();
  }

  // Update & display each colony
  for (let col of colonies) {
    col.update();
    col.display();
  }

  // Remove dead colonies and draw HUD
  removeDeadColonies();
  drawScoreboard();
  drawExtendedGraphs();
  checkForNewColonies();

  // Log fitness every 600 frames
  if (frameCount % 600 === 0) {
    colonies.forEach((c, i) => {
      console.log(`Colony ${i+1} Fitness:`, c.computeFitnessMetrics());
    });
  }
}

//——— Scoreboard ——————————————————————————————
function drawScoreboard() {
  push();
  textFont('Courier New');
  textSize(12);
  textAlign(LEFT, CENTER);

  const rowH = 20, tableX = 10, tableY = 10;
  const colX  = [0,50,100,150,220,300,380];
  const rows  = colonies.length + 1;
  const w     = colX[colX.length -1] + 70;
  const h     = rowH * rows + 10;

  fill(255,200);
  stroke(0);
  rect(tableX, tableY, w, h);

  // Header
  noStroke();
  fill(0);
  let y0 = tableY + rowH/2;
  text("Colony",      tableX+colX[0], y0);
  text("Score",       tableX+colX[1], y0);
  text("Ants",        tableX+colX[2], y0);
  text("Spawn",       tableX+colX[3], y0);
  text("Trail Bias",  tableX+colX[4], y0);
  text("Explore Bias",tableX+colX[5], y0);
  text("Resources",   tableX+colX[6], y0);

  // Rows
  for (let i=0; i<colonies.length; i++) {
    let c = colonies[i];
    let y = tableY + rowH*(i+1) + rowH/2;
    fill(c.color);
    text(i+1,                               tableX+colX[0], y);
    text(c.score,                          tableX+colX[1], y);
    text(c.ants.length,                    tableX+colX[2], y);
    text(c.genome.spawnRate,               tableX+colX[3], y);
    text(nf(c.genome.trailFollowingBias,1,2),tableX+colX[4], y);
    text(nf(c.genome.explorationBias,   1,2),tableX+colX[5], y);
    text(nf(c.colonyResources,          1,2),tableX+colX[6], y);
  }
  pop();
}

//——— Extended Graphs ————————————————————————————
function drawExtendedGraphs() {
  push();
  const m = 10, gW = 380, gH = 120;
  const gX = m, gY = height - gH - m;

  fill(255,200);
  stroke(0);
  rect(gX, gY, gW, gH);

  for (let i=0; i<colonies.length; i++) {
    let col = colonies[i];
    let pop = col.populationHistory;
    let ene = col.energyHistory;

    // Population (solid)
    stroke(col.color);
    noFill();
    beginShape();
    for (let j=0; j<pop.length; j++) {
      let x = map(j,0,pop.length-1, gX, gX+gW);
      let y = map(pop[j], 0, 50, gY+gH, gY);
      vertex(x,y);
    }
    endShape();

    // Energy (faded)
    stroke(red(col.color), green(col.color), blue(col.color), 150);
    beginShape();
    for (let j=0; j<ene.length; j++) {
      let x = map(j,0,ene.length-1, gX, gX+gW);
      let y = map(ene[j], 0, 150,    gY+gH, gY);
      vertex(x,y);
    }
    endShape();
  }

  pop();
}

//——— Helpers ————————————————————————————————

function generateNonOverlappingPositions(count, minDist) {
  const pts = [];
  let attempts=0, maxA=10000;
  while (pts.length < count && attempts++ < maxA) {
    let x = random(100, width - 100);
    let y = random(100, height- 100);
    if (!pts.some(p => dist(p.x,p.y,x,y) < minDist)) {
      pts.push({x,y});
    }
  }
  if (pts.length < count) {
    console.warn("Could not place all nests with non-overlap.");
  }
  return pts;
}

function checkForNewColonies() {
  const maxC = 20, threshold = 100;
  for (let i=0; i<colonies.length; i++) {
    let c = colonies[i];
    if (c.score > threshold && colonies.length < maxC) {
      let off = p5.Vector.random2D().mult(50);
      let nx  = constrain(c.nest.x + off.x, 50, width - 50);
      let ny  = constrain(c.nest.y + off.y, 50, height- 50);
      let g   = Object.assign({}, c.genome);
      g.antSpeed          = constrain(g.antSpeed + random(-0.1,0.1), 0.5, 2.0);
      g.pheromoneStrength = max(0.5, g.pheromoneStrength + random(-0.2,0.2));
      g.spawnRate         = constrain(g.spawnRate + floor(random(-10,10)), 30, 180);
      let nc = new Colony(nx, ny);
      nc.genome = g;
      nc.colonyResources = 5;
      colonies.push(nc);
      c.score -= threshold;
      console.log("New colony at", nx, ny, "with genome", g);
    }
  }
}

function removeDeadColonies() {
  for (let i=colonies.length-1; i>=0; i--) {
    if (colonies[i].ants.length === 0) colonies.splice(i,1);
  }
}
