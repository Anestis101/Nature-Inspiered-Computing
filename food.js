class Food {
  constructor(x, y, zone, initialAmount = 5, exact = false) {
    this.zone = zone;
    this.initialAmount = initialAmount;
    this.amount = initialAmount;

    // Exact = don't constrain to zone area
    if (exact) {
      this.pos = createVector(x, y);
    } else {
      this.pos = createVector(
        constrain(x, zone.x, zone.x + zone.w),
        constrain(y, zone.y, zone.y + zone.h)
      );
    }
  }

  pickup() {
    if (this.amount > 0) {
      this.amount--;
      return 1;
    }
    return 0;
  }

  display() {
    fill(0, 255, 0);
    noStroke();
    ellipse(this.pos.x, this.pos.y, 13, 13);
    fill(0);
    textAlign(CENTER, CENTER);
    textSize(10);
    text(this.amount, this.pos.x, this.pos.y);
  }
}
