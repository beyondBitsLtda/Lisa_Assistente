// Aba "Notícias & Clima" do Sentinela + assunto do Modo Rádio — previsão via Open-Meteo
// (https://open-meteo.com), API pública gratuita SEM chave/cadastro necessário.

// As cidades vêm de LISA_CIDADES_DO_TEMPO: "Nome:latitude:longitude", separadas por ";".
//   LISA_CIDADES_DO_TEMPO="São Paulo:-23.5505:-46.6333;Campinas:-22.9056:-47.0608"
// O fuso de LISA_FUSO (padrão America/Sao_Paulo). Sem a variável, vale só São Paulo.
const CIDADES_PADRAO = "São Paulo:-23.5505:-46.6333";

/** As cidades da previsão: [{ name, lat, lon }] (no máximo 4; linhas inválidas são ignoradas). */
export function cidadesDoTempo(texto = process.env.LISA_CIDADES_DO_TEMPO) {
  const lista = String(texto || CIDADES_PADRAO)
    .split(";")
    .map((item) => {
      const [name, lat, lon] = item.split(":").map((s) => (s || "").trim());
      return { name, lat: Number(lat), lon: Number(lon) };
    })
    .filter((c) => c.name && Number.isFinite(c.lat) && Number.isFinite(c.lon) && Math.abs(c.lat) <= 90 && Math.abs(c.lon) <= 180)
    .slice(0, 4);
  return lista.length ? lista : cidadesDoTempo(CIDADES_PADRAO);
}

// Tabela padrão de códigos de tempo WMO (usada pelo Open-Meteo) — tradução resumida pro
// português.
const WEATHER_CODE_PT = {
  0: "céu limpo",
  1: "poucas nuvens",
  2: "parcialmente nublado",
  3: "nublado",
  45: "neblina",
  48: "neblina com geada",
  51: "garoa fraca",
  53: "garoa moderada",
  55: "garoa forte",
  56: "garoa congelante fraca",
  57: "garoa congelante forte",
  61: "chuva fraca",
  63: "chuva moderada",
  65: "chuva forte",
  66: "chuva congelante fraca",
  67: "chuva congelante forte",
  71: "neve fraca",
  73: "neve moderada",
  75: "neve forte",
  77: "grãos de neve",
  80: "pancadas de chuva fracas",
  81: "pancadas de chuva moderadas",
  82: "pancadas de chuva fortes",
  85: "pancadas de neve fracas",
  86: "pancadas de neve fortes",
  95: "trovoada",
  96: "trovoada com granizo fraco",
  99: "trovoada com granizo forte",
};

function describeCode(code) {
  return WEATHER_CODE_PT[code] || "condição desconhecida";
}

const CACHE_MS = 30 * 60 * 1000;
let _cache = null; // { at, data }

/** Previsão de 4 dias pras cidades de LISA_CIDADES_DO_TEMPO — usada pela aba do Sentinela e
 * pelo Modo Rádio (categoria "weather"). Busca as cidades em paralelo mas SEM tudo-ou-nada: uma
 * falha pontual (ex.: 503 passageiro do Open-Meteo) numa cidade não deve derrubar a previsão da
 * outra — bug real visto (Promise.all rejeitava tudo por causa de 1 cidade só). */
export async function getWeatherForecast() {
  if (_cache && Date.now() - _cache.at < CACHE_MS) return _cache.data;

  const fuso = encodeURIComponent(process.env.LISA_FUSO || "America/Sao_Paulo");
  const results = await Promise.allSettled(
    cidadesDoTempo().map(async (c) => {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${c.lat}&longitude=${c.lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode&timezone=${fuso}&forecast_days=4`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status} (${c.name})`);
      const json = await res.json();
      const days = json.daily.time.map((date, i) => ({
        date,
        max: json.daily.temperature_2m_max[i],
        min: json.daily.temperature_2m_min[i],
        rainChance: json.daily.precipitation_probability_max[i],
        code: json.daily.weathercode[i],
        description: describeCode(json.daily.weathercode[i]),
      }));
      return { city: c.name, days };
    })
  );

  const data = results.filter((r) => r.status === "fulfilled").map((r) => r.value);
  // só guarda em cache se pelo menos uma cidade veio — uma falha total não deve "grudar" por
  // 30 minutos, deixa tentar de novo na próxima chamada.
  if (data.length) _cache = { at: Date.now(), data };
  return data;
}
