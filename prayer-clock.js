let prayerTimes = {}; // Filled dynamically

const prayerColors = {
  Fajr: "#00BFFF",
  Dhuhr: "#B8860B",
  Asr: "#FF8C00",
  Maghrib: "#DC143C",
  Isha: "#8A2BE2"
};

const TEST_OFFSET_MINUTES = 195;

function getAccurateTime() {
  return new Date();
}

async function fetchPrayerTimes() {
  try {
    const today = new Date().getDate().toString().padStart(2, '0');

    navigator.geolocation.getCurrentPosition(async (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      const zoneRes = await fetch(`https://api.waktusolat.app/zones/${lat}/${lng}`);
      const zoneData = await zoneRes.json();
      const zone = zoneData.zone;

      const prayerRes = await fetch(`https://api.waktusolat.app/solat/${zone}/${today}`);
      const prayerData = await prayerRes.json();
      const p = prayerData.prayerTime;

      function normalize(t) {
        return t.slice(0, 5);
      }

      prayerTimes = {
        Fajr: normalize(p.fajr),
        Sunrise: normalize(p.syuruk),
        Dhuhr: normalize(p.dhuhr),
        Asr: normalize(p.asr),
        Maghrib: normalize(p.maghrib),
        Isha: normalize(p.isha)
      };

      animate();
    }, (err) => {
      console.error("Location access denied:", err.message);
    });
  } catch (err) {
    console.error("Failed to fetch prayer times:", err);
  }
}

function drawClock() {
  const canvas = document.getElementById("prayerCanvas");
  resizeCanvas(canvas); // 📐 Automatically resize and scale canvas
  const ctx = canvas.getContext("2d");

  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const cx = width / 2;
  const cy = height / 2;
  const minDim = Math.min(width, height);

  const baseRadius = minDim * 0.25;
  const arcRadius = baseRadius + minDim * 0.08;
  const orbitRadius = baseRadius + minDim * 0.04;
  const fontBase = minDim * 0.032;

  ctx.clearRect(0, 0, width, height);

  // Base circle
  ctx.strokeStyle = "#666";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, baseRadius, 0, Math.PI * 2);
  ctx.stroke();

  // Hour numbers
  ctx.font = `${fontBase}px sans-serif`;
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let n = 1; n <= 12; n++) {
    const angle = (n / 12) * 2 * Math.PI - Math.PI / 2;
    const x = cx + Math.cos(angle) * (baseRadius - fontBase);
    const y = cy + Math.sin(angle) * (baseRadius - fontBase);
    ctx.fillText(n.toString(), x, y);
  }

  // Time & prayer logic
  const nowReal = getAccurateTime();
  const nowOffset = new Date(nowReal.getTime() + TEST_OFFSET_MINUTES * 60000);
  const hours = nowOffset.getHours();
  const minutes = nowOffset.getMinutes();
  const seconds = nowOffset.getSeconds();
  const totalMinutes = nowReal.getHours() * 60 + nowReal.getMinutes();

  const prayerTimeList = getPrayerTimeList();
  const currentPrayer = getCurrentPrayer(totalMinutes, prayerTimeList);
  const layeredNames = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
  let layerOffset = 0;

  // Prayer arcs + labels
  for (let name of layeredNames) {
    const start = getPrayerTimeMinutes(name) % 720;
    let end;
    if (name === "Fajr") end = getPrayerTimeMinutes("Sunrise") % 720;
    else if (name === "Dhuhr") end = getPrayerTimeMinutes("Asr") % 720;
    else if (name === "Asr") end = getPrayerTimeMinutes("Maghrib") % 720;
    else if (name === "Maghrib") end = getPrayerTimeMinutes("Isha") % 720;
    else if (name === "Isha") end = (getPrayerTimeMinutes("Fajr") % 720) + 720;

    const startAngle = ((start / 720) * 2 * Math.PI) - Math.PI / 2;
    const endAngle = ((end / 720) * 2 * Math.PI) - Math.PI / 2;

    ctx.beginPath();
    ctx.strokeStyle = prayerColors[name];
    ctx.lineWidth = name === currentPrayer ? minDim * 0.02 : minDim * 0.012;
    ctx.arc(cx, cy, arcRadius + layerOffset, startAngle, endAngle, false);
    ctx.stroke();

    const mid = ((start + (end < start ? end + 720 : end)) / 2) % 720;
    const midAngle = ((mid / 720) * 2 * Math.PI) - Math.PI / 2;
    const lx = cx + Math.cos(midAngle) * (arcRadius + layerOffset + fontBase);
    const ly = cy + Math.sin(midAngle) * (arcRadius + layerOffset + fontBase);
    ctx.font = `${fontBase * 0.75}px sans-serif`;
    ctx.fillStyle = "#fff";
    ctx.fillText(name, lx, ly);

    layerOffset += minDim * 0.025;
  }

  // Time marker ☀️ or 🌙
  const angleNow = ((totalMinutes % 720) / 720) * 2 * Math.PI - Math.PI / 2;
  const iconX = cx + Math.cos(angleNow) * orbitRadius;
  const iconY = cy + Math.sin(angleNow) * orbitRadius;
  const isDay = totalMinutes >= getPrayerTimeMinutes("Sunrise") && totalMinutes < getPrayerTimeMinutes("Maghrib");
  ctx.font = `${fontBase}px sans-serif`;
  ctx.fillText(isDay ? "☀️" : "🌙", iconX, iconY);

  // Clock hands
  const hourDeg = ((hours % 12) + minutes / 60) * 30;
  const minDeg = (minutes + seconds / 60) * 6;
  const secDeg = seconds * 6;

  drawHand(ctx, cx, cy, degToRad(hourDeg), baseRadius * 0.5, minDim * 0.015, "#ffffff");
  drawHand(ctx, cx, cy, degToRad(minDeg), baseRadius * 0.75, minDim * 0.012, "#00ff00");
  drawHand(ctx, cx, cy, degToRad(secDeg), baseRadius * 0.9, minDim * 0.008, "#ff3333");

  // Center dot
  ctx.beginPath();
  ctx.arc(cx, cy, minDim * 0.01, 0, Math.PI * 2);
  ctx.fillStyle = "#fff";
  ctx.fill();
}

function drawHand(ctx, x, y, angle, length, width, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -length);
  ctx.lineWidth = width;
  ctx.strokeStyle = color;
  ctx.stroke();
  ctx.restore();
}

function getPrayerTimeList() {
  return Object.entries(prayerTimes).map(([name, time]) => {
    const [h, m] = time.split(":").map(Number);
    return { name, minutes: h * 60 + m };
  });
}

function getPrayerTimeMinutes(name) {
  const [h, m] = prayerTimes[name].split(":").map(Number);
  return h * 60 + m;
}

function getCurrentPrayer(currentMinutes, timeList) {
  const fajr = getPrayerTimeMinutes("Fajr");
  const sunrise = getPrayerTimeMinutes("Sunrise");
  const isha = getPrayerTimeMinutes("Isha");

  if (currentMinutes >= fajr && currentMinutes < sunrise) return "Fajr";

  for (let i = 0; i < timeList.length; i++) {
    const { name, minutes: start } = timeList[i];
    if (name === "Sunrise" || name === "Fajr" || name === "Isha") continue;

    const next = timeList.find((p, idx) => idx > i && p.name !== "Sunrise");
    const end = next ? next.minutes : 1440;
    if (currentMinutes >= start && currentMinutes < end) return name;
  }

  if (currentMinutes >= isha || currentMinutes < fajr) return "Isha";
  return null;
}

function getNextPrayer(currentMinutes) {
  const times = getPrayerTimeList().filter(p => p.name !== "Sunrise");
  for (const t of times) {
    if (t.minutes > currentMinutes) return t;
  }
  return times[0];
}

function updateClockText() {
  const currentTime = getAccurateTime();
  const hours = currentTime.getHours();
  const minutes = currentTime.getMinutes();
  const totalMinutes = hours * 60 + minutes;

  const timeStr = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  document.getElementById("digitalTime").innerText = `Current Time: ${timeStr}`;

  const next = getNextPrayer(totalMinutes);
  if (next) {
    const diff = next.minutes - totalMinutes + (next.minutes < totalMinutes ? 1440 : 0);
    const hrs = Math.floor(diff / 60);
    const mins = diff % 60;
    document.getElementById("nextPrayer").innerText = `Next: ${next.name} in ${hrs}h ${mins}m`;
  }
}

function animate() {
  drawClock();
  updateClockText();
  requestAnimationFrame(animate);
}

function resizeCanvas(canvas) {
  const scale = window.devicePixelRatio || 1;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  canvas.width = width * scale;
  canvas.height = height * scale;
  canvas.getContext("2d").setTransform(scale, 0, 0, scale, 0, 0);
}

function degToRad(deg) {
  return (deg - 90) * (Math.PI / 180);
}

// Start
fetchPrayerTimes();
