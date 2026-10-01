# Timegami — Proje Rehberi (CLAUDE.md)

Bu dosya, Timegami projesinin bağlamını, alınan kararları ve yol haritasını içerir. Bu projede çalışan her oturum önce bu dosyayı okumalıdır.

**Dil:** Proje sahibi Türkçe konuşuyor. Kullanıcıyla Türkçe iletişim kur. Kod, değişken adları, commit mesajları ve kod içi yorumlar İngilizce olsun (global ürün).

---

## 1. Fikrin doğuşu

Proje sahibi, arkadaşlarıyla "günün her dakikasında tuvalete gitme" iddiasına girdi: günün 1.440 dakikasının her birinde en az bir kez işemiş olmak. Gerçekleştiği dakikaları elle Excel'e kaydediyor. Amaç bunu otomatikleştirmek ve herkesin oynayabileceği global bir mobil oyuna dönüştürmek.

Aynı mekanik başka olaylara da uygulanabilir: günün her dakikasında öpüşmek, bir 90 dakikalık maçın her dakikasında gol görmek, yılın her gününde bir şey yapmak vb.

## 2. Ürün tanımı (tek cümle)

**Timegami: bir zaman ızgarası seç, bir olay belirle, olay her gerçekleştiğinde o anın hücresini işaretle, ızgarayı tek başına ya da arkadaşlarınla doldur.**

İsim "time + origami" ve NFL'deki "Scorigami" kavramından (daha önce hiç oluşmamış skorları yakalamak) esinlenir: zamanın her hücresini doldurma sanatı.

## 3. Pazar araştırması özeti (Ekim 2026)

- **ClockCounter (iOS):** En yakın rakip. 1.440 dakikayı işaretleme, skor tablosu, bildirim, istatistik. Ama özel olay tanımlanamıyor, sadece dakika ızgarası var, özel oda yok, neredeyse hiç kullanıcı değerlendirmesi yok.
- **Minutiae:** Her gün rastgele bir dakikada fotoğraf; 1.440 kareye ~4 yılda ulaşılıyor. Uzun soluklu "dakika toplama" fikrinin ilgi gördüğünün kanıtı, ama tek kişilik sanat projesi.
- **Life Grid:** Hayatı 5.200 haftalık ızgara olarak renklendirme. Görsel benzer, oyun/sosyal yok.
- **Futbol bingo uygulamaları** (Football Bingo, MatchBingo, 90 MINUTES): Olay bazlı (korner, kart), dakika ızgarası bazlı değil.

**Farkımız:** (1) Olayı kullanıcı tanımlar, (2) zaman ölçeği dinamik ve ayarlanabilir, (3) arkadaşlarla ortak veya rekabetçi odalar. Bu üçlü birleşim pazarda yok.

## 4. Temel kavramlar (domain model)

### 4.1 Izgara (Grid)
Bir zaman ölçeğini hücrelere böler. Desteklenecek tipler:

| Tip | Hücre sayısı | Örnek hücre |
|---|---|---|
| `minute_of_day` | 1.440 (24×60) | 03:47 |
| `day_of_year` | 366 (29 Şubat dahil) | 14 Mart |
| `match_minute` | 90 (opsiyonel +uzatmalar, 120'ye kadar) | 67' |
| `hour_of_week` | 168 (7×24) | Salı 14:00 |
| `custom` | Kullanıcı tanımlı birim + aralık | — |

Kritik fonksiyon: `timestampToCell(timestamp, gridType, timezone) -> cellIndex`. Tüm işaretleme mantığı bu saf fonksiyona dayanır ve kapsamlı birim testleri olmalı (DST geçişleri, artık yıl, gece yarısı sınırları).

### 4.2 Oyun (Game)
- `eventName`: Takip edilen olay ("Tuvalet", "Öpücük", "Gol"), emoji/ikon ile
- `gridType` + ayarları
- `mode`: `solo` | `competitive` (herkesin kendi tahtası) | `cooperative` (herkes aynı tahtayı birlikte doldurur)
- `winCondition`: `blackout` (tüm hücreler) | `line` (ör. bir saatin 60 dakikası) | `first_to_n` | `most_in_period` (süre sonunda en çok dolduran)
- `startAt`, opsiyonel `endAt`
- `timezonePolicy`: `player_local` (varsayılan) | `room_fixed`

### 4.3 İşaret (Mark)
- `gameId`, `userId`, `cellIndex`
- `occurredAt` (UTC) + o anki oyuncu saat dilimi
- `source`: `live` (tek dokunuş, şu an) | `manual` (geçmişe dönük giriş) | `import` (Excel/CSV)
- Aynı hücreye birden fazla işaret olabilir (istatistik için sayılır), ama hücre bir kez "dolu" sayılır.

### 4.4 Oda (Room)
- Davet kodu / link ile katılım
- Üyeler, canlı skor tablosu, aktivite akışı ("Ahmet 03:47'yi kaptı!")
- Dürüstlük: güven esaslı sistem; üyeler bir işarete "itiraz" edebilir (MVP sonrası).

## 5. Önemli tasarım kararları

1. **Saat dilimi:** Varsayılan olarak her oyuncunun yerel saati geçerlidir (`player_local`). Oda kurucusu isterse sabit bir saat dilimi seçebilir. Zaman damgaları her zaman UTC saklanır; hücre, kayıt anındaki saat dilimiyle hesaplanıp da saklanır (oyuncu seyahat ederse eski işaretler değişmesin).
2. **Tek dokunuş önceliklidir:** Ana ekrandaki büyük "Şimdi oldu!" butonu uygulamanın kalbidir. Widget ve kilit ekranı kısayolu ileride eklenecek.
3. **Uzun soluklu oyun:** Oyunlar aylar/yıllar sürebilir. Motivasyon araçları: ısı haritası, eksik hücre listesi, zor hücreler için hatırlatma (ör. 04:00 civarı), seriler, rozetler.
4. **Excel içe aktarma:** Proje sahibinin mevcut verisi Excel'de. MVP'de CSV/XLSX içe aktarma olmalı (tarih-saat sütunu seç → işaretlere dönüştür).

## 6. MVP kapsamı

**Dahil:**
- Hesap açma / giriş (e-posta + Apple/Google ile giriş)
- Oyun oluşturma: olay adı + ikon, ızgara tipi (`minute_of_day`, `day_of_year`, `match_minute`), kazanma koşulu
- Tek dokunuşla işaretleme + geçmişe dönük manuel giriş
- Izgara görünümü (ısı haritası tarzı, yakınlaştırılabilir; 1.440 hücre mobilde okunaklı olmalı, ör. 24 satır × 60 sütun)
- İlerleme: dolu/boş sayısı, yüzde, eksik hücre listesi
- Arkadaş odası (rekabetçi mod): davet linki, skor tablosu, push bildirim
- Excel/CSV içe aktarma
- İngilizce + Türkçe arayüz (i18n baştan kurulmalı)

**MVP sonrası:** Ortak (cooperative) mod, `hour_of_week` ve `custom` ızgaralar, futbol veri API'siyle otomatik gol dakikası, itiraz sistemi, widget'lar, rozetler, paylaşılabilir ızgara görselleri, global herkese açık meydan okumalar.

## 7. Önerilen teknik altyapı

Kesinleşmedi, ilk oturumda proje sahibiyle teyit et:

- **Mobil:** React Native + Expo (TypeScript) — tek kod tabanıyla iOS + Android
- **Backend:** Supabase (Postgres, Auth, Realtime oda güncellemeleri, Row Level Security, Edge Functions)
- **Bildirim:** Expo Notifications
- **Tarih/saat:** `date-fns` + `date-fns-tz` (veya Temporal polyfill)
- **Durum yönetimi:** TanStack Query (sunucu durumu) + Zustand (yerel durum)
- **Test:** Jest; `timestampToCell` ve kazanma koşulları için kapsamlı birim testleri
- **i18n:** `i18next` / `react-i18next`

Öneri dizin yapısı:
```
/app            # Expo Router ekranları
/src/domain     # Saf iş mantığı: grids, cells, win conditions (UI'dan bağımsız, test edilir)
/src/features   # games, rooms, marks, import
/src/components
/src/lib        # supabase client, i18n, utils
/supabase       # migrations, RLS politikaları, edge functions
```

## 8. Yol haritası (ilk adımlar)

1. Teknik altyapıyı proje sahibiyle teyit et, Expo projesini kur.
2. `src/domain` içinde ızgara tipleri ve `timestampToCell` fonksiyonunu testleriyle yaz.
3. Supabase şeması: `profiles`, `games`, `game_members`, `marks`, `rooms` + RLS.
4. Solo oyun akışı: oyun oluştur → "Şimdi oldu!" → ızgara görünümü.
5. Excel/CSV içe aktarma.
6. Odalar, davet linki, skor tablosu, bildirimler.
7. Cilalama, i18n, mağaza hazırlığı (App Store + Google Play).

## 9. Çalışma kuralları

- Domain mantığını UI'dan ayrı ve saf tut; önce testi yaz.
- Zaman hesaplarında asla cihazın yerel saatine örtük olarak güvenme; saat dilimini her zaman açıkça geçir.
- Büyük kararlarda (veri modeli değişikliği, yeni bağımlılık) önce proje sahibine sor.
- Her anlamlı adımdan sonra bu dosyanın "Yol haritası" ve "Kararlar" bölümlerini güncel tut.

## 10. Açık sorular

- Teknik altyapı onayı (Expo + Supabase?)
- Gelir modeli: ücretsiz + premium (sınırsız oda, özel ızgaralar, temalar)?
- Marka kontrolü: App Store / Google Play isim müsaitliği, alan adı (timegami.app / .com), TÜRKPATENT / EUIPO / USPTO tescili.
- Proje sahibinin mevcut Excel dosyasının formatı (içe aktarma için örnek gerekli).
