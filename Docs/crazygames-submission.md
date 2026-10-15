# Shadow Tower — CrazyGames gönderimi

`HOTICE-Notes/crazygames-yayin-rehberi.md` rehberine göre doldurulmuştur. Rehber Unity oyunları
için yazılmıştı; **bu oyun HTML5** ve farklı olan her satır aşağıda ayrıca işaretli.

---

## Game name

```
Shadow Tower
```

(12 karakter; sınır 35. Oyunun içindeki başlıkla aynı.)

## Short description

```
Hold the wall. Spells fire themselves — you choose which ones grow. Five minutes, one tower, and everything in the dark coming for it.
```

## Full description

**Paste-ready — düz metin, HTML yok:**

```
A wizard, a waist-high wall, and five minutes of everything in the dark walking towards it.

Your spells fire on their own. What you decide is which of them becomes something else. Every
level-up offers three cards, and a spell fed five times changes: Magic Bolt splits in two,
Fireball leaves the ground burning, Lightning starts leaping between targets. Feed two of them
far enough and they fuse into a spell that was not in your book at all.

You bring five spells and only four can be cast at once, so no two runs with the same loadout
play the same way.

Every stage has its own creatures and they are not all hurt by the same things. Spiders take
double from fire and shrug off lightning. Wurms are the other way round. The map tells you before
you press PLAY — reading it is the difference between a clear and a wall coming down.

- 12 places, 4 creature families, 3 bosses
- 10 spells, 48 upgrades, 41 transformations, 4 fusions
- Permanent spell levels and a 50-step hero ladder between runs
- Daily missions, a weekly streak, a free spin and two chests
- English and Turkish
- Plays on desktop and phone
```

## Controls

**Paste-ready:**

```
Mouse or touch: tap anywhere to speed up your casting. The spells aim themselves.
Tap a card to take it when you level up, or press 1, 2 or 3.
Space: speed up casting. Esc: pause. Tab: see what you are carrying.
```

## Category

**Action**

(Rehber: tek kategori. Bu bir dalga-hayatta kalma / survivors oyunu. Action yoksa sırayla
Arcade, Casual.)

## Tags (en fazla 5, liste CrazyGames'in)

Şu sıraya göre, listede olanı seç:

```
survival · magic (veya wizard) · upgrade · arcade · 1 player
```

---

## 1. Upload sayfası

| Alan | Cevap |
|---|---|
| Game name | `Shadow Tower` |
| Game engine | **HTML5** — *rehberdeki "Unity 6" bu oyun için geçerli değil* |
| Upload files | **Oyunun tamamı, `index.html` kökte olacak şekilde.** *Rehberdeki "sadece Build klasörü" Unity'ye özeldi.* Yüklenecekler sadece `index.html` ve `src/`. Toplam **399 KB, 20 dosya** (sınır 50 MB / 1500 dosya). |
| Does your game save progress? | **Yes** — CrazyGames SDK **Data modülü** kullanılıyor (`SDK.data.getItem/setItem`), localStorage'a da aynı anda yazılıyor (modül bir saniye geciktirmeli). |
| The game supports mobile devices | ☑ |
| The game is an online multiplayer game | ☐ |
| The game supports CrazyGames muting audio through SDK | ☑ — `addSettingsChangeListener` ile `muteAudio` dinleniyor ve **oyunun kendi ses düğmesini eziyor** |
| Sekme | **Basic** |

**Yüklenecek dosyalar** (`Tools/`, `Docs/`, `Logs/`, `.git` GİRMEZ):

```
index.html
src/*.js   (19 dosya)
```

## 2. QA sayfası (Basic Launch requirements)

| Madde | Cevap | Neden |
|---|---|---|
| Initial download size <50MB | otomatik ✓ | **399 KB** — mobil ana sayfa eşiği olan 20 MB'ın da çok altında |
| First gameplay start | otomatik ✓ | |
| First gameplay start implemented correctly | **Yes** | `gameplayStart()` koşu başlayınca çağrılıyor, açılışta değil; duraklatmada `gameplayStop()` |
| Complies to Gameplay requirements | **Yes** | açılışta reklam yok, **ara reklam hiç yok**, ödül sadece reklam tamamlanınca veriliyor |
| Runs on all CrazyGames domains | **Yes** | SiteLock yok |
| Browser checks | **Yes** | *önce Preview'den Chrome + Firefox'ta aç* |
| Device checks: Mobile | **Yes** | *önce QR ile telefonda oyna* — dokunmatik ve dikey ekran çalışıyor mu |
| No external ads | **Yes** | sadece CrazyGames SDK reklamları |
| Does not offer external login options | **Yes** | hesap/giriş yok |
| In-game mention of Terms & Conditions / Privacy Policy | **N/A** | veri toplanmıyor, hesap yok |

"Detected SDK functionalities" kutusunda görünmesi gerekenler: **Gameplay Start, Gameplay Stop,
Loading Start, Loading Stop, Get Item, Set Item, Mute audio support.** Reklamlar listede çıkmaz —
Basic Launch'ta reklamlar kapalıdır.

## 3. Details sayfası

| Alan | Ne yapılacak |
|---|---|
| Category | **Action** |
| Tags | Yukarıdaki beşten listede olanlar |
| Description | Yukarıdaki **Full description** bloğu, düz metin |
| Controls | Yukarıdaki **Controls** bloğu, düz metin |
| Google Play / iOS / Steam | **Boş bırak** — sadece CrazyGames |
| Marketing creatives URL | Boş bırak |
| Cover images | `Logs/cover/kapak_yatay_1920x1080.png`, `kapak_dikey_800x1200.png`, `kapak_kare_800x800.png` |
| Preview videos | Landscape `Logs/promo/video_yatay_1920x1080.mp4`, Portrait `Logs/promo/video_dikey_1080x1620.mp4` |
| Mobile orientation | **Her ikisi** — oyun ekranın oranına göre kendini kuruyor, derlemeden gelen bir kilit yok |
| The game works well in fullscreen | ☑ — tuval pencereyi dolduruyor |

## 4. Submit

Gönderdikten sonra "Awaiting review". Düzeltme isterlerse "Submit new version" ile dosyalar
yeniden yüklenir, metinler kalır.

## 5. Onaydan sonra

- Gelir paylaşımı teklifi: %50 serbest **veya 1 yıl web münhasır %60**.
  **Karar (23.09.2026): sadece CrazyGames'te yayınlanıyor, yani %60 münhasır alınacak.**
- Ödeme aylık, bakiye 100 €'yu geçince.

---

## Bu oyuna özel notlar

- **Ara reklam yok, sadece ödüllü reklam** (kullanıcı kararı). Her reklam oyuncunun bir butona
  basıp karşılığında butonda yazanı aldığı bir reklam: çark, iki sandık, koşu sonu 2× ödül, hız
  kilidi, enerji dolumu. Her biri günde 3.
- **Basic Launch'ta reklamlar kapalı.** SDK `adsDisabledBasicLaunch` dönüyor; `ads.ready()` bunu
  görüp **bütün reklam butonlarını gizliyor**, yani oyuncu basıp hiçbir şey olmayan bir butonla
  karşılaşmıyor. Enerji dolumu da gizleniyor — oyuncu takılmasın diye enerji zaten dakikada 2
  doluyor.
- **Kapakların sol üst köşesi boş** (rozet oraya basılıyor) — Potion Mix/Slime Rush notu.
- SDK **sadece portalda yükleniyor**: `localhost`, `127.0.0.1` ve `*.github.io` dışındaki her
  yerde script ekleniyor. Portal dışında yüklenirse SDK konsola kendi hatalarını basıyor.
- Safari'de denenmedi (bu makinede yok). Tuval + Web Audio kullanıyor, ikisi de Safari'de var,
  ama **QA'den önce bir kez Safari'de açılmalı**.

## Son kontrol listesi

- [ ] `node Tools/test.mjs` — bot ölçümüyle birlikte geçiyor
- [ ] `node Tools/overlap.mjs <url> 390 844 tr` — yazı çakışması yok
- [ ] `node Tools/peek.mjs ...` — konsol temiz
- [ ] Kapaklar ve videolar yeniden üretildi
- [ ] **Telefonda gerçekten oynandı**
- [ ] Safari'de bir kez açıldı
