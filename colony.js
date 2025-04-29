// colony.js

class Colony {
  constructor(nestX, nestY) {
    this.id = Colony.nextID++;
    this.nest = createVector(nestX, nestY);
    this.ants = [];
    
    // Genome, appearance, and other properties…
    this.genome = {
      antSpeed: random(1.0, 1.5),
      pheromoneStrength: random(1.0, 2.0),
      spawnRate: floor(random(120, 180)),
      explorationBias: random(0.6, 0.9),
      trailFollowingBias: random(0.1, 0.5),
      turnSensitivity: random(0.05, 0.2),
      carryCapacity: 2,
      returnBias: random(0.5, 1.0),
      antDesign: floor(random(1, 4))
    };
    
    this.color = color(random(0, 100), random(0, 100), random(0, 100));
    
    this.score = 0;
    this.scoreHistory = [];
    
    // Resource management
    this.colonyResources = 50;
    this.consumptionRate = 0.0005;
    this.antCost         = 5;
    this.spawnThreshold  = this.antCost * 2; // must have ≥10 to spawn
    
    // Start with 5 ants
    for (let i = 0; i < 5; i++) {
      this.ants.push(new Ant(this.nest.x, this.nest.y, this));
    }
    this.spawnTimer = this.genome.spawnRate;
    
    // History for graphs
    this.populationHistory = [];
    this.energyHistory     = [];
  }
  
  update() {
    // 1) Let each ant act
    for (let ant of this.ants) {
      ant.update();
    }
    this.ants = this.ants.filter(ant => ant.alive);
    
    // 2) Consume resources
    this.colonyResources -= this.ants.length * this.consumptionRate;
    // never negative
    this.colonyResources = max(this.colonyResources, 0);
    
    // 3) Maybe spawn a new ant — only if we have at least spawnThreshold resources
    if (this.ants.length < 50) {
      this.spawnTimer--;
      if (this.spawnTimer <= 0 && this.colonyResources >= this.spawnThreshold) {
        this.colonyResources -= this.antCost;  // spend only 5
        this.spawnTimer = this.genome.spawnRate;
        this.spawnAnt();
      }
    }
    
    // 4) Record histories
    this.updatePopulationHistory();
    this.updateEnergyHistory();
  }
  
  updatePopulationHistory() {
    this.populationHistory.push(this.ants.length);
    if (this.populationHistory.length > 200) {
      this.populationHistory.shift();
    }
  }
  
  updateEnergyHistory() {
    let totalEnergy = 0;
    for (let ant of this.ants) totalEnergy += ant.energy;
    let avgEnergy = this.ants.length > 0
      ? totalEnergy / this.ants.length
      : 0;
    this.energyHistory.push(avgEnergy);
    if (this.energyHistory.length > 200) {
      this.energyHistory.shift();
    }
  }
  
  display() {
    fill(this.color);
    stroke(0);
    ellipse(this.nest.x, this.nest.y, 20, 20);
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
  
  computeFitnessMetrics() {
    let totalFoodCollected = this.score;
    let avgFoodPerAnt = this.ants.length > 0
      ? totalFoodCollected / this.ants.length
      : 0;
    let survivalRate = this.ants.length / 5;
    let trailEfficiency = "Not implemented";
    
    return {
      totalFoodCollected,
      avgFoodPerAnt,
      survivalRate,
      trailEfficiency
    };
  }
}
Colony.nextID = 0;

