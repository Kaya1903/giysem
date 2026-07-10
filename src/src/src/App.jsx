import { useState, useEffect, useCallback } from "react";

// ————————————————————————————————
// Giysem — bugün ne giysem?
// Hava verisi: Open-Meteo (ücretsiz, key gerektirmez)
// ————————————————————————————————

const WMO = {
  0: "açık", 1: "az bulutlu", 2: "parçalı bulutlu", 3: "kapalı",
  45: "sisli", 48: "sisli", 51: "çiseliyor", 53: "çiseliyor", 55: "çiseliyor",
  61: "hafif yağmurlu", 63: "yağmurlu", 65: "sağanak", 66: "dondurucu yağmur",
  71: "hafif kar", 73: "karlı", 75: "yoğun kar", 80: "sağanak geçişli",
  81: "sağanak", 82: "şiddetli sağanak", 95: "gök gürültülü", 96: "dolu riski", 99: "dolu riski",
};

async function forecastByCoords(latitude, longitude, cityLabel) {
  const wx = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
      `&current=temperature_2m,apparent_temperature,wind_speed_10m,precipitation_probability,weather_code` +
      `&hourly=apparent_temperature,wind_speed_10m,precipitation_probability&forecast_days=1&timezone=auto`
  ).then((r) => r.json());

  const pick = (h) => {
    const i = wx.hourly.time.findIndex((t) => t.endsWith(`T${h}`));
    return {
      hour: h,
      feels: Math.round(wx.hourly.apparent_temperature[i]),
      wind: Math.round(wx.hourly.wind_speed_10m[i]),
      precipProb: wx.hourly.precipitation_probability[i],
    };
  };

  return {
    city: cityLabel,
    current: {
      temp: Math.round(wx.current.temperature_2m),
      feels: Math.round(wx.current.apparent_temperature),
      wind: Math.round(wx.current.wind_speed_10m),
      precipProb: wx.current.precipitation_probability,
      code: wx.current.weather_code,
    },
    arc: [
      { label: "Sabah", ...pick("08:00") },
      { label: "Öğle", ...pick("13:00") },
      { label: "Akşam", ...pick("19:00") },
    ],
  };
}

async function fetchWeatherByCity(cityQuery) {
  const geo = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityQuery)}&count=1&language=tr`
  ).then((r) => r.json());
  if (!geo.results || !geo.results.length) throw new Error("city-not-found");
  const { latitude, longitude, name } = geo.results[0];
  return forecastByCoords(latitude, longitude, name);
}

// ————————————————————————————————
// Kombin motoru — spesifik parçalar, günlük Türkçe
// ————————————————————————————————

const buildOutfit = (w, gender) => {
  const f = w.current.feels;
  const windy = w.current.wind >= 20;
  const rainy = Math.max(w.current.precipProb, ...w.arc.map((a) => a.precipProb)) >= 50;

  const band =
    f <= 2 ? "freezing" : f <= 9 ? "cold" : f <= 15 ? "cool" : f <= 21 ? "mild" : f <= 27 ? "warm" : "hot";

  const OUTFITS = {
    freezing: {
      unisex: [
        ["Üst", "İçe termal içlik, üstüne kalın boğazlı kazak", "Hissedilen sıfırın altında, ısıyı içeriden tutmak lazım"],
        ["Dış giyim", "Şişme mont ya da kalın yün kaban", "Rüzgarı kesecek tek şey bu"],
        ["Alt", "Kalın kumaş pantolon, altına içlik", "Kot tek başına bu soğukta yetmez"],
        ["Ayak", "Kalın tabanlı bot + yün çorap", "Soğuk yerden gelir"],
        ["Yanına", "Bere, boyunluk ve eldiven", "Isı kaybının çoğu baş ve boyundan olur"],
      ],
    },
    cold: {
      unisex: [
        ["Üst", "Boğazlı kazak ya da kalın sweatshirt", `Hissedilen ${f}°C, tek parça ince kalır`],
        ["Dış giyim", windy ? "Rüzgar geçirmeyen mont" : "Yün ceket ya da bol kesim kaban", windy ? `${w.current.wind} km/s rüzgar var, kumaş kaban rüzgarı içeri alır` : "Öğlen açarsın, akşam kapatırsın"],
        ["Alt", "Kalın kot ya da kumaş pantolon", "İnce kumaş bu havada üşütür"],
        ["Ayak", "Bot ya da kalın tabanlı spor ayakkabı", "İnce taban soğuğu geçirir"],
      ],
      kadın: [
        ["Üst", "İnce uzun kollu body, üstüne bol kesim kazak", "İki ince parça tek kalın kazaktan daha iyi ısıtır"],
        ["Dış giyim", "Dizüstü yün palto ya da peluş ceket", `Hissedilen ${f}°C, uzun boy palto fark yaratır`],
        ["Alt", "Kalın tayt üstüne etek ya da düz kesim kot", "Aynı mantık altta da çalışır: iki ince, bir kalından iyi"],
        ["Ayak", "Deri bot (süet olmasın)", rainy ? "Bugün yağış ihtimali var, süet mahvolur" : "Bilek kapalı olsun"],
      ],
      erkek: [
        ["Üst", "Düz gömlek, üstüne yuvarlak yaka kazak", "İçerisi sıcaksa kazağı çıkarır gömlekle idare edersin"],
        ["Dış giyim", windy ? "İçi astarlı, rüzgar geçirmeyen mont" : "Yün kaban", windy ? "Rüzgar bugün ciddi, kumaş ceket yetmez" : "Klasik ama her yere uyar"],
        ["Alt", "Kalın kumaş pantolon ya da kalın kot", "İnce eşofman bu havaya göre değil"],
        ["Ayak", "Deri bot ya da kalın tabanlı spor ayakkabı", "Taban kalınlığı bugün konfor demek"],
      ],
    },
    cool: {
      unisex: [
        ["Üst", "Tişört, üstüne sweatshirt", `Hissedilen ${f}°C — tek tişört az, mont fazla`],
        ["Üstüne", windy ? "İnce rüzgarlık" : "Kot ceket ya da kalın gömlek (ceket gibi açık giyilir)", windy ? `${w.current.wind} km/s rüzgar hissedileni düşürüyor` : "Çıkarınca bele bağlanır, pratik"],
        ["Alt", "Düz kesim kot ya da kargo pantolon", "Şort için erken"],
        ["Ayak", "Spor ayakkabı, kalın çorapla", "Bu havada ayak rahat"],
      ],
      kadın: [
        ["Üst", "İnce triko ya da uzun kollu üst", "Tek başına da giyilir, ceket altına da"],
        ["Üstüne", "Trençkot ya da bol kesim blazer ceket", rainy ? "Trençkot bugün hem şık hem işlevsel — yağmur ihtimali var" : "Bu sıcaklığın tam ceketi"],
        ["Alt", "Yüksek bel düz kot ya da kumaş pantolon", "Bilek açıkta kalmasın, hissedilen düşük"],
        ["Ayak", "Makosen + çorap ya da spor ayakkabı", "Bot ağır kalır bugün"],
      ],
      erkek: [
        ["Üst", "Tişört, üstüne önü açık kalın gömlek", "Kalın gömlek bu havanın en işlevsel parçası: ceket gibi durur, ceket kadar terletmez"],
        ["Üstüne", windy ? "İnce rüzgarlık" : "Gerekirse ince mont — ama kalın gömlek yetebilir", "Öğlen sıcağında elde taşınabilir olsun"],
        ["Alt", "Kumaş pantolon ya da düz kesim kot", "Eşofmandan bir tık daha derli toplu"],
        ["Ayak", "Beyaz spor ayakkabı ya da süet bot", "İkisi de bu havayla uyumlu"],
      ],
    },
    mild: {
      unisex: [
        ["Üst", "Kalın kumaşlı düz tişört ya da ince uzun kollu", `Hissedilen ${f}°C — sweatshirt öğlen terletir`],
        ["Yanına", "İnce gömlek ya da fermuarlı sweatshirt al (giymesen de)", "Akşam serinliği bu havanın klasik tuzağı"],
        ["Alt", "Hafif kumaş pantolon ya da kot", "Şort sınırındasın ama akşamı düşün"],
        ["Ayak", "Spor ayakkabı ya da hafif bir ayakkabı", "Kalın taban gerekmiyor"],
      ],
      kadın: [
        ["Üst", "İnce örme üst ya da gömlek (kolları katlanır)", "Kol katlamak gün içi sıcaklık ayarıdır"],
        ["Yanına", "Omza ince hırka ya da kot ceket", "Akşam 4-5 derece düşecek, üşüyen hep pişman olur"],
        ["Alt", "Uzun etek + spor ayakkabı ya da bol paça kumaş pantolon", "İkisi de bu sıcaklıkta ter yapmaz"],
        ["Ayak", "Spor ayakkabı ya da babet", "Sandalet için akşam serin"],
      ],
      erkek: [
        ["Üst", "Kalın kumaşlı düz tişört (beyaz ya da gri)", "İyi bir düz tişört, uğraşılmamış gibi duran kombinin sırrı"],
        ["Yanına", "İnce keten gömlek, önü açık", "Ceket gibi durur, terletmez, akşam işe yarar"],
        ["Alt", "Hafif kumaş pantolon ya da kot", "Şort istersen olur ama akşam planın varsa pantolon"],
        ["Ayak", "Beyaz spor ayakkabı", "Bu havanın klasiği"],
      ],
    },
    warm: {
      unisex: [
        ["Üst", "Keten ya da ince pamuk tişört/gömlek", `Hissedilen ${f}°C — kumaş seçimi dereceden önemli`],
        ["Alt", "Şort ya da bol kesim hafif pantolon", "Dar kesim bu sıcakta yapışır"],
        ["Ayak", "Sandalet ya da fileli spor ayakkabı", "Ayağın nefes alsın"],
        ["Yanına", rainy ? "Çantaya küçük şemsiye" : "Şapka ve güneş gözlüğü", rainy ? "Yağış ihtimali var, sağanak sürprizi olmasın" : "Güneş bugün ciddi"],
      ],
    },
    hot: {
      unisex: [
        ["Üst", "Bol kesim keten gömlek ya da açık renk tişört", "Koyu renk güneşi çeker, bugün açık renk günü"],
        ["Alt", "Keten şort ya da çok hafif pantolon", "Kot bugün cezadır"],
        ["Ayak", "Sandalet", "Kapalı ayakkabı istemezsin"],
        ["Yanına", "Şapka, gözlük, yanında su", "Hissedilen 27°C üstü — gölge ve su plana dahil olsun"],
      ],
    },
  };

  const set = OUTFITS[band];
  const items = (set[gender] || set.unisex).map(([slot, piece, why]) => ({ slot, piece, why }));

  const eve = w.arc[2], noon = w.arc[1];
  let tip = null;
  if (noon.feels - eve.feels >= 4) tip = `Akşam hissedilen ${eve.feels}°C'ye düşüyor — yanına ince bir ceket ya da hırka almadan çıkma.`;
  else if (eve.precipProb >= 50) tip = `Akşam yağış ihtimali %${eve.precipProb} — şemsiyeyi çantaya at.`;
  else if (eve.wind >= 25) tip = `Akşam rüzgar ${eve.wind} km/s'e çıkıyor — montun rüzgar geçirmemesi bugün önemli.`;

  return {
    headline:
      band === "mild" || band === "warm"
        ? "Rahat bir gün, ama akşamı hesaba kat"
        : windy
        ? "Termometreye değil rüzgara giyin"
        : "Üst üste ince giyin, gün içinde ayarlarsın",
    items,
    tip,
  };
};

// ————————————————————————————————
// Vektörel kıyafet ikonları (slot'a göre)
// ————————————————————————————————

const Icon = ({ slot, color }) => {
  const s = { width: 34, height: 34, stroke: color, strokeWidth: 1.6, fill: "none", strokeLinecap: "round", strokeLinejoin: "round" };
  const key = slot.toLowerCase();

  if (key.includes("dış") || key.includes("üstüne")) return (
    <svg viewBox="0 0 24 24" style={s}>
      <path d="M9 3L4.5 5.5 3 11l3-.6V21h5V6M15 3l4.5 2.5L21 11l-3-.6V21h-5V6" />
      <path d="M9 3c.6 1.5 1.6 2.2 3 2.2S14.4 4.5 15 3" />
    </svg>
  );
  if (key.includes("üst")) return (
    <svg viewBox="0 0 24 24" style={s}>
      <path d="M8 4l-4.5 3 1.8 3.4L7 9.6V20h10V9.6l1.7.8L20.5 7 16 4c0 1.6-1.7 2.6-4 2.6S8 5.6 8 4z" />
    </svg>
  );
  if (key.includes("alt")) return (
    <svg viewBox="0 0 24 24" style={s}>
      <path d="M7 3h10l1.5 18h-5L12 10l-1.5 11h-5L7 3z" />
      <path d="M7 6.5h10" />
    </svg>
  );
  if (key.includes("ayak")) return (
    <svg viewBox="0 0 24 24" style={s}>
      <path d="M3 16c0-1 .5-2 2-2h3l3.5-4c.8 1.5 2.5 2.5 4.5 2.7 2.8.2 5 1.6 5 3.8V18H3v-2z" />
      <path d="M3 18h18" />
    </svg>
  );
  return (
    <svg viewBox="0 0 24 24" style={s}>
      <path d="M6 12a6 6 0 0 1 12 0" />
      <path d="M5 12h14v2.5a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V12z" />
      <path d="M12 6V4.5" />
    </svg>
  );
};

// ————————————————————————————————
// UI
// ————————————————————————————————

const accentFor = (feels) =>
  feels <= 5 ? "#4E7CA8" : feels <= 15 ? "#3F8578" : feels <= 24 ? "#5B63C7" : "#C25B54";

export default function App() {
  const [query, setQuery] = useState("");
  const [gender, setGender] = useState("unisex");
  const [weather, setWeather] = useState(null);
  const [outfit, setOutfit] = useState(null);
  const [phase, setPhase] = useState("loading"); // loading | ready | error
  const [errorMsg, setErrorMsg] = useState(null);

  const applyWeather = useCallback((w, g) => {
    setWeather(w);
    setOutfit(buildOutfit(w, g));
    setPhase("ready");
  }, []);

  const loadCity = useCallback(async (cityName, g) => {
    setPhase("loading");
    setErrorMsg(null);
    try {
      const w = await fetchWeatherByCity(cityName);
      applyWeather(w, g);
    } catch {
      setErrorMsg(`"${cityName}" bulunamadı. Şehir adını kontrol edip tekrar dene.`);
      setPhase(weather ? "ready" : "error");
    }
  }, [applyWeather, weather]);

  const loadMyLocation = useCallback((g) => {
    if (!navigator.geolocation) return loadCity("Warszawa", g);
    setPhase("loading");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const w = await forecastByCoords(pos.coords.latitude, pos.coords.longitude, "Konumun");
          applyWeather(w, g);
        } catch {
          loadCity("Warszawa", g);
        }
      },
      () => loadCity("Warszawa", g),
      { timeout: 6000 }
    );
  }, [applyWeather, loadCity]);

  useEffect(() => {
    loadMyLocation(gender);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const changeGender = (g) => {
    setGender(g);
    if (weather) setOutfit(buildOutfit(weather, g));
  };

  const submitCity = () => {
    if (!query.trim()) return;
    loadCity(query.trim(), gender);
    setQuery("");
  };

  const accent = weather ? accentFor(weather.current.feels) : "#3F8578";
  const today = new Date().toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div style={{ minHeight: "100vh", background: "#F6F7F8", color: "#17181A", fontFamily: "'Inter Tight', -apple-system, 'Helvetica Neue', sans-serif" }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; }
        button { font-family: inherit; cursor: pointer; }
        input { font-family: inherit; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
        .fade { animation: fadeUp .4s ease both; }
        @media (prefers-reduced-motion: reduce) { .fade { animation: none; } }
      `}</style>

      <div style={{ maxWidth: 420, margin: "0 auto", padding: "28px 22px 48px" }}>

        {/* Üst bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
          <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.01em" }}>Giysem</span>
          <span style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", color: "#90959B", fontWeight: 500 }}>{today}</span>
        </div>

        {/* Şehir */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitCity()}
            placeholder={weather ? weather.city : "Şehir"}
            style={{
              flex: 1, border: "none", borderBottom: "1px solid #DFE2E6", background: "transparent",
              padding: "6px 0", fontSize: 20, fontWeight: 600, outline: "none", color: "#17181A",
            }}
          />
          <button onClick={submitCity} aria-label="Şehri değiştir"
            style={{ border: "1px solid #DFE2E6", background: "white", borderRadius: 99, padding: "6px 14px", fontSize: 13, fontWeight: 500 }}>
            Değiştir
          </button>
        </div>
        <button onClick={() => loadMyLocation(gender)}
          style={{ border: "none", background: "transparent", color: accent, fontSize: 13, fontWeight: 500, padding: 0, marginBottom: 22 }}>
          Konumumu kullan
        </button>

        {errorMsg && (
          <p style={{ fontSize: 13.5, color: "#C25B54", marginBottom: 14 }}>{errorMsg}</p>
        )}

        {phase === "loading" && <p style={{ color: "#90959B", fontSize: 15 }}>Hava verisi alınıyor…</p>}
        {phase === "error" && !errorMsg && (
          <p style={{ color: "#90959B", fontSize: 15 }}>Hava verisi alınamadı. İnternet bağlantını kontrol edip bir şehir yaz.</p>
        )}

        {weather && phase === "ready" && (
          <div className="fade">
            {/* Hero: hissedilen */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
                <span style={{ fontSize: 76, lineHeight: 1, fontWeight: 700, letterSpacing: "-0.03em", color: accent }}>
                  {weather.current.feels}°
                </span>
                <div style={{ fontSize: 13.5, color: "#90959B", lineHeight: 1.5 }}>
                  hissedilen<br />
                  termometre {weather.current.temp}°
                </div>
              </div>
              <p style={{ fontSize: 14.5, color: "#5A5F66", marginTop: 10 }}>
                {WMO[weather.current.code] ? WMO[weather.current.code][0].toUpperCase() + WMO[weather.current.code].slice(1) : ""}
                {" · "}rüzgar {weather.current.wind} km/s · yağış %{weather.current.precipProb}
              </p>
            </div>

            {/* Gün seyri */}
            <div style={{ display: "flex", background: "white", border: "1px solid #E7EAED", borderRadius: 14, margin: "20px 0 24px" }}>
              {weather.arc.map((a, i) => (
                <div key={a.label} style={{ flex: 1, padding: "12px 0", textAlign: "center", borderLeft: i > 0 ? "1px solid #E7EAED" : "none" }}>
                  <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "#90959B", marginBottom: 4, fontWeight: 500 }}>{a.label}</div>
                  <div style={{ fontSize: 17, fontWeight: 600 }}>{a.feels}°</div>
                  <div style={{ fontSize: 11, color: "#A6ABB1", marginTop: 2 }}>{a.wind} km/s · %{a.precipProb}</div>
                </div>
              ))}
            </div>

            {/* Cinsiyet */}
            <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
              {[["unisex", "Unisex"], ["kadın", "Kadın"], ["erkek", "Erkek"]].map(([val, label]) => (
                <button key={val} onClick={() => changeGender(val)}
                  style={{
                    flex: 1, padding: "9px 0", borderRadius: 10, fontSize: 14, fontWeight: 500,
                    border: gender === val ? `1px solid ${accent}` : "1px solid #DFE2E6",
                    background: gender === val ? accent : "white",
                    color: gender === val ? "white" : "#5A5F66",
                    transition: "all .15s ease",
                  }}>
                  {label}
                </button>
              ))}
            </div>

            {/* Kombin */}
            {outfit && (
              <div className="fade">
                <h2 style={{ fontSize: 21, fontWeight: 700, letterSpacing: "-0.01em", lineHeight: 1.3, marginBottom: 16 }}>
                  {outfit.headline}
                </h2>

                <div style={{ background: "white", border: "1px solid #E7EAED", borderRadius: 14, padding: "4px 16px" }}>
                  {outfit.items.map((it, i) => (
                    <div key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start", padding: "14px 0", borderBottom: i < outfit.items.length - 1 ? "1px solid #EEF0F2" : "none" }}>
                      <div style={{ flexShrink: 0, paddingTop: 2 }}>
                        <Icon slot={it.slot} color={accent} />
                      </div>
                      <div>
                        <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "#A6ABB1", fontWeight: 500, marginBottom: 2 }}>{it.slot}</div>
                        <div style={{ fontSize: 15.5, fontWeight: 600, lineHeight: 1.4 }}>{it.piece}</div>
                        <div style={{ fontSize: 13.5, color: "#7A7F86", marginTop: 3, lineHeight: 1.45 }}>{it.why}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {outfit.tip && (
                  <div style={{ marginTop: 14, padding: "14px 16px", background: accent + "10", border: `1px solid ${accent}30`, borderRadius: 14, fontSize: 14, lineHeight: 1.5, color: "#3A3F45" }}>
                    <span style={{ color: accent, fontWeight: 600 }}>Günün notu · </span>{outfit.tip}
                  </div>
                )}

                <p style={{ marginTop: 24, fontSize: 11.5, color: "#B4B9BF", textAlign: "center" }}>
                  Veriler Open-Meteo'dan, öneriler hissedilen sıcaklık + rüzgar + yağışa göre
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
