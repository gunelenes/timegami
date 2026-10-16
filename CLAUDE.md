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

Kavramsal hiyerarşi: **Oda (Room) = bir Challenge.** Tek başına oynamak, tek üyeli bir odadır; ayrı bir "solo" yapısı yoktur.

### 4.1 Challenge türleri (`kind`)

| | `collection` (Origami) | `streak` (Takvim) |
|---|---|---|
| Örnek | Günün her dakikası, 90 dakikanın her dakikası | 365 gün her gün koşmak |
| Hücre neyi temsil eder | Döngü içindeki konum (03:47, 67') | Takvimdeki belirli bir dönem (12 Mart 2027) |
| Kaçırma | Önemsiz, sonraki döngüde doldurulur | Streak bozulur, ama oyuncu kayıt girmeye **devam edebilir** |
| Süre | Sınırsız; yıllar sürebilir, oyuncuya kalmış | Başlangıç tarihi + hücre sayısı kadar |
| Metrikler | Doluluk %, yeni hücre anı, eksik hücreler | Mevcut streak, en uzun streak, toplam dolu gün |

### 4.2 Izgara yapılandırması (dinamik)
- `cellUnit`: `minute` | `hour` | `day`
- `cellStep`: hücre başına birim sayısı (ör. 10 → "her 10 dakika")
- `cellCount`: hücre sayısı (ör. 1.440, 144, 90, 365)
- `clock`: hücrenin nasıl belirlendiği
  - `wall_day` / `wall_week` / `wall_year`: hücre, kayıt anının yerel saatinden hesaplanır ("Şimdi oldu!" butonu çalışır). Ör. günün dakikaları → `wall_day`, minute, step 1, 1.440 hücre.
  - `free`: saatle bağlantı yok; oyuncu hücreyi kendisi seçer. Ör. 90 dakikalık maç → minute, step 1, 90 hücre. **Kronometre/maç saati yok** (proje sahibi kararı); kişi gol 67'de olduysa 67'ye dokunur. Tamamlanma süresi tamamen oyuncuya kalmış.
  - `calendar`: `streak` türü için; `startDate`'ten itibaren her hücre ardışık bir takvim dönemidir.
- `targetPerCell`: varsayılan 1.
- UI'da hazır şablonlar + "Özelleştir".

Kritik saf fonksiyon: `timestampToCell(timestamp, config, timezone) -> cellIndex | null`. Kapsamlı birim testleri şart (DST geçişleri, artık yıl, gece yarısı sınırları).

### 4.3 Tahta görünümleri
- **Büyük ızgaralar (1.500+ hücre, ör. haftanın her dakikası = 10.080):** tek dev ızgara yerine bölümler (`buildSections`, `src/domain/layout.ts`): hafta → günler (her gün 24×60), uzun seri → 52 haftalık bloklar, diğerleri → 500'lük bloklar. Her bölüm bir ilerleme çubuğu; "şu an"ı içeren bölüm "Şu an" etiketiyle açık gelir, diğerleri dokununca açılır (`src/features/board/board-sections.tsx`).
- "Şimdi oldu!" kartındaki rozet: şu anki hücrede kaydın yoksa "Boş hücre!", varsa "Burası dolu (×n)".
- **Kendi tahtam:** Sadece benim kayıtlarım, benim rengimle.
- **Ortak tahta:** Odadaki herkesin kayıtları. Bir hücreyi birden fazla kişi doldurduysa hücre **paylaşılır**: her oyuncu kendi rengiyle (dilim/nokta) görünür.
- Oyuncu iki görünüm arasında geçiş yapabilir.
- Hücreye dokununca detay: kim (nickname + renk), tarih-saat, saat dilimi, kaynak (`live`/`manual`), not; aynı hücredeki tüm kayıtlar listelenir.

### 4.4 Kayıt (Mark)
- `roomId`, `uid`, `cellIndex`
- `occurredAt` (UTC) + kayıt anındaki saat dilimi; `cellIndex` kayıt anında hesaplanıp saklanır (seyahat eski kayıtları değiştirmez)
- `source`: `live` (şu an) | `manual` (geçmişe dönük / serbest seçim)
- `note` (opsiyonel)
- Aynı hücreye birden fazla kayıt olabilir (istatistik için sayılır), hücre oyuncu için bir kez "dolu" sayılır.
- Geçmişe dönük kayıt serbesttir (her iki türde de).

### 4.5 Oda (Room) ve üyeler
- Oda sahibi challenge'ı (isim, emoji, yapılandırma) oluşturur, **davet kodu** üretilir. Sahip kodu istediği an yenileyebilir (eski kod geçersiz olur).
- Her katılımcı **her oda için ayrı bir nickname** girer.
- Her üyeye odada benzersiz bir **renk** atanır (renk körlüğüne uygun palet; palet boyutu oda kapasitesini belirler).
- Aktivite akışı, skor tablosu, push bildirim ("Ahmet 03:47'yi kaptı!").
- Dürüstlük: **tamamen güvene dayalı**. Kanıt (fotoğraf) / itiraz sistemi ileride eklenebilir.

## 5. Önemli tasarım kararları

1. **Saat dilimi:** Her oyuncunun yerel saati geçerlidir. Zaman damgaları UTC saklanır; hücre kayıt anındaki saat dilimiyle hesaplanıp saklanır.
2. **Tek dokunuş önceliklidir:** `wall_*` ızgaralarda ana ekrandaki büyük "Şimdi oldu!" butonu uygulamanın kalbidir. `free` ızgaralarda hücreye dokunarak kayıt.
3. **Uzun soluklu oyun:** Motivasyon araçları: "yeni hücre!" kutlaması, ısı haritası, eksik hücre listesi, zor hücre hatırlatmaları, rozetler, paylaşılabilir ızgara görseli.
4. **Kimlik:** Hesap zorunlu değil; Firebase **anonim giriş** ile başlanır, veriler Firestore'da sunucuda tutulur (cihazda offline önbellek). İleride e-posta / Apple / Google hesabı anonim hesaba bağlanabilir (veri kaybı olmadan).
5. **İçe aktarma yok:** Excel/CSV içe aktarma kapsam dışı (proje sahibi kararı).

## 6. MVP kapsamı

**Dahil:**
- Anonim giriş
- Challenge/oda oluşturma: isim + emoji, tür (`collection`/`streak`), dinamik ızgara yapılandırması, hazır şablonlar
- Davet kodu ile katılma, oda bazlı nickname, otomatik renk; sahip için kod yenileme
- "Şimdi oldu!" + hücreye dokunarak / geçmişe dönük kayıt
- Kendi tahtam / ortak tahta geçişi, paylaşımlı hücreler, hücre detay paneli
- İlerleme: doluluk %, eksik hücreler; streak türünde mevcut/en uzun streak
- Arayüz dilleri: İngilizce (varsayılan), Türkçe, Almanca, İspanyolca, Fransızca; Ayarlar'dan seçilir, varsayılan cihaz dili

**MVP sonrası:** Hesap bağlama (e-posta/Apple/Google), push bildirimler, kanıt/itiraz sistemi, widget'lar, rozetler, paylaşılabilir görseller, herkese açık challenge'lar.

## 7. Teknik altyapı

- **Mobil:** React Native + Expo (TypeScript), Expo Router — **onaylandı**
- **Backend:** Firebase (Auth anonim, Firestore, Security Rules) — **onaylandı**. Proje: `timegami-206fe`.
- **Firebase SDK:** Firebase JS SDK (`firebase` v12), Auth kalıcılığı AsyncStorage ile. Expo Go'da çalışır. Çevrimdışı önbellek ve iOS Keychain kalıcılığı gerekirse `@react-native-firebase`'e geçilebilir; Firebase erişimi `src/lib/firebase.ts` ve `src/features/*/api.ts` içinde izole.
- **Config:** `.env.local` (gitignore'da) içinde `EXPO_PUBLIC_FIREBASE_*`; şablon `.env.example`.
- **Cloud Functions yok (şimdilik):** Blaze (ücretli) plan gerektirir. Katılma/renk atama istemci transaction'ı + `firebase/firestore.rules` ile korunuyor.
- **Bildirim:** Expo Notifications / FCM
- **Tarih/saat:** Bağımlılık yok; `Intl.DateTimeFormat` ile açık saat dilimi (`src/domain/time.ts`)
- **Durum yönetimi:** TanStack Query + Zustand (kesinleşmedi)
- **Test:** Jest
- **i18n:** `i18next` / `react-i18next`. Diller: `src/lib/i18n.ts` (`SUPPORTED_LANGUAGES`), metinler `src/locales/{en,tr,de,es,fr}.json`. Çoğul için `_one`/`_other` anahtarları. `src/locales/__tests__` tüm dillerin İngilizce ile aynı anahtar ve `{{yer tutucu}}` setine sahip olduğunu test eder; yeni metin eklerken 5 dosyaya da ekle. Tarih biçimi uygulama diline uyar (`appLocale()`).
- **Tema sistemi (Ekim 2026 kararı):** Çoklu temaya hazır altyapı, şimdilik tek tema: **"playful" (A: canlı/oyunsu)**, açık + koyu paleti var. Tanımlar `src/theme/themes.ts` (renk token'ları, fontlar, köşe yarıçapı, `depth` = buton/kart altındaki 3D çıkıntı). Ekranlar sadece `useAppTheme()` / `useTheme()` token'larını okur, tema id'sine bakmaz. Yeni tema = `THEMES`'e yeni bir tanım; Ayarlar'daki tema seçici 2+ tema olunca kendiliğinden görünür. Planlanan: B "gece neon" (karanlık mod adayı), C "origami kâğıdı" (belki premium). Taslaklar: https://claude.ai/artifact/FERoZMSDTzyT982TERfr9q
- **Logo (16 Ekim 2026, son karar): "Hücre çemberi" varyant E** — sarı #FFC93C zemin, 9×9 hücreden bir disk; hücreler saat 12'den saat yönünde mor (#6C3BFF) dolu, beyaz "şimdi" dilimi, kalanlar boş (krem #FFE7A3); ortada saatin merkezi olarak kırmızı (#F0434A) nokta. Önceki "Saat tik" logosunun (13 Ekim) yerini aldı. Wordmark: "Time" + mor "gami" (Fredoka). Uygulama içi: `src/components/logo.tsx` (`LogoMark`, `Wordmark`, `LOGO_BACKGROUND`). Cihaz/mağaza dosyaları `assets/brand/` (icon 1024 RGB, Android adaptif ön/arka/tek renk katmanları, splash-icon, favicon) `npm run brand:build` ile üretilir (`scripts/build-brand-assets.js`, yerel Chrome/Edge başsız modda; geometri `logo.tsx` ile aynı tutulmalı). iOS da `icon.png` kullanıyor (Icon Composer `assets/expo.icon` kullanılmıyor). Tüm adaylar ve renk varyantları (A–H): https://claude.ai/artifact/UFC5bGEQp9srsCS4KYKfUu
- **Rozet kutlamaları** oda başına bir kez: kutlananlar cihazda saklanır (`timegami.celebratedBadges.v1.<oda>.<uid>`, `src/features/room/use-badge-celebrations.ts`).
- **Paket kimliği (13 Ekim 2026, değiştirilemez):** iOS `bundleIdentifier` ve Android `package` = `com.timegami.app` (`app.json`). iOS: `supportsTablet: false`, `usesNonExemptEncryption: false` (ihracat uyumluluğu sorusunu atlar).
- **EAS Build:** `eas.json` profilleri: `preview` (dahili dağıtım, Android APK; arkadaşlarla test) ve `production` (mağaza, sürüm numarası EAS'ta otomatik artar, `appVersionSource: remote`). Firebase `EXPO_PUBLIC_FIREBASE_*` değişkenleri bulut derlemesinde `.env.local`'dan okunmaz; EAS ortam değişkeni (preview + production) olarak tanımlanmalı.
- **Gizlilik / KVKK (13 Ekim 2026):** Veri sorumlusu Enes Günel, iletişim enesgunel@enesgunel.com. Firestore bölgesi `eur3` (AB: Belçika + Hollanda); Auth Google küresel. Analitik/reklam/izleme yok (Firebase projesinde GA bağlı ama kodda kullanılmıyor) → çerez/rıza ekranı gerekmiyor; sadece **aydınlatma** (ilk açılışta `src/app/welcome.tsx`, onay kutusu yok; `Stack.Protected` ile kabul edilmeden hiçbir ekran/anonim giriş çalışmaz). Metinler tek kaynak: `src/legal/<dil>.json` (gizlilik + kullanım koşulları, 5 dil; `LEGAL_VERSION` artırılırsa bildirim yeniden gösterilir). Uygulama içi `/legal/privacy`, `/legal/terms`; web sayfaları `npm run legal:build` → `legal-site/` (Firebase Hosting, `firebase.json`). Challenge'dan ayrılma / silme (oda ekranının altı): `leaveRoom()` (kendi kayıtları + üyelik silinir; sahip ayrılırsa sahiplik en eski üyeye geçer) ve sahip için `deleteRoom()` (herkes için: tüm kayıtlar, üyeler, davet kodu, oda; diğer oyuncuların ana ekran listesindeki kalıntı kayıt `subscribeMyRooms` içinde temizlenir). Hesap silme: Ayarlar → `deleteAccount()` (`src/features/rooms/api.ts`: kayıtlar, üyelikler, sahiplik devri veya tek kişilik oda silme, Auth kullanıcısı) + yerel veriler. **Avukata sorulacaklar:** KVKK m.9 yurt dışı aktarım (standart sözleşme), "tuvalet" gibi odaların sağlık verisi sayılma riski, yaş sınırı.
- **Tercihler:** dil, görünüm (otomatik/açık/koyu), tema → `src/lib/preferences.tsx` (AsyncStorage, `timegami.preferences.v1`). Uygulama tercihler ve fontlar yüklenene kadar splash ekranda bekler.
- **UI paketleri:** `@expo-google-fonts/fredoka` + `nunito` (başlık/gövde fontu), `react-native-svg` (ikonlar `src/components/icon.tsx`, ilerleme halkası), `expo-haptics` (`src/lib/haptics.ts`), `expo-linear-gradient` (kuruldu, henüz kullanılmıyor). Animasyonlar Reanimated ile (`src/components/motion.tsx`: konfeti `Burst`, `Pulse`; "hareketi azalt" ayarına uyar).

Firestore taslağı:
```
rooms/{roomId}                 name, emoji, config{kind,clock,unit,step,cellCount,startDate?}, ownerId, inviteCode,
                               memberColors{uid: color} (üyelik listesi + renk benzersizliği), createdAt
rooms/{roomId}/members/{uid}   nickname, color, inviteCode (katılırken kullanılan), joinedAt
rooms/{roomId}/marks/{markId}  uid, cellIndex, occurredAt (UTC ms), timeZone, source, note?, createdAt
inviteCodes/{CODE}             roomId   (sadece tam kodla `get`; listelenemez)
```
İleride (Blaze plan ile): `rooms/{roomId}/board/state` özet belgesi, okuma maliyetini düşürmek için.

Dizin yapısı:
```
/src/app        # Expo Router ekranları (Expo SDK 57 şablonu: rotalar src/app altında)
/src/domain     # Saf iş mantığı: grid, cells (timestampToCell), progress (streak), room (renk, kod, nickname) + __tests__
/src/features   # rooms/ (api.ts Firestore işlemleri, hooks.ts), board/ (ızgara + hücre paneli)
/src/components
/src/lib        # firebase.ts, i18n.ts, locale.ts (cihaz saat dilimi/dili)
/src/locales    # en.json, tr.json
/firebase       # firestore.rules (deploy: firebase.json, .firebaserc)
```

## 8. Yol haritası

1. ✅ Teknik altyapı (Expo SDK 57 + Firebase JS SDK) ve Expo projesi (Ekim 2026).
2. ✅ `src/domain`: ızgara yapılandırması, `timestampToCell`, streak/ilerleme, renk/kod/nickname + testler (`npm test`).
3. ✅ Firebase: `src/lib/firebase.ts`, `src/features/rooms/api.ts`, `firebase/firestore.rules`. Anonymous giriş açık, kurallar deploy edildi (`npx firebase-tools deploy --only firestore:rules`); oluştur/katıl/kayıt/kod yenileme ve yetki reddi senaryoları gerçek projede uçtan uca doğrulandı (Ekim 2026).
4. 🟡 Ekranlar yazıldı (Ekim 2026), cihazda henüz denenmedi: `src/app/index.tsx` (odalarım), `create.tsx` (şablonlar + özel yapılandırma), `join.tsx` (kod + nickname, `timegami://join?code=` linki), `room/[id].tsx` (ızgara, "Şimdi oldu!", benim/ortak tahta, ilerleme/streak, oyuncu sıralaması, davet kodu paylaş/yenile). Izgara: `src/features/board/board-grid.tsx` (hücre küçükse satıra dokunup yakınlaştırma, paylaşımlı hücre = renk şeritleri), `cell-sheet.tsx` (hücre detayı, not ile kayıt, kendi kaydını silme). i18n: `src/lib/i18n.ts`, `src/locales/*.json`. Kullanıcının oda listesi: `users/{uid}/rooms/{roomId}`.
4b. ✅ A tasarımı + tema altyapısı + 5 dil (Ekim 2026): yeni ana ekran (oda kartları, boş durum, ayarlar butonu), oda ekranı ("Şimdi oldu!" kartı + konfeti/titreşim, istatistik kutuları, ızgara kartı, oyuncu sıralaması, davet kartı), Ayarlar ekranı (`src/app/settings.tsx`). Cihazda henüz denenmedi.
4c. ✅ Hızlı kazanımlar + motivasyon (13 Ekim 2026): takma ad değiştirme (oyuncu listesinde kalem), "Sıradaki boş: 14:52 · 15 dk sonra" ipucu, eksik hücre aralıkları listesi, ısı haritası görünümü (Benim / Ortak / Isı), son hareketler akışı, rozetler (`src/domain/badges.ts`; saklanmaz, hücrelerden hesaplanır) + yeni rozet kutlama ekranı, saat tamamlanınca "03:00 saati tamamlandı!", yerel seri hatırlatmaları (20:00, `expo-notifications`, sunucusuz; Ayarlar'da anahtar), paylaşılabilir 9:16 ızgara görseli (`react-native-view-shot` + `expo-sharing`, oda başlığındaki paylaş simgesi). Saf mantık: `src/domain/insights.ts`. Arayüz: `src/features/room/*`. **Karar:** arkadaş bildirimleri ("Ahmet 03:47'yi kaptı") Blaze plan + Cloud Functions gerektirdiği için şimdilik yok.
4d. ✅ Mağaza hazırlığı (16 Ekim 2026):
   - **Moderasyon (App Store kural 1.2):** oyuncu satırındaki "⋯" menüsünde herkes için "Oyuncuyu bildir", sahip için "Challenge'dan çıkar" var. Sahip olmayanlar oda ekranının altında "Challenge'ı bildir" görür.
   - `removeMember()` çıkarılan oyuncunun kayıtlarını ve üyeliğini siler, davet kodunu da yeniler; böylece eski kodla geri dönülemez. Kural: `isRemoval`, deploy edildi ve gerçek projede test edildi.
   - Bildirim, `CONTACT_EMAIL` adresine hazır doldurulmuş bir e-posta açar (`src/features/room/report.ts`).
   - Yasal sayfalar Firebase Hosting'de yayında: https://timegami-206fe.web.app (`/privacy.html`, `/terms.html`, `/<dil>/...`). timegami.com proje sahibine ait; ileride Hosting'e özel alan adı olarak bağlanacak.
   - EAS projesi: `@enesgunel/timegami` (`extra.eas.projectId`). Firebase değişkenleri EAS'ta preview + production ortamlarında tanımlı.
   - Android bildirim ikonu: `assets/brand/notification-icon.png` (`expo-notifications` eklentisi).
   - Expo yama sürümleri güncellendi, `expo-doctor` 21/21 kontrolden geçti.
   - `npx expo lint` çalışıyor ama React Compiler kurallarından 9 eski hata veriyor (efekt içinde `setState`, render sırasında `Date.now()`); yayını engellemiyor, sonra temizlenecek.
5. Telefonda deneme ve düzeltmeler (Hermes'te `Intl` saat dilimi/`formatToParts` desteğini doğrula), nickname değiştirme UI'ı, hesap bağlama (Apple/Google).
6. Cilalama, i18n, mağaza hazırlığı.

## 9. Çalışma kuralları

- Domain mantığını UI'dan ayrı ve saf tut; önce testi yaz.
- Zaman hesaplarında asla cihazın yerel saatine örtük olarak güvenme; saat dilimini her zaman açıkça geçir.
- Büyük kararlarda (veri modeli değişikliği, yeni bağımlılık) önce proje sahibine sor.
- Her anlamlı adımdan sonra bu dosyanın "Yol haritası" ve "Kararlar" bölümlerini güncel tut.

## 10. Açık sorular

- Anonim kullanıcının uygulamayı silip geri yüklediğinde verisine dönmesi (bkz. oturum notları; Android'de garanti yok).
- Oda kapasitesi şimdilik 12 (renk paleti boyutu); proje sahibi itiraz etmedi.
- Gelir modeli: ücretsiz + premium?
- Marka kontrolü: mağaza isim müsaitliği, alan adı, TÜRKPATENT / EUIPO / USPTO.

## 11. Kaldığımız yer (12 Ekim 2026)

**Durum:** Yol haritasının 1–3. adımları bitti, 4. adımın (ekranlar) kodu yazıldı ve A tasarımıyla yenilendi (12 Ekim 2026), ama **telefonda hiç denenmedi**. Tüm iş **commit edilmedi**; proje sahibi kontrol ettikten sonra tek seferde commit edilecek.

**Doğrulananlar:** 62 test (`npm test`: domain + çeviri dosyaları), `npx tsc --noEmit` hatasız (yeni rota eklenince tipler `expo start` ile yeniden üretilir), Android bundle derlemesi (`npx expo export --platform android`), web SSR'da ana sayfa/oluştur/katıl ekranlarının Türkçe metinlerle oluşması, Firestore kurallarının gerçek projede uçtan uca testi (21 senaryo).

**Sonraki oturumda ilk iş:**
1. Proje sahibinin telefonda Expo Go ile denemesi. Önerilen: aynı Wi-Fi'de `npx expo start --clear` (tünelsiz). Bakılacaklar: "Şimdi oldu!" butonundaki saat doğru mu (Hermes `Intl` saat dilimi / `formatToParts` desteği, özellikle Android), oda oluşturma, kayıt atma, ızgara performansı (1.440 hücre), hücre detay paneli.
2. Gelen hata/ekran görüntülerine göre düzeltmeler.
3. Sonra: nickname değiştirme UI'ı (`renameInRoom` API'si hazır), hesap bağlama (Apple/Google), ESLint kurulumu (projede yok; `npx expo lint` "Cannot find module 'eslint'" veriyor).

**Bilinen ortam notları:**
- `npx expo start --tunnel`: `@expo/ngrok` global kurulunca Expo bulamıyordu; projeye devDependency olarak eklendi. Buna rağmen tünel `failed to start tunnel` ile açılmadı (ngrok.exe çalışıyor; sebep ngrok servisi/güvenlik duvarı/ağ olabilir). Alternatif: aynı Wi-Fi veya bilgisayarın mobil hotspot'u.
- Port 8081'i başka bir `node.exe` tutuyordu (muhtemelen eski bir Metro); Expo 8082'yi kullanıyor.
- npm 12 kurulum script'lerini varsayılan olarak engelliyor (`protobufjs`, `unrs-resolver` uyarıları); şimdiye kadar sorun çıkarmadı.
- Proje OneDrive klasöründe; `node_modules` senkronizasyonu yavaşlık yaratabilir, repoyu OneDrive dışına taşımak önerildi. **Görülen sorun (12 Ekim):** OneDrive dosyaları "yer tutucu" (reparse point) yapınca Jest bazı test dosyalarını sessizce atladı (`locales.test.ts`; dosya yeniden yazılınca düzeldi). Test sayısı beklenenden azsa önce buna bak. Aynı sebeple Metro da dosya bulamadı ("Unable to resolve @/theme/theme-provider"). **Çözüm (12 Ekim):** proje sahibi OneDrive'ı kapattı (otomatik başlatma kapalı, işlem durduruldu), yer tutucu dosyalar normal dosyaya çevrildi, `node_modules` silinip `npm ci` ile temiz kuruldu. Benzer hata tekrar olursa: `Get-Process OneDrive` ile OneDrive açık mı bak.
- Firestore'da iki test odası kaldı: "E2E test - safe to delete" (`uBEzQKhpTwrOwzeYs8gX`, davet kodu `TI95M9`) ve "E2E delete repro - safe to delete" (`ZPcLrgYETzakQmrg7DPs`, kod `ZZCB0HJD`). Ayrıca Authentication'da 3 eski anonim test kullanıcısı var. Hepsi konsoldan silinebilir (oda + alt koleksiyonlar + `inviteCodes/<kod>`).
- Kurallar değişince: `npx firebase-tools deploy --only firestore:rules` (CLI girişi yapılı). **16 Ekim 2026:** ayrılma, oda silme ve sahiplik devri kuralları yazılmış ama deploy edilmemişti (yayındaki sürüm 6 Ekim tarihliydi), bu yüzden telefonda challenge silme `permission-denied` verdi. Deploy edildi ve gerçek projede doğrulandı: tek başına silme, üyenin ayrılması, sahibin ayrılıp devretmesi, yeni sahibin herkes için silmesi, eski sahibin silememesi. `firebase/firestore.rules` her değiştiğinde deploy etmeyi unutma.
