const axios = require("axios");

/* ===============================
   WEATHER EMOJI ENGINE
=============================== */

function getWeatherEmoji(weather) {
    const map = {
        Thunderstorm: "⛈️",
        Drizzle: "🌦️",
        Rain: "🌧️",
        Snow: "❄️",
        Mist: "🌫️",
        Smoke: "💨",
        Haze: "🌫️",
        Dust: "🌪️",
        Fog: "🌫️",
        Sand: "🏜️",
        Ash: "🌋",
        Squall: "💨",
        Tornado: "🌪️",
        Clear: "☀️",
        Clouds: "☁️"
    };

    return map[weather] || "🌍";
}

/* ===============================
   EXPORT PLUGIN
=============================== */

module.exports = {
    name: "weather",
    alias: ["wthr", "forecast"],
    category: "tools",
     // ⭐ Reaction config
    reactions: {
        start: '⛅',
        success: '✨'
    },
    

    execute: async (sock, m, { args, reply }) => {

        const city = args.join(" ").trim();
        if (!city) return reply("⚉ Please provide a city name.");

        try {

            await sock.sendPresenceUpdate("composing", m.key.remoteJid);

            const API_KEY = "e6926030169752d7e0d85377e489c415";

            const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`;

            const { data } = await axios.get(url);

            const emoji = getWeatherEmoji(data.weather[0].main);

            const weatherText = `
${emoji}

╭─❍ *CRYSNOVA WEATHER*
│ 📍 ${data.name}, ${data.sys.country}
│ ${emoji} ${data.weather[0].description}
│
│ 🌡️ Temp: ${data.main.temp}°C
│ 🤒 Feels: ${data.main.feels_like}°C
│ 💧 Humidity: ${data.main.humidity}%
│ 🌬️ Wind: ${data.wind.speed} m/s
│ 📊 Pressure: ${data.main.pressure} hPa
│
│ 🌐 ${data.coord.lat}, ${data.coord.lon}
╰─𓄄 Powered by Crysnova
            `.trim();

            await sock.sendMessage(
                m.key.remoteJid,
                { text: weatherText },
                { quoted: m }
            );

            await sock.sendPresenceUpdate("paused", m.key.remoteJid);

        } catch (error) {
            console.error("Weather Error:", error.response?.data || error.message);
            await reply("❌ Unable to fetch weather right now. Check city name.");
        }
    }
};
