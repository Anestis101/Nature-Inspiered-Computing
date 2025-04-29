class PheromoneGrid {
  constructor(w, h, cellSize) {
    this.cellSize = cellSize;
    this.cols = floor(w / cellSize);
    this.rows = floor(h / cellSize);
    this.grid = [];
    
    for (let i = 0; i < this.cols; i++) {
      this.grid[i] = [];
      for (let j = 0; j < this.rows; j++) {
        this.grid[i][j] = {}; // an object: {colonyID: amount}
      }
    }
  }
  
  update() {
    for (let i = 0; i < this.cols; i++) {
      for (let j = 0; j < this.rows; j++) {
        let cell = this.grid[i][j];
        for (let colonyID in cell) {
          cell[colonyID] *= 0.98;
          // Optional: remove very faint pheromones to save memory
          if (cell[colonyID] < 0.01) {
            delete cell[colonyID];
          }
        }
      }
    }
  }
  
  
  display() {
    noStroke();
    for (let i = 0; i < this.cols; i++) {
      for (let j = 0; j < this.rows; j++) {
        for (let colonyID in this.grid[i][j]) {
          let intensity = this.grid[i][j][colonyID];
          if (intensity > 0.1) {
            fill(255, 0, 0, intensity * 255);  // Fixed color (you can vary this later)
            rect(i * this.cellSize, j * this.cellSize, this.cellSize, this.cellSize);
          }
        }
      }
    }
  }
  
  
  deposit(x, y, amount, colonyID) {
    let c = floor(x / this.cellSize);
    let r = floor(y / this.cellSize);
    if (c >= 0 && c < this.cols && r >= 0 && r < this.rows) {
      if (!this.grid[c][r][colonyID]) {
        this.grid[c][r][colonyID] = 0;
      }
      this.grid[c][r][colonyID] += amount;
    }
  }
  
  
  getIntensity(x, y, colonyID) {
    let c = floor(x / this.cellSize);
    let r = floor(y / this.cellSize);
    if (c >= 0 && c < this.cols && r >= 0 && r < this.rows) {
      return this.grid[c][r][colonyID] || 0;
    }
    return 0;
  }
  
}
