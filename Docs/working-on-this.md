# Shadow Tower — bu projede çalışırken

Ortada bir kule, etraftan gelen düşmanlar, tıkladıkça hızlanan top, üç yükseltme. Siyah-beyaz,
siluet. Motor yok, derleme yok.

## Görünüm kuralı

**Tam iki mürekkep var:** soluk gökyüzü ve saf siyah. Hiçbir şey gölgelenmiyor, hiçbir şeyin
dokusu yok, hiçbir şey renkli değil. Bir nesne ya ışıktır ya da ışıktan kesilmiş bir şekil.

Bu bir eksiklik değil, tarz — ve dört projedir ilk kez sanatın yokluğunu saklamaya çalışmıyoruz.
Siluetin saklayacak bir şeyi yok: o bir şekildir, ve özenle çizilmiş bir şekil bitmiştir.

İki karar taşıyor:
- **Figürler her yönden gelmelerine rağmen ayakta çiziliyor.** Tepeden görülen şekil leke,
  yandan görülen şekil yaratıktır. Uzaktakiler küçük ve yukarıda, yakındakiler büyük ve aşağıda;
  her şey arkadan öne sıralanıp çiziliyor (`things.sort` → `y`).
- **Ufukta bir ağaç halkası var.** Hiçbir işe yaramıyor ve arenanın bir daire değil bir yer gibi
  görünmesinin yarısı o. Siluetin siluet olabilmesi için karşısında bir ufuk gerekiyor.

## Dosyalar ve komutlar

| yol | ne yapar |
| --- | --- |
| `src/rules.js` | Oyun. DOM yok, Node'da koşar. |
| `src/draw.js` | Görünen her şey + `buttons()` (fare de onu okuyor). |
| `src/main.js` | Döngü, fare, parçacıklar. |
| `Tools/test.mjs` | 22 kontrol + bot. |
| `Tools/look.mjs` | Tarayıcıda bot oynatıp belirli saniyelerde fotoğraf çeker. |

```sh
node Tools/test.mjs
node Tools/serve.mjs . 8050 0.0.0.0
node Tools/look.mjs http://localhost:8050/ Logs/look "5,45,120" 1280 720
```

## Bilinen ve çözülmemiş: ilk dakika tehlikesiz

Bot her ayarda **60. saniyede 100 canla** duruyor. Tek bir çarpanı değil, zorluk eğrisinin iki
eksenini birden süpürdüm (baskı böleni 36/48, düşman canı üssü 1.8-2.45): sekiz kombinasyonun
sekizinde de sonuç aynı.

Sebep tuning değil, **yapısal**: top hep en yakındakini vuruyor. Yani ya bütün dalgaya yetişiyor
ve hiçbir şey geçmiyor, ya da yetişemiyor ve her şey birden geçiyor. Arada bir bölge yok.

Denenen ve yetmeyen: koşuculara son 210 birimde hızlanma vermek (`SprintAt`). Sızıntı yaratması
gerekiyordu, top onları 210'a varmadan öldürüyor.

Açılışı yoğunlaştırmak ilk dakikayı tehlikeli yapar ama **yavaş tıklayanı 30 saniyede öldürür**
(2/sn tıklayan bot zaten 0:52'de ölüyor). Gerçek çözüm muhtemelen tek namlulu topu bırakmak:
birden fazla kule, ya da bir yöne nişan alan ve arkasını açık bırakan bir top.

Şu anki eğri: ortanca koşu **3:25**, 180. saniyede can 90.

## Tuzaklar

- **Ön yaydaki ağaçları ele.** Öndekiler en büyük çizilir, düğmelerin üstüne biner ve tam
  düşmanların yürüdüğü yere denk gelir. `front < 0.72` ile eleniyor — ilk yazdığımda koşulu ters
  yazdım ve boşluk hiçbir şeyin temizlenmesi gerekmeyen arkada açıldı.
- **`buttons()` tek kaynak.** Çizim ve fare aynı dikdörtgenleri okuyor.
- **Düğmeye tıklamak ateş etmemeli.** Ederse her satın alma yanlış tıklama gibi hissettiriyor.
- **Namlu ateşi şart.** O olmadan tıklamanın tek belirtisi bir yerden ayrılan nokta oluyor, ve
  tıklamak oyunun tamamı.
- **Tarayıcıda ölçme.** Oyun gerçek zamanlı; `look.mjs` ile 2 dakikalık koşu 2 dakika sürüyor ve
  swiftshader yüzünden oyun içi süre duvar saatinin ~%60'ı. Denge `Tools/test.mjs` ile ölçülür.

## Yapılmadı

- Ses yok.
- Telefon denenmedi (yerleşim pencereye göre ölçekleniyor, dikeyde dar kalır).
- Kayıt, en iyi skor, koşular arası ilerleme yok.
- Tek dalga tipi, üç düşman, üç yükseltme. Bu bir görünüm denemesi.
