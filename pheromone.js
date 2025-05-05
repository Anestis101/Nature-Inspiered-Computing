// pheromone.js

class PheromoneGrid {
  constructor(w, h, cellSize) {
    this.cellSize = cellSize;
    this.cols = floor(w / cellSize);
    this.rows = floor(h / cellSize);

    // Each cell holds an object mapping colonyId → intensity
    this.grid = [];
    for (let i = 0; i < this.cols; i++) {
      this.grid[i] = [];
      for (let j = 0; j < this.rows; j++) {
        this.grid[i][j] = {};
      }
    }
  }

  update() {
    // Decay every colony’s intensity in each cell
    for (let i = 0; i < this.cols; i++) {
      for (let j = 0; j < this.rows; j++) {
        let cell = this.grid[i][j];
        for (let colId in cell) {
          cell[colId] *= 0.98;
          if (cell[colId] < 0.01) {
            delete cell[colId];
          }
        }
      }
    }
  }

  display() {
    noStroke();
    for (let i = 0; i < this.cols; i++) {
      for (let j = 0; j < this.rows; j++) {
        // compute total intensity in this cell
        let sum = 0;
        for (let colId in this.grid[i][j]) {
          sum += this.grid[i][j][colId];
        }
        if (sum > 0.1) {
          fill(255, 0, 0, sum * 255);
          rect(i * this.cellSize, j * this.cellSize,
               this.cellSize, this.cellSize);
        }
      }
    }
  }

  // Deposit 'amount' under a specific colonyId
  deposit(x, y, amount, colonyId) {
    let c = floor(x / this.cellSize),
        r = floor(y / this.cellSize);
    if (c >= 0 && c < this.cols && r >= 0 && r < this.rows) {
      let cell = this.grid[c][r];
      cell[colonyId] = (cell[colonyId] || 0) + amount;
    }
  }

  // Get summed intensity in cell, optionally filtering to a rootId
  getIntensity(x, y, rootId = null) {
    let c = floor(x / this.cellSize),
        r = floor(y / this.cellSize);
    if (c < 0 || c >= this.cols || r < 0 || r >= this.rows) {
      return 0;
    }
    let cell = this.grid[c][r],
        sum = 0;
    for (let colId in cell) {
      if (!rootId || colId.split('.')[0] === rootId) {
        sum += cell[colId];
      }
    }
    return sum;
  }
}
