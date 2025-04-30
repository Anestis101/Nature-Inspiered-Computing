class Food {
  constructor(x, y, initialAmount = 5) {
    // 1) find any zone containing the point…
    let zone = foodZones.find(z =>
      x >= z.x && x <= z.x + z.w &&
      y >= z.y && y <= z.y + z.h
    );

    // 2) …or, if none, pick the NEAREST zone by center distance
    if (!zone) {
      zone = foodZones
        .map(z => {
          let cx = z.x + z.w/2, cy = z.y + z.h/2;
          return { z, d: dist(x, y, cx, cy) };
        })
        .reduce((a, b) => a.d < b.d ? a : b).z;
    }

    // 3) clamp the food position inside that zone
    this.zone = zone;
    this.pos = createVector(
      constrain(x, zone.x,     zone.x + zone.w),
      constrain(y, zone.y,     zone.y + zone.h)
    );

    this.amount = initialAmount;
    this.cooldown = 0;
    this.regenerationTime = 300;
  }
  
  // Called when an ant picks up food
  pickup() {
    if (this.amount > 0) {
      this.amount--;
      if (this.amount === 0) {
        this.cooldown = this.regenerationTime;
      }
      return 1; // Each pickup gives 1 unit
    } 
    return 0;
  }
  
  display() {
    if (this.amount > 0) {
      // Drawing  the food as a circle 
      fill(0, 255, 0);
      noStroke();
      // Fixed size circle for food
      ellipse(this.pos.x, this.pos.y, 13, 13);
      
      // Displaying the amount of food left
      fill(0);
      textAlign(CENTER, CENTER);
      textSize(10);
      text(this.amount, this.pos.x, this.pos.y);
    } else {
      if (this.cooldown > 0) {
        this.cooldown--;
      } else {
        // Regenerating food with a fixed capacity of 5
        this.amount = 5;
      }
    }
  }


  findFood() {
    let detectionRadius = 150; 
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
  
}
