/* =========================
   GLOBAL VARIABLES
========================= */
let tempChart = null;
let currentCity = "";

/* =========================
   ELEMENTS
========================= */
const cityInput = document.getElementById("cityInput");
const searchBtn = document.getElementById("searchBtn");
const locationBtn = document.getElementById("locationBtn");
const themeToggle = document.getElementById("themeToggle");
const aiBox = document.getElementById("aiText");
const suggestBox = document.getElementById("suggestBox");

/* =========================
   CITY LIST (GLOBAL + INDIA)
========================= */
const cities = [
    "Mumbai","Pune","Nagpur","Nashik","Delhi","Bangalore","Chennai",
    "Kolkata","Hyderabad","Ahmedabad","Jaipur","Lucknow","Bhopal",
    "Indore","London","New York","Paris","Tokyo","Dubai","Singapore","Nashik","Sydney","Toronto","Berlin","Moscow","Rome","Madrid","Seoul",
];

/* =========================
   INIT
========================= */
window.onload = () => {
    loadHistory();
    loadTheme();
};

/* =========================
   SEARCH BUTTON
========================= */
searchBtn.addEventListener("click", () => {
    const city = cityInput.value.trim();
    if (city) getWeather(city);
});

cityInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") searchBtn.click();
});

/* =========================
   SMART AUTO SUGGEST
========================= */
cityInput.addEventListener("input", () => {

    const value = cityInput.value.toLowerCase();
    suggestBox.innerHTML = "";

    if (value.length < 1) return;

    const filtered = cities.filter(c =>
        c.toLowerCase().includes(value)
    );

    filtered.slice(0, 6).forEach(city => {

        const div = document.createElement("div");
        div.className = "suggest-item";
        div.innerText = "🌍 " + city;

        div.onclick = () => {
            cityInput.value = city;
            suggestBox.innerHTML = "";
            getWeather(city);
        };

        suggestBox.appendChild(div);
    });
});

/* =========================
   MAIN WEATHER FUNCTION
========================= */
async function getWeather(city) {

    try {

        currentCity = city;

        const res = await fetch(`/weather/${encodeURIComponent(city)}`);
        const data = await res.json();

        if (data.error) {
            alert("City not found!");
            return;
        }

        updateUI(data);
        saveHistory(city);

        showAI(data);
        loadAQI(city);

    } catch (err) {
        console.log(err);
    }
}

/* =========================
   UPDATE UI
========================= */
function updateUI(data) {

    setText("cityName", `${data.location.name}, ${data.location.country}`);
    setText("localTime", data.location.localtime);

    setText("temperature", data.current.temp_c + "°C");
    setText("condition", data.current.condition.text);

    document.getElementById("weatherIcon").src =
        "https:" + data.current.condition.icon;

    setText("humidity", data.current.humidity + "%");
    setText("wind", data.current.wind_kph + " km/h");
    setText("pressure", data.current.pressure_mb + " mb");
    setText("cloud", data.current.cloud + "%");

    createForecast(data);
    createChart(data);
}

/* =========================
   🤖 AI SMART SUGGESTIONS
========================= */
function showAI(data) {

    const temp = data.current.temp_c;
    const wind = data.current.wind_kph;
    const humidity = data.current.humidity;
    const aqi = data.current.air_quality ? data.current.air_quality.pm2_5 : 0;

    let msg = "🤖 Smart AI Suggestions:<br><br>";

    if (temp > 35) {
        msg += "🔥 Hot → Avoid outdoor activities<br>";
    } else if (temp < 15) {
        msg += "❄ Cold → Wear warm clothes<br>";
    } else {
        msg += "🌤 Pleasant → Good for outdoor activity<br>";
    }

    if (humidity > 80) {
        msg += "💧 High humidity → Uncomfortable weather<br>";
    }

    if (wind > 25) {
        msg += "🌬 Windy → Avoid sports & travel<br>";
    }

    if (aqi > 50) {
        msg += "⚠ Poor AQI → Wear mask outdoors<br>";
    } else {
        msg += "🌿 Good AQI → Safe outdoor air<br>";
    }

    aiBox.innerHTML = msg;
}

/* =========================
   AQI
========================= */
function loadAQI(city) {

    fetch(`/aqi/${encodeURIComponent(city)}`)
        .then(res => res.json())
        .then(data => {

            setText("pm25", (data.pm2_5 || 0).toFixed(1));
            setText("pm10", (data.pm10 || 0).toFixed(1));
            setText("co", (data.co || 0).toFixed(1));
            setText("o3", (data.o3 || 0).toFixed(1));

        })
        .catch(err => console.log(err));
}

/* =========================
   FORECAST
========================= */
function createForecast(data) {

    const container = document.getElementById("forecastContainer");
    container.innerHTML = "";

    data.forecast.forecastday.forEach(day => {

        container.innerHTML += `
        <div class="forecast-card">
            <h4>${day.date}</h4>
            <img src="https:${day.day.condition.icon}">
            <p>${day.day.condition.text}</p>
            <h3>${day.day.avgtemp_c}°C</h3>
        `;
    });
}

/* =========================
   CHART (7 DAYS)
========================= */
function createChart(data) {

    const ctx = document.getElementById("tempChart");

    const labels = data.forecast.forecastday.map(d => d.date);
    const temps = data.forecast.forecastday.map(d => d.day.avgtemp_c);

    if (tempChart) tempChart.destroy();

    tempChart = new Chart(ctx, {
        type: "line",
        data: {
            labels: labels,
            datasets: [{
                label: "Temperature (°C)",
                data: temps,
                borderWidth: 3,
                tension: 0.4,
                fill: true
            }]
        }
    });
}

/* =========================
   📍 LOCATION FIX
========================= */
locationBtn.addEventListener("click", () => {

    navigator.geolocation.getCurrentPosition(async (pos) => {

        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;

        const res = await fetch(`/location_weather?lat=${lat}&lon=${lon}`);
        const data = await res.json();

        currentCity = data.location.name;

        updateUI(data);
        saveHistory(currentCity);
        showAI(data);
        loadAQI(currentCity);

    }, () => {
        alert("Location permission denied");
    });

});

/* =========================
   THEME TOGGLE
========================= */
themeToggle.addEventListener("click", () => {

    document.body.classList.toggle("light");

    localStorage.setItem(
        "theme",
        document.body.classList.contains("light")
    );
});

function loadTheme() {
    if (localStorage.getItem("theme") === "true") {
        document.body.classList.add("light");
    }
}

/* =========================
   HISTORY
========================= */
function saveHistory(city) {

    let history = JSON.parse(localStorage.getItem("history")) || [];

    history = history.filter(c => c !== city);
    history.unshift(city);
    history = history.slice(0, 6);

    localStorage.setItem("history", JSON.stringify(history));

    loadHistory();
}

function loadHistory() {

    const box = document.getElementById("history");
    const history = JSON.parse(localStorage.getItem("history")) || [];

    box.innerHTML = "";

    history.forEach(city => {

        const btn = document.createElement("button");
        btn.innerText = city;

        btn.onclick = () => getWeather(city);

        box.appendChild(btn);
    });
}

/* =========================
   HELPER
========================= */
function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.innerText = value;
}