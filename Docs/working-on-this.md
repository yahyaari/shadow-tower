# Shadow Tower — bu projede çalışırken

Ortada bir büyücü, etrafında alçak bir duvar, her yönden gelen düşmanlar. Üç katman:

- **Hesap.** Bölüm bitince kalıcı deneyim kazanılır, ana seviye atlanır, yeni büyüler açılır.
- **Loadout.** Dört slot, ilki **sabit: Magic Bolt**. Diğer üçünü sen seçersin. Bu bir "başlangıç
  eli" değil bir **havuz**: ne getirdiğin, kartların sana ne önerebileceğini belirler.
- **Bölüm.** Ana menüden seçilir (`◀ BÖLÜM 3 ▶`). Açılışta **sadece Magic Bolt ateşler**;
  getirdiğin diğer üçü "YENİ BÜYÜ" kartı olarak çıkar ve ancak alınca ateşler. Bölüm, patronu
  indirince biter ve **ayakta kalan duvara göre yıldız** verir.

Motor yok, derleme yok, bağımlılık yok. **Canlı: https://yahyaari.github.io/shadow-tower/**

## Menü — beş sekme

Alt barda beş yuva: **Ödüller · Kahraman · Harita · Büyüler · Külliyat**. Seçili olan büyüyüp
yukarı çıkıyor ve dolu siyah bir daireye oturuyor, yani hangisinde olduğun okumadan anlaşılıyor.

| sekme | durum |
| --- | --- |
| Harita | **çalışıyor** — bölüm seçimi, bölüm resmi, yıldızlar, düşman listesi, OYNA |
| Büyüler | **çalışıyor** — loadout seçimi. Büyü geliştirme buraya gelecek. |
| Ödüller | iskelet — şans çarkı, sandık, reklam izleyip ödül |
| Kahraman | iskelet — tek sıra beceri ağacı, yıldızlarla alınır |
| Külliyat | iskelet — düşman ve büyü ansiklopedisi |

Üç sekme bilerek iskelet: önce menünün şekli üstünde anlaşılacak, içleri sekme sekme konuşulacak.

**Bölüm resmi çizilerek üretiliyor**, yüklenmiyor. Aynı iki mürekkep, bölüm numarasından
tohumlanmış — kırkıncı bölümün de kendi ufku var ve her açılışta aynı. `stages.js` içinde altı
isim var (`Uğursuz Orman`, `Küllü Ova`, `Kırık Yol`…), sonrası numaralanarak dönüyor.

**Bölümde hangi düşmanların olduğu elle yazılmıyor**, dalganın kullandığı kuraldan okunuyor
(`kindsOn`). Elle tutulan bir liste, ikisinden biri değişince ilk anda yanlışa düşer.

## Bölümler ve yıldızlar

Bir koşu = bir bölüm. Dalgalar, sonra patron, sonra bitiş ekranı. Ortanca bölüm **1:45** sürüyor.

| ayakta kalan duvar | yıldız |
|---|---|
| %100 | ★★★ |
| %95+ | ★★☆ |
| %60+ | ★☆☆ |
| altı | bitirdin ama yıldız yok |

Yıldızlar her bölüm için **en iyisi** saklanıyor: kötü giden bir tekrar kazanılmışı geri almıyor,
yoksa kimse tekrar denemezdi. Bir bölümü bitirmek sonrakini açıyor.

Zorluk bölüm numarasıyla **çarpılıyor** (`StageStep = 0.2`), zamanla toplanmıyor. Çünkü her bölüm
sıfırdan oynanıyor: 5. bölüm, beş dakikalık bir dalgayla tek büyüyle karşılaşmamalı.

## Kart sistemi

**Kartta sadece büyünün adı ve vereceği güç yazar.** Eskiden yükseltmenin kendi uydurma adı
("Quicker"), kaçıncısı olduğu ve bir sonraki kademeye kaç kaldığı da yazıyordu — iki saniyede
okunan bir kartın üstünde üç ayrı defter kaydı. Kart bir seçimdir, ilerleme raporu değil.

Tek istisna: bir dönüşüm başka bir büyüden ödünç alıyorsa "**Ateş Topu sayesinde**" yazıyor. O
defter kaydı değil — kombinasyonların var olduğunu oyuncuya söyleyen tek yer.

Oran her büyüde farklı, çünkü sabit bir "+%18" iki ayrı büyüde aynı kart değil. Aynı kalabalığa
karşı on saniyede Nova 589, Magic Bolt 56 hasar veriyor:

| büyü | ölçülen çıktı | hasar kartı | bekleme kartı |
|---|---|---|---|
| Nova | 589 | +%13 | -%8 |
| Meteor | 389 | +%14 | -%10 |
| Fireball | 205 | +%19 | -%13 |
| Frost / Lightning | ~140 | +%24 | -%15 |
| Shards / Wisp / Orbit | ~105 | +%29 | -%18 |
| Beam | 89 | +%32 | -%20 |
| Magic Bolt | 56 | +%40 | -%25 |

Kart yazısı **sayıdan üretiliyor** (`+${pct(n)}% damage`), yani veremeyeceği bir rakamı vaat
edemez.

**Dönüşüm (tier)** — bir büyüye beş yükseltme yaptığında sonraki kartı dönüşüm olur, en fazla üç.

**Onarım** — tek pasif, ve **duvar hasar almadan sunulmuyor**.

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
| `src/stages.js` | Bölüm adları, görünümleri ve hangi düşmanların geldiği. Saf veri. |
| `src/menu.js` | Beş sekmeli menü. Çizim ilkelerini `draw.js`'ten alır. |
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
loadout: bolt, fireball, frost, lightning — bölüm başına 40 koşu:
bölüm  bitirme   süre    yıldız dağılımı (0/1/2/3)
  1     % 88    1:44    10 / 5 / 2 / 18
  2     % 65    1:41     5 / 2 / 2 / 17
  3     % 43    1:47     7 / 1 / 3 / 6
  4     % 28    1:42     2 / 1 / 0 / 8
  5     % 13    1:42     1 / 1 / 3 / 0
  sadece sabit büyüyle 3. bölüm: %23  (dört büyüyle %43)
```

Bir bölüm ~1:45, yani CrazyGames'in 10 dakikalık oturum eşiği **altı bölüm** demek — ve
tekrar oynanabilir olmaları (yıldız toplamak) bunu doğal kılıyor.

**Tek büyü mü dört büyü mü**, bölüme göre değişiyor ve bu bilerek böyle:

| bölüm | tek büyü | dört büyü |
|---|---|---|
| 1 | %100 | %88 |
| 2 | %100 | %65 |
| 3 | **%18** | **%43** |
| 5 | **%0** | **%13** |

İlk bölümler affedici ve odaklanmak işe yarıyor; 3'ten sonra loadout şart. Tek büyü erken tepe
yapıp çöküyor, dolu loadout ölçekleniyor.

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
- **Ok yönü: uç, gösterdiği yöne gider.** Ters yazınca sol ok ">" çizdi.
- **Siyah zeminin üstüne siyah yazı yazma.** Bölüm adı resmin alt şeridine oturuyordu ve o şerit
  tam siyah; isim görünmüyordu. Artık resmin altında.
- **Dar ekranda üst bar tek satıra sığmaz.** Seviye, yıldız sayısı ve iki ayar pili üst üste
  bindi; telefonda iki satıra ayrıldı.
- **Siluetleri iki yerde çizme.** Menünün yaratık listesi için `body()` `figure()`'dan ayrıldı:
  iki kopya, biri değişince eşleşmeyi bırakan iki kopyadır — külliyat da tam bunun için var.
- **Aynı koşuyu tekrar bitirirken `show.booked` sıfırlanmazsa** bitiş ekranı eski sonucu gösterir
  — %70 duvarla üç yıldız yazdı. Gerçek akışta `start()` sıfırlıyor, ama `peek.mjs` sıfırlamıyordu
  ve ekran görüntüsü yalan söylüyordu.
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
