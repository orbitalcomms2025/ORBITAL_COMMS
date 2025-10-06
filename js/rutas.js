// rutas.js - Enhanced Results Panel & Map Visualization
// Version 2.1 - Professional UX with Clear Visual Feedback

(() => {
  const API_BASE = 'https://nasa-climate-api.onrender.com';
  
  // Configuration
  const CONFIG = {
    defaultZoom: 5,
    selectedZoom: 12,
    defaultCenter: [-9.2, -75],
    searchDebounce: 300,
    toastDuration: 3000,
    maxSearchResults: 5,
    countryCodes: 'pe,ec,co,br,bo,cl,ar',
    routeRadius: 5000,
    safeZoneRadius: 2000
  };

  // State Management
  const state = {
    selectedLocation: null,
    analysisMode: 'route',
    map: null,
    currentMarker: null,
    citiesLayer: null,
    isProcessing: false,
    routeLayers: [],
    lastAnalysisData: null
  };

  // === UTILITIES ===
  
  function toast(msg, type = 'info', duration = CONFIG.toastDuration) {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
    toast.innerHTML = `
      <div class="toast-content">
        <span class="toast-icon">${icon}</span>
        <span class="toast-message">${msg}</span>
      </div>
    `;
    container.appendChild(toast);
    
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100px)';
      setTimeout(() => toast.remove(), 400);
    }, duration);
  }

  function isValidCoordinate(lat, lon) {
    return !isNaN(lat) && !isNaN(lon) && 
           lat >= -90 && lat <= 90 && 
           lon >= -180 && lon <= 180;
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // === MAP LEGEND ===

  function showMapLegend(mode, riskLevel) {
    const existingLegend = document.getElementById('mapLegend');
    if (existingLegend) existingLegend.remove();

    let legendHTML = '';

    if (mode === 'route') {
      legendHTML = `
        <div id="mapLegend" class="map-legend visible">
          <button class="legend-close" onclick="document.getElementById('mapLegend').remove()">×</button>
          <h4>Map Legend - Safe Routes</h4>
          
          <div class="legend-item">
            <div class="legend-symbol circle" style="background:#f44336;"></div>
            <span>Your selected location</span>
          </div>
          
          ${riskLevel === 'LOW' ? `
            <div class="legend-item">
              <div class="legend-symbol line" style="background:#2ecc71;"></div>
              <span>Safe travel directions</span>
            </div>
            <div class="legend-item">
              <div class="legend-symbol circle" style="background:#2ecc71;opacity:0.2;"></div>
              <span>Low risk zone (1km radius)</span>
            </div>
          ` : ''}
          
          ${riskLevel === 'MODERATE' ? `
            <div class="legend-item">
              <div class="legend-symbol line" style="background:#f39c12;"></div>
              <span>Recommended safer routes</span>
            </div>
            <div class="legend-item">
              <div class="legend-symbol dashed" style="border-color:#f39c12;"></div>
              <span>Caution zone (5km radius)</span>
            </div>
          ` : ''}
          
          ${riskLevel === 'HIGH' ? `
            <div class="legend-item">
              <div class="legend-symbol line" style="background:#e74c3c;"></div>
              <span>PRIMARY evacuation route</span>
            </div>
            <div class="legend-item">
              <div class="legend-symbol line dashed" style="background:#e67e22;"></div>
              <span>Secondary evacuation route</span>
            </div>
            <div class="legend-item">
              <div class="legend-symbol circle" style="background:#e74c3c;opacity:0.2;"></div>
              <span>HIGH RISK zone - Avoid travel</span>
            </div>
          ` : ''}
          
          <div class="legend-item">
            <div class="legend-symbol marker" style="background:#f44336;"></div>
            <span>Natural event location</span>
          </div>
          
          <div class="legend-note">
            <strong>Note:</strong> Arrows indicate safer travel directions. Follow main roads and monitor local alerts.
          </div>
        </div>
      `;
    } else {
      legendHTML = `
        <div id="mapLegend" class="map-legend visible">
          <button class="legend-close" onclick="document.getElementById('mapLegend').remove()">×</button>
          <h4>Map Legend - Construction Zones</h4>
          
          <div class="legend-item">
            <div class="legend-symbol circle" style="background:#f44336;"></div>
            <span>Selected construction site</span>
          </div>
          
          ${riskLevel === 'LOW' ? `
            <div class="legend-item">
              <div class="legend-symbol circle" style="background:#2ecc71;opacity:0.3;"></div>
              <span>SUITABLE zone (2km radius)</span>
            </div>
            <div class="legend-item">
              <div class="legend-symbol circle" style="background:#27ae60;"></div>
              <span>Alternative safe sites</span>
            </div>
          ` : ''}
          
          ${riskLevel === 'MODERATE' ? `
            <div class="legend-item">
              <div class="legend-symbol dashed" style="border-color:#f39c12;"></div>
              <span>Construction POSSIBLE with precautions</span>
            </div>
            <div class="legend-item">
              <div class="legend-symbol marker" style="background:#f39c12;"></div>
              <span>Recommended alternative sites</span>
            </div>
          ` : ''}
          
          ${riskLevel === 'HIGH' ? `
            <div class="legend-item">
              <div class="legend-symbol circle" style="background:#e74c3c;opacity:0.3;"></div>
              <span>NOT RECOMMENDED - High risk</span>
            </div>
            <div class="legend-item">
              <div class="legend-symbol marker" style="background:#2ecc71;"></div>
              <span>Better alternative locations</span>
            </div>
            <div class="legend-item">
              <div class="legend-symbol line dashed" style="background:rgba(255,255,255,0.3);"></div>
              <span>Connection to alternatives</span>
            </div>
          ` : ''}
          
          <div class="legend-note">
            <strong>Note:</strong> Circles show site viability zones. ${riskLevel === 'HIGH' ? 'Consider marked alternatives for safer construction.' : 'Follow building codes and conduct site studies.'}
          </div>
        </div>
      `;
    }

    document.body.insertAdjacentHTML('beforeend', legendHTML);
  }

  // === ROUTE VISUALIZATION ===

  function clearRouteLayers() {
    state.routeLayers.forEach(layer => {
      if (state.map && state.map.hasLayer(layer)) {
        state.map.removeLayer(layer);
      }
    });
    state.routeLayers = [];
  }

  function visualizeSafeRoutes(data, location) {
    clearRouteLayers();
    
    const risk = data.risk || {};
    const lat = location.lat;
    const lon = location.lon;

    const mainCircle = L.circle([lat, lon], {
      color: risk.color,
      fillColor: risk.color,
      fillOpacity: 0.2,
      radius: 1000,
      weight: 2
    }).addTo(state.map);
    state.routeLayers.push(mainCircle);

    if (risk.level === 'LOW') {
      drawSafeRouteArrows(lat, lon, ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'], '#2ecc71');
    } else if (risk.level === 'MODERATE') {
      drawSafeRouteArrows(lat, lon, ['N', 'NE', 'NW', 'E'], '#f39c12');
      drawWarningZone(lat, lon, 'CAUTION: Monitor weather conditions');
    } else {
      drawEvacuationRoutes(lat, lon);
      drawWarningZone(lat, lon, 'HIGH RISK: Evacuation routes shown');
    }

    if (data.events && data.events.length > 0) {
      data.events.forEach(event => {
        const eventLat = lat + (Math.random() - 0.5) * 0.2;
        const eventLon = lon + (Math.random() - 0.5) * 0.2;
        
        const marker = L.marker([eventLat, eventLon], {
          icon: L.divIcon({
            className: 'event-marker',
            html: `<div class="event-marker-content">${event.category}</div>`,
            iconSize: [100, 30]
          })
        }).bindPopup(`<strong>${event.title}</strong><br>${event.category}<br>${event.distance_km}km away`);
        
        marker.addTo(state.map);
        state.routeLayers.push(marker);
      });
    }

    state.map.fitBounds(mainCircle.getBounds().pad(0.5));
  }

  function drawSafeRouteArrows(lat, lon, directions, color) {
    const directionOffsets = {
      'N': [0.05, 0], 'S': [-0.05, 0],
      'E': [0, 0.05], 'W': [0, -0.05],
      'NE': [0.035, 0.035], 'NW': [0.035, -0.035],
      'SE': [-0.035, 0.035], 'SW': [-0.035, -0.035]
    };

    directions.forEach(dir => {
      const offset = directionOffsets[dir];
      const endLat = lat + offset[0];
      const endLon = lon + offset[1];

      const arrow = L.polyline(
        [[lat, lon], [endLat, endLon]],
        {
          color: color,
          weight: 4,
          opacity: 0.7,
          dashArray: '10, 10'
        }
      ).addTo(state.map);

      const arrowHead = L.circleMarker([endLat, endLon], {
        color: color,
        fillColor: color,
        fillOpacity: 1,
        radius: 6,
        weight: 2
      }).bindPopup(`Safe direction: ${dir}`).addTo(state.map);

      state.routeLayers.push(arrow, arrowHead);
    });
  }

  function drawEvacuationRoutes(lat, lon) {
    const route1 = L.polyline([
      [lat, lon],
      [lat + 0.03, lon],
      [lat + 0.05, lon + 0.02]
    ], {
      color: '#e74c3c',
      weight: 5,
      opacity: 0.8
    }).addTo(state.map);

    const label1 = L.marker([lat + 0.05, lon + 0.02], {
      icon: L.divIcon({
        className: 'route-label',
        html: '<div class="evacuation-label primary">EVACUATION ROUTE 1</div>',
        iconSize: [150, 30]
      })
    }).addTo(state.map);

    const route2 = L.polyline([
      [lat, lon],
      [lat + 0.02, lon + 0.03],
      [lat + 0.04, lon + 0.05]
    ], {
      color: '#e67e22',
      weight: 5,
      opacity: 0.8,
      dashArray: '10, 10'
    }).addTo(state.map);

    const label2 = L.marker([lat + 0.04, lon + 0.05], {
      icon: L.divIcon({
        className: 'route-label',
        html: '<div class="evacuation-label secondary">EVACUATION ROUTE 2</div>',
        iconSize: [150, 30]
      })
    }).addTo(state.map);

    state.routeLayers.push(route1, route2, label1, label2);
  }

  function drawWarningZone(lat, lon, message) {
    const zone = L.circle([lat, lon], {
      color: '#f39c12',
      fillColor: '#f39c12',
      fillOpacity: 0.1,
      radius: CONFIG.routeRadius,
      weight: 2,
      dashArray: '10, 5'
    }).bindPopup(message).addTo(state.map);

    state.routeLayers.push(zone);
  }

  function visualizeConstructionZones(data, location) {
    clearRouteLayers();
    
    const risk = data.risk || {};
    const lat = location.lat;
    const lon = location.lon;

    const siteCircle = L.circle([lat, lon], {
      color: risk.color,
      fillColor: risk.color,
      fillOpacity: 0.3,
      radius: 500,
      weight: 3
    }).addTo(state.map);
    state.routeLayers.push(siteCircle);

    if (risk.level === 'LOW') {
      const suitableZone = L.circle([lat, lon], {
        color: '#2ecc71',
        fillColor: '#2ecc71',
        fillOpacity: 0.15,
        radius: CONFIG.safeZoneRadius,
        weight: 2
      }).bindPopup('SUITABLE FOR CONSTRUCTION<br>Standard building practices apply').addTo(state.map);
      
      state.routeLayers.push(suitableZone);
      drawSafeConstructionPoints(lat, lon);

    } else if (risk.level === 'MODERATE') {
      const cautionZone = L.circle([lat, lon], {
        color: '#f39c12',
        fillColor: '#f39c12',
        fillOpacity: 0.15,
        radius: CONFIG.safeZoneRadius,
        weight: 2,
        dashArray: '10, 5'
      }).bindPopup('CONSTRUCTION POSSIBLE<br>Enhanced foundation & drainage required').addTo(state.map);
      
      state.routeLayers.push(cautionZone);
      drawAlternativeSites(lat, lon, '#f39c12');

    } else {
      const dangerZone = L.circle([lat, lon], {
        color: '#e74c3c',
        fillColor: '#e74c3c',
        fillOpacity: 0.2,
        radius: CONFIG.safeZoneRadius,
        weight: 3
      }).bindPopup('NOT RECOMMENDED<br>High flood/disaster risk').addTo(state.map);
      
      state.routeLayers.push(dangerZone);
      drawAlternativeSites(lat, lon, '#2ecc71', true);
    }

    state.map.fitBounds(siteCircle.getBounds().pad(1.5));
  }

  function drawSafeConstructionPoints(lat, lon) {
    const points = [
      [lat + 0.01, lon + 0.01, 'Site A'],
      [lat - 0.01, lon + 0.01, 'Site B'],
      [lat, lon + 0.015, 'Site C']
    ];

    points.forEach(([pLat, pLon, name]) => {
      const marker = L.circleMarker([pLat, pLon], {
        color: '#27ae60',
        fillColor: '#2ecc71',
        fillOpacity: 0.5,
        radius: 8,
        weight: 2
      }).bindPopup(`Alternative ${name}<br>Low risk area`).addTo(state.map);
      
      state.routeLayers.push(marker);
    });
  }

  function drawAlternativeSites(lat, lon, color, highlightBetter = false) {
    const alternatives = [
      [lat + 0.02, lon - 0.01, 'Higher Ground Site 1', highlightBetter],
      [lat - 0.015, lon + 0.02, 'Elevated Site 2', highlightBetter],
      [lat + 0.01, lon + 0.025, 'Alternative Site 3', false]
    ];

    alternatives.forEach(([aLat, aLon, name, isBetter]) => {
      const markerColor = isBetter ? '#2ecc71' : color;
      
      const marker = L.marker([aLat, aLon], {
        icon: L.divIcon({
          className: 'alt-site-marker',
          html: `<div class="alt-site-content" style="background:${markerColor}">${isBetter ? '✓' : '!'} ${name}</div>`,
          iconSize: [150, 40]
        })
      }).bindPopup(`<strong>${name}</strong><br>${isBetter ? 'Recommended alternative' : 'Consider evaluation'}`).addTo(state.map);

      const line = L.polyline([[lat, lon], [aLat, aLon]], {
        color: markerColor,
        weight: 2,
        opacity: 0.5,
        dashArray: '5, 10'
      }).addTo(state.map);

      state.routeLayers.push(marker, line);
    });
  }

  // === TUTORIAL ===
  
  function showTutorial() {
    if (localStorage.getItem('tutorial_seen') === 'true') return;

    const html = `
      <div id="tutorial" class="overlay">
        <div class="tutorial-box">
          <h2>NASA Climate Analysis System</h2>
          <p>Disaster prevention through real NASA data</p>
          <div class="steps">
            <div class="step">
              <span class="num">1</span>
              <div>
                <h3>Search Location</h3>
                <p>Enter city name or coordinates (e.g., "-5.2, -80.6")</p>
              </div>
            </div>
            <div class="step">
              <span class="num">2</span>
              <div>
                <h3>Select Analysis Mode</h3>
                <p>Safe Route (evacuation) or Construction (site viability)</p>
              </div>
            </div>
            <div class="step">
              <span class="num">3</span>
              <div>
                <h3>Process & Review</h3>
                <p>View routes/zones on map and download detailed PDF report</p>
              </div>
            </div>
          </div>
          <label class="tutorial-checkbox">
            <input type="checkbox" id="noShow"/> Don't show this again
          </label>
          <button id="closeTutorial" class="btn-primary">Get Started</button>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', html);
    
    document.getElementById('closeTutorial').onclick = () => {
      if (document.getElementById('noShow').checked) {
        localStorage.setItem('tutorial_seen', 'true');
      }
      document.getElementById('tutorial').remove();
    };
  }

  // === MAP INITIALIZATION ===
  
  function initMap() {
    const map = L.map('map', {
      minZoom: 3,
      maxZoom: 18,
      zoomControl: true
    }).setView(CONFIG.defaultCenter, CONFIG.defaultZoom);

    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: '© Esri',
      maxZoom: 18
    }).addTo(map);

    const citiesLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}.png', {
      attribution: '© CARTO',
      opacity: 0.9,
      maxZoom: 18
    });
    state.citiesLayer = citiesLayer;

    L.control.scale({ imperial: false }).addTo(map);

    map.on('mousemove', (e) => {
      const coordsEl = document.getElementById('coords');
      if (coordsEl && !state.selectedLocation) {
        coordsEl.innerHTML = `Lat: ${e.latlng.lat.toFixed(6)}, Lon: ${e.latlng.lng.toFixed(6)}`;
      }
    });

    map.on('click', (e) => {
      const { lat, lng } = e.latlng;
      selectLocation(lat, lng, 'Custom Location', map);
    });

    const btnCities = document.getElementById('btnCities');
    if (btnCities) {
      btnCities.addEventListener('click', function() {
        if (map.hasLayer(citiesLayer)) {
          map.removeLayer(citiesLayer);
          this.classList.remove('active');
        } else {
          citiesLayer.addTo(map);
          this.classList.add('active');
        }
      });
    }

    return map;
  }

  // === SEARCH SYSTEM ===
  
  function setupSearch(map) {
    const input = document.getElementById('searchInput');
    const results = document.getElementById('searchResults');
    let debounceTimer;

    if (!input || !results) return;

    input.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      const query = e.target.value.trim();
      
      if (query.length < 3) {
        results.style.display = 'none';
        return;
      }

      const coordMatch = query.match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/);
      if (coordMatch) {
        const lat = parseFloat(coordMatch[1]);
        const lon = parseFloat(coordMatch[2]);
        
        if (isValidCoordinate(lat, lon)) {
          results.innerHTML = `
            <div class="result-item" data-lat="${lat}" data-lon="${lon}">
              <strong>Coordinates</strong><br>
              <small>Lat: ${lat.toFixed(6)}, Lon: ${lon.toFixed(6)}</small>
            </div>
          `;
          results.style.display = 'block';
          
          document.querySelector('.result-item').onclick = () => {
            selectLocation(lat, lon, 'Custom Coordinates', map);
            results.style.display = 'none';
            input.value = `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
          };
          return;
        }
      }

      debounceTimer = setTimeout(async () => {
        await performGeocoding(query, results, input, map);
      }, CONFIG.searchDebounce);
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('#searchInput') && !e.target.closest('#searchResults')) {
        results.style.display = 'none';
      }
    });
  }

  async function performGeocoding(query, resultsEl, inputEl, map) {
    try {
      const url = `https://nominatim.openstreetmap.org/search?` +
        `format=json&q=${encodeURIComponent(query)}` +
        `&limit=${CONFIG.maxSearchResults}` +
        `&countrycodes=${CONFIG.countryCodes}`;
      
      const response = await fetch(url, {
        headers: { 'User-Agent': 'NASA-Climate-Analysis/2.1' }
      });
      
      if (!response.ok) throw new Error('Search service unavailable');
      
      const data = await response.json();
      
      if (data.length === 0) {
        resultsEl.innerHTML = '<div class="result-item">No results found</div>';
        resultsEl.style.display = 'block';
        return;
      }

      resultsEl.innerHTML = data.map(r => `
        <div class="result-item" 
             data-lat="${r.lat}" 
             data-lon="${r.lon}" 
             data-name="${escapeHtml(r.display_name.split(',')[0])}">
          <strong>${escapeHtml(r.display_name.split(',')[0])}</strong><br>
          <small>${escapeHtml(r.display_name)}</small>
        </div>
      `).join('');
      resultsEl.style.display = 'block';

      resultsEl.querySelectorAll('.result-item').forEach(item => {
        item.onclick = () => {
          const lat = parseFloat(item.dataset.lat);
          const lon = parseFloat(item.dataset.lon);
          const name = item.dataset.name || 'Location';
          selectLocation(lat, lon, name, map);
          resultsEl.style.display = 'none';
          inputEl.value = name;
        };
      });
      
    } catch (error) {
      console.error('Geocoding error:', error);
      resultsEl.innerHTML = '<div class="result-item">Search error. Try again.</div>';
      resultsEl.style.display = 'block';
    }
  }

  // === LOCATION SELECTION ===
  
  function selectLocation(lat, lon, name, map) {
    if (!isValidCoordinate(lat, lon)) {
      toast('Invalid coordinates', 'error');
      return;
    }

    state.selectedLocation = { lat, lon, name };
    
    if (state.currentMarker) {
      map.removeLayer(state.currentMarker);
    }
    
    state.currentMarker = L.marker([lat, lon], {
      icon: L.divIcon({
        className: 'location-marker',
        html: '<div class="marker-pin"></div>',
        iconSize: [32, 42],
        iconAnchor: [16, 42],
        popupAnchor: [0, -42]
      })
    }).bindPopup(`
      <strong>${name}</strong><br>
      Lat: ${lat.toFixed(6)}<br>
      Lon: ${lon.toFixed(6)}
    `).addTo(map);
    
    map.flyTo([lat, lon], CONFIG.selectedZoom, {
      duration: 1.5
    });
    
    toast(`Location selected: ${name}`, 'success');
    document.getElementById('coords').innerHTML = 
      `<strong>${name}</strong><br>Lat: ${lat.toFixed(6)}, Lon: ${lon.toFixed(6)}`;
  }

  // === PROCESSING ===
  
  function setupProcessing() {
    const btnProcess = document.getElementById('btnProcess');
    const modeRoute = document.getElementById('modeRoute');
    const modeConstruction = document.getElementById('modeConstruction');

    if (!btnProcess) return;

    if (modeRoute) {
      modeRoute.onchange = () => {
        if (modeRoute.checked) state.analysisMode = 'route';
      };
    }
    
    if (modeConstruction) {
      modeConstruction.onchange = () => {
        if (modeConstruction.checked) state.analysisMode = 'construction';
      };
    }

    btnProcess.onclick = async () => {
      if (state.isProcessing) return;
      
      if (!state.selectedLocation) {
        toast('Please select a location first', 'error');
        return;
      }

      const startDate = document.getElementById('dateStart').value;
      const endDate = document.getElementById('dateEnd').value;

      if (!startDate || !endDate) {
        toast('Please select date range', 'error');
        return;
      }

      if (new Date(startDate) > new Date(endDate)) {
        toast('Start date must be before end date', 'error');
        return;
      }

      await processAnalysis(startDate, endDate);
    };
  }

  async function processAnalysis(startDate, endDate) {
    const btnProcess = document.getElementById('btnProcess');
    const originalText = btnProcess.textContent;
    state.isProcessing = true;
    
    btnProcess.disabled = true;
    btnProcess.innerHTML = '<span class="btn-spinner"></span> Processing Analysis...';
    btnProcess.classList.add('processing');

    toast('Analyzing NASA climate data...', 'info', 2000);

    try {
      const payload = {
        lat: state.selectedLocation.lat,
        lon: state.selectedLocation.lon,
        start_date: startDate.replace(/-/g, ''),
        end_date: endDate.replace(/-/g, ''),
        mode: state.analysisMode
      };

      console.log('Sending request:', payload);

      const response = await fetch(`${API_BASE}/api/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      console.log('Response received:', data);

      if (data.status === 'error') {
        throw new Error(data.message || 'Analysis failed');
      }

      state.lastAnalysisData = data;
      
      // Show results panel
      showResults(data);
      
      // Visualize on map
      if (state.analysisMode === 'route') {
        visualizeSafeRoutes(data, state.selectedLocation);
      } else {
        visualizeConstructionZones(data, state.selectedLocation);
      }
      
      // Show map legend
      showMapLegend(state.analysisMode, data.risk?.level);
      
      toast('Analysis completed successfully!', 'success');

    } catch (error) {
      console.error('Processing error:', error);
      
      let errorMsg = 'Analysis failed. ';
      if (error.message.includes('Failed to fetch')) {
        errorMsg += 'Cannot connect to server. Is the backend running?';
      } else if (error.message.includes('500')) {
        error
  Msg += 'Server error. Check backend logs.';
      } else {
        errorMsg += error.message;
      }
      
      toast(errorMsg, 'error', 5000);
      
    } finally {
      state.isProcessing = false;
      btnProcess.disabled = false;
      btnProcess.textContent = originalText;
      btnProcess.classList.remove('processing');
    }
  }

  // === ENHANCED RESULTS DISPLAY ===
  
  function showResults(data) {
    const panel = document.getElementById('resultPanel');
    const content = document.getElementById('resultsContent');

    if (!panel || !content) return;

    const risk = data.risk || {};
    const climate = data.climate || {};
    const events = data.events || [];
    const recs = data.recommendations || [];
    const mode = data.mode || 'route';

    // Build comprehensive results HTML
    let html = `
      <!-- Result Header -->
      <div class="result-header">
        <div class="result-title-section">
          <h3>${mode === 'route' ? 'Safe Route Analysis' : 'Construction Site Viability'}</h3>
          <p class="location-name">${state.selectedLocation.name}</p>
          <p class="analysis-metadata">
            <span class="metadata-item">
              <span class="metadata-icon">📅</span>
              ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
            <span class="metadata-item">
              <span class="metadata-icon">🌍</span>
              ${state.selectedLocation.lat.toFixed(4)}, ${state.selectedLocation.lon.toFixed(4)}
            </span>
          </p>
        </div>
      </div>

      <!-- Map Visualization Explanation -->
      <div class="info-card map-explanation">
        <div class="info-card-header">
          <span class="info-card-icon">🗺️</span>
          <h4>Understanding the Map Visualization</h4>
        </div>
        <div class="info-card-content">
          <p>${mode === 'route' 
            ? 'The <strong>colors and lines</strong> on the map show <strong>safe travel directions</strong>. Arrows indicate recommended routes based on detected risk levels. Circular zones represent safety radiuses around your location.' 
            : 'The <strong>circles and zones</strong> on the map indicate <strong>construction site viability</strong>. Colors show whether the site is suitable, requires precautions, or should be avoided. Alternative sites are marked with their risk levels.'
          }</p>
          <div class="map-color-guide">
            <div class="color-item">
              <span class="color-dot" style="background:#2ecc71"></span>
              <span>Green = Safe / Low Risk</span>
            </div>
            <div class="color-item">
              <span class="color-dot" style="background:#f39c12"></span>
              <span>Orange = Caution / Moderate Risk</span>
            </div>
            <div class="color-item">
              <span class="color-dot" style="background:#e74c3c"></span>
              <span>Red = Danger / High Risk</span>
            </div>
          </div>
          <small class="info-note">Click on map elements for detailed information about each zone or route.</small>
        </div>
      </div>

      <!-- Risk Assessment Card -->
      <div class="risk-card" data-risk-level="${risk.level}">
        <div class="risk-visual" style="background: linear-gradient(135deg, ${risk.color}22 0%, ${risk.color}44 100%); border-left: 4px solid ${risk.color}">
          <div class="risk-badge" style="background: ${risk.color}">
            <span class="risk-icon">${risk.level === 'LOW' ? '✓' : risk.level === 'MODERATE' ? '⚠' : '✕'}</span>
          </div>
          <div class="risk-details">
            <div class="risk-label">Risk Assessment</div>
            <div class="risk-level" style="color: ${risk.color}">${risk.level}</div>
            <div class="risk-score">
              <div class="score-bar">
                <div class="score-fill" style="width: ${risk.score}%; background: ${risk.color}"></div>
              </div>
              <span class="score-value">${risk.score}/100</span>
            </div>
          </div>
        </div>
        <div class="risk-interpretation">
          <p class="risk-description">
            ${getRiskDescription(risk.level, mode)}
          </p>
        </div>
      </div>
    `;

    // Climate Data Section
    if (climate.total_precip !== undefined) {
      html += `
        <div class="data-section climate-section">
          <div class="section-header">
            <h4><span class="section-icon">📊</span> NASA Climate Data Analysis</h4>
            <span class="data-badge">${climate.days} days analyzed</span>
          </div>
          
          <!-- Primary Metrics Grid -->
          <div class="metrics-grid">
            <div class="metric-card">
              <div class="metric-icon" style="background: linear-gradient(135deg, #3498db 0%, #2980b9 100%)">💧</div>
              <div class="metric-content">
                <span class="metric-label">Total Precipitation</span>
                <strong class="metric-value">${climate.total_precip} mm</strong>
                <small class="metric-detail">${climate.precip_per_day} mm/day average</small>
              </div>
            </div>
            
            <div class="metric-card">
              <div class="metric-icon" style="background: linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)">🌧️</div>
              <div class="metric-content">
                <span class="metric-label">Rainy Days</span>
                <strong class="metric-value">${climate.rainy_days}/${climate.days}</strong>
                <small class="metric-detail">${(climate.rain_frequency * 100).toFixed(0)}% frequency</small>
              </div>
            </div>
            
            <div class="metric-card">
              <div class="metric-icon" style="background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)">🌡️</div>
              <div class="metric-content">
                <span class="metric-label">Temperature</span>
                <strong class="metric-value">${climate.avg_temp}°C</strong>
                <small class="metric-detail">Range: ${climate.temp_min}°C - ${climate.temp_max}°C</small>
              </div>
            </div>
            
            <div class="metric-card">
              <div class="metric-icon" style="background: linear-gradient(135deg, #1abc9c 0%, #16a085 100%)">💨</div>
              <div class="metric-content">
                <span class="metric-label">Humidity</span>
                <strong class="metric-value">${climate.avg_humidity}%</strong>
                <small class="metric-detail">Average relative humidity</small>
              </div>
            </div>
          </div>

          <!-- Secondary Metrics -->
          <div class="secondary-metrics">
            <div class="secondary-metric">
              <span class="sec-label">Wind Speed</span>
              <strong class="sec-value">${climate.avg_wind_speed} m/s</strong>
            </div>
            <div class="secondary-metric">
              <span class="sec-label">Solar Radiation</span>
              <strong class="sec-value">${climate.avg_solar} W/m²</strong>
            </div>
          </div>

          <!-- Climate Analysis Summary -->
          <div class="climate-summary-box">
            <strong>Analysis Summary:</strong> ${getClimateSummary(climate)}
          </div>
        </div>
      `;
    }

    // Natural Events Section
    if (events.length > 0) {
      html += `
        <div class="data-section events-section">
          <div class="section-header">
            <h4><span class="section-icon">⚠️</span> Natural Events Detected Nearby</h4>
            <span class="alert-badge">${events.length} active event${events.length > 1 ? 's' : ''}</span>
          </div>
          
          <div class="alert-box">
            <div class="alert-content">
              <strong>Alert:</strong> ${events.length} natural event${events.length > 1 ? 's have' : ' has'} been detected in the surrounding area. Please review the details below and exercise appropriate caution.
            </div>
          </div>

          <div class="events-list">
            ${events.map(event => `
              <div class="event-card">
                <div class="event-badge-cat">${event.category}</div>
                <div class="event-details">
                  <h5 class="event-title">${event.title}</h5>
                  <div class="event-meta">
                    <span class="event-distance">
                      <span class="meta-icon">📍</span>
                      ${event.distance_km} km away
                    </span>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    // Recommendations Section
    html += `
      <div class="data-section recommendations-section">
        <div class="section-header">
          <h4><span class="section-icon">💡</span> Expert Recommendations</h4>
        </div>
        
        <div class="info-box recommendations-intro">
          <p>Based on comprehensive analysis of NASA climate data and detected natural events, we recommend the following actions:</p>
        </div>

        <div class="recommendations-list">
          ${recs.map((rec, idx) => `
            <div class="recommendation-item">
              <div class="rec-number">${idx + 1}</div>
              <div class="rec-content">
                <p>${rec}</p>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    // Data Sources Section
    html += `
      <div class="data-section sources-section">
        <div class="section-header">
          <h4><span class="section-icon">📚</span> Data Sources</h4>
        </div>
        
        <div class="sources-grid">
          <div class="source-card">
            <div class="source-logo">🛰️</div>
            <div class="source-details">
              <strong>NASA POWER</strong>
              <small>Prediction Of Worldwide Energy Resources - Climate data</small>
            </div>
          </div>
          
          <div class="source-card">
            <div class="source-logo">🌍</div>
            <div class="source-details">
              <strong>NASA EONET</strong>
              <small>Earth Observatory Natural Event Tracker - Real-time events</small>
            </div>
          </div>
          
          <div class="source-card">
            <div class="source-logo">⛰️</div>
            <div class="source-details">
              <strong>Open-Elevation</strong>
              <small>Terrain elevation and topography data</small>
            </div>
          </div>
        </div>
        
        <div class="disclaimer-box">
          <small><strong>Disclaimer:</strong> This analysis is generated using scientific data from NASA and other sources. For official decisions, please consult with local authorities and certified professionals.</small>
        </div>
      </div>
    `;

    // Download PDF Button
    html += `
      <div class="download-section">
        <button id="btnDownloadPDF" class="btn-download">
          <span class="btn-icon">📄</span>
          <span class="btn-text">Download Complete PDF Report</span>
        </button>
        <p class="download-description">
          Generate a comprehensive PDF report including all data, visualizations, and detailed recommendations for ${mode === 'route' ? 'safe route planning' : 'construction site evaluation'}.
        </p>
      </div>
    `;

    // Update content
    content.innerHTML = html;
    
    // Show panel with smooth animation
    panel.style.display = 'flex';
    setTimeout(() => {
      panel.classList.add('visible');
    }, 50);

    // Setup PDF download handler
    const btnPDF = document.getElementById('btnDownloadPDF');
    if (btnPDF) {
      btnPDF.onclick = () => generateEnhancedPDF(data);
    }

    // Scroll to top
    content.scrollTop = 0;
  }

  // Helper function for risk descriptions
  function getRiskDescription(riskLevel, mode) {
    const descriptions = {
      route: {
        LOW: 'Favorable conditions detected. Standard travel precautions apply. Routes shown indicate safe directions with minimal weather-related risks.',
        MODERATE: 'Moderate risk conditions identified. Enhanced precautions recommended. Follow marked safer routes and monitor weather updates regularly.',
        HIGH: 'High risk conditions detected. Evacuation routes are displayed. Consider delaying travel or following emergency routes only if necessary.'
      },
      construction: {
        LOW: 'Site conditions are favorable for construction. Standard building practices and local codes apply. Green zones indicate suitable areas.',
        MODERATE: 'Site has moderate risk factors. Construction is possible with enhanced precautions including reinforced foundations and improved drainage systems.',
        HIGH: 'Site has high risk factors including flood or disaster potential. Construction is not recommended. Alternative safer locations are marked on the map.'
      }
    };
    
    return descriptions[mode][riskLevel] || 'Risk assessment completed based on available data.';
  }

  // Helper function for climate summary
  function getClimateSummary(climate) {
    const rainyPercentage = (climate.rain_frequency * 100).toFixed(0);
    const precipIntensity = climate.total_precip / climate.days;
    
    let summary = `Over ${climate.days} days, the area experienced ${climate.total_precip} mm of total precipitation (${climate.precip_per_day} mm/day average) with ${rainyPercentage}% rain frequency. `;
    
    if (precipIntensity > 10) {
      summary += 'Heavy rainfall patterns detected, indicating high moisture levels.';
    } else if (precipIntensity > 5) {
      summary += 'Moderate rainfall patterns indicate normal seasonal precipitation.';
    } else {
      summary += 'Low rainfall patterns suggest relatively dry conditions.';
    }
    
    return summary;
  }

  // === ENHANCED PDF GENERATION ===
  
  async function generateEnhancedPDF(data) {
    const btn = document.getElementById('btnDownloadPDF');
    if (!btn || !window.jspdf) {
      toast('PDF library not loaded', 'error');
      return;
    }

    const originalHTML = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="btn-spinner"></span> <span class="btn-text">Generating PDF...</span>';

    try {
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF();
      
      const risk = data.risk || {};
      const climate = data.climate || {};
      const events = data.events || [];
      const recs = data.recommendations || [];
      const mode = data.mode || 'route';
      
      // === PAGE 1: HEADER & SUMMARY ===
      pdf.setFillColor(25, 118, 210);
      pdf.rect(0, 0, 210, 40, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(22);
      pdf.setFont(undefined, 'bold');
      pdf.text('NASA CLIMATE ANALYSIS REPORT', 105, 15, { align: 'center' });
      pdf.setFontSize(14);
      pdf.setFont(undefined, 'normal');
      pdf.text(mode === 'route' ? 'Safe Route Analysis' : 'Construction Site Viability Assessment', 105, 25, { align: 'center' });
      pdf.setFontSize(10);
      pdf.text(`Generated: ${new Date().toLocaleString('en-US')}`, 105, 35, { align: 'center' });
      
      let y = 55;
      pdf.setTextColor(0, 0, 0);
      
      // Location Info
      pdf.setFillColor(240, 240, 240);
      pdf.rect(15, y, 180, 25, 'F');
      pdf.setFontSize(12);
      pdf.setFont(undefined, 'bold');
      pdf.text('LOCATION', 20, y + 8);
      pdf.setFont(undefined, 'normal');
      pdf.setFontSize(10);
      pdf.text(`Name: ${state.selectedLocation.name}`, 20, y + 15);
      pdf.text(`Coordinates: ${state.selectedLocation.lat.toFixed(6)}, ${state.selectedLocation.lon.toFixed(6)}`, 20, y + 21);
      
      y += 35;
      
      // Risk Assessment Box
      const riskColors = {
        'LOW': [46, 204, 113],
        'MODERATE': [243, 156, 18],
        'HIGH': [231, 76, 60]
      };
      const riskColor = riskColors[risk.level] || [150, 150, 150];
      
      pdf.setFillColor(...riskColor);
      pdf.rect(15, y, 180, 35, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(14);
      pdf.setFont(undefined, 'bold');
      pdf.text('RISK ASSESSMENT', 105, y + 10, { align: 'center' });
      pdf.setFontSize(24);
      pdf.text(risk.level, 105, y + 22, { align: 'center' });
      pdf.setFontSize(12);
      pdf.text(`Score: ${risk.score}/100`, 105, y + 30, { align: 'center' });
      
      y += 45;
      pdf.setTextColor(0, 0, 0);
      
      // Risk Description
      pdf.setFontSize(10);
      pdf.setFont(undefined, 'normal');
      const riskDesc = getRiskDescription(risk.level, mode);
      const riskLines = pdf.splitTextToSize(riskDesc, 170);
      riskLines.forEach((line, idx) => {
        pdf.text(line, 20, y + (idx * 5));
      });
      y += (riskLines.length * 5) + 10;
      
      // === NASA CLIMATE DATA ===
      if (climate.total_precip !== undefined) {
        if (y > 200) {
          pdf.addPage();
          y = 20;
        }
        
        pdf.setFontSize(14);
        pdf.setFont(undefined, 'bold');
        pdf.text('NASA CLIMATE DATA', 20, y);
        y += 8;
        
        pdf.setFillColor(240, 248, 255);
        pdf.rect(15, y, 180, 65, 'F');
        
        pdf.setFontSize(10);
        pdf.setFont(undefined, 'normal');
        const climateData = [
          `Analysis Period: ${climate.days} days`,
          `Total Precipitation: ${climate.total_precip} mm`,
          `Rainy Days: ${climate.rainy_days} out of ${climate.days} days (${(climate.rain_frequency * 100).toFixed(0)}% frequency)`,
          `Average Temperature: ${climate.avg_temp}°C (Min: ${climate.temp_min}°C, Max: ${climate.temp_max}°C)`,
          `Average Humidity: ${climate.avg_humidity}%`,
          `Average Wind Speed: ${climate.avg_wind_speed} m/s`,
          `Average Solar Radiation: ${climate.avg_solar} W/m²`,
          `Precipitation per Day: ${climate.precip_per_day} mm/day`,
          '',
          `Summary: ${getClimateSummary(climate)}`
        ];
        
        climateData.forEach((line, idx) => {
          if (line === '') {
            y += 3;
          } else {
            const lines = pdf.splitTextToSize(line, 170);
            lines.forEach(l => {
              pdf.text(l, 20, y + 7 + (idx * 6));
            });
          }
        });
        
        y += 75;
      }
      
      // === NATURAL EVENTS ===
      if (events.length > 0) {
        if (y > 220) {
          pdf.addPage();
          y = 20;
        }
        
        pdf.setFontSize(14);
        pdf.setFont(undefined, 'bold');
        pdf.text('NATURAL EVENTS DETECTED', 20, y);
        y += 8;
        
        pdf.setFillColor(255, 245, 230);
        const eventsHeight = Math.min(events.length * 12 + 10, 50);
        pdf.rect(15, y, 180, eventsHeight, 'F');
        
        pdf.setFontSize(9);
        pdf.setFont(undefined, 'normal');
        events.slice(0, 5).forEach((event, idx) => {
          const text = `• ${event.title} - ${event.category} (${event.distance_km} km away)`;
          const lines = pdf.splitTextToSize(text, 170);
          lines.forEach((line, lineIdx) => {
            pdf.text(line, 20, y + 7 + (idx * 10) + (lineIdx * 5));
          });
        });
        
        y += eventsHeight + 5;
      }
      
      // === RECOMMENDATIONS ===
      if (y > 200) {
        pdf.addPage();
        y = 20;
      }
      
      pdf.setFontSize(14);
      pdf.setFont(undefined, 'bold');
      pdf.text('RECOMMENDATIONS', 20, y);
      y += 10;
      
      pdf.setFontSize(10);
      pdf.setFont(undefined, 'normal');
      
      recs.forEach((rec, idx) => {
        if (y > 265) {
          pdf.addPage();
          y = 20;
        }
        
        const lines = pdf.splitTextToSize(`${idx + 1}. ${rec}`, 170);
        lines.forEach(line => {
          pdf.text(line, 20, y);
          y += 6;
        });
        y += 3;
      });
      
      // === MODE-SPECIFIC GUIDANCE ===
      y += 10;
      if (y > 240) {
        pdf.addPage();
        y = 20;
      }
      
      pdf.setFontSize(14);
      pdf.setFont(undefined, 'bold');
      
      if (mode === 'route') {
        pdf.text('SAFE ROUTE GUIDANCE', 20, y);
        y += 8;
        pdf.setFontSize(10);
        pdf.setFont(undefined, 'normal');
        
        const routeGuidance = [
          'Route Planning:',
          '• Priority: Use main highways and well-maintained roads',
          '• Alternatives: Keep secondary routes as backup options',
          '• Timing: Avoid travel during peak rain hours (typically afternoon)',
          '',
          'Safety Measures:',
          '• Check weather updates hourly during travel',
          '• Carry emergency supplies: water, food, first aid kit',
          '• Maintain full fuel tank and charged mobile devices',
          '• Share travel itinerary with trusted contacts',
          '',
          'Emergency Contacts:',
          '• Emergency Services: Check local emergency numbers',
          '• Weather Services: Monitor SENAMHI or local meteorological services',
          '• Local Authorities: Contact municipal emergency numbers if needed'
        ];
        
        routeGuidance.forEach(line => {
          if (y > 275) {
            pdf.addPage();
            y = 20;
          }
          pdf.text(line, 20, y);
          y += 5;
        });
        
      } else {
        pdf.text('CONSTRUCTION SITE REQUIREMENTS', 20, y);
        y += 8;
        pdf.setFontSize(10);
        pdf.setFont(undefined, 'normal');
        
        const constructionReq = [
          'Site Preparation:',
          '• Conduct detailed geotechnical soil study',
          '• Install adequate drainage systems',
          '• Implement erosion control measures',
          '',
          'Foundation Requirements:',
          risk.level === 'HIGH' ? '• Elevated foundations (minimum 1.5m above ground)' : '• Standard foundations with waterproofing',
          risk.level === 'HIGH' ? '• Reinforced concrete with anti-seismic design' : '• Standard reinforced concrete',
          '• Proper anchoring systems for high winds',
          '',
          'Building Standards:',
          '• Follow local building codes and regulations',
          '• Use weather-resistant materials',
          '• Install flood barriers if in flood-prone area',
          '• Ensure proper ventilation and humidity control',
          '',
          'Required Studies:',
          '• Topographic survey',
          '• Hydrological assessment',
          '• Environmental impact study',
          '• Structural engineering certification'
        ];
        
        constructionReq.forEach(line => {
          if (y > 275) {
            pdf.addPage();
            y = 20;
          }
          pdf.text(line, 20, y);
          y += 5;
        });
      }
      
      // === FOOTER ===
      const totalPages = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(100, 100, 100);
        pdf.text(`Page ${i} of ${totalPages}`, 105, 292, { align: 'center' });
      }
      
      // Final page - Data sources
      pdf.addPage();
      y = 20;
      
      pdf.setFontSize(14);
      pdf.setFont(undefined, 'bold');
      pdf.setTextColor(0, 0, 0);
      pdf.text('DATA SOURCES & DISCLAIMER', 20, y);
      y += 10;
      
      pdf.setFillColor(250, 250, 250);
      pdf.rect(15, y, 180, 40, 'F');
      pdf.setFontSize(10);
      pdf.setFont(undefined, 'bold');
      pdf.text('DATA SOURCES', 20, y + 8);
      pdf.setFont(undefined, 'normal');
      pdf.setFontSize(9);
      pdf.text('• NASA POWER: Prediction Of Worldwide Energy Resources - Climate data', 20, y + 15);
      pdf.text('• NASA EONET: Earth Observatory Natural Event Tracker - Natural events data', 20, y + 21);
      pdf.text('• Open-Elevation API: Terrain elevation and topography data', 20, y + 27);
      pdf.text('• OpenStreetMap: Geographic and location data', 20, y + 33);
      
      y += 50;
      
      pdf.setFillColor(255, 250, 240);
      pdf.rect(15, y, 180, 45, 'F');
      pdf.setFont(undefined, 'bold');
      pdf.text('DISCLAIMER', 20, y + 8);
      pdf.setFont(undefined, 'normal');
      pdf.setFontSize(8);
      const disclaimer = 'This report is generated using scientific data from NASA and other reliable sources. The analysis and recommendations provided are for informational purposes only. For official decisions regarding construction, travel, or disaster preparedness, please consult with local authorities, certified professionals, and relevant government agencies. This report should not be used as the sole basis for critical decisions.';
      const disclaimerLines = pdf.splitTextToSize(disclaimer, 170);
      disclaimerLines.forEach((line, idx) => {
        pdf.text(line, 20, y + 15 + (idx * 4));
      });
      
      // Save PDF
      const filename = `NASA_Climate_Analysis_${mode}_${state.selectedLocation.name.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(filename);
      
      toast('PDF report downloaded successfully!', 'success');
      
    } catch (error) {
      console.error('PDF generation error:', error);
      toast('Failed to generate PDF: ' + error.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalHTML;
    }
  }

  // === PANEL CONTROLS ===
  
  function setupPanels() {
    const closeResult = document.getElementById('closeResults');
    const minResult = document.getElementById('minResults');
    const resultPanel = document.getElementById('resultPanel');
    const resultsContent = document.getElementById('resultsContent');

    if (closeResult) {
      closeResult.onclick = () => {
        resultPanel.classList.remove('visible');
        clearRouteLayers();
        const legend = document.getElementById('mapLegend');
        if (legend) legend.remove();
        setTimeout(() => {
          resultPanel.style.display = 'none';
        }, 300);
      };
    }

    if (minResult) {
      minResult.onclick = () => {
        const isMinimized = resultPanel.classList.toggle('minimized');
        resultsContent.style.display = isMinimized ? 'none' : 'block';
        minResult.textContent = isMinimized ? '+' : '−';
      };
    }
  }

  // === INITIALIZATION ===
  
  function init() {
    // Set default dates (last 3 days)
    const today = new Date();
    const past = new Date(today);
    past.setDate(today.getDate() - 3);
    
    const dateStart = document.getElementById('dateStart');
    const dateEnd = document.getElementById('dateEnd');
    
    if (dateStart) dateStart.value = past.toISOString().split('T')[0];
    if (dateEnd) dateEnd.value = today.toISOString().split('T')[0];

    // Initialize map
    const map = initMap();
    state.map = map;
    
    // Setup components
    setupSearch(map);
    setupProcessing();
    setupPanels();
    
    // Show tutorial on first visit
    showTutorial();

    // Success message
    toast('NASA Climate Analysis System Ready', 'info', 4000);
    console.log('System initialized successfully');
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

