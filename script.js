// No API key needed!
const GEO_URL = "https://geocoding-api.open-meteo.com/v1/search";
const WEATHER_URL = "https://api.open-meteo.com/v1/forecast";

// Elements
const cityInput = document.getElementById("cityInput");
const searchBtn = document.getElementById("searchBtn");
const locationBtn = document.getElementById("locationBtn");
const weatherCard = document.getElementById("weatherCard");
const errorMsg = document.getElementById("errorMsg");
const loader = document.getElementById("loader");
const historyBox = document.getElementById("historyBox");
const historyList = document.getElementById("historyList");
const toggleUnit = document.getElementById("toggleUnit");

let currentTempC = null;
let isCelsius = true;
let searchHistory = JSON.parse(localStorage.getItem("weatherHistory")) || [];

// Get coordinates from city name
async function getWeather(city) {
  showLoader(true);
  clearError();
  weatherCard.style.display = "none";
  try {
    // Step 1: Get coordinates from city name
    const geoRes = await fetch(`${GEO_URL}?name=${encodeURIComponent(city)}&count=1&language=en&format=json`);
    const geoData = await geoRes.json();

    if (!geoData.results || geoData.results.length === 0) {
      throw new Error("City not found");
    }

    const { latitude, longitude, name, country } = geoData.results[0];

    // Step 2: Get weather using coordinates
    await fetchWeatherData(latitude, longitude, name, country);
    saveHistory(city);

  } catch (err) {
    showError(err.message === "City not found"
      ? "❌ City not found. Please try again."
      : "⚠️ Something went wrong. Check internet.");
  } finally {
    showLoader(false);
  }
}

// Fetch weather by coordinates
async function getWeatherByCoords(lat, lon) {
  showLoader(true);
  clearError();
  try {
    // Get city name from coordinates
    const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
    const geoData = await geoRes.json();
    const city = geoData.address.city || geoData.address.town || geoData.address.village || "Your Location";
    const country = geoData.address.country_code?.toUpperCase() || "";

    await fetchWeatherData(lat, lon, city, country);
    saveHistory(city);
  } catch (err) {
    showError("⚠️ Could not get location weather.");
  } finally {
    showLoader(false);
  }
}

// Core weather fetch function
async function fetchWeatherData(lat, lon, cityName, country) {
  const weatherRes = await fetch(
    `${WEATHER_URL}?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&wind_speed_unit=ms`
  );
  const weatherData = await weatherRes.json();
  const current = weatherData.current;

  currentTempC = current.temperature_2m;
  isCelsius = true;

  document.getElementById("cityName").textContent = `${cityName}, ${country}`;
  document.getElementById("date").textContent = new Date().toDateString();
  document.getElementById("tempValue").textContent = `${Math.round(currentTempC)}°C`;
  document.getElementById("humidity").textContent = `${current.relative_humidity_2m}%`;
  document.getElementById("windSpeed").textContent = `${current.wind_speed_10m} m/s`;
  document.getElementById("feelsLike").textContent = `${Math.round(current.apparent_temperature)}°C`;

  const { description, icon, bg } = getWeatherInfo(current.weather_code);
  document.getElementById("description").textContent = description;
  document.getElementById("weatherIcon").src = icon;

  weatherCard.style.display = "block";
  setBackground(bg);
}

// Weather code to description + icon + background
function getWeatherInfo(code) {
  if (code === 0) return { description: "Clear Sky", icon: "https://openweathermap.org/img/wn/01d@2x.png", bg: "sunny" };
  if (code <= 3) return { description: "Partly Cloudy", icon: "https://openweathermap.org/img/wn/02d@2x.png", bg: "cloudy" };
  if (code <= 48) return { description: "Foggy", icon: "https://openweathermap.org/img/wn/50d@2x.png", bg: "cloudy" };
  if (code <= 67) return { description: "Rainy", icon: "https://openweathermap.org/img/wn/10d@2x.png", bg: "rainy" };
  if (code <= 77) return { description: "Snowy", icon: "https://openweathermap.org/img/wn/13d@2x.png", bg: "snowy" };
  if (code <= 82) return { description: "Rain Showers", icon: "https://openweathermap.org/img/wn/09d@2x.png", bg: "rainy" };
  if (code <= 99) return { description: "Thunderstorm", icon: "https://openweathermap.org/img/wn/11d@2x.png", bg: "rainy" };
  return { description: "Unknown", icon: "https://openweathermap.org/img/wn/01d@2x.png", bg: "" };
}

// Dynamic background
function setBackground(bg) {
  document.body.className = "";
  if (bg) document.body.classList.add(bg);
}

// Toggle Celsius / Fahrenheit
toggleUnit.addEventListener("click", () => {
  if (currentTempC === null) return;
  if (isCelsius) {
    const f = (currentTempC * 9 / 5) + 32;
    document.getElementById("tempValue").textContent = `${Math.round(f)}°F`;
  } else {
    document.getElementById("tempValue").textContent = `${Math.round(currentTempC)}°C`;
  }
  isCelsius = !isCelsius;
});

// Save to search history
function saveHistory(city) {
  city = city.trim();
  searchHistory = searchHistory.filter(c => c.toLowerCase() !== city.toLowerCase());
  searchHistory.unshift(city);
  if (searchHistory.length > 5) searchHistory.pop();
  localStorage.setItem("weatherHistory", JSON.stringify(searchHistory));
  renderHistory();
}

// Render history list
function renderHistory() {
  if (searchHistory.length === 0) return;
  historyBox.style.display = "block";
  historyList.innerHTML = searchHistory
    .map(city => `<li onclick="getWeather('${city}')">${city}</li>`)
    .join("");
}

// Geolocation button
locationBtn.addEventListener("click", () => {
  if (!navigator.geolocation) return showError("Geolocation not supported.");
  navigator.geolocation.getCurrentPosition(
    pos => getWeatherByCoords(pos.coords.latitude, pos.coords.longitude),
    () => showError("⚠️ Location access denied.")
  );
});

// Search button
searchBtn.addEventListener("click", () => {
  const city = cityInput.value.trim();
  if (city) getWeather(city);
});

// Enter key
cityInput.addEventListener("keypress", e => {
  if (e.key === "Enter") {
    const city = cityInput.value.trim();
    if (city) getWeather(city);
  }
});

// Helpers
function showLoader(show) { loader.style.display = show ? "block" : "none"; }
function showError(msg) { errorMsg.textContent = msg; }
function clearError() { errorMsg.textContent = ""; }

// Load history on startup
renderHistory();