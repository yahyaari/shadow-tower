# Shadow Tower — bu projede çalışırken

Ortada bir büyücü, etrafında alçak bir duvar, her yönden gelen düşmanlar. Büyüler kendiliğinden
çıkıyor, tıklamak hepsini hızlandırıyor. Öldürdükçe seviye atlıyorsun, her seviyede üç karttan
biri. Bölüm 3 dakika; sonuna kadar dayanırsan kazanıyorsun. Vampire Survivors, yerinde duran.

Motor yok, derleme yok, siyah-beyaz siluet.

## Görünüm kuralı

**Tam iki mürekkep var:** soluk gökyüzü ve saf siyah. Hiçbir şey gölgeli, dokulu veya renkli
değil. Bir nesne ya ışıktır ya da ışıktan kesilmiş bir şekil. Bu bir eksiklik değil tarz — ve
dört projedir ilk kez sanatın yokluğunu saklamaya çalışmıyoruz.

- **Figürler her yönden gelmelerine rağmen ayakta çiziliyor.** Tepeden görülen şekil leke,
  yandan görülen şekil yaratıktır.
- **Orta bilerek alçak.** Bir halkanın ortasındaki uzun şey, arkasından geleni gizler — her
  yönden geliyorlarsa bu tahtanın yarısı demek. İlk sürümde oraya bir kule koymuştum ve tam
  olarak bu oldu. Bel hizasında bir duvar, içinde bir figür: savunulacak bir yer gibi duruyor
  ve hiçbir şeyin önünü kapatmıyor.
- **Duvar yıkıldıkça taşları eksiliyor.** Üstteki çubuk aynı şeyi sayıyla söylüyor ama gözün
  zaten baktığı yer duvar.

## Dosyalar ve komutlar

| yol | ne yapar |
| --- | --- |
| `src/rules.js` | Oyun. On büyü, dört pasif, düşmanlar, seviye. DOM yok. |
| `src/draw.js` | Görünen her şey + `cards()` (fare de onu okuyor). |
| `src/main.js` | Döngü, fare, parçacıklar. |
| `Tools/test.mjs` | 39 kontrol + bot. |
| `Tools/look.mjs` | Tarayıcıda bot oynatıp fotoğraf çeker (seçim ekranı dahil). |

```sh
node Tools/test.mjs
node Tools/serve.mjs . 8050 0.0.0.0
node Tools/look.mjs http://localhost:8050/ Logs/look "10,60,120" 1280 720
```

## Dengeyi nasıl buldum — ve neyi baştan yanlış kurmuşum

İlk halinde bot **60 koşunun sıfırında** bölümü bitiriyordu; ortanca dayanma 1:00, bölüm 4:00.

Duvarı 120'den 340'a çıkardım: **5 saniye** kazandırdı. Bu, duvarın sorun olmadığının kanıtıydı.

Asıl sebep şuydu: **düşman canı `basınç^1.9` ile sınırsız büyüyordu, oyuncunun gücü ise ~3.5
katta tavan yapıyor** — altı büyü × beş seviye, artı Güç. İki eğri bir dakikada kesişiyor ve bir
daha buluşmuyor.

Çözüm: dalga **sertleşmesin, kalabalıklaşsın**. Can üssü 1.9 → 0.9, doğma sıklığı ciddi arttı.
Türün gerçek şekli bu: tek tek öldürebileceğin ama teker teker yetişemeyeceğin bir kalabalık —
yirmi tanesine birden vuran bir büyüyü değerli kılan şey de bu.

İkinci bulgu: kazanan koşular duvarın %92'siyle, kaybedenler sıfırla bitiyordu. Yani duvar hiç
oyuna girmiyordu. Sebep: çevre bir kez delinince on düşman aynı anda ısırıyor ve duvar iki nefes
arasında gidiyor. **Isırıklar yarıya indi** — sızıntı artık aşındırma yapıyor.

Şu an:
```
saniyede 6 tıklayan bir oyuncu, 60 koşu (bölüm 3:00):
  bitirme oranı  %48
  dayanma        en kısa 1:38   ortanca 2:55   en uzun 3:00
  seviye         en düşük 13   ortanca 17   en yüksek 18
  bitirenin kalan duvarı  ortalama 247 / 300
  neredeyse hiç tıklamayan (1/sn): ortanca 1:30
```

Koşu başına ~17 kart seçimi, ve tıklamak koşuyu neredeyse iki katına çıkarıyor.

## Tuzaklar

- **"Sahadaki toplam can" ile hasar ölçme.** Her büyüyü tek tek sınarken bunu yaptım ve sayı
  ARTTI, çünkü o sekiz saniyede yeni düşmanlar doğdu. Test "hiçbir büyü hasar vermiyor" dedi.
  Artık sadece başta koyulanların id'leri sayılıyor.
- **Nova'nın yarıçapı 190; test düşmanları 200'e koyarsan büyüyü değil mesafeyi ölçersin.**
- **Ön yaydaki ağaçları ele** (`front < 0.72`). Öndekiler en büyük çizilir ve yazıların üstüne
  biner. İlk yazdığımda koşulu ters yazdım, boşluk arkada açıldı.
- **`cards()` tek kaynak.** Çizim ve fare aynı dikdörtgenleri okuyor.
- **Seçim ekranında boş tıklama kart seçmemeli.**
- **Denge tarayıcıda ölçülmez.** Oyun gerçek zamanlı; `Tools/test.mjs` aynı koşuyu
  milisaniyelerde bitiriyor.

## Yapılmadı

- Ses yok.
- Telefon denenmedi.
- Tek bölüm var. "Bölüm 2" diye bir şey, kayıt, koşular arası ilerleme yok.
- Patron yok — bölüm sadece süre dolunca bitiyor.
- Büyülerin birbiriyle birleşmesi (VS'teki evolution) yok.
