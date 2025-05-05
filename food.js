// food.js

class Food {
  constructor(x, y, initialAmount = 5) {
    // 1) find any zone containing the point (unchanged)
    let zone = foodZones.find(z =>
      x >= z.x && x <= z.x + z.w &&
      y >= z.y && y <= z.y + z.h
    );
    // 2) or, if none, snap to nearest zone center
    if (!zone) {
      zone = foodZones
        .map(z => {
          let cx = z.x + z.w/2, cy = z.y + z.h/2;
          return { z, d: dist(x, y, cx, cy) };
        })
        .reduce((a, b) => a.d < b.d ? a : b).z;
    }
    this.zone = zone;

    // 3) clamp into that zone
    this.pos = createVector(
      constrain(x, zone.x,     zone.x + zone.w),
      constrain(y, zone.y,     zone.y + zone.h)
    );

    // 4) remember how much a full cube holds
    this.initialAmount = initialAmount;
    this.amount        = initialAmount;
  }

  // Called when an ant picks up one unit
  pickup() {
    if (this.amount > 0) {
      this.amount--;

      // ★ on empty: spawn a new cube in the same zone
      if (this.amount === 0) {
        let fx = random(this.zone.x,           this.zone.x + this.zone.w);
        let fy = random(this.zone.y,           this.zone.y + this.zone.h);
        foods.push(new Food(fx, fy, this.initialAmount));
      }
      return 1;
    }
    return 0;
  }

  display() {
    // always draw, even if empty; we'll prune empties elsewhere
    fill(0, 255, 0);
    noStroke();
    ellipse(this.pos.x, this.pos.y, 13, 13);

    // draw the count
    fill(0);
    textAlign(CENTER, CENTER);
    textSize(10);
    text(this.amount, this.pos.x, this.pos.y);
  }
}
