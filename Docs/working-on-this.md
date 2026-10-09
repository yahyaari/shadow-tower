# Shadow Tower — bu projede çalışırken

Ortada bir büyücü, etrafında bel hizasında bir duvar, her yönden gelen düşmanlar. Büyüler
kendiliğinden çıkıyor, tıklamak hepsini hızlandırıyor. Öldürdükçe seviye atlıyorsun, her seviyede
üç karttan biri. Bölümün sonunda patron geliyor; onu indirince duvar onarılıyor, bedava bir kart
alıyorsun ve sıradaki bölüm daha zor başlıyor. Duvar yıkılınca koşu biter.

Motor yok, derleme yok, bağımlılık yok. **Canlı: https://yahyaari.github.io/shadow-tower/**

## Görünüm kuralı

**Tam iki mürekkep var:** soluk gökyüzü ve saf siyah. Bir nesne ya ışıktır ya da ışıktan kesilmiş
bir şekil. Bu bir eksiklik değil tarz — dört projedir ilk kez sanatın yokluğunu saklamıyoruz.

- **Figürler her yönden gelmelerine rağmen ayakta çiziliyor.** Tepeden görülen şekil leke,
  yandan görülen şekil yaratıktır.
- **Orta bilerek alçak.** Halkanın ortasındaki uzun şey arkasından geleni gizler; her yönden
  geliyorlarsa bu tahtanın yarısı demek. İlk sürümde oraya kule koymuştum ve tam olarak bu oldu.
- **Duvar yıkıldıkça taşları eksiliyor.** Üstteki çubuk aynı şeyi sayıyla söylüyor ama gözün
  zaten baktığı yer duvar.
- **Yavaşlayan düşmanın ayağında halka var.** İki mürekkepte boyayacak renk yok.

## Dosyalar ve komutlar

| yol | ne yapar |
| --- | --- |
| `src/rules.js` | Oyun. On büyü, dört pasif, dört düşman, bölümler. DOM yok. |
| `src/draw.js` | Görünen her şey + `cards()` (fare de onu okuyor). |
| `src/sound.js` | Dosyasız ses: osilatör ve gürültü. İlk dokunuşta açılır. |
| `src/store.js` | localStorage: en iyi bölüm, sessizlik. Her okuma try/catch içinde. |
| `src/main.js` | Döngü, fare, parçacıklar. |
| `Tools/test.mjs` | 47 kontrol + bot. |
| `Tools/look.mjs` | Tarayıcıda bot oynatıp fotoğraf çeker. Gerçek zamanlı. |
| `Tools/peek.mjs` | Belirli bir ANA atlayıp çeker: patron, bölüm geçme, bitiş. Saniyeler. |

```sh
node Tools/test.mjs
node Tools/serve.mjs . 8050 0.0.0.0
node Tools/look.mjs http://localhost:8050/ Logs/look "30,130" 1280 720
node Tools/look.mjs http://localhost:8050/ Logs/phone "30,130" 390 844
node Tools/peek.mjs http://localhost:8050/ Logs/peek 1280 720
```

`look.mjs` oyunu gerçekten oynuyor, yani patronu görmek için gerçek zamanda yetmiş saniye
beklemek gerekiyor — swiftshader'da bu dört dakika duvar saati. `peek.mjs` durumu doğrudan kurup
o anı çekiyor. Denge ölçmek için değil, yeni çizilen bir şeyin doğru göründüğünü görmek için.

**Yayınlama:** `master`'a push etmek yeter, GitHub Pages kendi yayınlıyor (~1 dk).

## Dengeyi üç kere yanlış kurdum

Üçü de ölçümle çıktı, üçünü de not ediyorum çünkü aynı aileden hatalar.

**1. Oyuncunun gücü tavan yapıyordu, düşmanınki yapmıyordu.** İlk halinde bot 60 koşunun
sıfırında bölümü bitiriyordu. Duvarı üçe katladım, **5 saniye** kazandırdı — duvarın sorun
olmadığının kanıtı buydu. Asıl sebep: düşman canı `basınç^1.9` ile sınırsız büyüyor, oyuncunun
gücü ise ~3.5 katta duruyordu (6 büyü × 5 seviye + Güç). İki eğri bir dakikada kesişiyor ve bir
daha buluşmuyor. **Çözüm: dalga sertleşmesin, kalabalıklaşsın** — can üssü 1.9 → 0.9, doğma
sıklığı arttı. Türün gerçek şekli bu, ve yirmi tanesine birden vuran bir büyüyü değerli kılan da.

**2. Duvar hiç oyuna girmiyordu.** Kazanan koşular duvarın %92'siyle, kaybedenler sıfırla
bitiyordu. Sebep: çevre bir kez delinince on düşman aynı anda ısırıyor ve duvar iki nefes arasında
gidiyor. Isırıklar yarıya indi; sızıntı artık aşındırma yapıyor.

**3. Süreyle biten bölüm, bölüm değil.** Önce "180 saniye dayan, kazandın" vardı. Kendiliğinden
biten bir şey, ne yaptığından bağımsız olarak bitiyor. Yerine patron geldi: bölüm, senin
sebep olduğun bir şeyle bitiyor.

Şu an:
```
saniyede 6 tıklayan bir oyuncu, 60 koşu:
  dayanma   en kısa 2:16   ortanca 3:28   en uzun 6:39
  bölüm     en düşük 2   ortanca 2   en yüksek 4
  seviye    en düşük 14   ortanca 17   en yüksek 23
  1. bölümü geçen %100   2'yi %37   3'ü %5   4'ü %0
  neredeyse hiç tıklamayan (1/sn): ortanca 1:39
```

İlk bölümü herkes geçiyor (ilk oturuşta hiçbir şey başaramayan oyuncu geri gelmez), ikincisi
gerçek bir hedef, üçüncüsü övünülecek şey. Tıklamak koşuyu iki katına çıkarıyor.

## Telefon

Üç ayrı sorundu:
- Dikey ekranda arena genişliğe sığdığı için üstü altı bomboştu. **Yassılık artık ekran oranına
  göre**: dar ve uzun ekranda daire yuvarlaklaşıp o yüksekliği kullanıyor. Dünyada hiçbir şey
  yerinden oynamıyor, sadece izdüşüm değişiyor.
- Yazılar tuval pikseliyle ölçülüyordu, telefonun tuvali ekranının iki katı, yani masaüstünde
  doğru görünen metin elde yarım boyda çıkıyordu. **Artık cihaz oranıyla çarpılıyor**; sıradan
  monitörde oran 1 olduğu için oradaki görünüm değişmedi.
- **Üç kart dar ekranda alt alta diziliyor**, işaret solda. Aynı üç dikdörtgen, aynı `cards()`
  listesi, yani çizim ile dokunma çelişemez.
- Parmakta hover yok: karta dokunulunca seçili hale geliyor.

## Tuzaklar

- **"Sahadaki toplam can" ile hasar ölçme.** Her büyüyü tek tek sınarken bunu yaptım ve sayı
  ARTTI (o sırada yeni düşmanlar doğdu). Test "hiçbir büyü hasar vermiyor" dedi. Artık sadece
  başta koyulanların id'leri sayılıyor.
- **Nova'nın yarıçapı 190**; test düşmanlarını 200'e koyarsan büyüyü değil mesafeyi ölçersin.
- **Ön yaydaki ağaçları ele** (`front < 0.72`). İlk yazdığımda koşulu ters yazdım, boşluk
  arkada açıldı.
- **Üst üste iki isimsiz çubuk koyma.** Isı, bölüm çubuğunun hemen altındaydı ve ikisi de
  okunmuyordu. Isı sola, adıyla taşındı.
- **`cards()` tek kaynak**, çizim ve fare aynı listeyi okuyor.
- **Ses ilk dokunuşa kadar açılmaz.** Tarayıcı kullanıcı dokunmadan ses bağlamı başlatmıyor;
  bir kere reddedilip tekrar denenmeyen bağlam, oyunun herkeste sessiz olup yazanda çalışması
  demek.
- **`mend` pasifi açıkken duvar düşmüyor.** Bitiş ekranını denerken duvarı 1 cana indirdim ve
  saniyede bir buçuk geri gelerek ayakta kaldı; ekranı hiç göremedim. `peek.mjs` artık önce
  tamiri kapatıyor.
- **İlk koşuda "en iyi" cümlesi kırılır.** "a new best — you had never passed stage 0" yazıyordu;
  kıyaslanacak bir şey yokken kıyaslama cümlesi kurma.
- **Koşu bitişi bir kere işlenmeli.** `step` her karede çağrılıyor ve on kare önce biten koşu
  hâlâ bitmiş durumda — `show.booked` bayrağı olmadan skor her karede kaydedilirdi.
- **Denge tarayıcıda ölçülmez.** Oyun gerçek zamanlı ve swiftshader'da duvar saatinin ~%35'i
  hızında koşuyor; `Tools/test.mjs` aynı koşuyu milisaniyelerde bitiriyor.

## Yapılmadı

- Müzik yok (ses efektleri var).
- Büyülerin birleşmesi (VS'teki evolution) yok.
- Tek arena, tek patron tipi.
- Koşular arası kalıcı ilerleme yok — sadece en iyi bölüm kaydediliyor.
- CrazyGames SDK bağlanmadı, kapak görseli yok.
- Dikey telefonda hâlâ üstte altta boşluk var; daire geniş ekrana göre tasarlandı.
