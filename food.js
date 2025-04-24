// food.js

class Food {
  /**
   * @param {number} x
   * @param {number} y
   * @param {number} initialAmount  # units to start with
   * @param {boolean} canRegenerate whether to regrow after depletion
   */
  constructor(x, y, initialAmount = 5, canRegenerate = true) {
    this.pos = createVector(x, y);
    this.amount = initialAmount;
    this.canRegenerate = canRegenerate;
    this.cooldown = 0;
    this.regenerationTime = 300; // frames until regrow
  }
  
  // Called when an ant picks up one unit
  pickup() {
    if (this.amount > 0) {
      this.amount--;
      if (this.amount === 0 && this.canRegenerate) {
        this.cooldown = this.regenerationTime;
      }
      return 1;
    }
    return 0;
  }
  
  display() {
    if (this.amount > 0) {
      fill(0, 255, 0);
      noStroke();
      ellipse(this.pos.x, this.pos.y, 13, 13);
      fill(0);
      textAlign(CENTER, CENTER);
      textSize(10);
      text(this.amount, this.pos.x, this.pos.y);
    } else if (this.canRegenerate) {
      if (this.cooldown > 0) {
        this.cooldown--;
      } else {
        this.amount = 5; // regrow
      }
    }
    // If canRegenerate==false and amount==0: stays gone
  }
}
