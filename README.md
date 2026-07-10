# Giysem — bugün ne giysem?

Hava durumuna göre kombin önerisi yapan minimal web uygulaması.
Sadece dereceye değil; **hissedilen sıcaklık, rüzgar ve yağış ihtimaline** bakar,
sabah–öğle–akşam farkını hesaba katar ve "yanına ince bir ceket al" gibi
gerçek hayatta işe yarayan öneriler verir.

## Özellikler
- Konum otomatik alınır ("Konumumu kullan") ya da şehir yazılır — dünya geneli çalışır
- Unisex / Kadın / Erkek kombin seçenekleri
- Spesifik parçalar (kesim + kumaş) ve her parçanın hava verisine bağlı gerekçesi
- Günün notu: akşam soğuması, rüzgar sertleşmesi, yağış uyarısı
- Hava verisi: [Open-Meteo](https://open-meteo.com) (ücretsiz, API key gerekmez)

## Çalıştırma
```bash
npm install
npm run dev
```

## Deploy (Vercel)
1. Bu klasörü GitHub'a repo olarak yükle
2. vercel.com → GitHub ile giriş → repoyu seç → Deploy
3. Bitti — ayar gerekmez, Vite otomatik tanınır

## Yol haritası (v2 fikirleri)
- Claude API ile kişiselleştirilmiş öneri metni (küçük bir serverless fonksiyon gerekir)
- Gardırop: kendi kıyafetlerinden kombin
- Yarın için kombin önerisi
