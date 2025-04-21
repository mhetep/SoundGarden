// audio_garden.js

let mic;
let canvas;

let plants = [];
let baseHue = 120;

function setup() {
  canvas = createCanvas(windowWidth, windowHeight);
  mic = new p5.AudioIn();
  mic.start();

  colorMode(HSL, 360, 100, 100, 1);
  noStroke();
}

function draw() {
  background(210, 50, 15);

  let vol = mic.getLevel();
  let freq = vol * 5000;

  if (frameCount % 15 === 0) {
    let plantType = "foliage";
    if (freq > 400) {
      plantType = "flower";
    } else if (freq > 200) {
      plantType = "tree";
    }

    plants.push(new Plant(random(width), random(height), plantType));
  }

  for (let plant of plants) {
    plant.display();
  }
}

class Plant {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.color = this.varyColor(`#${this.hueToHex(baseHue)}`);
  }

  varyColor(baseColor) {
    const r = parseInt(baseColor.substring(1, 3), 16);
    const g = parseInt(baseColor.substring(3, 5), 16);
    const b = parseInt(baseColor.substring(5, 7), 16);

    const variance = 30;
    const newR = Math.max(0, Math.min(255, r + (Math.random() * variance) - (variance / 2)));
    const newG = Math.max(0, Math.min(255, g + (Math.random() * variance) - (variance / 2)));
    const newB = Math.max(0, Math.min(255, b + (Math.random() * variance) - (variance / 2)));

    return `#${Math.floor(newR).toString(16).padStart(2, '0')}${Math.floor(newG).toString(16).padStart(2, '0')}${Math.floor(newB).toString(16).padStart(2, '0')}`;
  }

  hueToHex(hue) {
    let c = color(hue, 70, 50);
    return hex(c.levels[0], 2) + hex(c.levels[1], 2) + hex(c.levels[2], 2);
  }

  display() {
    if (this.type === "foliage") {
      this.drawFoliage();
    } else if (this.type === "flower") {
      this.drawFlower();
    } else if (this.type === "tree") {
      this.drawTree();
    }
  }

  drawFoliage() {
    fill(this.color);
    for (let i = 0; i < 5; i++) {
      ellipse(this.x + random(-10, 10), this.y + random(-10, 10), random(20, 40));
    }
  }

  drawFlower() {
    let petalCount = 6;
    let angleStep = TWO_PI / petalCount;

    for (let i = 0; i < petalCount; i++) {
      let angle = i * angleStep;
      let px = this.x + cos(angle) * 20;
      let py = this.y + sin(angle) * 20;
      fill(`hsl(${baseHue}, 70%, 60%)`);
      ellipse(px, py, 20, 30);
    }

    fill(60, 100, 50);
    ellipse(this.x, this.y, 20, 20);
  }

  drawTree() {
    fill(30, 100, 30);
    ellipse(this.x, this.y, 80, 80);

    fill(30, 80, 20);
    rect(this.x - 5, this.y, 10, 40);
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
