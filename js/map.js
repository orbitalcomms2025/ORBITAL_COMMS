// map.js - Professional English version with floating tab system

const peruBounds = [[-18.5, -81.5], [1.0, -68.0]];
const piuraBounds = [[-5.3, -80.75], [-5.1, -80.55]];

// Date 3 days ago (NASA GIBS processing delay)
const dateObj = new Date();
dateObj.setUTCDate(dateObj.getUTCDate() - 3);
const today = dateObj.toISOString().split('T')[0];

/* ===========================
   RISK ZONES DATA
=========================== */

const riskZones = {
  piura: {
    name: "Piura",
    bounds: [[-5.5, -81], [-4.8, -80.3]],
    risk: "HIGH",
    precipitation: "350-450 mm/month",
    probability: 85,
    recommendations: [
      "Avoid low-lying flood-prone areas",
      "Prepare family emergency kit",
      "Monitor SENAMHI alerts",
      "Reinforce roofs and drainage systems"
    ]
  },
  tumbes: {
    name: "Tumbes",
    bounds: [[-4.5, -80.8], [-3.2, -80]],
    risk: "HIGH",
    precipitation: "300-400 mm/month",
    probability: 82,
    recommendations: [
      "Risk of river overflow",
      "Evacuate low coastal areas",
      "Store drinking water and food",
      "Identify evacuation routes"
    ]
  },
  lambayeque: {
    name: "Lambayeque",
    bounds: [[-7.2, -80.2], [-5.9, -79.2]],
    risk: "MODERATE-HIGH",
    precipitation: "200-300 mm/month",
    probability: 70,
    recommendations: [
      "Monitor river channels",
      "Prepare drainage systems",
      "Check infrastructure status",
      "Stay alert to local warnings"
    ]
  },
  laLibertad: {
    name: "La Libertad",
    bounds: [[-8.5, -79.5], [-7.0, -78.2]],
    risk: "MODERATE",
    precipitation: "150-250 mm/month",
    probability: 60,
    recommendations: [
      "Watch dry ravines",
      "Prepare family emergency plan",
      "Review home insurance",
      "Avoid hillside construction"
    ]
  },
  lima: {
    name: "Lima",
    bounds: [[-12.5, -77.5], [-11.5, -76.5]],
    risk: "LOW-MODERATE",
    precipitation: "50-100 mm/month",
    probability: 35,
    recommendations: [
      "Minor coastal impact",
      "Possible landslides in highlands",
      "Keep drains clean",
      "Check precarious housing status"
    ]
  }
};

/* ===========================
   WMTS TEMPLATES
=========================== */

function imergTemplate(time) {
  return `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/IMERG_Precipitation_Rate/default/${time}/GoogleMapsCompatible_Level6/{z}/{y}/{x}.png`;
}

function sstAnomalyTemplate(time) {
  return `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/GHRSST_L4_MUR_Sea_Surface_Temperature_Anomalies/default/${time}/GoogleMapsCompatible_Level7/{z}/{y}/{x}.png`;
}

/* ===========================
   UTILITIES
=========================== */

function createToast(message, type = 'info', duration = 4000) {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-8px)';
    setTimeout(() => toast.remove(), 450);
  }, duration);
}

function generateRandomData(quantity = 200) {
  const points = [];
  for (let i = 0; i < quantity; i++) {
    const lat = (Math.random() * 180) - 90;
    const lon = (Math.random() * 360) - 180;
    const intensity = Math.random();
    points.push([lat, lon, intensity]);
  }
  return points;
}

function generateFuturePredictions(quantity = 100) {
  const points = [];
  for (let i = 0; i < quantity; i++) {
    const lat = -5 + Math.random() * 0.3;
    const lon = -80.75 + Math.random() * 0.2;
    const intensity = Math.random();
    points.push([lat, lon, intensity]);
  }
  return points;
}

/* ===========================
   PLACE SEARCH
=========================== */

function setupGeocoder(map) {
  const searchContainer = document.createElement('div');
  searchContainer.id = 'geocoder';
  searchContainer.innerHTML = `
    <input type="text" id="searchInput" placeholder="🔍 Search location or coordinates (e.g., -5.2, -80.6)..." />
    <div id="searchResults"></div>
  `;
  document.body.appendChild(searchContainer);

  const searchInput = document.getElementById('searchInput');
  const searchResults = document.getElementById('searchResults');
  let searchMarker = null;
  let debounceTimer;

  searchInput.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    const query = e.target.value.trim();
    
    if (query.length < 3) {
      searchResults.style.display = 'none';
      return;
    }

    // Check if input is coordinates format (lat, lon)
    const coordPattern = /^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/;
    const coordMatch = query.match(coordPattern);
    
    if (coordMatch) {
      const lat = parseFloat(coordMatch[1]);
      const lon = parseFloat(coordMatch[2]);
      
      if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
        searchResults.innerHTML = `
          <div class="search-item coord-result" data-lat="${lat}" data-lon="${lon}">
            <strong>📍 Coordinates</strong>
            <br><small>Latitude: ${lat.toFixed(6)}, Longitude: ${lon.toFixed(6)}</small>
          </div>
        `;
        searchResults.style.display = 'block';
        
        document.querySelector('.coord-result').addEventListener('click', () => {
          map.setView([lat, lon], 13);
          
          if (searchMarker) map.removeLayer(searchMarker);
          searchMarker = L.marker([lat, lon]).addTo(map)
            .bindPopup(`<b>Coordinates</b><br>Lat: ${lat.toFixed(6)}<br>Lon: ${lon.toFixed(6)}`)
            .openPopup();
          
          searchResults.style.display = 'none';
          createToast('Coordinates found', 'success', 3000);
        });
        return;
      }
    }

    debounceTimer = setTimeout(async () => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=pe,ec,co,br,bo,cl,ar,uy,py,ve`
        );
        const results = await response.json();
        
        if (results.length === 0) {
          searchResults.innerHTML = '<div class="search-item">No results found</div>';
          searchResults.style.display = 'block';
          return;
        }

        searchResults.innerHTML = results.map(result => `
          <div class="search-item" data-lat="${result.lat}" data-lon="${result.lon}">
            <strong>${result.display_name.split(',')[0]}</strong>
            <br><small>${result.display_name}</small>
          </div>
        `).join('');
        
        searchResults.style.display = 'block';

        document.querySelectorAll('.search-item').forEach(item => {
          item.addEventListener('click', () => {
            const lat = parseFloat(item.dataset.lat);
            const lon = parseFloat(item.dataset.lon);
            
            map.setView([lat, lon], 13);
            
            if (searchMarker) map.removeLayer(searchMarker);
            searchMarker = L.marker([lat, lon]).addTo(map)
              .bindPopup(`<b>${item.querySelector('strong').textContent}</b>`)
              .openPopup();
            
            searchResults.style.display = 'none';
            searchInput.value = item.querySelector('strong').textContent;
            
            createToast('Location found', 'success', 3000);
          });
        });
      } catch (error) {
        console.error('Search error:', error);
        searchResults.innerHTML = '<div class="search-item">Search error</div>';
        searchResults.style.display = 'block';
      }
    }, 300);
  });

  document.addEventListener('click', (e) => {
    if (!searchContainer.contains(e.target)) {
      searchResults.style.display = 'none';
    }
  });
}

/* ===========================
   FLOATING TABS SYSTEM
=========================== */

function setupFloatingTabs() {
  const tabsHTML = `
    <div id="floatingTabs">
      <button class="floatTab floatTab-right" data-target="layerPanel" title="Map Layers">
        <span>LAYERS</span>
      </button>
      <button class="floatTab floatTab-right" data-target="fenomenoPane" title="El Niño 2019 Info">
        <span>EL NIÑO</span>
      </button>
      <button class="floatTab floatTab-right" data-target="prediccionPane" title="Predictions">
        <span>FORECAST</span>
      </button>
      <button class="floatTab floatTab-bottom" data-target="animationPanel" title="SST Animation Player">
        <span>⏯ SST TIMELINE</span>
      </button>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', tabsHTML);

  document.querySelectorAll('.floatTab').forEach(tab => {
    tab.addEventListener('click', () => {
      const targetId = tab.dataset.target;
      const targetPanel = document.getElementById(targetId);
      
      if (targetPanel) {
        const isHidden = targetPanel.getAttribute('aria-hidden') === 'true';
        
        if (isHidden) {
          // Open panel
          targetPanel.setAttribute('aria-hidden', 'false');
          if (targetId === 'animationPanel') {
            targetPanel.style.display = 'block';
          }
          tab.classList.add('active');
          createToast(`${tab.title} opened`, 'info', 2000);
        } else {
          // Close panel
          targetPanel.setAttribute('aria-hidden', 'true');
          if (targetId === 'animationPanel') {
            targetPanel.style.display = 'none';
          }
          tab.classList.remove('active');
        }
      }
    });
  });
}

/* ===========================
   INITIALIZATION
=========================== */

document.addEventListener('DOMContentLoaded', () => {
  
  const dateInput = document.getElementById('date');
  if (dateInput) dateInput.value = today;

  const map = L.map('map', {
    zoomSnap: 0.5,
    worldCopyJump: false,
    maxBounds: [[-60, -100], [15, -30]], // Expandido para toda Sudamérica
    maxBoundsViscosity: 0.5, // Menos restrictivo
    minZoom: 3,
    maxZoom: 18
  }).setView([-9.2, -75], 5);

  const commonOptions = {
    tileSize: 256,
    minZoom: 2,
    errorTileUrl: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==',
    noWrap: true,
    detectRetina: false
  };

  let currentDate = today;

  /* ===========================
     BASE LAYERS AND OVERLAYS
  =========================== */

  const esri = L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    { 
      attribution: 'Tiles © Esri', 
      minZoom: 1, 
      maxZoom: 19 
    }
  ).addTo(map);

  let imergLayer = L.tileLayer(imergTemplate(currentDate), {
    ...commonOptions,
    maxZoom: 12,
    opacity: 0.65,
    attribution: "NASA EOSDIS GIBS — IMERG Precipitation"
  });

  let sstLayer = L.tileLayer(sstAnomalyTemplate(currentDate), {
    ...commonOptions,
    maxZoom: 12,
    opacity: 0.75,
    attribution: "NASA GHRSST — SST Anomalies (MUR L4)"
  });

  let streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    opacity: 0.7,
    minZoom: 1,
    maxZoom: 19
  });

  // Country borders and city labels overlay
  let bordersLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap',
    opacity: 0.5,
    minZoom: 1,
    maxZoom: 19
  });

  // Labels overlay for cities
  let labelsLayer = L.tileLayer('https://stamen-tiles-{s}.a.ssl.fastly.net/toner-labels/{z}/{x}/{y}.png', {
    attribution: 'Map tiles by Stamen Design, under CC BY 3.0',
    opacity: 0.8,
    minZoom: 1,
    maxZoom: 19
  });

  let heatPiura = L.heatLayer(generateRandomData(), {
    radius: 25,
    blur: 15,
    minOpacity: 0.5,
    max: 1.0,
    gradient: { 0.0: 'blue', 0.4: 'cyan', 0.6: 'yellow', 0.8: 'orange', 1.0: 'red' }
  });

  let heatPeru = L.heatLayer(generateRandomData(), {
    radius: 30,
    blur: 20,
    minOpacity: 0.5,
    max: 1.0,
    gradient: { 0.0: 'blue', 0.4: 'cyan', 0.6: 'yellow', 0.8: 'orange', 1.0: 'red' }
  });

  let heatFuture = L.heatLayer(generateFuturePredictions(), {
    radius: 25,
    blur: 15,
    minOpacity: 0.5,
    max: 1.0,
    gradient: { 0.0: 'blue', 0.4: 'cyan', 0.6: 'yellow', 0.8: 'orange', 1.0: 'red' }
  });

  /* ===========================
     LAYERS PANEL
  =========================== */

  const layerPanel = document.getElementById('layerPanel');
  const layerList = document.getElementById('layerList');
  const closePanel = document.getElementById('closePanel');
  const resetLayers = document.getElementById('resetLayers');

  const layersConfig = [
    { name: 'Esri World Imagery', layer: esri, defaultOn: true, locked: true },
    { name: 'SST Anomalies (El Niño)', layer: sstLayer, defaultOn: false, special: 'sst' },
    { name: 'IMERG Rainfall', layer: imergLayer, defaultOn: false },
    { name: 'Country Borders & Cities', layer: labelsLayer, defaultOn: false },
    { name: 'OSM Streets', layer: streetLayer, defaultOn: false },
    { name: 'Piura Heatmap', layer: heatPiura, defaultOn: false },
    { name: 'Peru Heatmap', layer: heatPeru, defaultOn: false },
    { name: 'Flood Prediction', layer: heatFuture, defaultOn: false }
  ];

  function createLayerControls() {
    layerList.innerHTML = '';
    layersConfig.forEach((cfg, idx) => {
      const row = document.createElement('div');
      row.className = 'layer-row';
      if (cfg.special === 'sst') row.classList.add('sst-special');

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = `layer-${idx}`;
      checkbox.checked = cfg.defaultOn;
      if (cfg.locked) checkbox.disabled = true;

      const label = document.createElement('label');
      label.htmlFor = `layer-${idx}`;
      label.innerHTML = cfg.name;
      if (cfg.locked) label.innerHTML += ' <span style="font-size:10px;color:#999;">(Base)</span>';

      row.appendChild(checkbox);
      row.appendChild(label);
      layerList.appendChild(row);

      checkbox.addEventListener('change', (e) => {
        if (e.target.checked) {
          cfg.layer.addTo(map);
          if (cfg.special === 'sst') {
            createToast('SST Anomalies layer activated', 'info', 3000);
          }
        } else {
          map.removeLayer(cfg.layer);
        }
      });
    });
  }

  createLayerControls();

  if (closePanel) {
    closePanel.addEventListener('click', () => {
      layerPanel.setAttribute('aria-hidden', 'true');
      document.querySelector('[data-target="layerPanel"]').classList.remove('active');
    });
  }

  if (resetLayers) {
    resetLayers.addEventListener('click', () => {
      layersConfig.forEach((cfg, idx) => {
        const checkbox = document.getElementById(`layer-${idx}`);
        if (checkbox && !cfg.locked) {
          checkbox.checked = cfg.defaultOn;
          if (cfg.defaultOn) {
            cfg.layer.addTo(map);
          } else {
            map.removeLayer(cfg.layer);
          }
        }
      });
      createToast('Layers reset', 'success', 3000);
    });
  }

  // Draggable panel
  let isDragging = false;
  let offsetX, offsetY;

  const panelHeader = layerPanel.querySelector('.panelHeader');
  
  panelHeader.addEventListener('mousedown', (e) => {
    isDragging = true;
    offsetX = e.clientX - layerPanel.offsetLeft;
    offsetY = e.clientY - layerPanel.offsetTop;
  });

  document.addEventListener('mousemove', (e) => {
    if (isDragging) {
      layerPanel.style.left = (e.clientX - offsetX) + 'px';
      layerPanel.style.top = (e.clientY - offsetY) + 'px';
      layerPanel.style.right = 'auto';
    }
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
  });

  /* ===========================
     NAVIGATION
  =========================== */

  const fitPeruBtn = document.getElementById('fitPeru');
  if (fitPeruBtn) {
    fitPeruBtn.addEventListener('click', () => {
      map.fitBounds(peruBounds, { padding: [20, 20] });
    });
  }

  const fitPiuraBtn = document.getElementById('fitPiura');
  if (fitPiuraBtn) {
    fitPiuraBtn.addEventListener('click', () => {
      map.fitBounds(piuraBounds, { padding: [20, 20] });
      map.setZoom(13);
    });
  }

  /* ===========================
     ZONE PREDICTION
  =========================== */

  let predictionMarker = null;
  let predictionPanel = null;

  map.on('click', function (e) {
    const lat = e.latlng.lat;
    const lon = e.latlng.lng;
    
    const coordsEl = document.getElementById('coords');
    if (coordsEl) {
      coordsEl.innerHTML = `Lat: <strong>${lat.toFixed(6)}</strong>, Lon: <strong>${lon.toFixed(6)}</strong>`;
    }

    let foundZone = null;
    for (let key in riskZones) {
      const zone = riskZones[key];
      const [[minLat, minLon], [maxLat, maxLon]] = zone.bounds;
      if (lat >= minLat && lat <= maxLat && lon >= minLon && lon <= maxLon) {
        foundZone = zone;
        break;
      }
    }

    if (foundZone) {
      showPrediction(foundZone, lat, lon);
    } else {
      if (predictionPanel) {
        predictionPanel.remove();
        predictionPanel = null;
      }
    }

    if (predictionMarker) map.removeLayer(predictionMarker);
    predictionMarker = L.marker([lat, lon]).addTo(map);
  });

  function showPrediction(zone, lat, lon) {
    if (predictionPanel) predictionPanel.remove();

    predictionPanel = document.createElement('div');
    predictionPanel.style.cssText = `
      position: absolute;
      bottom: 120px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 2000;
      background: rgba(255, 255, 255, 0.98);
      color: #111;
      padding: 16px 20px;
      border-radius: 10px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
      max-width: 420px;
      min-width: 320px;
      font-size: 14px;
    `;

    const riskColor = zone.risk.includes('HIGH') ? '#e74c3c' : zone.risk.includes('MODERATE') ? '#f39c12' : '#27ae60';

    predictionPanel.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <h3 style="margin: 0; color: ${riskColor};">Prediction: ${zone.name}</h3>
        <button id="closePred" style="background: none; border: none; font-size: 20px; cursor: pointer; color: #999;">×</button>
      </div>
      <div style="background: ${riskColor}22; padding: 8px 12px; border-radius: 6px; margin-bottom: 10px;">
        <strong>Risk Level:</strong> <span style="color: ${riskColor}; font-weight: 700;">${zone.risk}</span>
        <br>
        <strong>Probability:</strong> ${zone.probability}%
      </div>
      <div style="margin-bottom: 10px;">
        <strong>Expected precipitation:</strong> ${zone.precipitation}
      </div>
      <div>
        <strong>Recommendations:</strong>
        <ul style="margin: 8px 0 0 0; padding-left: 20px;">
          ${zone.recommendations.map(r => `<li style="margin: 4px 0;">${r}</li>`).join('')}
        </ul>
      </div>
      <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #ddd; font-size: 12px; color: #666;">
        Coordinates: ${lat.toFixed(4)}, ${lon.toFixed(4)}
      </div>
    `;

    document.body.appendChild(predictionPanel);

    document.getElementById('closePred').addEventListener('click', () => {
      predictionPanel.remove();
      predictionPanel = null;
    });

    createToast(`Prediction generated for ${zone.name}`, 'success', 3000);
  }

  /* ===========================
     SST TEMPORAL ANIMATION
  =========================== */

  let animationState = {
    playing: false,
    currentIndex: 0,
    dates: [],
    interval: null,
    speed: 1000
  };

  function getDateDaysAgo(days) {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - days);
    return date.toISOString().split('T')[0];
  }

  function generateDateRange(start, end) {
    const dates = [];
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    for (let d = new Date(startDate); d <= endDate; d.setUTCDate(d.getUTCDate() + 1)) {
      dates.push(new Date(d).toISOString().split('T')[0]);
    }
    return dates;
  }

  function setupAnimationControls() {
    const animPanel = document.createElement('div');
    animPanel.id = 'animationPanel';
    animPanel.setAttribute('data-minimized', 'false');
    animPanel.setAttribute('aria-hidden', 'true');
    animPanel.style.display = 'none';
    animPanel.innerHTML = `
      <div class="animPanelHeader" id="animDragHandle">
        <strong>SST Temporal Animation</strong>
        <div class="animHeaderButtons">
          <button id="minimizeAnim" class="headerBtn" title="Minimize">−</button>
          <button id="closeAnim" class="headerBtn" title="Close">×</button>
        </div>
      </div>
      <div id="animContent" class="animControls">
        <div class="dateRange">
          <label>From:</label>
          <input type="date" id="animStartDate" value="${getDateDaysAgo(30)}" />
          <label>To:</label>
          <input type="date" id="animEndDate" value="${today}" />
        </div>
        <div class="playControls">
          <button id="playBtn" class="animBtn">▶ Play</button>
          <button id="pauseBtn" class="animBtn" style="display:none;">⏸ Pause</button>
          <button id="stopBtn" class="animBtn">⏹ Stop</button>
        </div>
        <div class="speedControl">
          <label>Speed:</label>
          <select id="speedSelect">
            <option value="2000">Slow (2s)</option>
            <option value="1000" selected>Normal (1s)</option>
            <option value="500">Fast (0.5s)</option>
            <option value="250">Very Fast (0.25s)</option>
          </select>
        </div>
        <div class="progressContainer">
          <div class="progressBar">
            <div id="progressFill" class="progressFill"></div>
          </div>
          <div id="currentDateDisplay" class="currentDateDisplay">Date: ${today}</div>
        </div>
      </div>
    `;
    document.body.appendChild(animPanel);

    // Drag functionality
    let isDraggingAnim = false;
    let animOffsetX, animOffsetY;
    const dragHandle = document.getElementById('animDragHandle');
    
    dragHandle.addEventListener('mousedown', (e) => {
      if (e.target.classList.contains('headerBtn')) return;
      isDraggingAnim = true;
      animOffsetX = e.clientX - animPanel.offsetLeft;
      animOffsetY = e.clientY - animPanel.offsetTop;
      dragHandle.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', (e) => {
      if (isDraggingAnim) {
        animPanel.style.left = (e.clientX - animOffsetX) + 'px';
        animPanel.style.top = (e.clientY - animOffsetY) + 'px';
        animPanel.style.bottom = 'auto';
        animPanel.style.transform = 'none';
      }
    });

    document.addEventListener('mouseup', () => {
      if (isDraggingAnim) {
        isDraggingAnim = false;
        dragHandle.style.cursor = 'grab';
      }
    });

    // Minimize/Maximize
    document.getElementById('minimizeAnim').addEventListener('click', () => {
      const content = document.getElementById('animContent');
      const isMinimized = animPanel.getAttribute('data-minimized') === 'true';
      
      if (isMinimized) {
        content.style.display = 'flex';
        animPanel.setAttribute('data-minimized', 'false');
        document.getElementById('minimizeAnim').textContent = '−';
      } else {
        content.style.display = 'none';
        animPanel.setAttribute('data-minimized', 'true');
        document.getElementById('minimizeAnim').textContent = '+';
      }
    });

    // Close
    document.getElementById('closeAnim').addEventListener('click', () => {
      stopAnimation();
      animPanel.setAttribute('aria-hidden', 'true');
      animPanel.style.display = 'none';
      document.querySelector('[data-target="animationPanel"]').classList.remove('active');
    });

    // Event listeners
    document.getElementById('playBtn').addEventListener('click', startAnimation);
    document.getElementById('pauseBtn').addEventListener('click', pauseAnimation);
    document.getElementById('stopBtn').addEventListener('click', stopAnimation);
    document.getElementById('speedSelect').addEventListener('change', (e) => {
      animationState.speed = parseInt(e.target.value);
      if (animationState.playing) {
        stopAnimation();
        startAnimation();
      }
    });
  }

  function startAnimation() {
    const startDate = document.getElementById('animStartDate').value;
    const endDate = document.getElementById('animEndDate').value;
    
    if (!startDate || !endDate) {
      createToast('Select valid date range', 'error', 3000);
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      createToast('Start date must be before end date', 'error', 3000);
      return;
    }

    animationState.dates = generateDateRange(startDate, endDate);
    animationState.currentIndex = 0;
    animationState.playing = true;

    document.getElementById('playBtn').style.display = 'none';
    document.getElementById('pauseBtn').style.display = 'inline-block';

    const sstCheckbox = document.getElementById('layer-1');
    if (sstCheckbox && !sstCheckbox.checked) {
      sstCheckbox.checked = true;
      sstLayer.addTo(map);
      createToast('SST layer activated', 'info', 2000);
    }

    createToast(`Animation: ${animationState.dates.length} days`, 'success', 3000);
    playNextFrame();
  }

  function playNextFrame() {
    if (!animationState.playing || animationState.currentIndex >= animationState.dates.length) {
      stopAnimation();
      return;
    }

    const currentDate = animationState.dates[animationState.currentIndex];
    
    // Create new layer with fade-in transition
    const newSstLayer = L.tileLayer(sstAnomalyTemplate(currentDate), {
      ...commonOptions,
      maxZoom: 12,
      opacity: 0,
      attribution: "NASA GHRSST — SST Anomalies (MUR L4)",
      className: 'sst-transition'
    });

    // Add new layer first
    newSstLayer.addTo(map);

    // Wait for tiles to load, then fade in
    newSstLayer.once('load', () => {
      // Fade in new layer
      let opacity = 0;
      const fadeInterval = setInterval(() => {
        opacity += 0.15;
        if (opacity >= 0.75) {
          opacity = 0.75;
          clearInterval(fadeInterval);
          // Remove old layer after fade completes
          if (map.hasLayer(sstLayer)) map.removeLayer(sstLayer);
          sstLayer = newSstLayer;
          layersConfig[1].layer = sstLayer;
        }
        newSstLayer.setOpacity(opacity);
      }, 30);
    });

    // Timeout fallback in case tiles don't load
    setTimeout(() => {
      if (newSstLayer.options.opacity < 0.75) {
        newSstLayer.setOpacity(0.75);
        if (map.hasLayer(sstLayer)) map.removeLayer(sstLayer);
        sstLayer = newSstLayer;
        layersConfig[1].layer = sstLayer;
      }
    }, 1000);

    const progress = ((animationState.currentIndex + 1) / animationState.dates.length) * 100;
    document.getElementById('progressFill').style.width = progress + '%';
    document.getElementById('currentDateDisplay').textContent = `Date: ${currentDate} (${animationState.currentIndex + 1}/${animationState.dates.length})`;
    
    if (dateInput) dateInput.value = currentDate;

    animationState.currentIndex++;
    animationState.interval = setTimeout(playNextFrame, animationState.speed);
  }

  function pauseAnimation() {
    animationState.playing = false;
    if (animationState.interval) clearTimeout(animationState.interval);
    document.getElementById('playBtn').style.display = 'inline-block';
    document.getElementById('pauseBtn').style.display = 'none';
    createToast('Animation paused', 'info', 2000);
  }

  function stopAnimation() {
    animationState.playing = false;
    animationState.currentIndex = 0;
    if (animationState.interval) clearTimeout(animationState.interval);
    document.getElementById('playBtn').style.display = 'inline-block';
    document.getElementById('pauseBtn').style.display = 'none';
    document.getElementById('progressFill').style.width = '0%';
    
    if (animationState.dates.length > 0) {
      createToast('Animation stopped', 'info', 2000);
    }
  }

  /* ===========================
     APPLY DATE
  =========================== */

  const goDateBtn = document.getElementById('goDate');
  if (goDateBtn) {
    goDateBtn.addEventListener('click', () => {
      const d = dateInput ? dateInput.value : null;
      if (!d) {
        alert('Choose a date.');
        return;
      }

      currentDate = d;

      if (map.hasLayer(imergLayer)) map.removeLayer(imergLayer);
      if (map.hasLayer(sstLayer)) map.removeLayer(sstLayer);

      imergLayer = L.tileLayer(imergTemplate(currentDate), {
        ...commonOptions,
        maxZoom: 12,
        opacity: 0.65,
        attribution: "NASA EOSDIS GIBS — IMERG Precipitation"
      });

      sstLayer = L.tileLayer(sstAnomalyTemplate(currentDate), {
        ...commonOptions,
        maxZoom: 12,
        opacity: 0.75,
        attribution: "NASA GHRSST — SST Anomalies (MUR L4)"
      });

      layersConfig[1].layer = sstLayer;
      layersConfig[2].layer = imergLayer;

      const checkbox1 = document.getElementById('layer-1');
      const checkbox2 = document.getElementById('layer-2');

      if (checkbox1 && checkbox1.checked) sstLayer.addTo(map);
      if (checkbox2 && checkbox2.checked) imergLayer.addTo(map);

      heatPiura.setLatLngs(generateRandomData());
      heatPeru.setLatLngs(generateRandomData());
      heatFuture.setLatLngs(generateFuturePredictions());

      const layerInfoEl = document.getElementById('layerInfo');
      if (layerInfoEl) {
        layerInfoEl.innerText = `Date updated: ${currentDate}`;
      }

      createToast(`Date updated to ${currentDate}`, 'success', 3000);
    });
  }

  /* ===========================
     TABS
  =========================== */

  const tabBtns = document.querySelectorAll('.tabBtn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-tab');
      const tab = document.getElementById(tabId);
      if (!tab) return;

      const isVisible = tab.style.display === 'block';
      
      document.querySelectorAll('.tabContent').forEach(t => t.style.display = 'none');
      document.querySelectorAll('.tabBtn').forEach(b => b.classList.remove('active'));
      
      if (!isVisible) {
        tab.style.display = 'block';
        btn.classList.add('active');
      }
    });
  });

  // Close buttons for tab content
  document.querySelectorAll('.tabContent').forEach(pane => {
    pane.addEventListener('click', (e) => {
      if (e.target.classList.contains('closeTabContent')) {
        pane.style.display = 'none';
        const tabBtn = document.querySelector(`[data-tab="${pane.id}"]`);
        if (tabBtn) tabBtn.classList.remove('active');
        const floatTab = document.querySelector(`[data-target="${pane.id}"]`);
        if (floatTab) floatTab.classList.remove('active');
      }
    });
  });

  /* ===========================
     CHARTS
  =========================== */

  try {
    new Chart(document.getElementById('rainChart').getContext('2d'), {
      type: 'bar',
      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [{
          label: 'Precipitation (mm)',
          data: [120, 180, 420, 200, 80, 40],
          backgroundColor: 'rgba(54, 162, 235, 0.6)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: false,
        scales: {
          y: { beginAtZero: true, title: { display: true, text: 'mm' } },
          x: { title: { display: true, text: 'Months' } }
        },
        plugins: { legend: { display: false } }
      }
    });
  } catch (e) {
    console.warn('rainChart not available', e);
  }

  try {
    new Chart(document.getElementById('cropChart').getContext('2d'), {
      type: 'pie',
      data: {
        labels: ['Rice', 'Corn', 'Cotton'],
        datasets: [{
          label: 'Reduction (%)',
          data: [35, 25, 20],
          backgroundColor: [
            'rgba(255, 99, 132, 0.6)',
            'rgba(255, 206, 86, 0.6)',
            'rgba(75, 192, 192, 0.6)'
          ],
          borderColor: '#fff',
          borderWidth: 1
        }]
      },
      options: {
        responsive: false,
        plugins: {
          legend: { position: 'bottom' },
          title: { display: true, text: 'Crop Impact' }
        }
      }
    });
  } catch (e) {
    console.warn('cropChart not available', e);
  }

  setupGeocoder(map);
  setupAnimationControls();
  setupFloatingTabs();

  // Initial tutorial
  const tutorial = document.getElementById('initialTutorial');
  const closeTutorialBtn = document.getElementById('closeTutorial');
  
  if (closeTutorialBtn) {
    closeTutorialBtn.addEventListener('click', () => {
      tutorial.style.animation = 'fadeOut 0.3s ease';
      setTimeout(() => {
        tutorial.remove();
      }, 300);
    });
  }

  map.fitBounds(peruBounds, { padding: [20, 20] });
  L.control.scale().addTo(map);

  createToast('Map loaded successfully. Use side tabs to open panels.', 'success', 5000);

});
