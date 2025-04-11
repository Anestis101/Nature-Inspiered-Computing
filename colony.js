class Colony {
  constructor(nestX, nestY) {
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
      antDesign: floor(random(1, 4)) // or antStyle/antDesign trait
    };
    
    this.color = color(random(0, 100), random(0, 100), random(0, 100));
    
    this.score = 0;
    this.scoreHistory = [];
    
    // For resource management...
    this.colonyResources = 50;
    this.consumptionRate = 0.0005;
    this.antCost = 5;
    
    // Start with 5 ants.
    for (let i = 0; i < 5; i++) {
      this.ants.push(new Ant(this.nest.x, this.nest.y, this));
    }
    this.spawnTimer = this.genome.spawnRate;
    
    // NEW: History arrays for visualization.
    this.populationHistory = [];
    this.energyHistory = [];
  }
  
  update() {
    // Update ants (they now update their own state, energy, and maybe conflict resolution)
    for (let ant of this.ants) {
      ant.update();
    }
    
    // Clean up dead ants (we'll use an 'alive' property on ants; see below)
    this.ants = this.ants.filter(ant => ant.alive);
    
    
    // Resource consumption and ant death:
this.colonyResources -= this.ants.length * this.consumptionRate;
if (this.colonyResources < 0 && this.ants.length > 0) {
  let idx = floor(random(this.ants.length));
  this.ants.splice(idx, 1);
}

// Check for spawning new ants:
if (this.ants.length < 50) {
  this.spawnTimer--;
  if (this.spawnTimer <= 0 && this.colonyResources >= this.antCost) {
    this.colonyResources -= this.antCost;
    // Optionally, reduce the cumulative score to reflect resource spending
    // this.score -= this.antCost * someFactor;  
    this.spawnTimer = this.genome.spawnRate;
    this.spawnAnt();
  }
}

    
    // Update history for extra graphs:
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
    for (let ant of this.ants) {
      totalEnergy += ant.energy;
    }
    let avgEnergy = (this.ants.length > 0) ? totalEnergy / this.ants.length : 0;
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
    let newAnt = new Ant(this.nest.x, this.nest.y, this);
    this.ants.push(newAnt);
  }
  
  addFood(amount) {
    this.score += amount;
    this.colonyResources += amount; // Increase resources when food is delivered
  }
  
  updateScoreHistory() {
    this.scoreHistory.push(this.score);
    if (this.scoreHistory.length > 20) {
      this.scoreHistory.shift();
    }
  }
  computeFitnessMetrics() {
    // Total food collected is stored as `score`
    let totalFoodCollected = this.score;
    
    // Average food per ant: if there are ants, divide score by the number of ants
    let avgFoodPerAnt = this.ants.length > 0 ? totalFoodCollected / this.ants.length : 0;
    
    // Survival rate: assuming each colony starts with 5 ants, it's the current number divided by 5
    let survivalRate = this.ants.length / 5;
    
    // Trail efficiency is more complex. For now, we leave it as a placeholder.
    let trailEfficiency = "Not implemented";
    
    return {
      totalFoodCollected,
      avgFoodPerAnt,
      survivalRate,
      trailEfficiency
    };
  }
  
}
