// rutas.js — Safe Routes & Construction Analysis System v3
// Phase 2: Draggable/minimizable panels + Python-ready structure

(() => {
  const API_BASE = 'http://localhost:5000'; // Backend URL - set this when Python backend is ready
  /* ===========================
     UTILITIES
  =========================== */

  function createToast(msg, type = 'info', duration = 3500) {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = msg;
    container.appendChild(toast);
    
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px)';
      setTimeout(() => toast.remove(), 420);
    }, duration);
  }

  function haversineMeters(a, b) {
    const R = 6371000;
    const toRad = (x) => x * Math.PI / 180;
    const dLat = toRad(b[0] - a[0]);
    const dLon = toRad(b[1] - a[1]);
    const lat1 = toRad(a[0]);
    const lat2 = toRad(b[0]);
    const sinDlat = Math.sin(dLat / 2);
    const sinDlon = Math.sin(dLon / 2);
    const c = 2 * Math.asin(Math.sqrt(sinDlat * sinDlat + Math.cos(lat1) * Math.cos(lat2) * sinDlon * sinDlon));
    return R * c;
  }

  /* ===========================
     GIBS TEMPLATES
  =========================== */

  function imergTemplate(date) {
    return `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/IMERG_Precipitation_Rate/default/${date}/GoogleMapsCompatible_Level6/{z}/{y}/{x}.png`;
  }

  function sstTemplate(date) {
    return `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/GHRSST_L4_MUR_Sea_Surface_Temperature_Anomalies/default/${date}/GoogleMapsCompatible_Level7/{z}/{y}/{x}.png`;
  }

  /* ===========================
     STATE
  =========================== */

  const state = {
    selectedLocation: null,
    analysisMode: 'route',
    dateRange: { start: null, end: null },
    resultLayer: null,
    currentMarker: null,
    explorationMode: false,
    userMarkers: [],
    panels: {
      control: { minimized: false },
      results: { minimized: false }
    }
  };

  /* ===========================
     DRAGGABLE PANEL SYSTEM
  =========================== */

  function makePanelDraggable(panelId, handleClass) {
    const panel = document.getElementById(panelId);
    const handle = panel.querySelector(`.${handleClass}`);
    
    if (!panel || !handle) return;

    let isDragging = false;
    let currentX, currentY, initialX, initialY;

    handle.style.cursor = 'grab';

    handle.addEventListener('mousedown', dragStart);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', dragEnd);

    // Touch events
    handle.addEventListener('touchstart', dragStart);
    document.addEventListener('touchmove', drag);
    document.addEventListener('touchend', dragEnd);

    function dragStart(e) {
      if (e.target.closest('.closeBtn') || e.target.closest('.minimizeBtn')) return;
      
      initialX = panel.offsetLeft;
      initialY = panel.offsetTop;

      if (e.type === 'touchstart') {
        currentX = e.touches[0].clientX;
        currentY = e.touches[0].clientY;
      } else {
        currentX = e.clientX;
        currentY = e.clientY;
      }

      isDragging = true;
      handle.style.cursor = 'grabbing';
      panel.style.transition = 'none';
    }

    function drag(e) {
      if (!isDragging) return;

      e.preventDefault();

      let clientX, clientY;
      if (e.type === 'touchmove') {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      const deltaX = clientX - currentX;
      const deltaY = clientY - currentY;

      let newX = initialX + deltaX;
      let newY = initialY + deltaY;

      // Keep panel within viewport
      const maxX = window.innerWidth - panel.offsetWidth;
      const maxY = window.innerHeight - panel.offsetHeight;
      
      newX = Math.max(0, Math.min(newX, maxX));
      newY = Math.max(0, Math.min(newY, maxY));

      panel.style.left = newX + 'px';
      panel.style.top = newY + 'px';
      panel.style.right = 'auto';
      panel.style.bottom = 'auto';
    }

    function dragEnd() {
      if (!isDragging) return;
      isDragging = false;
      handle.style.cursor = 'grab';
      panel.style.transition = '';
    }
  }

  function setupPanelMinimize(panelId, btnId, stateKey) {
    const panel = document.getElementById(panelId);
    const btn = document.getElementById(btnId);
    const content = panel.querySelector('.panel-content, #resultsContent');

    if (!btn || !content) return;

    btn.addEventListener('click', () => {
      state.panels[stateKey].minimized = !state.panels[stateKey].minimized;

      if (state.panels[stateKey].minimized) {
        content.style.display = 'none';
        btn.innerHTML = '+';
        btn.title = 'Maximize';
        panel.classList.add('minimized');
        createToast('Panel minimized', 'info', 1500);
      } else {
        content.style.display = 'block';
        btn.innerHTML = '−';
        btn.title = 'Minimize';
        panel.classList.remove('minimized');
        createToast('Panel restored', 'info', 1500);
      }
    });
  }

  /* ===========================
     TUTORIAL SYSTEM
  =========================== */

  function showTutorial() {
    if (localStorage.getItem('rutas_tutorial_seen') === 'true') {
      return;
    }

    const tutorialHTML = `
      <div id="tutorialOverlay" class="tutorial-overlay">
        <div class="tutorial-content">
          <h2>Welcome to Safe Routes & Construction Analysis</h2>
          <p>Interactive platform for route safety and construction site viability analysis</p>
          
          <div class="tutorial-steps">
            <div class="tutorial-step">
              <span class="step-number">1</span>
              <div class="step-content">
                <h3>Search Location</h3>
                <p>Enter a city name (e.g., "Piura") or coordinates (e.g., "-5.2, -80.6") in the search box</p>
              </div>
            </div>
            
            <div class="tutorial-step">
              <span class="step-number">2</span>
              <div class="step-content">
                <h3>Select Date Range</h3>
                <p>Choose analysis period to evaluate climate conditions and risks</p>
              </div>
            </div>
            
            <div class="tutorial-step">
              <span class="step-number">3</span>
              <div class="step-content">
                <h3>Choose Analysis Mode</h3>
                <p><strong>Safe Route:</strong> Check if traveling through area is safe<br>
                   <strong>Construction:</strong> Evaluate site viability for building</p>
              </div>
            </div>
            
            <div class="tutorial-step">
              <span class="step-number">4</span>
              <div class="step-content">
                <h3>Process & View Results</h3>
                <p>Click "Process Analysis" to see risk assessment and recommendations</p>
              </div>
            </div>
            
            <div class="tutorial-step">
              <span class="step-number">5</span>
              <div class="step-content">
                <h3>Explore Maps</h3>
                <p><strong>Top map:</strong> Current climate data visualization<br>
                   <strong>Bottom map:</strong> Analysis results with risk zones (independent navigation)</p>
              </div>
            </div>
            
            <div class="tutorial-step">
              <span class="step-number">6</span>
              <div class="step-content">
                <h3>Panel Controls</h3>
                <p>Panels are draggable (click header) and minimizable (− button). Use Exploration Mode to mark custom points.</p>
              </div>
            </div>
          </div>
          
          <div class="tutorial-footer">
            <label class="tutorial-checkbox">
              <input type="checkbox" id="dontShowAgain" />
              <span>Don't show this again</span>
            </label>
            <button id="closeTutorial" class="btn-tutorial">Got it! Start Analyzing</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', tutorialHTML);

    document.getElementById('closeTutorial').addEventListener('click', () => {
      const dontShow = document.getElementById('dontShowAgain').checked;
      if (dontShow) {
        localStorage.setItem('rutas_tutorial_seen', 'true');
      }
      document.getElementById('tutorialOverlay').style.animation = 'fadeOut 0.3s ease';
      setTimeout(() => {
        document.getElementById('tutorialOverlay').remove();
      }, 300);
    });
  }

  /* ===========================
     MAP INITIALIZATION
  =========================== */

  function initMaps() {
    const dateInput = document.getElementById('date');
    const defaultDate = (() => {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() - 3);
      return d.toISOString().split('T')[0];
    })();

    if (dateInput && !dateInput.value) {
      dateInput.value = defaultDate;
    }

    const startView = [-9.2, -75];
    const startZoom = 5;

    // Initialize INDEPENDENT maps
    const mapRoutes = L.map('mapRoutes', {
      zoomSnap: 0.5,
      minZoom: 3,
      maxZoom: 18,
      maxBounds: [[-60, -100], [15, -30]],
      maxBoundsViscosity: 0.5
    }).setView(startView, startZoom);

    const mapBuild = L.map('mapBuild', {
      zoomSnap: 0.5,
      minZoom: 3,
      maxZoom: 18,
      maxBounds: [[-60, -100], [15, -30]],
      maxBoundsViscosity: 0.5
    }).setView(startView, startZoom);

    // Base layers
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { attribution: 'Tiles © Esri', minZoom: 1, maxZoom: 19 }
    ).addTo(mapRoutes);

    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { attribution: 'Tiles © Esri', minZoom: 1, maxZoom: 19 }
    ).addTo(mapBuild);

    // NASA GIBS overlays
    let imergLayer = L.tileLayer(imergTemplate(defaultDate), {
      maxZoom: 12,
      opacity: 0.65,
      attribution: 'NASA IMERG'
    });

    let sstLayer = L.tileLayer(sstTemplate(defaultDate), {
      maxZoom: 12,
      opacity: 0.75,
      attribution: 'NASA GHRSST',
      className: 'sst-transition'
    });

    // City labels only (removed borders)
    const citiesLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}.png', {
      attribution: '© CARTO',
      opacity: 1,
      maxZoom: 19
    });

    // Layer groups
    const drawnGroupRoutes = L.layerGroup().addTo(mapRoutes);
    const drawnGroupBuild = L.layerGroup().addTo(mapBuild);

    // Scale controls
    L.control.scale().addTo(mapRoutes);
    L.control.scale().addTo(mapBuild);

    // Coordinate display
    setupCoordinateDisplay(mapRoutes);
    setupCoordinateDisplay(mapBuild);

    return {
      mapRoutes,
      mapBuild,
      overlays: { imergLayer, sstLayer, citiesLayer },
      drawn: { drawnGroupRoutes, drawnGroupBuild }
    };
  }

  /* ===========================
     COORDINATE DISPLAY
  =========================== */

  function setupCoordinateDisplay(map) {
    map.on('mousemove', (e) => {
      const coordsEl = document.getElementById('coords');
      if (coordsEl && state.explorationMode) {
        coordsEl.innerHTML = `Lat: <strong>${e.latlng.lat.toFixed(6)}</strong><br>Lon: <strong>${e.latlng.lng.toFixed(6)}</strong>`;
      }
    });
  }

  /* ===========================
     EXPLORATION MODE
  =========================== */

  function setupExplorationMode(env) {
    const explorationToggle = document.getElementById('btnExplorationMode');
    
    explorationToggle.addEventListener('click', () => {
      state.explorationMode = !state.explorationMode;
      
      if (state.explorationMode) {
        explorationToggle.classList.add('active');
        explorationToggle.innerHTML = 'Exploration ON';
        createToast('Exploration mode: Click anywhere to mark points', 'info', 3000);
      } else {
        explorationToggle.classList.remove('active');
        explorationToggle.innerHTML = 'Exploration OFF';
        createToast('Exploration mode disabled', 'info', 2000);
      }
    });

    env.mapRoutes.on('click', (e) => {
      if (state.explorationMode) {
        addUserMarker(e.latlng, env.mapRoutes, env.drawn.drawnGroupRoutes);
      }
    });

    env.mapBuild.on('click', (e) => {
      if (state.explorationMode) {
        addUserMarker(e.latlng, env.mapBuild, env.drawn.drawnGroupBuild);
      }
    });
  }

  function addUserMarker(latlng, map, layerGroup) {
    const markerId = state.userMarkers.length + 1;
    
    const marker = L.marker(latlng, {
      icon: L.divIcon({
        className: 'user-marker',
        html: `<div class="user-marker-pin"><span>${markerId}</span></div>`,
        iconSize: [30, 40],
        iconAnchor: [15, 40]
      })
    }).addTo(layerGroup);

    marker.bindPopup(`
      <div class="marker-popup">
        <strong>Point #${markerId}</strong><br>
        <small>Lat: ${latlng.lat.toFixed(6)}</small><br>
        <small>Lon: ${latlng.lng.toFixed(6)}</small><br>
        <button onclick="window.removeUserMarker(${markerId})" class="btn-remove-marker">Remove</button>
      </div>
    `);

    state.userMarkers.push({ id: markerId, marker, latlng });
    
    updateCoordinatesPanel();
    createToast(`Point #${markerId} added`, 'success', 2000);
  }

  window.removeUserMarker = function(id) {
    const index = state.userMarkers.findIndex(m => m.id === id);
    if (index !== -1) {
      const markerData = state.userMarkers[index];
      markerData.marker.remove();
      state.userMarkers.splice(index, 1);
      updateCoordinatesPanel();
      createToast(`Point #${id} removed`, 'info', 2000);
    }
  };

  function updateCoordinatesPanel() {
    const coordsEl = document.getElementById('coords');
    if (!coordsEl) return;

    if (state.userMarkers.length === 0) {
      coordsEl.innerHTML = 'Click on map or search location';
      return;
    }

    const lastMarker = state.userMarkers[state.userMarkers.length - 1];
    coordsEl.innerHTML = `
      <strong>Point #${lastMarker.id}</strong><br>
      Lat: ${lastMarker.latlng.lat.toFixed(6)}<br>
      Lon: ${lastMarker.latlng.lng.toFixed(6)}<br>
      <small>${state.userMarkers.length} point(s) marked</small>
    `;
  }

  /* ===========================
     SEARCH SYSTEM
  =========================== */

  function setupSearchSystem(env) {
    const searchInput = document.getElementById('searchLocation');
    const searchResults = document.getElementById('searchResults');
    let debounceTimer;

    searchInput.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      const query = e.target.value.trim();
      
      if (query.length < 3) {
        searchResults.style.display = 'none';
        return;
      }

      const coordPattern = /^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/;
      const coordMatch = query.match(coordPattern);
      
      if (coordMatch) {
        const lat = parseFloat(coordMatch[1]);
        const lon = parseFloat(coordMatch[2]);
        
        if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
          searchResults.innerHTML = `
            <div class="search-item" data-lat="${lat}" data-lon="${lon}">
              <strong>📍 Coordinates</strong>
              <small>Lat: ${lat.toFixed(6)}, Lon: ${lon.toFixed(6)}</small>
            </div>
          `;
          searchResults.style.display = 'block';
          
          document.querySelector('.search-item').addEventListener('click', () => {
            selectLocation(lat, lon, 'Coordinates', env);
            searchResults.style.display = 'none';
          });
          return;
        }
      }

      debounceTimer = setTimeout(async () => {
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=pe,ec,co,br,bo,cl,ar,uy,py,ve,gy,sr,gf`
          );
          const results = await response.json();
          
          if (results.length === 0) {
            searchResults.innerHTML = '<div class="search-item">No results found</div>';
            searchResults.style.display = 'block';
            return;
          }

          searchResults.innerHTML = results.map(result => `
            <div class="search-item" data-lat="${result.lat}" data-lon="${result.lon}" data-name="${result.display_name.split(',')[0]}">
              <strong>${result.display_name.split(',')[0]}</strong>
              <small>${result.display_name}</small>
            </div>
          `).join('');
          
          searchResults.style.display = 'block';

          document.querySelectorAll('.search-item').forEach(item => {
            item.addEventListener('click', () => {
              const lat = parseFloat(item.dataset.lat);
              const lon = parseFloat(item.dataset.lon);
              const name = item.dataset.name || 'Location';
              
              selectLocation(lat, lon, name, env);
              searchResults.style.display = 'none';
              searchInput.value = name;
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
      if (!e.target.closest('#searchLocation') && !e.target.closest('#searchResults')) {
        searchResults.style.display = 'none';
      }
    });
  }

  function selectLocation(lat, lon, name, env) {
    state.selectedLocation = { lat, lon, name };
    
    if (state.currentMarker) {
      env.drawn.drawnGroupRoutes.removeLayer(state.currentMarker);
    }
    
    state.currentMarker = L.marker([lat, lon], {
      icon: L.divIcon({
        className: 'custom-marker-pin',
        html: '<div class="marker-pin-selected"><span>📍</span></div>',
        iconSize: [36, 48],
        iconAnchor: [18, 48]
      })
    }).bindPopup(`<strong>${name}</strong><br>Lat: ${lat.toFixed(6)}<br>Lon: ${lon.toFixed(6)}`).addTo(env.drawn.drawnGroupRoutes);
    
    env.mapRoutes.setView([lat, lon], 12);
    
    createToast(`Location selected: ${name}`, 'success', 2500);
    
    const coordsEl = document.getElementById('coords');
    if (coordsEl) {
      coordsEl.innerHTML = `<strong>${name}</strong><br>Lat: ${lat.toFixed(6)}<br>Lon: ${lon.toFixed(6)}`;
    }
  }

  /* ===========================
     PROCESSING SYSTEM (Python-ready)
  =========================== */

  function setupProcessingSystem(env) {
    const btnProcess = document.getElementById('btnProcess');
    const modeRoute = document.getElementById('modeRoute');
    const modeConstruction = document.getElementById('modeConstruction');
    const dateStart = document.getElementById('dateStart');
    const dateEnd = document.getElementById('dateEnd');
    const btnToggleCities = document.getElementById('btnToggleCities');
    const btnToggleSST = document.getElementById('btnToggleSST');
    const btnToggleIMERG = document.getElementById('btnToggleIMERG');

    modeRoute.addEventListener('change', () => {
      if (modeRoute.checked) state.analysisMode = 'route';
    });

    modeConstruction.addEventListener('change', () => {
      if (modeConstruction.checked) state.analysisMode = 'construction';
    });

    btnProcess.addEventListener('click', async () => {
      if (!state.selectedLocation) {
        createToast('Please search and select a location first', 'error', 3000);
        return;
      }

      const startDate = dateStart.value;
      const endDate = dateEnd.value;

      if (!startDate || !endDate) {
        createToast('Please select date range', 'error', 3000);
        return;
      }

      if (new Date(startDate) > new Date(endDate)) {
        createToast('Start date must be before end date', 'error', 3000);
        return;
      }

      state.dateRange = { start: startDate, end: endDate };

      btnProcess.disabled = true;
      btnProcess.textContent = '⏳ Processing...';

      // Python API call preparation
      if (API_BASE) {
        await callPythonAPI(env);
      } else {
        // Fallback to simulation
        await new Promise(resolve => setTimeout(resolve, 1500));
        if (state.analysisMode === 'route') {
          processRouteAnalysis(env);
        } else {
          processConstructionAnalysis(env);
        }
      }

      btnProcess.disabled = false;
      btnProcess.textContent = '🚀 Process Analysis';
    });

    // Layer toggles
    let layerStates = { cities: false, sst: false, imerg: false };

    btnToggleCities.addEventListener('click', () => {
      layerStates.cities = !layerStates.cities;
      if (layerStates.cities) {
        env.overlays.citiesLayer.addTo(env.mapRoutes);
        env.overlays.citiesLayer.addTo(env.mapBuild);
        btnToggleCities.classList.add('active');
      } else {
        env.mapRoutes.removeLayer(env.overlays.citiesLayer);
        env.mapBuild.removeLayer(env.overlays.citiesLayer);
        btnToggleCities.classList.remove('active');
      }
    });

    btnToggleSST.addEventListener('click', () => {
      layerStates.sst = !layerStates.sst;
      if (layerStates.sst) {
        env.overlays.sstLayer.addTo(env.mapRoutes);
        btnToggleSST.classList.add('active');
        createToast('SST layer activated', 'info', 2000);
      } else {
        env.mapRoutes.removeLayer(env.overlays.sstLayer);
        btnToggleSST.classList.remove('active');
      }
    });

    btnToggleIMERG.addEventListener('click', () => {
      layerStates.imerg = !layerStates.imerg;
      if (layerStates.imerg) {
        env.overlays.imergLayer.addTo(env.mapRoutes);
        btnToggleIMERG.classList.add('active');
        createToast('IMERG Precipitation layer activated', 'info', 2000);
      } else {
        env.mapRoutes.removeLayer(env.overlays.imergLayer);
        btnToggleIMERG.classList.remove('active');
      }
    });
  }

  /* ===========================
     PYTHON API INTEGRATION
  =========================== */

  async function callPythonAPI(env) {
    const payload = {
      location: {
        lat: state.selectedLocation.lat,
        lon: state.selectedLocation.lon,
        name: state.selectedLocation.name
      },
      dateRange: state.dateRange,
      analysisMode: state.analysisMode
    };

    try {
      const endpoint = state.analysisMode === 'route' 
        ? `${API_BASE}/api/analyze-route`
        : `${API_BASE}/api/evaluate-site`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (state.analysisMode === 'route') {
        displayRouteResults(data, env);
      } else {
        displayConstructionResults(data, env);
      }

      createToast('Analysis completed successfully', 'success', 3000);
    } catch (error) {
      console.error('Python API error:', error);
      createToast('Backend unavailable - using simulation', 'error', 4000);
      
      // Fallback
      if (state.analysisMode === 'route') {
        processRouteAnalysis(env);
      } else {
        processConstructionAnalysis(env);
      }
    }
  }

  /* ===========================
     ROUTE ANALYSIS (Simulation)
  =========================== */

  function processRouteAnalysis(env) {
    const loc = state.selectedLocation;
    env.drawn.drawnGroupBuild.clearLayers();

    const riskScore = Math.floor(Math.random() * 100);
    const riskLevel = riskScore > 70 ? 'HIGH' : riskScore > 40 ? 'MODERATE' : 'LOW';
    const riskColor = riskScore > 70 ? '#e74c3c' : riskScore > 40 ? '#f39c12' : '#2ecc71';

    const routePoints = [];
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2;
      const radius = 0.05;
      routePoints.push([
        loc.lat + Math.cos(angle) * radius,
        loc.lon + Math.sin(angle) * radius
      ]);
    }

    const routeLine = L.polyline(routePoints, {
      color: riskColor,
      weight: 5,
      opacity: 0.8
    }).addTo(env.drawn.drawnGroupBuild);

    const zones = [
      { center: routePoints[2], risk: 'low', color: '#2ecc71' },
      { center: routePoints[5], risk: 'moderate', color: '#f39c12' },
      { center: routePoints[8], risk: 'high', color: '#e74c3c' }
    ];

    zones.forEach(zone => {
      L.circle(zone.center, {
        radius: 2000,
        color: zone.color,
        fillColor: zone.color,
        fillOpacity: 0.2,
        weight: 2
      }).bindPopup(`<strong>Risk Zone: ${zone.risk.toUpperCase()}</strong>`).addTo(env.drawn.drawnGroupBuild);
    });

    env.mapBuild.fitBounds(routeLine.getBounds(), { padding: [50, 50] });

    showResults({
      type: 'route',
      location: loc.name,
      riskScore,
      riskLevel,
      riskColor,
      dateRange: state.dateRange,
      recommendations: generateRouteRecommendations(riskLevel)
    });

    createToast('Route analysis completed', 'success', 3000);
  }

  function generateRouteRecommendations(riskLevel) {
    const recommendations = {
      HIGH: [
        'Travel NOT recommended due to high risk',
        'High precipitation expected in the area',
        'Possible flooding and road blockages',
        'Monitor SENAMHI alerts constantly',
        'Consider alternative routes or postpone travel'
      ],
      MODERATE: [
        'Travel with caution - moderate risk detected',
        'Expect moderate rainfall along the route',
        'Some road sections may be affected',
        'Keep emergency contacts accessible',
        'Plan extra time for your journey'
      ],
      LOW: [
        'Route appears safe for travel',
        'Weather conditions are favorable',
        'Roads should be in good condition',
        'Standard safety precautions apply',
        'Normal travel times expected'
      ]
    };
    return recommendations[riskLevel] || recommendations.LOW;
  }

  /* ===========================
     CONSTRUCTION ANALYSIS (Simulation)
  =========================== */

  function processConstructionAnalysis(env) {
    const loc = state.selectedLocation;
    env.drawn.drawnGroupBuild.clearLayers();

    const viabilityScore = Math.floor(Math.random() * 100);
    const viabilityLevel = viabilityScore > 70 ? 'SAFE' : viabilityScore > 40 ? 'CAUTION' : 'DANGEROUS';
    const viabilityColor = viabilityScore > 70 ? '#2ecc71' : viabilityScore > 40 ? '#f39c12' : '#e74c3c';

    const analysisCircle = L.circle([loc.lat, loc.lon], {
      radius: 500,
      color: viabilityColor,
      fillColor: viabilityColor,
      fillOpacity: 0.25,
      weight: 3
    }).addTo(env.drawn.drawnGroupBuild);

    const gridSize = 5;
    const gridSpacing = 0.002;
    
    for (let i = -gridSize; i <= gridSize; i++) {
      for (let j = -gridSize; j <= gridSize; j++) {
        const pointLat = loc.lat + i * gridSpacing;
        const pointLon = loc.lon + j * gridSpacing;
        const pointRisk = Math.random();
        
        const pointColor = pointRisk > 0.7 ? '#e74c3c' : pointRisk > 0.4 ? '#f39c12' : '#2ecc71';
        
        L.circleMarker([pointLat, pointLon], {
          radius: 3,
          color: pointColor,
          fillColor: pointColor,
          fillOpacity: 0.6,
          weight: 1
        }).addTo(env.drawn.drawnGroupBuild);
      }
    }

    env.mapBuild.fitBounds(analysisCircle.getBounds(), { padding: [80, 80] });

    showResults({
      type: 'construction',
      location: loc.name,
      viabilityScore,
      viabilityLevel,
      viabilityColor,
      dateRange: state.dateRange,
      floodProbability: (Math.random() * 100).toFixed(1),
      slope: (Math.random() * 15).toFixed(2),
      soilType: ['Clay', 'Sandy', 'Rocky', 'Mixed'][Math.floor(Math.random() * 4)],
      recommendations: generateConstructionRecommendations(viabilityLevel)
    });

    createToast('Construction site analysis completed', 'success', 3000);
  }

  function generateConstructionRecommendations(viabilityLevel) {
    const recommendations = {
      SAFE: [
        'Site is suitable for construction',
        'Good soil conditions and low flood risk',
        'Standard foundation design recommended',
        'Basic drainage system sufficient',
        'Proceed with normal building permits'
      ],
      CAUTION: [
        'Construction possible with precautions',
        'Reinforced foundation recommended',
        'Enhanced drainage system required',
        'Elevated structure design advised',
        'Detailed soil study necessary'
      ],
      DANGEROUS: [
        'Construction NOT recommended at this site',
        'High flood risk detected',
        'Poor soil conditions',
        'Consider alternative location',
        'Consult with civil engineer before proceeding'
      ]
    };
    return recommendations[viabilityLevel] || recommendations.CAUTION;
  }

  /* ===========================
     DISPLAY RESULTS FROM PYTHON
  =========================== */

  function displayRouteResults(data, env) {
    env.drawn.drawnGroupBuild.clearLayers();

    // Draw route from Python data
    if (data.route_geojson) {
      try {
        const routeLayer = L.geoJSON(data.route_geojson, {
          style: {
            color: data.risk_color || '#ff6600',
            weight: 5,
            opacity: 0.8
          }
        }).addTo(env.drawn.drawnGroupBuild);

        env.mapBuild.fitBounds(routeLayer.getBounds(), { padding: [50, 50] });
      } catch (e) {
        console.warn('Error displaying route:', e);
      }
    }

    // Display risk zones if provided
    if (data.risk_zones && Array.isArray(data.risk_zones)) {
      data.risk_zones.forEach(zone => {
        L.circle([zone.lat, zone.lon], {
          radius: zone.radius || 2000,
          color: zone.color,
          fillColor: zone.color,
          fillOpacity: 0.2,
          weight: 2
        }).bindPopup(`<strong>${zone.label}</strong>`).addTo(env.drawn.drawnGroupBuild);
      });
    }

    showResults({
      type: 'route',
      location: state.selectedLocation.name,
      riskScore: data.risk_score,
      riskLevel: data.risk_level,
      riskColor: data.risk_color || '#f39c12',
      dateRange: state.dateRange,
      recommendations: data.recommendations || []
    });
  }

  function displayConstructionResults(data, env) {
    env.drawn.drawnGroupBuild.clearLayers();

    const loc = state.selectedLocation;

    // Draw analysis zone
    const analysisCircle = L.circle([loc.lat, loc.lon], {
      radius: data.analysis_radius || 500,
      color: data.viability_color || '#f39c12',
      fillColor: data.viability_color || '#f39c12',
      fillOpacity: 0.25,
      weight: 3
    }).addTo(env.drawn.drawnGroupBuild);

    // Display risk grid if provided
    if (data.risk_grid && Array.isArray(data.risk_grid)) {
      data.risk_grid.forEach(point => {
        L.circleMarker([point.lat, point.lon], {
          radius: 3,
          color: point.color,
          fillColor: point.color,
          fillOpacity: 0.6,
          weight: 1
        }).addTo(env.drawn.drawnGroupBuild);
      });
    }

    env.mapBuild.fitBounds(analysisCircle.getBounds(), { padding: [80, 80] });

    showResults({
      type: 'construction',
      location: state.selectedLocation.name,
      viabilityScore: data.viability_score,
      viabilityLevel: data.viability_level,
      viabilityColor: data.viability_color || '#f39c12',
      dateRange: state.dateRange,
      floodProbability: data.flood_probability,
      slope: data.slope,
      soilType: data.soil_type,
      recommendations: data.recommendations || []
    });
  }

  /* ===========================
     RESULTS PANEL
  =========================== */

  function showResults(data) {
    const resultPanel = document.getElementById('resultPanel');
    const resultsContent = document.getElementById('resultsContent');

    let html = '';

    if (data.type === 'route') {
      html = `
        <div class="result-header">
          <h3>Safe Route Analysis</h3>
          <div class="result-location">${data.location}</div>
        </div>

        <div class="result-score" style="background:${data.riskColor}22; border-left:4px solid ${data.riskColor};">
          <div class="score-label">Risk Level</div>
          <div class="score-value" style="color:${data.riskColor};">${data.riskLevel}</div>
          <div class="score-number">${data.riskScore}/100</div>
        </div>

        <div class="result-section">
          <h4>Analysis Period</h4>
          <p>${data.dateRange.start} to ${data.dateRange.end}</p>
        </div>

        ${data.climateData ? `
        <div class="result-section">
          <h4>Climate Data (NASA POWER)</h4>
          <div class="characteristics-grid">
            <div class="char-item">
              <span class="char-label">Avg Temperature</span>
              <span class="char-value">${data.climateData.avg_temp || 'N/A'}°C</span>
            </div>
            <div class="char-item">
              <span class="char-label">Total Precipitation</span>
              <span class="char-value">${data.climateData.total_precip || 0} mm</span>
            </div>
            <div class="char-item">
              <span class="char-label">Rainy Days</span>
              <span class="char-value">${data.climateData.precip_days || 0}/${data.climateData.days || 0}</span>
            </div>
            <div class="char-item">
              <span class="char-label">Avg Humidity</span>
              <span class="char-value">${data.climateData.avg_rh || 'N/A'}%</span>
            </div>
          </div>
        </div>
        ` : ''}

        <div class="result-section">
          <h4>Recommendations</h4>
          <ul class="recommendations-list">
            ${data.recommendations.map(rec => `<li>${rec}</li>`).join('')}
          </ul>
        </div>

        ${data.diagnostics ? `
        <details class="diagnostics-details">
          <summary>View Diagnostic Details</summary>
          <div class="diagnostics-content">
            <p><strong>Precipitation per day:</strong> ${data.diagnostics.precip_per_day || 'N/A'} mm</p>
            <p><strong>Precipitation frequency:</strong> ${(data.diagnostics.precip_frequency * 100).toFixed(1) || 'N/A'}%</p>
            <p><strong>Analysis days:</strong> ${data.diagnostics.days || 'N/A'}</p>
          </div>
        </details>
        ` : ''}

        <div class="result-footer">
          <small>Analysis based on NASA POWER climate data</small>
        </div>
      `;
    } else {
      html = `
        <div class="result-header">
          <h3>Construction Viability Analysis</h3>
          <div class="result-location">${data.location}</div>
        </div>

        <div class="result-score" style="background:${data.viabilityColor}22; border-left:4px solid ${data.viabilityColor};">
          <div class="score-label">Viability Level</div>
          <div class="score-value" style="color:${data.viabilityColor};">${data.viabilityLevel}</div>
          <div class="score-number">${data.viabilityScore}/100</div>
        </div>

        <div class="result-section">
          <h4>Site Characteristics</h4>
          <div class="characteristics-grid">
            <div class="char-item">
              <span class="char-label">Flood Probability</span>
              <span class="char-value">${data.floodProbability}%</span>
            </div>
            <div class="char-item">
              <span class="char-label">Terrain Slope</span>
              <span class="char-value">${data.slope}°</span>
            </div>
            <div class="char-item">
              <span class="char-label">Soil Type</span>
              <span class="char-value">${data.soilType}</span>
            </div>
          </div>
        </div>

        ${data.climateData ? `
        <div class="result-section">
          <h4>Climate Data (NASA POWER)</h4>
          <div class="characteristics-grid">
            <div class="char-item">
              <span class="char-label">Avg Temperature</span>
              <span class="char-value">${data.climateData.avg_temp || 'N/A'}°C</span>
            </div>
            <div class="char-item">
              <span class="char-label">Total Precipitation</span>
              <span class="char-value">${data.climateData.total_precip || 0} mm</span>
            </div>
            <div class="char-item">
              <span class="char-label">Rainy Days</span>
              <span class="char-value">${data.climateData.precip_days || 0}/${data.climateData.days || 0}</span>
            </div>
            <div class="char-item">
              <span class="char-label">Avg Solar Radiation</span>
              <span class="char-value">${data.climateData.avg_solar || 'N/A'} W/m²</span>
            </div>
          </div>
        </div>
        ` : ''}

        <div class="result-section">
          <h4>Analysis Period</h4>
          <p>${data.dateRange.start} to ${data.dateRange.end}</p>
        </div>

        <div class="result-section">
          <h4>Recommendations</h4>
          <ul class="recommendations-list">
            ${data.recommendations.map(rec => `<li>${rec}</li>`).join('')}
          </ul>
        </div>

        ${data.diagnostics ? `
        <details class="diagnostics-details">
          <summary>View Diagnostic Details</summary>
          <div class="diagnostics-content">
            <p><strong>Precipitation per day:</strong> ${data.diagnostics.precip_per_day || 'N/A'} mm</p>
            <p><strong>Precipitation frequency:</strong> ${(data.diagnostics.precip_frequency * 100).toFixed(1) || 'N/A'}%</p>
            <p><strong>Analysis days:</strong> ${data.diagnostics.days || 'N/A'}</p>
          </div>
        </details>
        ` : ''}

        <div class="result-footer">
          <small>Analysis based on NASA POWER climate data and terrain models</small>
        </div>
      `;
    }

    resultsContent.innerHTML = html;
    resultPanel.style.display = 'block';
    resultPanel.classList.add('visible');
    
    // Remove minimized state when showing new results
    state.panels.results.minimized = false;
    resultPanel.classList.remove('minimized');
    resultsContent.style.display = 'block';
    const minimizeBtn = document.getElementById('minimizeResults');
    if (minimizeBtn) minimizeBtn.innerHTML = '−';
  }

  /* ===========================
     FLOATING TABS FOR CLOSED PANELS
  =========================== */

  function createFloatingTabs() {
    const tabsHTML = `
      <div id="floatingTabs">
        <button class="float-tab" data-panel="controlPanel" style="display:none;" title="Open Control Panel">
          <span>📊 CONTROL</span>
        </button>
        <button class="float-tab" data-panel="resultPanel" style="display:none;" title="Open Results Panel">
          <span>📋 RESULTS</span>
        </button>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', tabsHTML);

    document.querySelectorAll('.float-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const panelId = tab.dataset.panel;
        const panel = document.getElementById(panelId);
        
        panel.style.display = 'block';
        panel.classList.add('visible');
        tab.style.display = 'none';
        
        createToast('Panel reopened', 'info', 2000);
      });
    });
  }

  /* ===========================
     PANEL CONTROLS
  =========================== */

  function setupPanelControls() {
    const closeControl = document.getElementById('closeControl');
    const closeResults = document.getElementById('closeResults');
    const controlPanel = document.getElementById('controlPanel');
    const resultPanel = document.getElementById('resultPanel');

    if (closeControl) {
      closeControl.addEventListener('click', () => {
        controlPanel.classList.remove('visible');
        setTimeout(() => {
          controlPanel.style.display = 'none';
          document.querySelector('[data-panel="controlPanel"]').style.display = 'flex';
        }, 300);
        createToast('Control panel closed - click floating tab to reopen', 'info', 3000);
      });
    }

    if (closeResults) {
      closeResults.addEventListener('click', () => {
        resultPanel.classList.remove('visible');
        setTimeout(() => {
          resultPanel.style.display = 'none';
          document.querySelector('[data-panel="resultPanel"]').style.display = 'flex';
        }, 300);
        createToast('Results panel closed - click floating tab to reopen', 'info', 3000);
      });
    }
  }

  /* ===========================
     DATE UPDATE
  =========================== */

  function setupDateUpdate(env) {
    const goDateBtn = document.getElementById('goDate');
    const dateInput = document.getElementById('date');

    if (goDateBtn && dateInput) {
      goDateBtn.addEventListener('click', () => {
        const d = dateInput.value;
        if (!d) {
          createToast('Select a date first', 'error', 2000);
          return;
        }

        try {
          const newIMERG = L.tileLayer(imergTemplate(d), {
            maxZoom: 12,
            opacity: 0.65,
            attribution: 'NASA IMERG'
          });

          const newSST = L.tileLayer(sstTemplate(d), {
            maxZoom: 12,
            opacity: 0.75,
            attribution: 'NASA GHRSST',
            className: 'sst-transition'
          });

          if (env.mapRoutes.hasLayer(env.overlays.imergLayer)) {
            env.mapRoutes.removeLayer(env.overlays.imergLayer);
            newIMERG.addTo(env.mapRoutes);
          }

          if (env.mapRoutes.hasLayer(env.overlays.sstLayer)) {
            env.mapRoutes.removeLayer(env.overlays.sstLayer);
            newSST.addTo(env.mapRoutes);
          }

          env.overlays.imergLayer = newIMERG;
          env.overlays.sstLayer = newSST;

          createToast(`Date updated: ${d}`, 'success', 2000);
        } catch (e) {
          console.warn('Date update error', e);
          createToast('Could not update layers', 'error', 2000);
        }
      });
    }
  }

  /* ===========================
     INITIALIZATION
  =========================== */

  document.addEventListener('DOMContentLoaded', () => {
    // Initialize default dates
    const dateStart = document.getElementById('dateStart');
    const dateEnd = document.getElementById('dateEnd');
    
    if (dateStart && dateEnd) {
      const today = new Date();
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(today.getDate() - 30);
      
      dateStart.value = thirtyDaysAgo.toISOString().split('T')[0];
      dateEnd.value = today.toISOString().split('T')[0];
    }

    const env = initMaps();
    setupSearchSystem(env);
    setupProcessingSystem(env);
    setupExplorationMode(env);
    setupPanelControls();
    setupDateUpdate(env);
    
    // Setup draggable and minimizable panels
    makePanelDraggable('controlPanel', 'panel-header');
    makePanelDraggable('resultPanel', 'result-header');
    setupPanelMinimize('controlPanel', 'minimizeControl', 'control');
    setupPanelMinimize('resultPanel', 'minimizeResults', 'results');
    
    // Create floating tabs for closed panels
    createFloatingTabs();

    // Show tutorial on first visit
    showTutorial();

    createToast('Safe Routes & Construction Analysis System ready', 'success', 4000);
  });

})();
// === 🔍 FUNCIÓN PARA OBTENER Y MOSTRAR DATOS DE RIESGO ===
document.getElementById("btnProcess").addEventListener("click", async () => {
  const lat = -5.18;   // ← puedes hacer dinámico según búsqueda o clic en el mapa
  const lon = -80.64;

  try {
    const res = await fetch(`http://127.0.0.1:5001/riesgo?lat=${lat}&lon=${lon}`);
    if (!res.ok) throw new Error("Error al conectar con la API Flask");

    const data = await res.json();

    // Mostramos el resultado en el panel derecho
    const panel = document.getElementById("resultsContent");
    panel.innerHTML = `
      <div class="result-card">
        <h2>📍 ${data.location.lat.toFixed(2)}, ${data.location.lon.toFixed(2)}</h2>
        <p><strong>Fecha:</strong> ${data.fecha}</p>
        <p><strong>🌧️ Precipitación:</strong> ${data.precipitacion_mm ?? "N/A"} mm</p>
        <p><strong>🌡️ Temperatura:</strong> ${data.temperatura_c} °C</p>
        <p><strong>💧 Humedad:</strong> ${data.humedad_relativa}%</p>
        <p><strong>⚠️ Nivel de riesgo:</strong> <span style="color:${
          data.nivel_riesgo === "alto"
            ? "red"
            : data.nivel_riesgo === "medio"
            ? "orange"
            : "green"
        }">${data.nivel_riesgo.toUpperCase()}</span></p>
        <p><strong>🧭 Recomendación:</strong> ${data.recomendacion}</p>
      </div>
    `;
  } catch (err) {
    console.error(err);
    alert("Error obteniendo datos del servidor.");
  }
});
