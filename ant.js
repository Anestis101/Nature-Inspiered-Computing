// ant.js

class Ant {
  constructor(x, y, colony) {
    this.alive = true;
    this.pos = createVector(x, y);
    this.vel = p5.Vector.random2D();
    this.colony = colony;

    // Speeds
    this.normalSpeed = colony.genome.antSpeed;
    this.carryingSpeed = this.normalSpeed * 0.5;
    this.speed = this.normalSpeed;

    // Energy
    this.maxEnergy = 150;
    this.energy = this.maxEnergy;
    this.consumptionMultiplier = 0.5;

    // Aging
    this.age = 0;
    this.maxAge = 20;
    this._ageTicker = 0;

    // State
    this.state = "searching";
    this.lastResourcePos = null;
    this.foodCarried = 0;
    this.carryCapacity = 2;

    this.senseDistance = 20;
  }

  update() {
    if (this.state === "goingToResource") {
      this.moveTowards(this.lastResourcePos);
      this.pos.add(this.vel.copy().setMag(this.speed));
      this.screenWrap();
      if (this.pos.dist(this.lastResourcePos) < 5) {
        this.lastResourcePos = null;
        this.state = "searching";
      }
      return;
    }

    this.energy -= 0.05 * this.consumptionMultiplier;

    // If starving while carrying food → drop it
    if (this.energy < 20 && this.foodCarried > 0) {
      let dummyZone = { x: this.pos.x, y: this.pos.y, w: 1, h: 1 };
      let dropped = new Food(this.pos.x, this.pos.y, dummyZone, this.foodCarried, true);  // ← exact = true
      foods.push(dropped);
      this.foodCarried = 0;
      this.speed = this.normalSpeed;
      this.consumptionMultiplier = 1;
      this.state = "returning";
    }
    
    if (this.state === "searching") {
      let target = this.findFood();
      if (target) {
        this.moveTowards(target.pos);
        if (this.pos.dist(target.pos) < 5) {
          let picked = 0;
          while (picked < this.carryCapacity && target.amount > 0) {
            picked += target.pickup();
          }
          this.foodCarried = picked;

          if (this.foodCarried > 0) {
            let remaining = foods
              .filter(f => f.zone === target.zone && f.amount > 0)
              .length;
            if (remaining > 20) {
              this.lastResourcePos = target.pos.copy();
            }

            this.state = "returning";
            this.speed = this.carryingSpeed;
            this.consumptionMultiplier = 2;
          }
        }
      } else {
        if (!this.followTrail()) {
          this.explore();
        }
      }

    } else if (this.state === "returning") {
      this.moveTowards(this.colony.nest);
      pheromoneGrid.deposit(
        this.pos.x, this.pos.y,
        this.colony.genome.pheromoneStrength
      );

      if (this.pos.dist(this.colony.nest) < 10) {
        if (this.foodCarried > 0) {
          this.colony.addFood(this.foodCarried);
          this.foodCarried = 0;
        }
        this.energy = this.maxEnergy;
        this.state = this.lastResourcePos ? "goingToResource" : "searching";
        this.speed = this.normalSpeed;
        this.consumptionMultiplier = 1;
      }

      this._ageTicker++;
      if (this._ageTicker >= 120) {
        this.age++;
        this._ageTicker = 0;
        if (this.age >= this.maxAge) {
          this.alive = false;
          deadAnts.push({ x: this.pos.x, y: this.pos.y, timer: 300 });
          return;
        }
      }
    }

    this.pos.add(this.vel.copy().setMag(this.speed));
    this.screenWrap();

    if (this.energy <= 0 && this.alive) {
      this.alive = false;
      deadAnts.push({ x: this.pos.x, y: this.pos.y, timer: 300 });
    }
  }

  moveTowards(target) {
    let desired = p5.Vector.sub(target, this.pos).setMag(this.speed);
    this.vel.lerp(desired, 0.1);
  }

  findFood() {
    let record = Infinity, closest = null;
    for (let f of foods) {
      let d = this.pos.dist(f.pos);
      if (d < 100 && d < record && f.amount > 0) {
        record = d;
        closest = f;
      }
    }
    return closest;
  }

  sensePheromone() {
    let best = { vec: null, val: 0 };
    let base = this.vel.heading();
    for (let off of [0, -PI / 4, PI / 4]) {
      let dir = p5.Vector.fromAngle(base + off).setMag(this.senseDistance);
      let ix = this.pos.x + dir.x, iy = this.pos.y + dir.y;
      let intensity = pheromoneGrid.getIntensity(ix, iy);
      if (intensity > best.val) {
        best = { vec: dir.copy(), val: intensity };
      }
    }
    return best.val > 0.1 ? best.vec.setMag(this.speed) : null;
  }

  followTrail() {
    let trailDir = this.sensePheromone();
    if (trailDir) {
      this.vel.lerp(trailDir, this.colony.genome.trailFollowingBias);
      this.vel.limit(this.speed);
      return true;
    }
    return false;
  }

  explore() {
    let turn = random(
      -this.colony.genome.turnSensitivity,
      this.colony.genome.turnSensitivity
    );
    this.vel.rotate(turn);
    this.vel.setMag(this.speed);
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
    noStroke();
    fill(this.colony.color);
    switch (this.colony.genome.antDesign) {
      case 1:
        ellipse(0, 0, 8, 5);
        stroke(0);
        line(-2, -3, -8, -8);
        line(2, -3, 8, -8);
        break;
      case 2:
        triangle(-4, 4, 4, 4, 0, -6);
        stroke(0);
        line(0, -6, -3, -9);
        line(0, -6, 3, -9);
        break;
      case 3:
        rectMode(CENTER);
        rect(0, 0, 6, 4);
        fill(0);
        ellipse(0, 0, 2, 2);
        stroke(0);
        line(-1, -2, -2, -4);
        line(1, -2, 2, -4);
        break;
      default:
        ellipse(0, 0, 5, 5);
    }
    pop();

    // Energy bar
    let w = 10, h = 2;
    fill(200);
    rect(this.pos.x - w / 2, this.pos.y - 10, w, h);
    let pct = constrain(this.energy / this.maxEnergy, 0, 1);
    fill(0, 255, 0);
    rect(this.pos.x - w / 2, this.pos.y - 10, w * pct, h);
  }
}
