let prayerTimes = {}; // Filled dynamically

const prayerColors = {
  Fajr: "#00BFFF",
  Dhuhr: "#FFD700",
  Asr: "#FF8C00",
  Maghrib: "#DC143C",
  Isha: "#8A2BE2"
};

function getAccurateTime() {
  return new Date();
}

async function fetchPrayerTimes() {
  try {
    const state = "selangor"; // ← Change this if needed
    const zone = "SGR01";     // ← Change this if needed

    const res = await fetch(`https://api.waktusolat.app/v1/prayer/${state}/${zone}`);
    const data = await res.json();

    prayerTimes = {
      Fajr: data.prayerTime.Fajr,
      Sunrise: data.prayerTime.Syuruk,
      Dhuhr: data.prayerTime.Dhuhr,
      Asr: data.prayerTime.Asr,
      Maghrib: data.prayerTime.Maghrib,
      Isha: data.prayerTime.Isha
    };

    animate();
  } catch (err) {
    console.error("Failed to fetch prayer times:", err);
  }
}

function drawClock() {
  const canvas = document.getElementById("prayerCanvas");
  const ctx = canvas.getContext("2d");
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  const baseRadius = 130;
  const arcRadius = baseRadius + 40;
  const orbitRadius = baseRadius + 20;
  const labelRadius = arcRadius + 25;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Clock face
  ctx.strokeStyle = "#666";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, baseRadius, 0, Math.PI * 2);
  ctx.stroke();

  // Clock numbers
  ctx.font = "16px sans-serif";
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let n = 1; n <= 12; n++) {
    const angle = (n / 12) * 2 * Math.PI - Math.PI / 2;
    const x = cx + Math.cos(angle) * (baseRadius - 20);
    const y = cy + Math.sin(angle) * (baseRadius - 20);
    ctx.fillText(n.toString(), x, y);
  }

  // Clock time
  const nowReal = getAccurateTime();
  const nowOffset = new Date(nowReal.getTime());
  nowOffset.setMinutes(nowOffset.getMinutes() + 195); // ⏰ test offset

  const hours = nowOffset.getHours();
  const minutes = nowOffset.getMinutes();
  const seconds = nowOffset.getSeconds();

  const totalMinutes = nowReal.getHours() * 60 + nowReal.getMinutes(); // real for sun/prayers

  const prayerTimeList = getPrayerTimeList();
  const currentPrayer = getCurrentPrayer(totalMinutes, prayerTimeList);

  // Prayer arcs
  for (let i = 0; i < prayerTimeList.length; i++) {
    const { name, minutes: start } = prayerTimeList[i];
    if (name === "Sunrise") continue;

    let end;
    if (name === "Fajr") end = getPrayerTimeMinutes("Sunrise");
    else if (name === "Isha") end = getPrayerTimeMinutes("Fajr") + 1440;
    else {
      const next = prayerTimeList.find((p, idx) => idx > i && p.name !== "Sunrise");
      end = next ? next.minutes : 1440;
    }

    const startAngle = ((start / 1440) * 2 * Math.PI) - Math.PI / 2;
    const endAngle = ((end / 1440) * 2 * Math.PI) - Math.PI / 2;

    ctx.beginPath();
    ctx.strokeStyle = prayerColors[name];
    ctx.lineWidth = name === currentPrayer ? 10 : 6;
    ctx.arc(cx, cy, arcRadius, startAngle, endAngle, false);
    ctx.stroke();

    const midMinutes = (start + end) / 2;
    const midAngle = ((midMinutes / 1440) * 2 * Math.PI) - Math.PI / 2;
    const lx = cx + Math.cos(midAngle) * labelRadius;
    const ly = cy + Math.sin(midAngle) * labelRadius;
    ctx.font = "12px sans-serif";
    ctx.fillStyle = "#fff";
    ctx.fillText(name, lx, ly);
  }

  // Sun or moon icon
  const angleNow = ((totalMinutes / 1440) * 2 * Math.PI) - Math.PI / 2;
  const iconX = cx + Math.cos(angleNow) * orbitRadius;
  const iconY = cy + Math.sin(angleNow) * orbitRadius;
  const isDay = totalMinutes >= getPrayerTimeMinutes("Sunrise") && totalMinutes < getPrayerTimeMinutes("Maghrib");
  ctx.font = "20px sans-serif";
  ctx.fillText(isDay ? "☀️" : "🌙", iconX, iconY);

  // Clock hand angles
  const hourDeg = ((hours % 12) + minutes / 60) * 30;
  const minDeg = (minutes + seconds / 60) * 6;
  const secDeg = seconds * 6;

  const hourAngle = (hourDeg - 90) * (Math.PI / 180);
  const minAngle = (minDeg - 90) * (Math.PI / 180);
  const secAngle = (secDeg - 90) * (Math.PI / 180);

  drawHand(ctx, cx, cy, hourAngle, baseRadius * 0.5, 8, "#ffffff");
  drawHand(ctx, cx, cy, minAngle, baseRadius * 0.75, 6, "#00ff00");
  drawHand(ctx, cx, cy, secAngle, baseRadius * 0.9, 3, "#ff3333");

  // Center circle
  ctx.beginPath();
  ctx.arc(cx, cy, 4, 0, Math.PI * 2);
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
  const currentTime = new Date(new Date().getTime() + 195 * 60000); // apply offset for testing
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

// Start everything
fetchPrayerTimes();
