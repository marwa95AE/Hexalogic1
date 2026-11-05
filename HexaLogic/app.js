const weatherTable = document.querySelector("#weather-table");
const weatherStatus = document.querySelector("#weather-status");

if (weatherTable && weatherStatus) {
  const rows = [...weatherTable.querySelectorAll("tbody tr[data-lat][data-lon]")];
  const setStatus = (message, state) => {
    weatherStatus.textContent = message;
    weatherStatus.className = state;
  };

  const updateWeather = async (row) => {
    const latitude = Number(row.dataset.lat);
    const longitude = Number(row.dataset.lon);
    const name = row.querySelector("td strong")?.textContent.trim() || row.id;

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      throw new Error(`Invalid coordinates for ${name}`);
    }

    const params = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      current: "temperature_2m,relative_humidity_2m,surface_pressure",
      temperature_unit: "celsius",
      timezone: "auto",
    });
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);

    if (!response.ok) {
      throw new Error(`Weather request failed for ${name} (${response.status})`);
    }

    const data = await response.json();
    const current = data.current;

    if (
      !current ||
      !Number.isFinite(current.temperature_2m) ||
      !Number.isFinite(current.relative_humidity_2m) ||
      !Number.isFinite(current.surface_pressure)
    ) {
      throw new Error(`Weather data is incomplete for ${name}`);
    }

    const prefix = row.id.replace(/^weather-/, "");
    document.getElementById(`${prefix}-temp`).textContent =
      `${current.temperature_2m.toFixed(1)} °C`;
    document.getElementById(`${prefix}-humidity`).textContent =
      `${current.relative_humidity_2m}%`;
    document.getElementById(`${prefix}-pressure`).textContent =
      `${current.surface_pressure.toFixed(1)} hPa`;

    return name;
  };

  const loadWeather = async () => {
    weatherTable.setAttribute("aria-busy", "true");
    setStatus("Loading current Earth weather data…", "loading");

    const results = await Promise.allSettled(rows.map(updateWeather));
    const failures = results.filter((result) => result.status === "rejected");
    failures.forEach((result) => console.error(result.reason));

    if (failures.length === 0) {
      setStatus("Weather data updated from Open-Meteo.", "success");
    } else {
      const succeeded = results.length - failures.length;
      const message = succeeded
        ? `Weather loaded for ${succeeded} of ${results.length} locations. Some data is unavailable.`
        : "Weather data is currently unavailable. Please try again later.";
      setStatus(message, "error");
    }

    weatherTable.removeAttribute("aria-busy");
  };

  loadWeather().catch((error) => {
    weatherTable.removeAttribute("aria-busy");
    setStatus("Weather data could not be loaded. Please try again later.", "error");
    console.error("Could not load weather data:", error);
  });
}
