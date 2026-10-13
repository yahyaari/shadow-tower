# Shadow Tower — bu projede çalışırken

Ortada bir büyücü, etrafında alçak bir duvar, her yönden gelen düşmanlar. Üç katman:

- **Hesap.** Koşu bitince kalıcı deneyim kazanılır, ana seviye atlanır, yeni büyüler açılır.
- **Loadout.** Dört slot, ilki **sabit: Magic Bolt**. Diğer üçünü sen seçersin. Ama bu bir
  "başlangıç eli" değil, bir **havuz**: loadout, kartların sana ne önerebileceğini belirler.
- **Koşu.** Açılışta **sadece Magic Bolt ateşler.** Getirdiğin diğer üç büyü, seviye atladıkça
  "YENİ BÜYÜ" kartı olarak çıkar ve ancak alınca ateşlemeye başlar.

Yani her koşu tek büyüyle açılır ve sen onu kurarsın; ne kurabileceğini ise ne getirdiğin
belirler. Kart ekranındaki tipik bir seçim şöyle görünür:

```
NEW POWER        NEW SPELL              MAGIC BOLT
Haste            Lightning              Sharper
+13% cast speed  leaps between them     +18% damage
                 not cast until you      5 more to tier 2
                 take it
```

Motor yok, derleme yok, bağımlılık yok. **Canlı: https://yahyaari.github.io/shadow-tower/**

## Kart sistemi

İki tip kart var:

**Normal yükseltme** — +1 atış, +%18 hasar, -%13 bekleme, daha geniş patlama, delip geçme…
Her büyünün 5 tanesi var, her birinin kendi tavanı (`most`).

**Dönüşüm (tier)** — bir büyüye **beş normal yükseltme** yaptığında bir sonraki kartı dönüşüm
olur: "çarptığı yerde patlar", "yere yangın bırakır", "elektrik fırtınası başlatır". Bir büyü en
fazla **üç** dönüşüm alabilir (yani T4).

## Kombo kuralı — bu oyunun kalbi

41 dönüşümün **24'ü başka bir büyüye kilitli**. "Çarptığı yerde elektrik fırtınası" seçeneği,
**Lightning o koşuda ALINMAMIŞSA asla çıkmaz**. Nadir değil — yok.

Dikkat: loadout'ta olması yetmez, karttan alınmış olması gerekir. `carries()` "kit'te var mı"
diye bakıyor, kit de koşu içinde dolan şey. Bu, loadout havuza dönüşünce kendiliğinden doğru
oldu ve testte ayrı bir kontrol olarak duruyor.

Kod tarafında tek bir yerde: `evolutionsFor()` içindeki `!e.needs || carries(s, e.needs)`.
Testte 400 rastgele seçimde tek bir sızıntı olmadığı doğrulanıyor.

## Dosyalar ve komutlar

| yol | ne yapar |
| --- | --- |
| `src/text.js` | İki dil. Her yazı bir çift: `['Magic Bolt', 'Sihirli Ok']`. `say()` seçer. |
| `src/spells.js` | Büyü kitabı. Saf veri: 10 büyü, 50 yükseltme, 41 dönüşüm, kilit seviyeleri. |
| `src/meta.js` | Hesap: kalıcı deneyim, ana seviye, kilitler, loadout. localStorage. |
| `src/rules.js` | Oyun. DOM yok. `statsOf()` tek hesap yeri, `evoke()` dönüşüm etkileri. |
| `src/draw.js` | Görünen her şey + `cards()`, `tiles()` (fare de onları okuyor). |
| `src/sound.js` | Dosyasız ses. |
| `src/main.js` | İki ekran: loadout ve koşu. |
| `Tools/test.mjs` | 91 kontrol + bot. |
| `Tools/peek.mjs` | Belirli bir ANA atlayıp fotoğraf çeker. Saniyeler. |
| `Tools/look.mjs` | Gerçek zamanlı oynatır. Dakikalar. |

```sh
node Tools/test.mjs
node Tools/serve.mjs . 8050 0.0.0.0
node Tools/peek.mjs http://localhost:8050/ Logs/peek 1280 720
node Tools/peek.mjs http://localhost:8050/ Logs/tel 390 844
```

**Yayınlama:** `master`'a push etmek yeter, GitHub Pages ~1 dakikada yayınlıyor.

## Şu anki denge

```
loadout: bolt, fireball, frost, lightning — saniyede 6 tıklayan oyuncu, 60 koşu:
  dayanma   en kısa 1:55   ortanca 5:36   en uzun 6:59
  bölüm     ortanca 3   en yüksek 5
  seviye    ortanca 34   dönüşüm ortanca 2, en çok 5
  1. bölümü geçen %98   2'yi %52   3'ü %45
  sadece sabit büyüyle (hiç kart alınmadan): ortanca 0:45
  neredeyse hiç tıklamayan (1/sn): ortanca 1:13
```

Dolu loadout, kart almayan bir koşudan **yedi kat** iyi. Bu, loadout'un ve hesap ilerlemesinin
anlamlı olduğunun tek kanıtı ve testte ayrı bir kontrol olarak duruyor.

Ortanca koşu 5:36 — CrazyGames'in 10 dakikalık oturum eşiği için bilerek böyle: iki koşu o eşiği
geçiyor.

## Dil

Her yazı bir çift, **İngilizce önce, Türkçe sonra**, ve çeviri adlandırdığı şeyin yanında duruyor
(`spells.js` içinde büyünün yanında, `text.js` içinde düğmenin yanında) — ayrı bir anahtar
tablosunda değil. Böylece bir metin ile çevirisi birbirinden kopamaz veya sessizce kaybolamaz.
Test 265 yazının hepsinin iki dilde olduğunu ve (Nova/Meteor gibi özel adlar dışında) gerçekten
çevrildiğini kontrol ediyor.

`say()` çift değil de düz bir metin alırsa onu olduğu gibi döndürüyor: yarım çevrilmiş bir şeyin
üstünde koşarsa ekran boş kalmaz, İngilizcesi görünür.

Dil açılış ekranından değiştiriliyor ve kaydediliyor. Varsayılan İngilizce.

## Kartlar her ekranda yan yana

Üçü de her zaman yan yana. Dar ekranda alt alta diziyordum ve bu, üç kartı **tartılacak üç şey**
değil **kaydırılacak bir liste** gibi gösteriyordu — seviye atlamanın tamamı o tartı. Karttaki her
şey (yazı boyu, işaret, noktalar) ekranın değil **kartın kendi genişliğinin** oranı: böylece yarı
genişlikte bir kart hâlâ bir kart oluyor, etikete dönüşmüyor.

## Oyun hızı

Sağ üstte 1x / 1.5x / 2x. **Hızlanmak tek büyük adım değil, çok adım:** 2x iki adım, 1.5x üç
yarım adım. Tek uzun adım mermiyi vuracağı şeyin içinden geçirir, çünkü çarpışma nerede olduğuna
bakılarak kontrol ediliyor, nerede olduğuna değil.

**Bunu tarayıcıda ölçemezsin.** Denedim ve 2x, 1x'ten yavaş çıktı: yazılımsal çizim zaten
darboğaz olduğu için iki kat simülasyon istemek kare hızını yarıya indiriyor ve oyun saati hiç
ilerlememiş gibi görünüyor. Bu yüzden adımlama `advance()` içine taşındı ve tuvalsiz test
ediliyor — 2 saniyelik duvar saatinde 1x→2.0sn, 1.5x→3.0sn, 2x→4.0sn.

## Üç kere ölçüm aletini oyun sandım

Bu bölümü uzun yazıyorum çünkü en pahalı hatalar bunlardı: **sorun oyunda değil, botumdaydı** ve
her seferinde oyunu "düzeltmeye" başlamıştım.

**1. Bot hep ilk kartı alıyordu.** Hiçbir büyü beş yükseltmeye ulaşmıyor, koşu başına sıfır
dönüşüm alınıyordu. Bunu "dönüşümler çalışmıyor" diye okudum. Gerçek oyuncu odaklanır.

**2. Bot "en çok yatırdığım büyüyü büyüt" derken PASİFLERİ HİÇ ALMIYORDU.** Ve bu, şu yanıltıcı
sonucu üretti: **tek büyülü bot 6:16, beş büyülü bot 3:28.** Günlerce "neden derinlik genişliği
yeniyor" diye oyunu değiştirdim — dönüşüm sınırı koydum, tavanları kıstım, bekleme tabanını
yükselttim. Hiçbiri işe yaramadı.

Sebep şuydu: **tek büyülü havuz 5 girişlik** (1 büyü + 4 pasif), yani pasifler oraya
kendiliğinden düşüyor ve maxlanıyordu. **Beş büyülü havuz 9 girişlik** ve botun kuralı pasiflere
hiç puan vermiyordu — 200 saniyede sadece `haste 1` almıştı, öbürü `might 5, mend 5, haste 5`.
Ölçtüğüm şey "bir büyü mü beş büyü mü" değil, "pasifleri alan bot mu almayan bot mu" idi.

Bot kartları puanlamaya başlayınca sonuç **anında tersine döndü**: 0:38 / 2:33.

**3. Hasarı "sahadaki toplam can" ile ölçmek.** Her büyüyü tek tek sınarken bunu yaptım ve sayı
ARTTI, çünkü o sekiz saniyede yeni düşmanlar doğdu. Test "hiçbir büyü hasar vermiyor" dedi.

Bunların ortak dersi: **bir ölçüm beklenmedik bir şey söylediğinde, önce ölçüm aletine bak.**

## Diğer bulgular

- **Kart havuzu büyü başına kurulmalı, yükseltme başına değil.** İlk halinde her mevcut yükseltme
  havuza ayrı bir giriş koyuyordu; beş yükseltmesi olan bir büyü beş bilet, seviye kartı bir bilet
  atıyordu, yani dönüşümler neredeyse hiç çıkmıyordu.
- **Hak edilmiş bir seviye kartı kurayla değil, garantiyle gelir.** "Beş kere seç, seviye atlasın"
  cümlesi bunu söylüyor; kurada çıkarsa verdiği söz bir piyango bileti olur.
- **Koşu başına seçim sayısı, loadout boyutuyla orantılı olmalı.** Beş büyü × beş yükseltme = 25
  seçim; koşu 18 seçim veriyorsa hiçbir büyü dönüşemez. Seviye maliyeti düzleştirildi (~28 seviye).
- **`split` dönüşümü rastgele yöne atıyordu** ve hiçbir şeye isabet etmiyordu — test "bu dönüşüm
  hiçbir şey yapmıyor" dedi. Artık en yakın ikisini avlıyor.
- **Yerdeki ateş dolu disk olarak çizilince su birikintisi gibi okunuyor.** Sadece alev dilleri
  kaldı.
- **`mend` pasifi açıkken duvar düşmüyor**; bitiş ekranını test ederken önce onu kapatmak gerekti.
- **Telefonda kutu yazıları taşar.** `fitWrite()` sığmıyorsa küçültüyor.
- **Denge tarayıcıda ölçülmez.** `Tools/test.mjs` aynı koşuyu milisaniyelerde bitiriyor.
- **Koşu tek büyüyle açılınca erken baskı yeniden ayarlanmalı.** Loadout havuza dönüşünce
  açılış çok zayıfladı ve 1. bölümü geçen oranı %93'ten %55'e düştü; baskı böleni 58'den 72'ye
  çıkarıldı.
- **Fonksiyon bloğunu toptan değiştirirken aradakileri silme.** Kart yerleşimini yeniden yazarken
  `speedBox`, `hitSpeed`, `settings`, `hitSettings` fonksiyonları da gitti — `look.mjs` konsolda
  "does not provide an export named hitSettings" diye yakaladı. Bu hatayı bu projede ikinci kez
  yaptım.

## Yapılmadı

- Müzik yok (ses efektleri var).
- Büyüler birleşip **yeni bir büyü** doğurmuyor; dönüşüm bir etki ödünç alıyor.
- Tek arena, tek patron tipi.
- CrazyGames SDK bağlanmadı, kapak görseli yok.
- Gerçek parmakla oynanmadı.
