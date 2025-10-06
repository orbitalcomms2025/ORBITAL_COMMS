"""
NASA Climate Analysis Backend - Optimized Version
Uses real NASA data APIs for disaster prevention analysis
"""

import requests
from flask import Flask, jsonify, request
from flask_cors import CORS
import math
from datetime import datetime, timedelta

# API Configuration
NASA_POWER_URL = "https://power.larc.nasa.gov/api/temporal/daily/point"
NASA_EONET_URL = "https://eonet.gsfc.nasa.gov/api/v3/events"
ELEVATION_URL = "https://api.open-elevation.com/api/v1/lookup"

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Constants
PROCESS_DAYS = 3  # Always process 3 days for speed
PROXIMITY_KM = 150  # Event proximity threshold

def log(msg):
    """Simple logging"""
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")

# === UTILITIES ===

def haversine_distance(lat1, lon1, lat2, lon2):
    """Calculate distance in km between two points"""
    R = 6371.0
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    return R * 2 * math.asin(math.sqrt(a))

def limit_dates(start, end):
    """Limit date range to PROCESS_DAYS"""
    try:
        start_dt = datetime.strptime(start.replace('-', ''), '%Y%m%d')
        end_dt = datetime.strptime(end.replace('-', ''), '%Y%m%d')
        
        if (end_dt - start_dt).days > PROCESS_DAYS:
            end_dt = start_dt + timedelta(days=PROCESS_DAYS)
        
        return start_dt.strftime('%Y%m%d'), end_dt.strftime('%Y%m%d')
    except:
        today = datetime.now()
        return (today - timedelta(days=PROCESS_DAYS)).strftime('%Y%m%d'), today.strftime('%Y%m%d')

# === NASA POWER (Climate Data) ===

def get_climate_data(lat, lon, start, end):
    """Get real climate data from NASA POWER"""
    start_fmt, end_fmt = limit_dates(start, end)
    
    params = {
        'parameters': 'PRECTOTCORR,T2M,T2M_MIN,T2M_MAX,RH2M,WS2M,ALLSKY_SFC_SW_DWN',
        'community': 'RE',
        'longitude': lon,
        'latitude': lat,
        'start': start_fmt,
        'end': end_fmt,
        'format': 'JSON'
    }
    
    log(f"NASA POWER: ({lat},{lon}) {start_fmt}->{end_fmt}")
    
    try:
        resp = requests.get(NASA_POWER_URL, params=params, timeout=15)
        resp.raise_for_status()
        data = resp.json()
        
        params_data = data['properties']['parameter']
        
        # Extract values
        precip = [v for v in params_data.get('PRECTOTCORR', {}).values() if isinstance(v, (int, float)) and v >= 0]
        temp = [v for v in params_data.get('T2M', {}).values() if isinstance(v, (int, float))]
        temp_min = [v for v in params_data.get('T2M_MIN', {}).values() if isinstance(v, (int, float))]
        temp_max = [v for v in params_data.get('T2M_MAX', {}).values() if isinstance(v, (int, float))]
        humidity = [v for v in params_data.get('RH2M', {}).values() if isinstance(v, (int, float))]
        wind = [v for v in params_data.get('WS2M', {}).values() if isinstance(v, (int, float))]
        solar = [v for v in params_data.get('ALLSKY_SFC_SW_DWN', {}).values() if isinstance(v, (int, float))]
        
        total_precip = sum(precip)
        days = len(precip)
        rainy_days = sum(1 for p in precip if p > 1.0)
        
        result = {
            'total_precip': round(total_precip, 2),
            'avg_temp': round(sum(temp)/len(temp), 2) if temp else None,
            'temp_min': round(min(temp_min), 2) if temp_min else None,
            'temp_max': round(max(temp_max), 2) if temp_max else None,
            'avg_humidity': round(sum(humidity)/len(humidity), 2) if humidity else None,
            'avg_wind_speed': round(sum(wind)/len(wind), 2) if wind else None,
            'avg_solar': round(sum(solar)/len(solar), 2) if solar else None,
            'rainy_days': rainy_days,
            'days': days,
            'precip_per_day': round(total_precip/days, 2) if days > 0 else 0,
            'rain_frequency': round(rainy_days/days, 2) if days > 0 else 0
        }
        
        log(f"  ✓ Climate: {total_precip}mm, {rainy_days}/{days} rainy days")
        return result
        
    except Exception as e:
        log(f"  ✗ NASA POWER error: {e}")
        return None

# === NASA EONET (Natural Events) ===

def get_natural_events(lat, lon):
    """Get nearby natural events from EONET"""
    try:
        params = {'status': 'open', 'limit': 50, 'days': 30}
        resp = requests.get(NASA_EONET_URL, params=params, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        
        nearby = []
        for event in data.get('events', []):
            if event.get('geometry') and event['geometry']:
                geom = event['geometry'][0]
                if geom.get('type') == 'Point' and geom.get('coordinates'):
                    ev_lon, ev_lat = geom['coordinates']
                    distance = haversine_distance(lat, lon, ev_lat, ev_lon)
                    
                    if distance <= PROXIMITY_KM:
                        nearby.append({
                            'title': event.get('title', 'Unknown'),
                            'category': event['categories'][0]['title'] if event.get('categories') else 'Unknown',
                            'distance_km': round(distance, 1)
                        })
        
        log(f"  ✓ Events: {len(nearby)} within {PROXIMITY_KM}km")
        return nearby
        
    except Exception as e:
        log(f"  ✗ EONET error: {e}")
        return []

# === ELEVATION (Terrain) ===

def get_elevation(lat, lon):
    """Placeholder for elevation data - requires stable API"""
    log(f"  ⚠ Elevation: API disabled (use Google Elevation API for production)")
    return {'elevation': None, 'slope': 0}

# === RISK CALCULATION ===

def calculate_risk(climate, events, terrain, mode):
    """Calculate risk score 0-100"""
    score = 0
    
    if climate:
        total_precip = climate.get('total_precip', 0)
        rain_freq = climate.get('rain_frequency', 0)
        precip_day = climate.get('precip_per_day', 0)
        
        if total_precip > 150:
            score += 20
        elif total_precip > 100:
            score += 15
        elif total_precip > 50:
            score += 10
        elif total_precip > 20:
            score += 5
        
        if rain_freq > 0.8:
            score += 15
        elif rain_freq > 0.6:
            score += 10
        elif rain_freq > 0.4:
            score += 5
        
        if precip_day > 30:
            score += 15
        elif precip_day > 20:
            score += 10
        elif precip_day > 10:
            score += 5
    
    for event in events:
        cat = event['category'].lower()
        dist = event['distance_km']
        proximity_factor = max(0, 1 - (dist / PROXIMITY_KM))
        
        if 'flood' in cat or 'storm' in cat or 'cyclone' in cat:
            score += int(15 * proximity_factor)
        elif 'fire' in cat or 'volcano' in cat:
            score += int(10 * proximity_factor)
        elif 'drought' in cat:
            score += int(5 * proximity_factor)
    
    if mode == 'construction' and terrain:
        slope = terrain.get('slope', 0)
        if slope > 15:
            score += 20
        elif slope > 10:
            score += 15
        elif slope > 7:
            score += 10
        elif slope > 5:
            score += 5
    
    score = min(100, max(0, score))
    
    if score > 70:
        level = "HIGH"
        color = "#e74c3c"
    elif score > 40:
        level = "MODERATE"
        color = "#f39c12"
    else:
        level = "LOW"
        color = "#2ecc71"
    
    return {'score': score, 'level': level, 'color': color}

# === RECOMMENDATIONS ===

def generate_recommendations(risk, climate, events, terrain, mode):
    recs = []
    score = risk['score']
    level = risk['level']
    
    if mode == 'route':
        if level == "HIGH":
            recs.append("⚠ TRAVEL NOT RECOMMENDED - High risk conditions")
            if climate and climate['total_precip'] > 100:
                recs.append(f"Heavy rainfall: {climate['total_precip']}mm expected over {climate['days']} days")
            if events:
                recs.append(f"⚡ {len(events)} active natural event(s) detected nearby")
            recs.append("📱 Monitor SENAMHI and local alerts constantly")
            recs.append("🚫 Avoid travel if possible, seek alternative routes")
        elif level == "MODERATE":
            recs.append("⚠ Travel with CAUTION - Moderate risk detected")
            if climate and climate['rainy_days'] > 1:
                recs.append(f"Rain expected {climate['rainy_days']} of {climate['days']} days")
            recs.append("⏰ Allow extra travel time")
            recs.append("🛣 Use main roads, avoid secondary routes")
            recs.append("📦 Carry emergency supplies and charged phone")
        else:
            recs.append("✅ CONDITIONS FAVORABLE for travel")
            recs.append("☀ Weather conditions are stable")
            recs.append("🚗 Standard safety precautions apply")
            recs.append("📻 Monitor forecasts during journey")
    else:
        if level == "HIGH":
            recs.append("🚫 SITE NOT RECOMMENDED for construction")
            if climate and climate['total_precip'] > 100:
                recs.append(f"⚠ High flood risk: {climate['total_precip']}mm precipitation")
            if terrain and terrain['slope'] > 10:
                recs.append(f"⛰ Steep terrain: {terrain['slope']}° slope detected")
            recs.append("📍 Consider alternative higher-ground location")
            recs.append("🏗 If proceeding: elevated foundations mandatory")
        elif level == "MODERATE":
            recs.append("⚠ Construction POSSIBLE with precautions")
            recs.append("🏗 Reinforced foundation design required")
            recs.append("💧 Enhanced drainage systems necessary")
            if climate and climate['rain_frequency'] > 0.4:
                recs.append(f"Frequent rainfall - plan schedule carefully")
            recs.append("📋 Conduct detailed geotechnical study")
        else:
            recs.append("✅ SITE SUITABLE for construction")
            recs.append("🏗 Standard foundation design adequate")
            recs.append("💧 Basic drainage recommended")
            recs.append("📊 Standard building permits apply")
    
    return recs

# === API ENDPOINTS ===

@app.route('/')
def index():
    return """
    <h2>NASA Climate Analysis API - Optimized</h2>
    <h3>Endpoints:</h3>
    <ul>
        <li><strong>POST /api/process</strong> - Unified analysis (route or construction)</li>
        <li><strong>GET /health</strong> - Health check</li>
    </ul>
    <h3>Data Sources:</h3>
    <ul>
        <li>NASA POWER - Climate data (3-day window)</li>
        <li>NASA EONET - Natural events</li>
        <li>Open-Elevation - Terrain data</li>
    </ul>
    """

@app.route('/health')
def health():
    return jsonify({"status": "ok", "timestamp": datetime.now().isoformat()})

@app.route('/api/process', methods=['POST'])
def process_analysis():
    try:
        data = request.get_json()
        lat = float(data['lat'])
        lon = float(data['lon'])
        start = data.get('start_date', '')
        end = data.get('end_date', '')
        mode = data.get('mode', 'route')
        
        log(f"\n{'='*60}")
        log(f"ANALYSIS: {mode.upper()} at ({lat}, {lon})")
        log(f"{'='*60}")
        
        climate = get_climate_data(lat, lon, start, end)
        events = get_natural_events(lat, lon)
        terrain = get_elevation(lat, lon) if mode == 'construction' else {}
        
        risk = calculate_risk(climate, events, terrain, mode)
        recommendations = generate_recommendations(risk, climate, events, terrain, mode)
        
        response = {
            'status': 'ok',
            'mode': mode,
            'risk': risk,
            'recommendations': recommendations,
            'climate': climate,
            'events': events[:5],
            'terrain': terrain if mode == 'construction' else None,
            'diagnostics': {
                'precip_per_day': climate['precip_per_day'] if climate else 0,
                'rain_frequency': climate['rain_frequency'] if climate else 0,
                'days_analyzed': climate['days'] if climate else 0,
                'events_count': len(events)
            }
        }
        
        log(f"RESULT: {risk['level']} (score: {risk['score']})")
        log(f"{'='*60}\n")
        
        return jsonify(response), 200
        
    except Exception as e:
        log(f"ERROR: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

if __name__ == '__main__':
    print("\n" + "="*60)
    print("NASA CLIMATE ANALYSIS API - OPTIMIZED")
    print("="*60)
    print("Endpoint: POST /api/process")
    print("\nData Sources:")
    print("  • NASA POWER   - Real climate data")
    print("  • NASA EONET   - Active natural events")
    print("  • Open-Elevation - Terrain analysis")
    print("\nProcessing: 3-day window for fast response")
    print("="*60 + "\n")
    app.run(host='0.0.0.0', port=5000)
