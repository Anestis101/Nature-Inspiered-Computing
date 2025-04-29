class Ant {
  constructor(x, y, colony) {
    this.alive = true;
    this.pos = createVector(x, y);
    this.vel = p5.Vector.random2D();
    this.colony = colony;
    // Set normal speed from the colony's genome
    this.normalSpeed = this.colony.genome.antSpeed;
    // When carrying food, ant moves slower (e.g. 50% speed)
    this.carryingSpeed = this.normalSpeed * 0.5;
    // Start with normal speed
    this.speed = this.normalSpeed;
    
    // Energy properties:
    this.maxEnergy = 100;         // Maximum energy
    this.energy = this.maxEnergy; // Start fully charged
    // Energy consumption multiplier (increases when carrying food)
    this.consumptionMultiplier = 1; // Normal consumption
    
    // States: "searching" for food or "returning" to nest
    this.state = "searching";
    this.foodCarried = 0;
  }
  checkForConflicts() {
    // Define a conflict threshold distance (e.g., 5 pixels)
    let conflictThreshold = 5;
    // Loop through all colonies (global array 'colonies')
    for (let col of colonies) {
      if (col !== this.colony) {
        for (let other of col.ants) {
          // Make sure we don't conflict with ourselves
          if (other.alive && this.pos.dist(other.pos) < conflictThreshold) {
            // Simple resolution: the ant with lower energy dies (set alive = false)
            if (this.energy < other.energy) {
              this.alive = false;
              return; // Exit early since this ant is now "dead"
            } else {
              other.alive = false;
            }
          }
        }
      }
    }
  }
  
  update() {
    // Consume energy each frame (adjust energy loss as needed)
    let energyLoss = 0.2 * this.consumptionMultiplier;
    this.energy -= energyLoss;
    
    // If energy is too low while carrying food, drop it on the map
    if (this.energy < 20 && this.foodCarried > 0) {
      // Drop the carried food at the ant's current position
      // The new Food object will have an amount equal to the dropped food
      foods.push(new Food(this.pos.x, this.pos.y, this.foodCarried));
      this.foodCarried = 0;
      // Reset speed and consumption multiplier back to normal since the ant is unburdened now
      this.speed = this.normalSpeed;
      this.consumptionMultiplier = 1;
      // Change state to "returning" so the ant goes back to the nest to recharge
      this.state = "returning";
    }
    
    if (this.state === "searching") {
      let target = this.findFood();
      if (target) {
        this.moveTowards(target.pos);
        if (this.pos.dist(target.pos) < 5) {
          // Instead of picking up all food at once, pick 1 unit (as before)
          this.foodCarried = target.pickup();
          if (this.foodCarried > 0) {
            this.state = "returning";
            // Adjust speed and energy consumption when carrying food
            this.speed = this.carryingSpeed;
            this.consumptionMultiplier = 2;
          }
        }
      } else {
        this.randomWalk();
      }
    } else if (this.state === "returning") {
      this.moveTowards(this.colony.nest);
      pheromoneGrid.deposit(this.pos.x, this.pos.y, this.colony.genome.pheromoneStrength, this.colony.id);
      if (this.pos.dist(this.colony.nest) < 10) {
        this.colony.addFood(this.foodCarried);
        this.foodCarried = 0;
        this.energy = this.maxEnergy;
        this.state = "searching";
        this.speed = this.normalSpeed;
        this.consumptionMultiplier = 1;
      }
    }
    
    this.pos.add(this.vel.copy().setMag(this.speed));
    this.screenWrap();
    this.checkForConflicts();
  }
  
  
  moveTowards(target) {
    let desired = p5.Vector.sub(target, this.pos);
    desired.setMag(this.speed);
    this.vel.lerp(desired, 0.1);
  }
  
  randomWalk() {
    // Instead of pure random, bias toward pheromone gradient
    let sensingDistance = 10; // how far to look
    let left = p5.Vector.fromAngle(this.vel.heading() - PI / 4).setMag(sensingDistance);
    let right = p5.Vector.fromAngle(this.vel.heading() + PI / 4).setMag(sensingDistance);
  
    let leftSense = pheromoneGrid.getIntensity(this.pos.x + left.x, this.pos.y + left.y, this.colony.id);
    let rightSense = pheromoneGrid.getIntensity(this.pos.x + right.x, this.pos.y + right.y, this.colony.id);
  
    let turnAmount = 0;
    if (leftSense > rightSense) {
      turnAmount = -0.3; // turn left
    } else if (rightSense > leftSense) {
      turnAmount = 0.3;  // turn right
    } else {
      turnAmount = random(-0.2, 0.2); // random small wandering
    }
  
    this.vel.rotate(turnAmount);
    this.vel.limit(this.speed);
  }
  
  
  findFood() {
    let detectionRadius = 50; // Increased detection radius
    let closest = null;
    let record = Infinity;
    for (let food of foods) {
      let d = this.pos.dist(food.pos);
      if (d < detectionRadius && d < record && food.amount > 0) {
        record = d;
        closest = food;
      }
    }
    return closest;
  }
  
  screenWrap() {
    if (this.pos.x < 0) this.pos.x = width;
    if (this.pos.x > width) this.pos.x = 0;
    if (this.pos.y < 0) this.pos.y = height;
    if (this.pos.y > height) this.pos.y = 0;
  }
  
  display() {
    push();
    translate(this.pos.x, this.pos.y);
    
    // Use the colony's antDesign trait to determine the drawing style.
    switch (this.colony.genome.antDesign) {
      case 1:
        // Design 1: Two long antennas and an elliptical body.
        fill(this.colony.color);
        noStroke();
        ellipse(0, 0, 8, 5);
        stroke(0);
        line(-2, -3, -8, -8); // Left antenna
        line(2, -3, 8, -8);   // Right antenna
        break;
        
      case 2:
        // Design 2: A triangle body with short antennas.
        fill(this.colony.color);
        noStroke();
        triangle(-4, 4, 4, 4, 0, -6);
        stroke(0);
        line(0, -6, -3, -9); // Left short antenna
        line(0, -6, 3, -9);  // Right short antenna
        break;
        
      case 3:
        // Design 3: A rectangular body with a decorative dot and minimal antennas.
        fill(this.colony.color);
        noStroke();
        rectMode(CENTER);
        rect(0, 0, 6, 4);
        fill(0);
        ellipse(0, 0, 2, 2);
        stroke(0);
        line(-1, -2, -2, -4); // Minimal left antenna
        line(1, -2, 2, -4);   // Minimal right antenna
        break;
        
      default:
        // Fallback design: simple circle.
        fill(this.colony.color);
        noStroke();
        ellipse(0, 0, 5, 5);
    }
    
    pop();
    
    // Draw energy bar (optional, as before)
    let barWidth = 10;
    let barHeight = 2;
    let energyPercent = this.energy / this.maxEnergy;
    fill(200);
    rect(this.pos.x - barWidth / 2, this.pos.y - 10, barWidth, barHeight);
    fill(0, 255, 0);
    rect(this.pos.x - barWidth / 2, this.pos.y - 10, barWidth * energyPercent, barHeight);
  }
}
