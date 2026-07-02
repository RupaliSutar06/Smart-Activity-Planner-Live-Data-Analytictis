from flask import Flask, render_template, jsonify, request
import requests
import csv
import os
from datetime import datetime

app = Flask(__name__)

# =========================
# WEATHER API KEY
# =========================
API_KEY = "55aaa40c20f04a09b5371723261706"

# =========================
# CSV FILE (POWER BI)
# =========================
CSV_FILE = "weather_data.csv"

# =========================
# SAVE DATA FOR POWER BI
# =========================
def save_weather_data(data):

    try:
        file_exists = os.path.isfile(CSV_FILE)

        with open(CSV_FILE, "a", newline="", encoding="utf-8") as file:
            writer = csv.writer(file)

            # HEADER
            if not file_exists:
                writer.writerow([
                    "Date",
                    "City",
                    "Country",
                    "Temperature",
                    "Humidity",
                    "Wind",
                    "Pressure",
                    "Condition",
                    "PM2.5",
                    "PM10",
                    "CO",
                    "O3"
                ])

            # SAFE AQI HANDLING (IMPORTANT FIX)
            air = data.get("current", {}).get("air_quality")

            if not air:
                air = {
                    "pm2_5": 0,
                    "pm10": 0,
                    "co": 0,
                    "o3": 0
                }

            writer.writerow([
                datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                data["location"]["name"],
                data["location"]["country"],
                data["current"]["temp_c"],
                data["current"]["humidity"],
                data["current"]["wind_kph"],
                data["current"]["pressure_mb"],
                data["current"]["condition"]["text"],
                air.get("pm2_5", 0),
                air.get("pm10", 0),
                air.get("co", 0),
                air.get("o3", 0)
            ])

    except Exception as e:
        print("CSV Error:", e)


# =========================
# HOME PAGE
# =========================
@app.route("/")
def home():
    return render_template("index.html")


# =========================
# WEATHER API (7 DAYS + AQI)
# =========================
@app.route("/weather/<path:city>")
def weather(city):

    try:
        url = (
            f"http://api.weatherapi.com/v1/forecast.json"
            f"?key={API_KEY}"
            f"&q={city}"
            f"&days=7"
            f"&aqi=yes"
            f"&alerts=yes"
        )

        response = requests.get(url, timeout=10)
        data = response.json()

        if "error" in data:
            return jsonify({"error": data["error"]["message"]})

        save_weather_data(data)

        return jsonify(data)

    except Exception as e:
        return jsonify({"error": str(e)})


# =========================
# SEARCH AUTOCOMPLETE
# =========================
@app.route("/search")
def search():

    query = request.args.get("q", "")

    if len(query) < 2:
        return jsonify([])

    try:
        url = (
            f"http://api.weatherapi.com/v1/search.json"
            f"?key={API_KEY}"
            f"&q={query}"
        )

        response = requests.get(url, timeout=10)
        data = response.json()

        result = []
        for city in data:
            result.append({
                "name": f"{city['name']}, {city['country']}"
            })

        return jsonify(result)

    except Exception as e:
        return jsonify([])


# =========================
# LOCATION WEATHER
# =========================
@app.route("/location_weather")
def location_weather():

    lat = request.args.get("lat")
    lon = request.args.get("lon")

    try:
        url = (
            f"http://api.weatherapi.com/v1/forecast.json"
            f"?key={API_KEY}"
            f"&q={lat},{lon}"
            f"&days=7"
            f"&aqi=yes"
        )

        response = requests.get(url, timeout=10)
        data = response.json()

        if "error" in data:
            return jsonify({"error": data["error"]["message"]})

        save_weather_data(data)

        return jsonify(data)

    except Exception as e:
        return jsonify({"error": str(e)})


# =========================
# AQI ENDPOINT
# =========================
@app.route("/aqi/<path:city>")
def aqi(city):

    try:
        url = (
            f"http://api.weatherapi.com/v1/current.json"
            f"?key={API_KEY}"
            f"&q={city}&aqi=yes"
        )

        data = requests.get(url).json()

        air = data.get("current", {}).get("air_quality", {})

        return jsonify({
            "pm2_5": air.get("pm2_5", 0),
            "pm10": air.get("pm10", 0),
            "co": air.get("co", 0),
            "o3": air.get("o3", 0)
        })

    except Exception as e:
        return jsonify({"error": str(e)})


# =========================
# AI SUGGESTION
# =========================
@app.route("/ai_suggestion/<path:city>")
def ai_suggestion(city):

    try:
        url = (
            f"http://api.weatherapi.com/v1/current.json"
            f"?key={API_KEY}"
            f"&q={city}"
        )

        data = requests.get(url).json()

        current = data.get("current", {})

        temp = current.get("temp_c", 0)
        humidity = current.get("humidity", 0)
        wind = current.get("wind_kph", 0)
        condition = current.get("condition", {}).get("text", "").lower()

        if "rain" in condition:
            msg = "🌧 Rain → Stay indoor, watch movies or read books"
        elif temp >= 38:
            msg = "🔥 Extreme heat → Avoid outdoor activities"
        elif temp >= 32 and humidity > 70:
            msg = "🥵 Hot & humid → Prefer indoor activities"
        elif wind > 25:
            msg = "🌬 Windy → Avoid outdoor sports"
        elif temp <= 15:
            msg = "❄ Cold → Wear warm clothes"
        else:
            msg = "🌤 Perfect weather → Great for outdoor activities"

        return jsonify({
            "city": city,
            "suggestion": msg
        })

    except Exception as e:
        return jsonify({"error": str(e)})


# =========================
# HEALTH CHECK
# =========================
@app.route("/health")
def health():
    return jsonify({
        "status": "running",
        "project": "Smart AI Weather + Activity Planner"
    })


# =========================
# RUN APP
# =========================
if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)