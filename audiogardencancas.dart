// audio_garden.js

let mic;
let canvas;

let plants = [];
let particles = [];
let baseHue = 120;

function setup() {
  canvas = createCanvas(windowWidth, windowHeight);
  mic = new p5.AudioIn();
  mic.start();

  colorMode(HSL, 360, 100, 100, 1);
  noStroke();

  // Create floating particles
  for (let i = 0; i < 80; i++) {
    particles.push(new Particle());
  }
}

function draw() {
  background(210, 50, 15, 0.2); // transparent background for trails

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

  // Draw floating particles
  for (let p of particles) {
    p.update();
    p.display();
  }

  // Draw fog overlay
  drawFog();
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
    const newR = constrain(r + random(-variance / 2, variance / 2), 0, 255);
    const newG = constrain(g + random(-variance / 2, variance / 2), 0, 255);
    const newB = constrain(b + random(-variance / 2, variance / 2), 0, 255);

    return `#${hex(newR, 2)}${hex(newG, 2)}${hex(newB, 2)}`;
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
      fill(baseHue, 70, 60);
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

class Particle {
  constructor() {
    this.x = random(width);
    this.y = random(height);
    this.size = random(2, 5);
    this.speedX = random(-0.5, 0.5);
    this.speedY = random(-0.5, 0.5);
    this.alpha = random(0.05, 0.15);
  }

  update() {
    this.x += this.speedX;
    this.y += this.speedY;

    if (this.x < 0) this.x = width;
    if (this.x > width) this.x = 0;
    if (this.y < 0) this.y = height;
    if (this.y > height) this.y = 0;
  }

  display() {
    fill(0, 0, 100, this.alpha);
    ellipse(this.x, this.y, this.size);
  }
}

function drawFog() {
  noStroke();
  for (let i = 0; i < 3; i++) {
    let radius = random(width / 3, width);
    let alpha = random(0.01, 0.04);
    fill(0, 0, 100, alpha);
    ellipse(random(width), random(height), radius);
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
