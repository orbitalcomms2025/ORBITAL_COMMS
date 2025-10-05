# registrar_datos.py
import requests
import pandas as pd
import datetime
import os
import time

# --- CONFIGURACIÓN ---
ARCHIVO = "datos_inundacion.csv"
LUGARES = [
    {"name": "Piura", "lat": -5.18, "lon": -80.64}
]
PARAMS = "PRECTOT,T2M,RH2M,WS2M,PS"  # lluvia, temperatura, humedad, viento, presión
COMMUNITY = "AG"
# ----------------------

def obtener_datos_fecha(lat, lon, fecha_str):
    url = "https://power.larc.nasa.gov/api/temporal/daily/point"
    params = {
        "parameters": PARAMS,
        "community": COMMUNITY,
        "longitude": lon,
        "latitude": lat,
        "start": fecha_str,
        "end": fecha_str,
        "format": "JSON"
    }

    try:
        r = requests.get(url, params=params, timeout=20)
        r.raise_for_status()
        data = r.json()
    except Exception as e:
        print("❌ ERROR en request:", e)
        return None

    props = data.get("properties", {}).get("parameter", {})

    def val(key):
        if key in props:
            vlist = list(props[key].values())
            if vlist:
                v = vlist[0]
                if v != -999 and v is not None:
                    return v
        return None

    registro = {
        "fecha": fecha_str,
        "lat": lat,
        "lon": lon,
        "lluvia_mm": val("PRECTOT"),
        "temp_c": val("T2M"),
        "humedad": val("RH2M"),
        "viento_m_s": val("WS2M"),
        "presion_kpa": val("PS")
    }

    # Verificar si hay datos válidos
    if all(v is None for v in registro.values() if v not in [lat, lon, fecha_str]):
        return None

    return registro


def guardar_registro(nuevo):
    if os.path.exists(ARCHIVO):
        df = pd.read_csv(ARCHIVO)
        dup = df[(df["fecha"] == nuevo["fecha"]) & (df["lat"] == nuevo["lat"]) & (df["lon"] == nuevo["lon"])]
        if not dup.empty:
            print("🔁 Ya existe registro para", nuevo["fecha"], "- salto.")
            return
        df = pd.concat([df, pd.DataFrame([nuevo])], ignore_index=True)
    else:
        df = pd.DataFrame([nuevo])
    df.to_csv(ARCHIVO, index=False)
    print("✅ Guardado:", nuevo)


if __name__ == "__main__":
    hoy = datetime.date.today()

    for lugar in LUGARES:
        print(f"\n📡 Consultando datos para {lugar['name']} ({lugar['lat']}, {lugar['lon']})...")
        encontrado = False

        # Intenta desde hoy hacia 5 días atrás
        for dias_retroceso in range(0, 6):
            fecha_consulta = hoy - datetime.timedelta(days=dias_retroceso)
            fecha_str = fecha_consulta.strftime("%Y%m%d")

            print(f"🔍 Intentando con fecha: {fecha_str} ...")
            dato = obtener_datos_fecha(lugar["lat"], lugar["lon"], fecha_str)
            time.sleep(1)  # evitar sobrecargar API

            if dato:
                guardar_registro(dato)
                encontrado = True
                break
            else:
                print(f"⚠️  Sin datos válidos para {fecha_str}")

        if not encontrado:
            print(f"❌ No se encontraron datos disponibles en los últimos 5 días para {lugar['name']}.")
