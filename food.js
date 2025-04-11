class Food {
  constructor(x, y, initialAmount = 5) {
    this.pos = createVector(x, y);
    this.amount = initialAmount;  // Use passed value or 5 by default
    this.cooldown = 0;       
    this.regenerationTime = 300; // Frames before the food regenerates
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
      // Draw the food as a circle (you can adjust the size if desired)
      fill(0, 255, 0);
      noStroke();
      // Fixed size circle; you could also make size proportional to amount if desired
      ellipse(this.pos.x, this.pos.y, 13, 13);
      
      // Optionally, display the amount remaining as text
      fill(0);
      textAlign(CENTER, CENTER);
      textSize(10);
      text(this.amount, this.pos.x, this.pos.y);
    } else {
      if (this.cooldown > 0) {
        this.cooldown--;
      } else {
        // Regenerate food with a fixed capacity of 5
        this.amount = 5;
      }
    }
  }


  findFood() {
    let detectionRadius = 150; // increased slightly, or you could make it variable
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
