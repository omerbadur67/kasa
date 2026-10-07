// Bu dosya, telefonunuzdaki uygulamanın istediği fiyatları arka planda
// GoldAPI.io'dan çekip TL/gram olarak geri döndüren küçük bir sunucudur.
// API anahtarı burada YAZILI DEĞİL — Vercel'de "Environment Variable" olarak
// GOLDAPI_KEY adıyla eklenecek (aşağıdaki kurulum adımlarında anlatılıyor).

const GRAM_PER_OUNCE = 31.1035;

async function fetchMetal(symbol, key) {
  const res = await fetch(`https://www.goldapi.io/api/${symbol}/TRY`, {
    headers: { "x-access-token": key, "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`${symbol} alınamadı`);
  const data = await res.json();
  // GoldAPI bazı metaller için gram fiyatını doğrudan verir (price_gram_24k),
  // vermezse ons fiyatından (price) grama çeviriyoruz.
  if (data.price_gram_24k) return data.price_gram_24k;
  if (data.price) return data.price / GRAM_PER_OUNCE;
  throw new Error(`${symbol} fiyatı okunamadı`);
}

export default async function handler(req, res) {
  const key = process.env.GOLDAPI_KEY;
  if (!key) {
    res.status(500).json({ error: "GOLDAPI_KEY tanımlı değil" });
    return;
  }
  try {
    const [gold, silver, platinum] = await Promise.all([
      fetchMetal("XAU", key),
      fetchMetal("XAG", key),
      fetchMetal("XPT", key),
    ]);
    // GoldAPI ücretsiz planı zaten veriyi 30 dakikada bir güncelliyor ve
    // günlük istek kotası sınırlı. Bu önbellek süresi, farklı ziyaretlerin
    // gereksiz yere GoldAPI'ye tekrar tekrar istek atmasını önler.
    res.setHeader("Cache-Control", "s-maxage=1500, stale-while-revalidate=300");
    res.status(200).json({ gold, silver, platinum });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
