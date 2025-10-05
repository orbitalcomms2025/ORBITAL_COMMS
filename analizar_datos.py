# analizar_datos.py
from flask import Flask, jsonify, request
import pandas as pd
import os

app = Flask(__name__)
ARCHIVO = "datos_inundacion.csv"

def calcular_riesgo(temp, humedad, lluvia):
    """
    Determina un nivel de riesgo simple con base en condiciones climáticas.
    Puedes ajustar los umbrales según tus necesidades o datos locales.
    """
    if lluvia is None:
        lluvia = 0
    if humedad is None:
        humedad = 50
    if temp is None:
        temp = 25

    # Regla de decisión básica
    if lluvia > 20 or humedad > 85:
        return "alto", "Evitar construcción o tránsito: riesgo alto de inundación."
    elif 5 < lluvia <= 20 or 70 < humedad <= 85:
        return "medio", "Riesgo moderado: evaluar drenaje y evitar zonas bajas."
    else:
        return "bajo", "Zona segura para construcción o tránsito."

@app.route('/')
def index():
    return "<h2>🌍 API de Análisis de Riesgo Climático está activa</h2><p>Usa /riesgo?lat=-5.18&lon=-80.64</p>"

@app.route('/riesgo', methods=['GET'])
def riesgo():
    lat = request.args.get('lat', type=float)
    lon = request.args.get('lon', type=float)

    if not os.path.exists(ARCHIVO):
        return jsonify({"error": "No se encuentra el archivo de datos"}), 404

    df = pd.read_csv(ARCHIVO)
    df_filtrado = df[(df["lat"] == lat) & (df["lon"] == lon)]

    if df_filtrado.empty:
        return jsonify({"error": "No hay datos para esta ubicación"}), 404

    # Último registro disponible
    fila = df_filtrado.iloc[-1]

    nivel, recomendacion = calcular_riesgo(
        fila.get("temp_c"),
        fila.get("humedad"),
        fila.get("lluvia_mm")
    )

    resultado = {
        "fecha": fila.get("fecha"),
        "location": {"lat": lat, "lon": lon},
        "temperatura_c": round(fila.get("temp_c", 0), 2),
        "humedad_relativa": round(fila.get("humedad", 0), 2),
        "precipitacion_mm": fila.get("lluvia_mm"),
        "nivel_riesgo": nivel,
        "recomendacion": recomendacion
    }

    return jsonify(resultado)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)
