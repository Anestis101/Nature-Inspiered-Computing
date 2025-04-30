class PheromoneGrid {
  constructor(w, h, cellSize) {
    this.cellSize = cellSize;
    this.cols = floor(w / cellSize);
    this.rows = floor(h / cellSize);
    this.grid = [];
    
    for (let i = 0; i < this.cols; i++) {
      this.grid[i] = [];
      for (let j = 0; j < this.rows; j++) {
        this.grid[i][j] = 0;
      }
    }
  }
  
  update() {
    
    for (let i = 0; i < this.cols; i++) {
      for (let j = 0; j < this.rows; j++) {
        this.grid[i][j] *= 0.98;
      }
    }
  }
  
  display() {
    noStroke();
    for (let i = 0; i < this.cols; i++) {
      for (let j = 0; j < this.rows; j++) {
        let intensity = this.grid[i][j];
        if (intensity > 0.1) {
          fill(255, 0, 0, intensity * 255);
          rect(i * this.cellSize, j * this.cellSize, this.cellSize, this.cellSize);
        }
      }
    }
  }
  
  deposit(x, y, amount) {
    let c = floor(x / this.cellSize);
    let r = floor(y / this.cellSize);
    if (c >= 0 && c < this.cols && r >= 0 && r < this.rows) {
      this.grid[c][r] += amount;
    }
  }
  
  getIntensity(x, y) {
    let c = floor(x / this.cellSize);
    let r = floor(y / this.cellSize);
    if (c >= 0 && c < this.cols && r >= 0 && r < this.rows) {
      return this.grid[c][r];
    }
    return 0;
  }
}
