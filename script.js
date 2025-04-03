// Main application logic
const AudioGarden = {
    // Configuration
    config: {
      canvasWidth: window.innerWidth,
      canvasHeight: window.innerHeight,
      maxPlants: 50,
      growthSpeed: 0.5,
      saveInterval: 5000, // Save garden every 5 seconds
    },
  
    // State
    audioContext: null,
    analyzer: null,
    microphone: null,
    canvas: null,
    ctx: null,
    plants: [],
    isListening: false,
    lastAudioLevel: 0,
  
    // Plant types based on frequency ranges
    plantTypes: [
        { name: 'flower', minFreq: 0, maxFreq: 300, color: '#FF6B6B' }, // Increased flower range
        { name: 'bush', minFreq: 301, maxFreq: 600, color: '#4ECDC4' }, // Adjusted bush range
        { name: 'tree', minFreq: 601, maxFreq: 1100, color: '#6B48FF' }, // Adjusted tree range
        { name: 'mushroom', minFreq: 1101, maxFreq: 2500, color: '#FFD166' }, // Adjusted mushroom range
        { name: 'cactus', minFreq: 2501, maxFreq: 20000, color: '#06D6A0' } // Adjusted cactus range
      ],
  
    // Initialize the garden
    init: function() {
      // Create canvas
      this.setupCanvas();
  
      // Setup event listeners
      document.getElementById('startButton').addEventListener('click', () => this.startListening());
      document.getElementById('clearButton').addEventListener('click', () => this.clearGarden());
  
      // Load existing garden if available
      this.loadGarden();
  
      // Start animation loop
      this.animate();
  
      // Setup autosave
      setInterval(() => this.saveGarden(), this.config.saveInterval);
    },
  
    // Setup canvas
    setupCanvas: function() {
      this.canvas = document.getElementById('gardenCanvas');
      this.canvas.width = this.config.canvasWidth;
      this.canvas.height = this.config.canvasHeight;
      this.ctx = this.canvas.getContext('2d');
  
      // Handle window resize
      window.addEventListener('resize', () => {
        this.config.canvasWidth = window.innerWidth;
        this.config.canvasHeight = window.innerHeight;
        this.canvas.width = this.config.canvasWidth;
        this.canvas.height = this.config.canvasHeight;
        this.redrawGarden();
      });
  
      // Handle clicks for manual planting
      this.canvas.addEventListener('click', (e) => {
        if (!this.isListening) {
          const rect = this.canvas.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          this.addRandomPlant(x, y, 30);
        }
      });
    },
  
    // Start listening to microphone
    startListening: function() {
      if (this.isListening) return;
  
      // Request microphone access
      navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        .then(stream => {
          // Create audio context
          this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
  
          // Create analyzer
          this.analyzer = this.audioContext.createAnalyser();
          this.analyzer.fftSize = 2048;
  
          // Create microphone source
          this.microphone = this.audioContext.createMediaStreamSource(stream);
          this.microphone.connect(this.analyzer);
  
          // Start monitoring audio
          this.isListening = true;
          document.getElementById('statusMessage').textContent = 'Listening to your sounds...';
          document.getElementById('startButton').textContent = 'Listening...';
          this.monitorAudio();
        })
        .catch(err => {
          console.error('Error accessing microphone:', err);
          document.getElementById('statusMessage').textContent = 'Unable to access microphone. Click anywhere to plant manually.';
        });
    },
  
    // Monitor audio levels and frequencies
    monitorAudio: function() {
      if (!this.isListening) return;
  
      // Get frequency data
      const bufferLength = this.analyzer.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      this.analyzer.getByteFrequencyData(dataArray);
  
      // Calculate average level
      let sum = 0;
      let dominantFrequencyBin = 0;
      let maxAmplitude = 0;
  
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
        if (dataArray[i] > maxAmplitude) {
          maxAmplitude = dataArray[i];
          dominantFrequencyBin = i;
        }
      }
  
      const avgLevel = sum / bufferLength;
      const normalizedLevel = avgLevel / 256; // Normalize to 0-1
  
      // Determine if there was a significant audio spike
      const threshold = 0.15;
      if (normalizedLevel > threshold && normalizedLevel > this.lastAudioLevel * 0.5) {
        // Calculate dominant frequency
        const dominantFrequency = dominantFrequencyBin * (this.audioContext.sampleRate / (this.analyzer.fftSize * 2));
  
        // Determine size based on volume
        const size = 20 + (normalizedLevel * 80);
  
        // Plant a new plant at random position
        const x = Math.random() * this.config.canvasWidth;
        const y = Math.random() * (this.config.canvasHeight * 0.8) + (this.config.canvasHeight * 0.2);
  
        this.addPlant(x, y, size, dominantFrequency);
      }
  
      this.lastAudioLevel = normalizedLevel;
  
      // Continue monitoring
      requestAnimationFrame(() => this.monitorAudio());
    },
  
    // Add a plant based on frequency
    addPlant: function(x, y, size, frequency) {
      if (this.plants.length >= this.config.maxPlants) {
        // Remove oldest plant if at capacity
        this.plants.shift();
      }
  
      // Find plant type based on frequency
      let plantType = this.plantTypes[0];
      for (const type of this.plantTypes) {
        if (frequency >= type.minFreq && frequency <= type.maxFreq) {
          plantType = type;
          break;
        }
      }
  
      // Add some randomness to the plant characteristics
      const plant = {
        x,
        y,
        targetSize: size,
        currentSize: 0,
        type: plantType.name,
        color: this.varyColor(plantType.color),
        age: 0,
        growthRate: this.config.growthSpeed * (0.8 + (Math.random() * 0.4)),
        segments: Math.floor(3 + (Math.random() * 5))
      };
  
      // Adjust size based on volume (normalizedLevel)
      const volumeFactor = this.lastAudioLevel * 1.5; // Adjust multiplier as needed
      size *= (1 + volumeFactor); // Increase size based on volume
  
      const maxSize = 150; // Set maximum plant size
      size = Math.min(size, maxSize); // Limit size to maximum
  
      plant.targetSize = size;
  
      this.plants.push(plant);
    },
  
    // Add a random plant (for manual planting)
    addRandomPlant: function(x, y, size) {
      const randomFrequency = Math.random() * 2000;
      this.addPlant(x, y, size, randomFrequency);
    },
  
    // Vary a color slightly for natural variation
    varyColor: function(baseColor) {
      // Convert hex to RGB
      const r = parseInt(baseColor.substring(1, 3), 16);
      const g = parseInt(baseColor.substring(3, 5), 16);
      const b = parseInt(baseColor.substring(5, 7), 16);
  
      // Add slight random variation
      const variance = 30;
      const newR = Math.max(0, Math.min(255, r + (Math.random() * variance) - (variance / 2)));
      const newG = Math.max(0, Math.min(255, g + (Math.random() * variance) - (variance / 2)));
      const newB = Math.max(0, Math.min(255, b + (Math.random() * variance) - (variance / 2)));
  
      // Convert back to hex
      return `#<span class="math-inline">\{Math\.floor\(newR\)\.toString\(16\)\.padStart\(2, '0'\)\}</span>{Math.floor(newG).toString(16).padStart(2, '0')}${Math.floor(newB).toString(16).padStart(2, '0')}`;
    },
  
    // Animation loop
    animate: function() {
      // Clear canvas
      this.ctx.clearRect(0, 0, this.config.canvasWidth, this.config.canvasHeight);
  
      // Draw background gradient
      this.ctx.fillStyle = 'rgb(39, 29, 29)';
      this.ctx.fillRect(0, 0, this.config.canvasWidth, this.config.canvasHeight);
  
      // Draw ground
      this.ctx.fillStyle = '#8D6E63';
      this.ctx.fillRect(0, this.config.canvasHeight * 0.85, this.config.canvasWidth, this.config.canvasHeight * 0.15);
  
      // Draw plants
      this.plants.forEach((plant, index) => {
        // Grow plants gradually
        if (plant.currentSize < plant.targetSize) {
          plant.currentSize += plant.growthRate;
          if (plant.currentSize > plant.targetSize) {
            plant.currentSize = plant.targetSize;
          }
        }
  
        // Age plants
        plant.age += 0.01;
  
        // Draw the plant
        this.drawPlant(plant);
      });
  
      // Continue animation
      requestAnimationFrame(() => this.animate());
    },
  
    // Draw a plant based on its type
    drawPlant: function(plant) {
      switch (plant.type) {
        case 'flower':
          this.drawFlower(plant);
          break;
        case 'bush':
          this.drawBush(plant);
          break;
        case 'tree':
          this.drawTree(plant);
          break;
        case 'mushroom':
          this.drawMushroom(plant);
          break;
        case 'cactus':
          this.drawCactus(plant);
          break;
      }
    },
  
    // Draw flower
    drawFlower: function(plant) {
      const ctx = this.ctx;
      let size = plant.currentSize;
      size *= 1.15;
  
      // Stem
      ctx.beginPath();
      ctx.moveTo(plant.x, plant.y);
      ctx.lineTo(plant.x, plant.y - size * 0.8);
      ctx.lineWidth = size * 0.05;
      ctx.strokeStyle = '#2E7D32';
      ctx.stroke();
  
      // Flower center
      ctx.beginPath();
      ctx.arc(plant.x, plant.y - size * 0.8, size * 0.2, 0, Math.PI * 2);
      ctx.fillStyle = '#FFC107';
      ctx.fill();
  
      // Petals
      const petalCount = 5 + Math.floor(plant.age * 2);
      for (let i = 0; i < petalCount; i++) {
        const angle = (i / petalCount) * Math.PI * 2;
        const petalX = plant.x + Math.cos(angle) * size * 0.4;
        const petalY = (plant.y - size * 0.8) + Math.sin(angle) * size * 0.4;
  
        ctx.beginPath();
        ctx.arc(petalX, petalY, size * 0.25, 0, Math.PI * 2);
        ctx.fillStyle = plant.color;
        ctx.fill();
      }
  
      // Leaves
      ctx.beginPath();
      ctx.ellipse(plant.x - size * 0.2, plant.y - size * 0.4, size * 0.15, size * 0.3, Math.PI / 4, 0, Math.PI * 2);
      ctx.fillStyle = '#388E3C';
      ctx.fill();
  
      ctx.beginPath();
      ctx.ellipse(plant.x + size * 0.2, plant.y - size * 0.3, size * 0.15, size * 0.3, -Math.PI / 4, 0, Math.PI * 2);
      ctx.fillStyle = '#388E3C';
      ctx.fill();
    },
  
    // Draw bush
    drawBush: function(plant) {
      const ctx = this.ctx;
      const size = plant.currentSize;
  
      // Stem/trunk
      ctx.beginPath();
      ctx.moveTo(plant.x, plant.y);
      ctx.lineTo(plant.x, plant.y - size * 0.3);
      ctx.lineWidth = size * 0.1;
      ctx.strokeStyle = '#5D4037';
      ctx.stroke();
  
      // Foliage clusters
      const clusters = 3 + Math.floor(plant.age * 2);
      for (let i = 0; i < clusters; i++) {
        const offsetX = (Math.random() - 0.5) * size * 0.8;
        const offsetY = (Math.random() - 0.5) * size * 0.8;
        const clusterSize = size * (0.3 + Math.random() * 0.2);
  
        ctx.beginPath();
        ctx.arc(plant.x + offsetX, plant.y - size * 0.5 + offsetY, clusterSize, 0, Math.PI * 2);
        ctx.fillStyle = plant.color;
        ctx.fill();
      }
    },
  
    // Draw tree
    drawTree: function(plant) {
      const ctx = this.ctx;
      const size = plant.currentSize;
  
      // Trunk
      ctx.beginPath();
      ctx.moveTo(plant.x, plant.y);
      ctx.lineTo(plant.x, plant.y - size * 0.7);
      ctx.lineWidth = size * 0.1;
      ctx.strokeStyle = '#5D4037';
      ctx.stroke();
  
      // Squiggly Vines instead of straight branches
      const vineCount = 3 + Math.floor(plant.age);
      for (let i = 0; i < vineCount; i++) {
        const vineStartY = plant.y - size * (0.3 + (i * 0.15));
        const vineLength = size * 0.4 * (1 - (i * 0.1));
        const direction = (i % 2 === 0) ? 1 : -1; // Alternate sides
  
        // Draw squiggly vine
        ctx.beginPath();
        ctx.moveTo(plant.x, vineStartY);
  
        // Create a curly vine with bezier curves
        const cp1x = plant.x + (direction * vineLength * 0.3);
        const cp1y = vineStartY - size * 0.05;
        const cp2x = plant.x + (direction * vineLength * 0.6);
        const cp2y = vineStartY + size * 0.05;
        const endX = plant.x + (direction * vineLength);
        const endY = vineStartY - size * 0.02;
  
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);
        ctx.lineWidth = size * 0.03;
        ctx.strokeStyle = '#2E7D32'; // Green vine color
        ctx.stroke();
  
        // Add leaves
        if (i % 2 === 0) {
          // Small leaf at middle of vine
          const leafX = plant.x + (direction * vineLength * 0.5);
          const leafY = vineStartY + (direction * size * 0.03);
  
          ctx.beginPath();
          ctx.ellipse(leafX, leafY, size * 0.08, size * 0.04, Math.PI / 4 * direction, 0, Math.PI * 2);
          ctx.fillStyle = '#81C784'; // Light green for leaves
          ctx.fill();
        }
  
        // Add a rose at the end of some vines
        if (i % 3 === 0) {
          ctx.beginPath();
          ctx.arc(endX, endY, size * 0.06, 0, Math.PI * 2);
          ctx.fillStyle = '#E91E63'; // Pink/rose color
          ctx.fill();
  
          // Rose detail
          ctx.beginPath();
          ctx.arc(endX + size * 0.02, endY - size * 0.02, size * 0.03, 0, Math.PI * 2);
          ctx.fillStyle = '#F8BBD0'; // Lighter pink for detail
          ctx.fill();
        }
      }
  
      // Main foliage (purple)
      ctx.beginPath();
      ctx.arc(plant.x, plant.y - size * 0.9, size * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = plant.color; // Keep the original purple color
      ctx.fill();
  
      ctx.beginPath();
      ctx.arc(plant.x + size * 0.25, plant.y - size * 0.7, size * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = plant.color;
      ctx.fill();
  
      ctx.beginPath();
      ctx.arc(plant.x - size * 0.25, plant.y - size * 0.75, size * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = plant.color;
      ctx.fill();
    },
  
    // Draw mushroom
    drawMushroom: function(plant) {
      const ctx = this.ctx;
      let size = plant.currentSize;
      size *= 1.2;
  
      // Stem
      ctx.beginPath();
      ctx.moveTo(plant.x - size * 0.1, plant.y);
      ctx.lineTo(plant.x - size * 0.05, plant.y - size * 0.5);
      ctx.lineTo(plant.x + size * 0.05, plant.y - size * 0.5);
      ctx.lineTo(plant.x + size * 0.1, plant.y);
      ctx.fillStyle = '#EFEBE9';
      ctx.fill();
  
      // Cap
      ctx.beginPath();
      ctx.ellipse(plant.x, plant.y - size * 0.5, size * 0.3, size * 0.2, 0, 0, Math.PI * 2);
      ctx.fillStyle = plant.color;
      ctx.fill();
  
      // Spots
      const spotCount = 3 + Math.floor(Math.random() * 4);
      for (let i = 0; i < spotCount; i++) {
        const spotX = plant.x + (Math.random() - 0.5) * size * 0.4;
        const spotY = plant.y - size * 0.5 + (Math.random() - 0.5) * size * 0.2;
        const spotSize = size * 0.05;
  
        ctx.beginPath();
        ctx.arc(spotX, spotY, spotSize, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
      }
    },
  
    // Draw cactus
    drawCactus: function(plant) {
      const ctx = this.ctx;
      const size = plant.currentSize;
  
      // Main body
      ctx.beginPath();
      ctx.moveTo(plant.x - size * 0.15, plant.y);
      ctx.lineTo(plant.x - size * 0.15, plant.y - size * 0.6);
      ctx.arc(plant.x, plant.y - size * 0.6, size * 0.15, Math.PI, 0);
      ctx.lineTo(plant.x + size * 0.15, plant.y);
      ctx.fillStyle = plant.color;
      ctx.fill();
  
      // Arms (if plant is mature)
      if (plant.age > 1) {
        // Left arm
        ctx.beginPath();
        ctx.moveTo(plant.x - size * 0.15, plant.y - size * 0.4);
        ctx.lineTo(plant.x - size * 0.3, plant.y - size * 0.4);
        ctx.lineTo(plant.x - size * 0.3, plant.y - size * 0.5);
        ctx.arc(plant.x - size * 0.3, plant.y - size * 0.5, size * 0.1, Math.PI, 0);
        ctx.lineTo(plant.x - size * 0.2, plant.y - size * 0.4);
        ctx.fillStyle = plant.color;
        ctx.fill();
  
        // Right arm (for older plants)
        if (plant.age > 2) {
          ctx.beginPath();
          ctx.moveTo(plant.x + size * 0.15, plant.y - size * 0.3);
          ctx.lineTo(plant.x + size * 0.35, plant.y - size * 0.3);
          ctx.lineTo(plant.x + size * 0.35, plant.y - size * 0.4);
          ctx.arc(plant.x + size * 0.35, plant.y - size * 0.4, size * 0.1, Math.PI, 0);
          ctx.lineTo(plant.x + size * 0.25, plant.y - size * 0.3);
          ctx.fillStyle = plant.color;
          ctx.fill();
        }
      }
  
      // Spines
      const spineCount = 10 + Math.floor(plant.age * 5);
      for (let i = 0; i < spineCount; i++) {
        const spineY = plant.y - (i * size * 0.1);
        if (spineY < plant.y - size * 0.6) continue;
  
        // Left spine
        ctx.beginPath();
        ctx.moveTo(plant.x - size * 0.15, spineY);
        ctx.lineTo(plant.x - size * 0.25, spineY - size * 0.05);
        ctx.strokeStyle = '#FFF9C4';
        ctx.lineWidth = 1;
        ctx.stroke();
  
        // Right spine
        ctx.beginPath();
        ctx.moveTo(plant.x + size * 0.15, spineY);
        ctx.lineTo(plant.x + size * 0.25, spineY - size * 0.05);
        ctx.strokeStyle = '#FFF9C4';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
  
      // Flower (for mature plants)
      if (plant.age > 3) {
        ctx.beginPath();
        ctx.arc(plant.x, plant.y - size * 0.75, size * 0.1, 0, Math.PI * 2);
        ctx.fillStyle = '#E91E63';
        ctx.fill();
  
        // Petals
        const petalCount = 5;
        for (let i = 0; i < petalCount; i++) {
          const angle = (i / petalCount) * Math.PI * 2;
          const petalX = plant.x + Math.cos(angle) * size * 0.15;
          const petalY = (plant.y - size * 0.75) + Math.sin(angle) * size * 0.15;
  
          ctx.beginPath();
          ctx.arc(petalX, petalY, size * 0.08, 0, Math.PI * 2);
          ctx.fillStyle = '#F8BBD0';
          ctx.fill();
        }
      }
    },
  
    // Clear the garden
    clearGarden: function() {
      this.plants = [];
      localStorage.removeItem('audioGarden');
      document.getElementById('statusMessage').textContent = 'Garden cleared. Start speaking or click to plant.';
    },
  
    // Save garden to local storage
    saveGarden: function() {
      if (this.plants.length > 0) {
        localStorage.setItem('audioGarden', JSON.stringify(this.plants));
        document.getElementById('statusMessage').textContent = 'Garden saved! Keep speaking to grow more plants.';
      }
    },
  
    // Load garden from local storage
    loadGarden: function() {
      const savedGarden = localStorage.getItem('audioGarden');
      if (savedGarden) {
        try {
          this.plants = JSON.parse(savedGarden);
          document.getElementById('statusMessage').textContent = 'Your garden has been restored! Speak to add more plants.';
        } catch (e) {
          console.error('Error loading garden:', e);
        }
      } else {
        document.getElementById('statusMessage').textContent = 'Welcome! Click "Start Listening" and speak to grow plants.';
      }
    },
  
    // Redraw garden (e.g., after resize)
    redrawGarden: function() {
      // Implementation handled by the animation loop
    }
  };
  
  // Initialize on page load
  window.addEventListener('DOMContentLoaded', () => {
    AudioGarden.init();
  });