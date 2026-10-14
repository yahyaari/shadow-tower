# Shadow Tower — bu projede çalışırken

> **NEREDE KALDIK** — 2026-10-14
>
> Oyun **yayında ve oynanabilir**: https://yahyaari.github.io/shadow-tower/
> Depo: `yahyaari/shadow-tower` · `master`'a push → GitHub Pages ~1 dakikada yayınlıyor.
> `node Tools/test.mjs` → **426 kontrol geçiyor**.
>
> ## SIRADAKİ İŞ: SAHANIN BÖLÜME GÖRE DEĞİŞMESİ
>
> **Bu, oyunun şu anki en büyük açığı ve kullanıcı bunu yapmamı istedi.**
>
> Menüde 12 ayrı yer var (orman, ova, yol, taşlar, çukur, sırt, bataklık, mağara, yıkık köy,
> buzul, kemik tarlası, kum denizi) ve her birinin kendi çizimi var. **Ama oyunun içindeki saha
> hepsinde aynı.** Menü "Kum Denizi" diyor, OYNA'ya basıyorsun, aynı ölü ormandasın.
>
> Sebebi: `src/draw.js` içindeki `Trees` sabiti. Modül seviyesinde, **sabit bir tohumla bir kez**
> üretiliyor (`let s = 20260413`), ve bölümden hiç haberi yok. 52 öğe: %30 kaya, %70 ağaç.
> Ön yay (oyuncuya en yakın 0.72 radyan) kasten boş bırakılıyor — oradaki bir ağaç en büyük
> çiziliyor, yazının üstüne biniyor ve düşmanların girdiği yere denk geliyor.
>
> **Yapılacak:** sahne bölümün `look`'una göre üretilsin. 12 görünümün çizim kuralları
> `src/menu.js` içindeki `portrait()`'te zaten var (`Hills`, `Count`, ve her `look` için bir dal)
> — sıfırdan yazmak değil, uyarlamak. `stageOf(n).look` ile `src/stages.js`'ten geliyor,
> `Looks` listesi de orada.
>
> Dikkat: `Trees` modül seviyesinde sabit olduğu için `begin()` çağrıldığında yeniden
> üretilmesi gerekir; `frame()` her karede çağrılıyor, orada üretmek olmaz.
>
> ## Bundan sonrası (hiçbiri seçilmedi)
>
> 1. **Müzik** — ses efektleri var, müzik yok. Dosyasız üretilebilir (ses efektleri zaten öyle).
> 2. **Büyü birleştirme** — iki büyüden yeni bir büyü doğması hiç yapılmadı.
> 3. **Gerçek parmakla test** — kullanıcı hâlâ oynamadı, bütün denge bot ölçümü.
> 4. **CrazyGames SDK** — reklam, kapak görseli, tanıtım videosu. Dikiş hazır (`src/ads.js`).
>
> ## Enerji — karar verildi, SDK'ya bırakıldı
>
> Depo **60**, koşu **5**, %100 bitirişte **+5** iade, dakikada **2** yenilenme. SDK ile birlikte,
> "enerjin bitti → reklam izle doldur" üstüne kurulacak. CrazyGames enerji yasaklamıyor
> (kontrol edildi), itiraz ekonomikti: gelir oynanma süresine bağlı ve satacak bir şey yok.
>
> ## Bitmiş olanlar
>
> Oyun döngüsü · bölüm seçimi + yıldızlar · 10 büyü / 48 yükseltme / 41 dönüşüm (24'ü kombo
> kilitli) · **üç patron** (Gardiyan/Çağırıcı/Gölge) · **dört düşman ailesi + element direnci** ·
> **12 yer** · **dört para birimi** (deneyim/altın/parça/gem) · gem farmlanamaz · **iki sandık +
> 10x** · **kalıcı büyü seviyeleri** · 50 hücreli kahraman peteği · **görevler** (günlük + koşu) ·
> **7 günlük seri** · **12 başarım** · **reklam dikişi** · beş sekmeli menü · külliyat · iki dil ·
> 1x-1.5x-2x hız · dosyasız ses.
>
> ## Kullanıcının cevaplamadığı sorular
>
> Aile çarpanları (×2.1 / ×0.55) · kahraman basamak fiyatları · bölüm uzunluğu (~1:45) ·
> gem temposu · hafta ödülü (250 gem) · başarım ödülleri.

Ortada bir büyücü, etrafında alçak bir duvar, her yönden gelen düşmanlar. Üç katman:

- **Hesap.** Bölüm bitince kalıcı deneyim kazanılır, ana seviye atlanır, yeni büyüler açılır.
- **Loadout.** Dört slot, ilki **sabit: Magic Bolt**. Diğer üçünü sen seçersin. Bu bir "başlangıç
  eli" değil bir **havuz**: ne getirdiğin, kartların sana ne önerebileceğini belirler.
- **Bölüm.** Ana menüden seçilir (`◀ BÖLÜM 3 ▶`). Açılışta **sadece Magic Bolt ateşler**;
  getirdiğin diğer üçü "YENİ BÜYÜ" kartı olarak çıkar ve ancak alınca ateşler. Bölüm, patronu
  indirince biter ve **ayakta kalan duvara göre yıldız** verir.

Motor yok, derleme yok, bağımlılık yok. **Canlı: https://yahyaari.github.io/shadow-tower/**

## Menü — beş sekme

Alt barda beş **ayrı kart**: Ödüller · Kahraman · Harita · Büyüler · Külliyat. Altlarında yazı
yok, sadece işaretler — telefonun altına beş küçük etiket koymak, kimsenin iki kere okumadığı beş
küçük yazı koymaktır. Seçili kart sıradan yukarı kalkıp doluyor; hangisinde olduğun hiçbir şey
okumadan anlaşılıyor.

Ses ve dil **ayarlar panelinde**, sağ üstteki dişliden açılıyor. Önce iki pil olarak menünün
köşesinde duruyorlardı; iki tane varken sorun değildi ama üçüncü bir ayar isteyen hiçbir şey için
yer yoktu, ve telefonda zaten hesap satırıyla aynı yeri paylaşıyorlardı.

| sekme | durum |
| --- | --- |
| Harita | **çalışıyor** — bölüm seçimi, bölüm resmi, yıldızlar, düşman listesi, OYNA |
| Büyüler | **çalışıyor** — iki yarı: KADRO (loadout) ve YÜKSELT (kalıcı büyü seviyesi) |
| Ödüller | **çalışıyor** — kaydırmalı: günlük çark, altında gem ile alınan iki sandık (1x/10x) |
| Kahraman | **çalışıyor** — 50 basamaklı merdiven, deneyimle alınır |
| Külliyat | **çalışıyor** — iki yarı: BÜYÜLER ve CANAVARLAR |

İskelet sekme kalmadı. Ödüller'in reklam kısmı CrazyGames SDK'sı istediği için en sona bırakıldı.

### Kahraman

Elli hücreli bir **bal peteği**, aşağıdan yukarı, kaydırmalı. İki şerit arasında zikzak yapıyor;
alınanlar dolu siyah, sıradaki halkalı, yukarısı soluk. Her hücrede yazı değil **bir işaret** var
(hasar yıldızı, duvar mazgalı, kum saati, iç içe halkalar, artı, açık kitap) — elli hücreye birer
cümle koymak bir yazı duvarı demek. Sıradakinin ne verdiği, ekranın altında bir kere yazıyor. Her basamak **küçük ve genel**: +%2.5
hasar, +10 duvar, -%0.5 bekleme, +%1.5 alan, onarım, deneyim kazancı. **Hiçbiri bir büyüye özel
değil** ve test bunu kontrol ediyor — olsaydı, kart hiç bahsetmeden hangi büyüyü getireceğine
karar verirdi.

Deneyimle alınıyor, yıldızla değil. Deneyim artık iki işi birden yapıyor: `xp` ana seviyeye doğru
tırmanıp sıfırlanıyor (büyü kilitleri), `bank` ise harcanabilir bakiye olarak duruyor. Tek sayı
kazanılıyor, iki yol birden besleniyor — merdiveni dolduran biri büyü açmayı bırakmıyor,
biriktiren biri de daha hızlı açmıyor.

| | |
| --- | --- |
| maliyet | 250, 500, 630, … 3.040 — toplam **98.290 deneyim** |
| koşu başına deneyim | 1. bölüm 143, 4. bölüm 725 (ortalama ~434) |
| yani | yaklaşık **226 koşu** |
| tamamında | hasar +%54, duvar +145, bekleme -%7.2, alan +%11, onarım 1.13/sn, deneyim +%15 |

Basamak büyüklüğü 20. ve 35. basamakta artıyor, yoksa en üstteki basamak on iki katı fiyata
aynı şeyi verirdi.

**Merdivenin asıl işi ölçüldü:** bugün çok sert olan bölümleri zamanla açıyor.

```
bölüm 3:  merdivensiz % 43   tam merdivenle % 98
bölüm 4:  merdivensiz % 28   tam merdivenle % 90
bölüm 5:  merdivensiz % 13   tam merdivenle % 90
```

### Külliyat

**Büyüler** yarısı on büyüyü ızgara olarak gösteriyor; birine dokununca kendi sayfası açılıyor:
adı, ne yaptığı, bütün **yükseltmeleri** (adı, ne verdiği, en fazla kaç tane) ve bütün
**kademeleri**. Kademenin yanında `needs Fireball` / `Ateş Topu gerekir` yazıyor — oyuncunun
kombinasyonları koşuya girmeden önce planlayabileceği tek yer burası, ve külliyatın asıl sebebi
de bu.

**Canavarlar** yarısı dört yaratığı siluetiyle, sayılarıyla (can, hız, ısırık, deneyim) ve birer
cümleyle listeliyor. Sayılar `Kinds`'tan okunuyor, elle yazılmıyor.

Panel yüksekliği içeriğinden hesaplanıyor: sabit yükseklikte Magic Bolt'un altında üçte iki boş
alan kalıyordu ve daha dolu bir büyüyü kırpardı.

**Bölüm resmi çizilerek üretiliyor**, yüklenmiyor. Aynı iki mürekkep, bölüm numarasından
tohumlanmış — kırkıncı bölümün de kendi ufku var ve her açılışta aynı. `stages.js` içinde altı
isim var (`Uğursuz Orman`, `Küllü Ova`, `Kırık Yol`…), sonrası numaralanarak dönüyor.

**Bölümde hangi düşmanların olduğu elle yazılmıyor**, dalganın kullandığı kuraldan okunuyor
(`kindsOn`). Elle tutulan bir liste, ikisinden biri değişince ilk anda yanlışa düşer.

## On iki yer

Altı yer vardı, altısı da sayıyla tekrar ediyordu: 7. bölüm "Uğursuz Orman 2" idi ve resmi 1.
bölümle **birebir aynı** çiziliyordu. Altı yeni yer eklendi (bataklık, mağara ağzı, yıkık köy,
buzul, kemik tarlası, kum denizi), hepsi listenin **sonuna** — böylece 1-6. bölümler aynen kaldı
ve ölçülmüş denge kıpırdamadı.

Üç ayrı döngü uzunluğu var ve bu kasten: **yer 12'de, aile deseni 8'de, patron 3'te** dönüyor.
Yer + aile kombinasyonu ancak 24 bölümde bir tekrar ediyor, yani "Uğursuz Orman 2"ye
döndüğünde orada başka şeyler yaşıyor.

Resim hâlâ kodda üretiliyor: `look` bir dosya adı değil, bir yer türü. `Looks` listesi var çünkü
portre tanımadığı bir görünüm için **sessizce çıplak ağaçlara düşüyor** — yanlış yazılmış bir
görünüm hata vermez, ilk ormanı çizer ve kimse fark etmez. Test bu yüzden her yerin görünümünün
listede olmasını, her görünümün kullanılmasını ve hiçbirinin iki kez kullanılmamasını kontrol
ediyor.

Üçü ilk çizimde okunmuyordu ve düzeltildi: **mağara** gri bir dikdörtgen artı dişti (artık tepeye
açılmış siyah bir ağız, dişler ağzın içine kırpılıyor), **kemik tarlası** ot gibi görünüyordu
(kaburgalar iki kat kalın, omurga da var), **kum denizi** boştu (üst üste binen kum sırtları).

## Dört düşman ailesi

İki şey kasten ayrı tutuluyor:

- **Rol** — yürüyen, koşucu, gladyatör. Dalgada ne yaptığı. Dalga kuralı sadece rollerden
  konuşuyor, o yüzden yeni bir aile dengeye hiçbir şey mal olmuyor.
- **Aile** — insanlar, sürü, örümcekler, kurtlar. Ne olduğu. Nasıl göründüğünü ve hangi
  hasardan ne kadar aldığını değiştiriyor, başka hiçbir şeyi değil.

| aile | nerede | zayıf | zırhlı |
| --- | --- | --- | --- |
| **İnsanlar** | 1. bölüm | — | — |
| **Sürü** (uçan) | 2. bölüm | ateş ×2.1 | bıçak ×0.6 |
| **Örümcekler** | 3. bölüm | ateş ×2.1 | yıldırım ×0.55 |
| **Kurtlar** | 4. bölüm | bıçak ×2.1 | ateş ×0.55 |

5. bölümden sonra karışıyorlar (sürü+insan, örümcek+insan, kurt+sürü…), ve liste bittiğinde
bitmiyor — her tur bir aile daha ekleniyor, yani 20. bölümde hepsi birden geliyor.

**İki sayı kasten dengesiz:** zayıflık iki katından fazla, zırh yarıdan az kesiyor. Tablo, doğru
büyüyü getireni **ödüllendirmeli**, yanlış getireni cezalandırmamalı. Eşit yaptığımda 4. bölüm,
sadece haritayı henüz okumamış bir oyuncu için %30'dan %15'e düştü.

### Hasarın tek kapıdan geçmesi

Oyundaki her şey tek bir `wound()`'dan geçiyor, o yüzden direnç tablosu yedi ayrı yere değil tek
bir yere uygulanıyor. Yeni bir aile eklemek bu yüzden bedava: bir tablo satırı, bir dal değil.

Her büyünün bir **elementi** var (gizem / ateş / buz / yıldırım / bıçak). Dönüşümlerin yere
bıraktığı şeyler kendi elementlerini taşıyor: Lightning'den ödünç alınmış bir fırtına gerçekten
fırtına, ve örümcek onu gerçekten umursamıyor.

### Burada üç kere yanlış ölçtüm

1. **Bitirme oranıyla ölçtüm.** %20 civarında, 40 koşuda standart hata ~6 puan — aradığım etki
   gürültünün içinde kayboldu. İki kez "fark yok" çıktı; yanlış olan ölçümdü, oyun değil.
2. **Tabloyu açıp kapatarak ölçtüm** (aynı tohum, aynı loadout). Bu doğru izolasyondu ama yine
   "+%0" dedi — çünkü **bot bütün kartları tek bir büyüye yığıyor**, ve o loadout'ta ateş toplam
   hasarın yüzde dördüydü. Bir elementi iki katına çıkarmak, o element hasarın %4'üyse hiçbir şey
   yapmaz.
3. **Zayıflığı Buz'a koydum.** Buz Küresi 7 hasarlık bir fayda büyüsü; iki katı da hiçbir şey.
   Zayıflık, gerçekten hasar taşıyan bir elemente bakmalı. Ateş ve bıçak öyle — Yörünge tek
   başına bir koşunun hasarının dörtte birini yapıyor.

Doğru ölçüm: **aynı tohumlarda, elemente göre kurulmuş iki ayrı loadout.** Ateş yığını sürüye
karşı %11, örümceğe karşı %13 önde; kurtlara karşı bıçak yığını %19 önde. Sıralama tersine
dönüyor — ailelerin anlamı bu.

### "Bıçak diye bir büyü yok"

İlk hâlinde harita "BIÇAK ×2.1" yazıyordu ama oyuncunun bunu bağlayabileceği hiçbir şey yoktu:
oyunda Bıçak adında bir büyü yok, **Kıymıklar** ve **Yörünge** var ve ikisinin de bıçak olduğu
hiçbir yerde yazmıyordu. Okunamaz bir sayıydı.

Artık her büyünün adının yanında elementi bir rozet olarak duruyor — loadout kartlarında,
külliyat ızgarasında, açılmış büyü sayfasında ve yükseltme satırlarında. Test de bunu koruyor:
**bir ailenin saydığı her elementin, oyuncunun görebileceği bir karşılığı olmak zorunda.**

Bu, Çağırıcı'nın "üç çağırır" demesiyle aynı sınıftan bir hataydı — ekran, oyunda karşılığı
olmayan bir şey söylüyordu.

### Oyuncu bunu nereden bilecek

**Haritada, OYNA'nın yanında.** Bölümün aileleri gerçek siluetleriyle, altlarında ▲ zayıflık ve
▼ zırh. Oyuncunun ancak kaybederek öğrenebileceği bir zayıflık bir karar değil, bir tahmindir.
Külliyat da dört aileyi üç rolüyle birlikte gösteriyor.

## Üç patron

Bölümler sonsuza kadar gidiyor; tek bir patron, on altıncı kez görüldüğünde patron değil, can
çubuğu olan bir duvardır. Üçü sırayla geliyor ve **farkları istatistik değil davranış** — ikinci
bir sünger, birincinin aynısı olurdu.

| | nerede | ne yapar |
| --- | --- | --- |
| **Gardiyan** | 1, 4, 7… | yavaş, kocaman, duvara her şeyden sert vurur. Düello. |
| **Çağırıcı** | 2, 5, 8… | durduğu yerden sürekli koşucu çağırır. Görmezden gelirsen alan dolar. |
| **Gölge** | 3, 6, 9… | hızlı ve ince; ölünce **kenarda** ikiye ayrılır ve ikisi de yeniden yürür. |

Gölge'nin yarıları öldüğü yerde değil kenarda beliriyor: öldürmek onu **geri itiyor**. İlk hâlinde
olduğu yerde doğuyorlardı ve iki tanesi duvarın dibinde oturup kemiriyordu — o yüzden Gölge'nin
beklediği hiçbir bölüm tam canla bitirilemiyordu.

Üst bardaki can çubuğu artık **yaşayan patron başına** bir tane. Tek çubukla Gölge'yi öldürmek
hiçbir şey olmamış gibi görünüyordu: çubuk basitçe yeniden doluyordu, çünkü `state.boss` artık
yarılardan biriydi.

### Dengelemesi üç tur sürdü

1. İlk hâlinde yeni patronlar oyunu **kolaylaştırdı** (5. bölüm %13 → %20) ve tek büyü dört
   büyüyü geçti. Sebep: canları Gardiyan'ın 420'sinden düşüktü. Davranış farkı indirimle gelmemeli.
2. Canları yükseltince 3. ve 5. bölümde **hiç üç yıldız kalmadı**. Çağırıcı saniyede üç koşucu
   çağırıyordu (bir patron dövüşünde ~20 fazladan gövde) ve Gölge yarılarıyla duvarda kamp
   kuruyordu.
3. Çağırıcı ikiye indi, Gölge kenarda doğar oldu. Son hâli, eski eğriye neredeyse birebir oturdu:
   %88 / %70 / %45 / %28 / %13 (eskisi %88 / %65 / %43 / %28 / %13).

### Külliyat kuraldan okuyor

Canavar listesi elle yazılı bir diziydi (`['walker','runner','brute','warden']`) ve iki yeni
patron gelince yalan söylemeye başladı. Artık `Kinds`'tan türetiliyor.

Açıklamalardaki sayılar da öyle: Çağırıcı'nın metni "üç tane çağırır" diyordu, ben ikiye
indirdikten sonra bile. Sayılar artık `HeraldCalls` ve `ShadeKeeps`'ten geliyor ve test
açıklamanın gerçekten olanı söylediğini doğruluyor — kartlarda zaten uyguladığım kural.

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

## Ödüller — çark ve sandık

Ödül **deneyim**, başka hiçbir şey değil. Oyunun zaten harcanacak yeri olan bir para birimi var
(kahraman peteği); çarkın ikinci bir jeton türü dağıtması, oyuncudan bir ödülü anlayabilmek için
bir ekonomi öğrenmesini istemek olurdu.

İki kaynak, **ritimleri bilerek farklı**:

| | ne zaman | niye |
| --- | --- | --- |
| **çark** | günde bir bedava çevirme | yarın oyunu açmanın sebebi — hiçbir oturum bunu veremez |
| **sandık** | 750 ölüde dolar, oynarken | kazandığın oturumun içinde ödeyen kısım |

Sekizin biri ikramiye, hepsi düz 1/8. "Neredeyse kazandın" ağırlığı yok, ibrenin kaçırdığı dilim
yok. En küçük dilim de bir işe yaramalı: sekiz oyuncudan biri ona düşüyor ve yeni bir hesapta
oyuncunun bu sekmeye dair ilk izlenimi o oluyor.

### İki sandık, gem ile

Ödüller sekmesi **kaydırılıyor**: üstte çark, aşağısında iki sandık. İkisi de **gem** ile
alınıyor, teker teker ya da onar onar.

| | 1x | 10x | verir (tek) |
| --- | --- | --- | --- |
| **küçük sandık** | 100 gem | 900 gem | ~10 parça + biraz deneyim/altın |
| **büyük sandık** | 250 gem | 2250 gem | ~25 parça + daha fazlası |

10x'in bütün sebebi **dokuz tane fiyatına on tane** olması. Ucuz olmasaydı düğme bir
kolaylıktan ibaret kalırdı.

### Gem: farmlanamayan para birimi

Oyunun en önemli ekonomik kuralı bu. Gem'i sadece **ilerlemek** üretiyor:

| geçiş | gem |
| --- | --- |
| ilk | tam |
| ikinci | %25 |
| üçüncü | %10 |
| dördüncü ve sonrası | **sıfır** |

Üstüne temizlik çarpanı var: 3 yıldızlı bir ilk geçiş, 0 yıldızlıdan %43 fazla ödüyor. Yıldızlar
hâlâ hiçbir şey satın almıyor ama hangi geçişin daha çok gem getirdiğini belirliyorlar.

Bölümler sonsuz döndüğü için gem akışı hiç kurumuyor — ama kaynağı **hep önünde**, hiç arkanda
değil. Ölçüm: aynı bölümü **elli kez** geçmek tek bir küçük sandık bile açmıyor.

**Diğer ödüller de tekrarda düşüyor** (1 → 0.85 → 0.70 → 0.55 → %50 taban) ama sıfıra inmiyor.
Bir sonraki bölümü henüz geçemeyen oyuncunun, geçebilmesi için gereken yükseltmeleri alabilmesi
bir öncekini tekrar tekrar geçmesine bağlı; o kapıyı kapatmak "takıldım"ı "bittim" yapardı.

### Bu ekonominin üç yanlış kurulumu

Hepsi ölçümle yakalandı, hiçbiri gözle görülmedi:

1. **Her bitirme bir anahtar, bir anahtar bir sandık** → 1. bölümde sandıklar koşuların
   kendisinden çok ödüyordu (altın %133).
2. **Sabit anahtar düşüşü** → 1. bölümü çiftliğe çevirmek ilerlemekten iyiydi (dakikada 5,4 parça
   vs 2,5), çünkü orası hızlı ve neredeyse hep bitiriliyor.
3. **10x'i toptan yuvarlamak** → on tane birden almak 1845 ödüyordu, tek tek almak 1850. İndirim
   düğmesinin içine gizli bir ceza. Artık tek sandığın değeri bir kez hesaplanıp çarpılıyor.

Bir de **ölçümün kendisi yanlış soruyu soruyordu**. "Ödül, koşu gelirinin yüzde kaçı" sorusu
*çark* için doğru — çark bedava. Sandık için yanlış: sandık gem ile alınıyor, gem'i de oynamak
üretiyor. Sandığa sorulacak soru: *bir sandığa kaç yeni bölüm uzaklıktasın?*

### Çarkın bütün dürüstlüğü tek cümlede### Çarkın bütün dürüstlüğü tek cümlede

**Kazanan dilim kurallarda çekiliyor, animasyon ona nişan alıyor.** `meta.spin()` dilimi seçip
ödülü bankaya yazıyor; `restFor(at, from)` çarkın o dilimin üstünde durması için gereken açıyı
hesaplıyor. Ters kurulsaydı — önce döndür, sonra durduğu yeri oku — çark bir şey gösterip başka
bir şey ödeyebilirdi ve bunu kimse fark etmezdi. Test her dilim ve yedi farklı başlangıç açısı
için `wedgeUnder(restFor(at, from)) === at` olduğunu doğruluyor.

Ödül **basıldığı anda** bankaya yazılıyor, animasyon bitince değil: dönerken sekmeyi kapatan
oyuncu ödülünü kaybetmesin. Bunun yan etkisi, bankadaki sayının ibre durmadan önce zıplamasıydı —
o yüzden sekme dönerken eski rakamı tutuyor (`show.spin.was`).

### Büyüklük

Testin sonunda duran ölçüm, ödüllerin bir oturumda kazanılan deneyimin yanında ne ettiğini
söylüyor. Şu an **8 koşuluk bir oturumda %15-25 ekliyor** — ikram, ana yemek değil. İlk kurulumda
%47'ydi: ödül seviyeye bağlıydı, koşu geliri ise bölüme. Seviye 3'e gelip 1. bölümü tekrar oynayan
oyuncu, 1. bölüm geliriyle seviye 3 ödülü alıyordu. Düğmelerin hepsi `src/rewards.js`'in başında,
tek yerde.

## Görevler

İki ritim:

| | ne zaman | ödül | niye |
| --- | --- | --- | --- |
| **günlük** | üç tane, gece yarısı yenilenir | **gem** + altın | yarın oyunu açmanın sebebi |
| **koşu** | üç tane, her koşu | **sadece altın** | anlık hedef |

**Koşu görevleri gem veremez** ve bu bir tercih değil, zorunluluk: koşu görevi her koşuda
yenileniyor, gem verseydi aynı bölümü tekrar tekrar geçerek sonsuz gem üretilebilirdi — oysa
gem'in tek özelliği tam olarak bunun yapılamaması. Test bu kuralı ayrıca kontrol ediyor.

Günlük görevler **alınmak için dokunulur** (Ödüller sekmesinde), koşu görevleri **kendiliğinden
ödenir**. Koşu görevi zaten koşuya ait; gidip toplanması gereken bir koşu ödülü iş olur.

Koşunun üçü **haritada, OYNA'ya basmadan önce** yazıyor. Sonradan söylenen bir hedef hedef değil,
sürprizdir.

Görevler hiçbir şeyi koşunun içinden saymıyor: hepsi `finish`'in zaten bildiği sayılardan
(öldürülen, duvar, seviye, dönüşüm, taşınan büyü) ölçülüyor. Yani yeni bir görev eklemek
`rules.js`'te tek satır değiştirmiyor.

### Yedi günlük seri

Üst üste yedi gün bir şey **yapınca** 250 gem + altın. Sayfayı yedi kez açmak değil — seri
`mark()` içinde sayılıyor, yani bir şey başarıldığında. Yedide sarıyor: sonsuza kadar giden bir
sayı bakılmayan bir sayıdır, ve bir hafta, kaçırılan bir günden sonra yeniden başlamayı kayıp
hissettirmeyecek kadar kısa.

### Başarımlar

Hayat boyu bir kez ödenen 12 kilometre taşı, hesabın kendi sayılarından ölçülüyor (koşu, öldürme,
en derin bölüm, üç yıldızlı bölüm, sandık, petek, en yüksek büyü). Hepsi gem ödüyor — ama
tekrarlanamadıkları için gem'in farmlanamaz olma kuralını bozmuyorlar. Test bunu ayrıca kontrol
ediyor: sayı daha da artsa bile ikinci kez ödeme yok.

### Reklam — dikiş hazır, reklam yok

`ads.js` tam olarak reklamın gireceği yer. İçinde reklam yok çünkü CrazyGames SDK'sı henüz yok.
İçinde olan her şey reklamın **etrafı**: günde kaç tane (çark 3, küçük sandık 3, büyük sandık 3),
neyi satın aldıkları, ve beklenen tek bir `show()`.

`ready()` bugün **bilerek false**. Reklamsız ödeyen bir düğme, anlamsız bir beklemenin arkasındaki
bedava ödüldür — ve günde üç bedava çark çevirme, ekonominin dayandığı kuralı sessizce bozardı.
Düğmeler çiziliyor ama kesik çizgili ve soluk, altında "reklamlar portal sürümüyle gelecek".

Reklamla çevirme **günün bedava çevirmesini harcamıyor** (fazladan bir tur, aynı turun iki kez
satın alınması değil), reklamla sandık açmak **gem harcamıyor** (reklam zaten ödemedir). İkisi de
test ediliyor.

### Ana ekran — kullanıcının çizdiği gibi

Bölüm görseli **tam ortada**, iki yanında boşluk. Oklar görselin kendi kenarlarına bindi (dışarıda
dururken o boşlukları yiyorlardı), üstlerine soluk birer disk kondu çünkü görselin yarısı katı
siyah ve siyah bir ok orada ok değildir.

Sol kenarda **üç pano**: görevler, başarımlar, duyurular. İkon olarak, tabların olduğu gibi —
telefonun kenarına dizilmiş üç etiket, kimsenin iki kez okumadığı üç küçük yazıdır. Üstünde
bekleyen bir şey varsa köşesinde bir nokta beliriyor. Dişli köşede kaldı: o her sekmede var, yanına
koyacağı görsel ise sadece bir sekmede.

Alt menü artık **tek şerit**: kartlar bitişik, aralarındaki çizgi onları ayıran şey, seçili olan
şeritten tamamen ayrılıp yukarı kalkıyor. Aralıklı dururken ekranın dibinde savrulmuş beş nesne
gibi duruyorlardı.

### Enerji — SDK'ya bırakıldı

Enerji sistemi konuşuldu ve **bilerek ertelendi**. CrazyGames enerji/zamanlayıcı yasaklamıyor
(kurallarda böyle bir madde yok, kontrol edildi), ama orada gelir **oynanma süresine** bağlı:
mobilde kapıyı satabildiğin için mantıklı, burada satacak bir şey yok, dolayısıyla kapı sadece
maliyet. Üstelik web portalında bildirim yok — duvara çarpıp çıkanı geri çağıracak hiçbir şey yok.

Enerjinin anlamlı olduğu tek hâl, bitince **reklam izleyip doldurmak**. O yüzden SDK ile birlikte
gelecek. Karar verilen sayılar: **depo 60, koşu 5, %100 bitirişte +5 iade, dakikada 2 yenilenme.**

## Üç para birimi

Her bölüm sonu üçü birden düşüyor, ve üçünün harcandığı yer ayrı:

| | nereden | nereye | kim karar verir |
| --- | --- | --- | --- |
| **deneyim** | koşu + çark + sandık | kahraman peteği | — |
| **altın** | koşu + çark + sandık | büyü yükseltmeleri | KAÇ büyüyü çıkarabilirsin |
| **parça** | sadece taşıdığın büyülerden | o büyünün yükseltmesi | HANGİ büyüyü çıkarırsın |

Bu ayrım kasten. Altın ortak olduğu için "her şeyi yükseltemezsin" diyen o; parça büyüye özel
olduğu için "o büyüyü gerçekten oynaman lazım" diyen bu. Tek bir para birimi olsaydı ikisinden
biri söylenmemiş kalırdı.

**Parça, o büyüye ne kadar yatırım yaptığına ödeniyor** — sadece getirmiş olmana değil. Taşıyıp
hiç kart koymamak tabanı veriyor, bütün koşu onu beslemek üç katını. Dört büyüyle oynamak
basitçe dört katı parça vermiyor; neye yoğunlaştıysan onu bankaya yazıyorsun.

### Kalıcı büyü seviyesi

Her büyü 1'den 10'a çıkıyor, her basamak **+%5 hasar**, sonu +%45. Maliyet altın + o büyünün
parçası, ikisi de artıyor (100→2700 altın, 5→21 parça; toplam 11.100 altın + 117 parça).

Bilerek düz. Bunun üstüne zaten **birbiriyle çarpılan** iki güç kaynağı var — koşu içi kartlar ve
kahraman peteği — ve kendi şekli olan üçüncü bir kaynak dengeyi derinleştirmez, okunmaz yapar.
Kalıcı seviye üçünün en küçüğü, çünkü hiç kaybolmayan tek kaynak o.

**Ölçüm (40 koşu):**

| | çıplak | sadece büyü seviyesi | merdiven + seviye |
| --- | --- | --- | --- |
| bölüm 3 | %43 | %70 | %100 |
| bölüm 5 | %13 | %50 | %98 |

Tam donanımlı oyuncuda 3. ve 5. bölüm neredeyse garanti — ve bu, ancak derin bölümler hâlâ
direniyorsa sorun değil. Ölçüldü: tam donanımlı **8. bölüm %60, 12. bölüm %0, 16. bölüm %0**.
Duvar duruyor. Test bunu her koşuda kontrol ediyor; biri çıkıp büyülere +%200 verirse test düşer.

### İsim çakışması

Büyülerden birinin adı zaten **Shards**. Ödül de İngilizce "shards" olunca çark "+6 Shards
shards" yazıyordu. İngilizce ödülün adı **RUNE** oldu; Türkçe'de çakışma yok, **parça** kaldı.

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
| `src/stages.js` | 12 yerin adı, tanıtımı ve görünümü + çizilebilen `Looks` listesi. |
| `src/foes.js` | Düşman aileleri, elementler, direnç tablosu, bölüm→aile eşlemesi. Saf veri. |
| `src/missions.js` | Günlük/koşu görevleri, 7 günlük seri, başarımlar. Saf veri + aritmetik. |
| `src/ads.js` | Ödüllü reklam dikişi: günlük hak, `ready()`, `show()`. SDK gelince tek dosya değişir. |
| `src/news.js` | Duyurular. Tarihli, kısa, oyuncu için yazılmış. |
| `src/hero.js` | 50 basamaklı kahraman merdiveni. Saf veri + maliyet eğrisi. |
| `src/rewards.js` | Çark dilimleri (türlü), sandık eşiği, "bugün çevrildi mi". DOM yok, saati de yok. |
| `src/upgrades.js` | Büyülerin kalıcı seviye çizgisi: 10 basamak, maliyetler. Saf veri. |
| `src/menu.js` | Beş sekmeli menü. Çizim ilkelerini `draw.js`'ten alır. |
| `src/spells.js` | Büyü kitabı. Saf veri: 10 büyü, 50 yükseltme, 41 dönüşüm, kilit seviyeleri. |
| `src/meta.js` | Hesap: kalıcı deneyim, ana seviye, kilitler, loadout. localStorage. |
| `src/rules.js` | Oyun. DOM yok. `statsOf()` tek hesap yeri, `evoke()` dönüşüm etkileri. |
| `src/draw.js` | Görünen her şey + `cards()`, `tiles()` (fare de onları okuyor). |
| `src/sound.js` | Dosyasız ses. |
| `src/main.js` | İki ekran: menü ve koşu. `window.ShadowTower.menu()` menü tuşlarını sürer. |
| `Tools/test.mjs` | 426 kontrol + bot. |
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
- **Kaydırılan bir listede dokunuş ile sürükleme ayrılmalı.** Kahraman merdiveninde basma
  anında değil, BIRAKMA anında karar veriliyor: az kımıldadıysa dokunuş, çok kımıldadıysa
  sürükleme. Yoksa her kaydırma denemesi bir basamak satın alırdı.
- **Ekran dışındaki bir şey satın alınamamalı.** Dokunma testi, sıradaki hücrenin gerçekten
  görünür olup olmadığına da bakıyor.
- **Alt bilgi çubuğu peteğin üstünü örter.** Hücreler o çubuğun üstünde kesiliyor, yoksa
  parmağına en yakın olanlar — yani yeni aldıkların — gizlenenler oluyordu.
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
- Tek arena (patron üç tane, düşman ailesi dört tane).
- CrazyGames SDK bağlanmadı, kapak görseli yok. Reklamla ödül de buna bağlı.
- Yıldızlar hiçbir şey satın almıyor; sadece bir geçişin kaç gem getireceğini belirliyorlar.
- Gerçek parmakla oynanmadı.
