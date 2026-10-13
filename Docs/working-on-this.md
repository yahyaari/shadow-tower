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

Kartların hepsi bir büyüye aittir. **Küresel pasif yok** — tek istisna Onarım.

**Normal yükseltme** — "Magic Bolt: +%40 hasar", "Nova: +%13 hasar". Oran her büyüde farklı ve
bu bilerek: aynı kalabalığa karşı on saniyede Nova 589, Magic Bolt 56 hasar veriyor, yani sabit
bir "+%18" birine on kat fazla kazandırırdı. **En çok iş yapan en az kazanır.**

| büyü | sahada ölçülen çıktı | hasar kartı | bekleme kartı |
|---|---|---|---|
| Nova | 589 | +%13 | -%8 |
| Meteor | 389 | +%14 | -%10 |
| Fireball | 205 | +%19 | -%13 |
| Frost Orb | 140 | +%24 | -%15 |
| Lightning | 139 | +%24 | -%15 |
| Shards | 109 | +%29 | -%18 |
| Wisp | 104 | +%29 | -%18 |
| Orbit | 103 | +%29 | -%18 |
| Beam | 89 | +%32 | -%20 |
| Magic Bolt | 56 | +%40 | -%25 |

Kart yazısı **sayıdan üretiliyor** (`+${pct(n)}% damage`), yani bir kart veremeyeceği bir rakamı
vaat edemez. Test de bunu kontrol ediyor.

**Dönüşüm (tier)** — bir büyüye beş yükseltme yaptığında bir sonraki kartı dönüşüm olur. En fazla
üç dönüşüm (T4).

**Onarım** — tek pasif. Diğerleri "daha hızlı öldür" diyor, bu "daha uzun dayan" diyor; koşunun
ikisine de ihtiyacı var. Ve **duvar hasar almadan sunulmuyor**: dolu bir duvarı onarmayı teklif
eden kart boşa giden karttır.

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
  dayanma   en kısa 1:46   ortanca 4:13   en uzun 6:39
  bölüm     ortanca 3   en yüksek 4
  seviye    ortanca 30   dönüşüm ortanca 3, en çok 5
  1. bölümü geçen %85   2'yi %50   3'ü %27
  sadece sabit büyüyle: ortanca 3:10
  neredeyse hiç tıklamayan (1/sn): ortanca 1:41
```

Ortanca koşu 4:13 — iki koşu CrazyGames'in 10 dakikalık oturum eşiğini geçiyor.

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

## Derinlik mi genişlik mi — en uzun savaş

Bu oyunda en çok uğraştığım şey: **tek bir büyüye yatırım yapmak, dört büyü taşımaktan iyi
olmamalı**, yoksa loadout'un hiçbir anlamı kalmaz. Üç ayrı turda üç ayrı sebeple ters döndü.

**1. Pasifler yüzünden (ölçüm aleti hatası).** Botum pasifleri hiç almıyordu. Tek büyülü havuz
beş girişlikti, pasifler oraya kendiliğinden düşüp maxlanıyordu; dört büyülü havuzda ise hiç
seçilmiyordu. Ölçtüğüm şey "bir büyü mü dört büyü mü" değil, "pasifleri alan bot mu almayan bot
mu" idi. Bot kartları puanlamaya başlayınca sonuç anında tersine döndü.

**2. Çarpım yüzünden.** Hasar, mermi sayısı ve atış hızı birbirini çarpıyor. Tek büyüye on iki
seçim koymak on iki kat değil, **otuz kat** demek. Ölçtüm: 90. saniyede tek büyülü bot **1872
dps**, dört büyülü bot **168 dps** — on bir kat. Çözüm küçük yüzde değil **kısa merdiven**: bir
büyü altı-yedi seçimde yükseltmelerini tüketiyor, gerisi başka yere gitmek zorunda.

**3. Bekleme süresi yüzünden.** Yine de 3.2 kat fark kaldı. Sebep: bir büyü hem mermi sayısını
dörde katlayıp hem beklemesini yarıya indirebiliyordu — saniyede 18 mermi. **Mutlak bir taban**
kondu: hiçbir büyü saniyede üçten fazla ateşleyemez, kendisine ne kadar yatırılırsa yatırılsın.

Şu an dolu loadout tek büyüden iyi ve testte ayrı bir kontrol olarak duruyor. Fark hâlâ mütevazı
(4:13 vs 3:10) — gerçek oyunda loadout zaten hep dört, ama bu kontrol kanarya olarak kalsın.

## Üç kere ölçüm aletini oyun sandım

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
- **Oyundan çıkarılan bir anahtar kayıtlı durumda kalabilir.** Might/Haste/Reach kaldırılınca
  `peek.mjs` hâlâ onları kuruyordu ve panel `Passives[key].name` okurken bütün kareyi düşürdü.
  Artık kitabın tanımadığı anahtarlar atlanıyor.
- **Olmayan bir yükseltmeyi test kurulumunda verme.** Dönüşüm boyutunu bolt üzerinde ölçmeye
  çalıştım ama bolt'un ALAN KARTI YOK; `statsOf` onu sessizce atlıyor ve sayı hiç değişmiyordu.
  Ölçtüğüm şey oyun değil kendi kurulumumun hatasıydı — bu projede üçüncü kez.
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
