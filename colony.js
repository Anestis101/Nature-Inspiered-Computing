// colony.js

class Colony {
  constructor(nestX, nestY, parentColony = null) {
    this.nest = createVector(nestX, nestY);
    this.ants = [];

    // Assign unique colony ID
    if (parentColony) {
      parentColony.subColonyCount += 1;
      this.id = `${parentColony.id}.${parentColony.subColonyCount}`;
    } else {
      this.id = `${colonies.length + 1}`;
    }
    this.subColonyCount = 0;

    // Genome & appearance
    this.genome = {
      antSpeed:            random(1.0, 1.5),
      pheromoneStrength:   random(1.0, 2.0),
      spawnRate:           floor(random(120, 180)),
      explorationBias:     random(0.6, 0.9),
      trailFollowingBias:  random(0.1, 0.5),
      turnSensitivity:     random(0.05, 0.2),
      carryCapacity:       2,
      returnBias:          random(0.5, 1.0),
      antDesign:           floor(random(1,4))
    };

    this.color = color(random(0,100), random(0,100), random(0,100));
    this.score = 0;
    this.scoreHistory = [];

    // Resources
    this.colonyResources = 50;
    this.consumptionRate  = 0.00025;
    this.antCost          = 5;
    this.spawnThreshold   = 50;   // must have at least 50 total to spawn

    // Start with 5 ants
    for (let i = 0; i < 5; i++) {
      this.ants.push(new Ant(this.nest.x, this.nest.y, this));
    }
    this.spawnTimer = this.genome.spawnRate;

    this.populationHistory = [];
    this.energyHistory     = [];
  }

  update() {
    // Update each ant, remove dead
    for (let ant of this.ants) ant.update();
    this.ants = this.ants.filter(a => a.alive);

    // Consume resources per ant
    this.colonyResources -= this.ants.length * this.consumptionRate;
    if (this.colonyResources < 0 && this.ants.length > 0) {
      // starve one ant
      this.ants.splice(floor(random(this.ants.length)), 1);
    }

    if (this.ants.length < 50 && this.colonyResources >= 20) {
      this.spawnTimer--;
      // NEW: require at least spawnThreshold total resources
      if (this.spawnTimer <= 0
          && this.colonyResources >= this.spawnThreshold) {
        // pay the per‐ant cost
        this.colonyResources -= this.antCost;
        this.spawnTimer = this.genome.spawnRate;
        this.spawnAnt();
      }
    }

    this.updatePopulationHistory();
    this.updateEnergyHistory();
  }

  updatePopulationHistory() {
    this.populationHistory.push(this.ants.length);
    if (this.populationHistory.length > 200) this.populationHistory.shift();
  }

  updateEnergyHistory() {
    let sum = this.ants.reduce((s,a) => s + a.energy, 0);
    let avg = this.ants.length ? sum / this.ants.length : 0;
    this.energyHistory.push(avg);
    if (this.energyHistory.length > 200) this.energyHistory.shift();
  }

  display() {
    // Draw nest
    fill(this.color);
    stroke(0);
    ellipse(this.nest.x, this.nest.y, 20, 20);
    // Draw colony ID
    textSize(12);
    textAlign(CENTER, CENTER);
    stroke(0); strokeWeight(1); fill(255);
    text(this.id, this.nest.x, this.nest.y);

    // Draw ants
    for (let ant of this.ants) {
      ant.display();
    }
  }

  spawnAnt() {
    this.ants.push(new Ant(this.nest.x, this.nest.y, this));
  }

  addFood(amount) {
    this.score += amount;
    this.colonyResources += amount;
  }

  updateScoreHistory() {
    this.scoreHistory.push(this.score);
    if (this.scoreHistory.length > 20) this.scoreHistory.shift();
  }

  computeFitnessMetrics() {
    let totalFood     = this.score;
    let avgFoodPerAnt = this.ants.length ? totalFood / this.ants.length : 0;
    let survivalRate  = this.ants.length / 5;
    return {
      totalFoodCollected: totalFood,
      avgFoodPerAnt,
      survivalRate,
      trailEfficiency: "Not implemented"
    };
  }
}
