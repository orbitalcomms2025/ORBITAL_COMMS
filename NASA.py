from flask import Flask, jsonify, request
import requests

app = Flask(__name__)

@app.route('/')
def home():
    return "<h2>🌦️ NASA Flood Risk API Ready!</h2><p>Use /get_data?lat=...&lon=...</p>"

@app.route('/get_data', methods=['GET'])
def get_data():
    lat = request.args.get('lat', type=float)
    lon = request.args.get('lon', type=float)

    url = f"https://power.larc.nasa.gov/api/temporal/daily/point?parameters=PRECTOTCORR,T2M,RH2M,WS2M&community=AG&longitude={lon}&latitude={lat}&start=20250101&end=20250110&format=JSON"
    
    r = requests.get(url)
    data = r.json()

    # 🔹 Extraemos los valores más recientes
    last_date = list(data["properties"]["parameter"]["PRECTOTCORR"].keys())[-1]
    rain = data["properties"]["parameter"]["PRECTOTCORR"][last_date]
    temp = data["properties"]["parameter"]["T2M"][last_date]
    hum = data["properties"]["parameter"]["RH2M"][last_date]

    # 🔹 Evaluamos riesgo simple (ejemplo)
    if rain > 15 and hum > 85:
        risk = "alto"
        rec = "Evitar construcción: probabilidad alta de inundación."
    elif rain > 5:
        risk = "medio"
        rec = "Riesgo moderado: revisar drenaje pluvial."
    else:
        risk = "bajo"
        rec = "Zona segura."

    return jsonify({
        "location": {"lat": lat, "lon": lon},
        "fecha": last_date,
        "precipitacion_mm": rain,
        "temperatura_c": temp,
        "humedad_relativa": hum,
        "nivel_riesgo": risk,
        "recomendacion": rec
    })


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
