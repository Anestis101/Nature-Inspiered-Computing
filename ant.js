// ant.js

class Ant {
  constructor(x, y, colony) {
    this.alive       = true;
    this.pos         = createVector(x, y);
    this.vel         = p5.Vector.random2D();
    this.colony      = colony;

    // Speeds
    this.normalSpeed   = colony.genome.antSpeed;
    this.carryingSpeed = this.normalSpeed * 0.5;
    this.speed         = this.normalSpeed;

    // Energy
    this.maxEnergy             = 100;
    this.energy                = this.maxEnergy;
    this.consumptionMultiplier = 1;

    // State: only "searching" or "returning" now
    this.state       = "searching";
    this.foodCarried = 0;

    // How far ahead to sample pheromone
    this.senseDistance = 20;
  }

  update() {
    // 1) drain energy
    this.energy -= 0.2 * this.consumptionMultiplier;

    // 2) if starving while carrying, drop & head home
    if (this.energy < 20 && this.foodCarried > 0) {
      foods.push(new Food(this.pos.x, this.pos.y, this.foodCarried));
      this.foodCarried = 0;
      this.speed = this.normalSpeed;
      this.consumptionMultiplier = 1;
      this.state = "returning";
    }

    // 3) behavior by state
    if (this.state === "searching") {
      // look for food
      let target = this.findFood();
      if (target) {
        this.moveTowards(target.pos);
        if (this.pos.dist(target.pos) < 5) {
          this.foodCarried = target.pickup();
          if (this.foodCarried > 0) {
            this.state = "returning";
            this.speed = this.carryingSpeed;
            this.consumptionMultiplier = 2;
          }
        }
      } else {
        // no food: follow pheromone or explore
        if (!this.followTrail()) {
          this.explore();
        }
      }

    } else if (this.state === "returning") {
      // return to nest & deposit pheromone
      this.moveTowards(this.colony.nest);
      pheromoneGrid.deposit(
        this.pos.x, this.pos.y,
        this.colony.genome.pheromoneStrength
      );
      if (this.pos.dist(this.colony.nest) < 10) {
        this.colony.addFood(this.foodCarried);
        this.foodCarried = 0;
        this.energy = this.maxEnergy;
        this.state = "searching";
        this.speed = this.normalSpeed;
        this.consumptionMultiplier = 1;
      }
    }

    // 4) move & wrap
    this.pos.add(this.vel.copy().setMag(this.speed));
    this.screenWrap();

    if (this.energy <= 0 && this.alive) {
      this.alive = false;
      deadAnts.push({ x: this.pos.x, y: this.pos.y, timer: 300 }); // 5 seconds at 60fps
    }
    

    // 5) NO MORE conflict deaths
    // this.checkForConflicts();  ← simply do nothing now
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
    // smooth wander via small rotations
    let turn = random(
      -this.colony.genome.turnSensitivity,
      this.colony.genome.turnSensitivity
    );
    this.vel.rotate(turn);
    this.vel.setMag(this.speed);
  }

  screenWrap() {
    if (this.pos.x < 0)       this.pos.x = width;
    if (this.pos.x > width)   this.pos.x = 0;
    if (this.pos.y < 0)       this.pos.y = height;
    if (this.pos.y > height)  this.pos.y = 0;
  }

  // Stub out conflicts entirely
  checkForConflicts() {
    // no-op
  }

  display() {
    push();
      translate(this.pos.x, this.pos.y);
      noStroke();
      fill(this.colony.color);
      switch (this.colony.genome.antDesign) {
        case 1:
          ellipse(0,0,8,5);
          stroke(0);
          line(-2,-3,-8,-8);
          line(2,-3,8,-8);
          break;
        case 2:
          triangle(-4,4,4,4,0,-6);
          stroke(0);
          line(0,-6,-3,-9);
          line(0,-6,3,-9);
          break;
        case 3:
          rectMode(CENTER);
          rect(0,0,6,4);
          fill(0);
          ellipse(0,0,2,2);
          stroke(0);
          line(-1,-2,-2,-4);
          line(1,-2,2,-4);
          break;
        default:
          ellipse(0,0,5,5);
      }
    pop();

    // energy bar
    let w = 10, h = 2;
    fill(200);
    rect(this.pos.x - w/2, this.pos.y - 10, w, h);
    let pct = constrain(this.energy / this.maxEnergy, 0, 1);
    fill(0,255,0);
    rect(this.pos.x - w/2, this.pos.y - 10, w * pct, h);
  }
}
