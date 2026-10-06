import type { HelpContent } from "@/components/feature/admin/help-dialog-button";
import type { AdminHelpKey } from "./index";

const S = {
  when: "Ne zaman kullanılır",
  fields: "Yönetilen alanlar",
  flows: "Sık yapılan işler",
  pitfalls: "Dikkat / tuzaklar",
  related: "İlgili sayfalar",
};

export const HELP_TR: Partial<Record<AdminHelpKey, HelpContent>> = {
  dashboard: {
    title: "Genel Bakış (Dashboard)",
    purpose:
      "Platformun anlık nabzı: gelir, kullanıcı aktivitesi, üretim hacmi ve sistem sağlığı tek ekranda. Sabah kontrolü ve olay takibi için ilk açılacak sayfadır.",
    sections: [
      {
        heading: S.when,
        bullets: [
          "Sabah brifingi: günün ilk üretim sayısı ve MRR durumu.",
          "Olay araştırması: AI gateway sağlığı sarı/kırmızı mı?",
          "Kullanıcı büyümesi: son 30 gün aktif kullanıcı eğilimi.",
          "Plan dağılımı: ücretsiz/ücretli kullanıcı oranı bozulduysa.",
          "Üç aylık değerlendirme: 12 aylık gelir + üretim grafiği.",
        ],
      },
      {
        heading: S.fields,
        bullets: [
          "MRR — Aktif aboneliklerin priceMonthly toplamı (canlı). İndirim/ayarlamaları yansıtmaz.",
          "Active users (30d) — Son 30 gün içinde en az 1 üretim yapan farklı kullanıcı sayısı; delta önceki 30 güne göre %.",
          "Generations / day — Bugün 00:00'dan beri oluşan GenerationTrace sayısı; delta düne göre.",
          "Avg credit cost (30d) — Son 30 gün CreditLedger negatif kayıt ortalaması (kredi/çağrı). Düşmesi 'iyi' sayılır.",
          "Revenue & generations grafiği — 12 aylık gelir (mavi) + üretim sayısı (turuncu) trendi.",
          "System health — API ve DB sabit 'Healthy'; AI gateway son 5 dakikadaki hata oranına göre healthy/degraded/down.",
          "Plan distribution — Free + her aktif planın kullanıcı sayısı ve % payı.",
          "Recent activity — AuditLog'dan son 6 admin eylemi (kim, ne, kaç dakika önce).",
        ],
      },
      {
        heading: S.flows,
        bullets: [
          "Sayfayı aç → MRR + bugünkü üretim + AI gateway durumunu tara → kırmızıysa traces sayfasına geç.",
          "Active users delta düşüyorsa /pr/yonet/users üzerinden son suspend'leri kontrol et.",
          "Avg credit cost yukarı gidiyorsa /pr/yonet/plans üzerindeki kredi maliyet kuralları tablosunu incele.",
          "AI gateway 'Degraded' ise /pr/yonet/traces ile son hatalı üretimleri aç.",
        ],
      },
      {
        heading: S.pitfalls,
        bullets: [
          "AI gateway sağlığı yalnızca son 5 dakika penceresine bakar; geçici hatalar durumu yanıltabilir.",
          "MRR liste fiyatından hesaplanır; manuel kredi ayarlamalarını içermez.",
          "Plan dağılımındaki 'Free' = abonesi olmayan tüm kullanıcılar (askıya alınmışlar dahil).",
          "Sayfada otomatik yenileme yok — güncel sayılar için tarayıcıyı yenile.",
        ],
      },
      {
        heading: S.related,
        bullets: [
          "/pr/yonet/users — kullanıcı sayım ve plan değişiklikleri burada görünür.",
          "/pr/yonet/plans — fiyat/kredi değişiklikleri MRR'ı etkiler.",
          "/pr/yonet/traces — AI gateway hata detayları.",
          "/pr/yonet/audit — son admin eylemlerinin tam dökümü.",
        ],
      },
    ],
  },

  users: {
    title: "Kullanıcılar (Users)",
    purpose:
      "Tüm kullanıcı hesaplarını yönetir: davet et, askıya al, plan değiştir, sil, CSV dışa aktar. Ayrıca arama ve durum filtresi sağlar.",
    sections: [
      {
        heading: S.when,
        bullets: [
          "Yeni admin/üye davet etmek (Invite).",
          "Kötüye kullanım: bir kullanıcıyı gerekçe yazarak askıya almak (oturumlar anında düşer).",
          "Plan yükseltme/düşürme talepleri (period yeniden başlar).",
          "GDPR/silme talebi: kullanıcıyı tüm verileriyle birlikte kalıcı silmek.",
          "Uyumluluk için tüm kullanıcı listesini CSV indirmek.",
        ],
      },
      {
        heading: S.fields,
        bullets: [
          "Kullanıcı — Avatar baş harfleri + ad (yoksa e-postanın @ öncesi) + e-posta.",
          "Plan — Aktif aboneliğin plan adı; abonelik yoksa 'Free'.",
          "Credits — CreditLedger.delta toplamı (tüm sebepler birlikte). Negatif olabilir.",
          "Country — user.country (ISO-2); yoksa user.locale'den türetilir.",
          "Joined — user.createdAt 'MMM D, YYYY' formatında.",
          "Status — Active veya Suspended (kırmızı). Suspend altında neden de görünür.",
          "Filtre çubuğu — Status (All/Active/Suspended) + ad/e-posta arama.",
          "Satır menüsü — Plan değiştir / Suspend (gerekçe ister) / Unsuspend / Sil (çift onay).",
          "Invite modal — E-posta zorunlu, rol User|Admin (Admin /pr/yonet erişimi alır).",
        ],
      },
      {
        heading: S.flows,
        bullets: [
          "Yeni admin davet et: Invite → e-posta + rol Admin → kaydet (e-posta gönderimi auth akışına bağlıdır).",
          "Kullanıcı askıya al: ara → ⋯ menü → Suspend → gerekçe (max 500) → onayla. Tüm oturumları silinir.",
          "Plan değiştir: ⋯ menü → Change plan → numarayla yeni planı seç. Period sıfırlanır; oran kullanılmaz.",
          "CSV dışa aktar: Export → users-YYYY-MM-DD.csv indirilir.",
          "Sil: ⋯ menü → Delete → çift onay. Geri alınamaz; tüm ilişkili veri kaskadla silinir.",
        ],
      },
      {
        heading: S.pitfalls,
        bullets: [
          "Silme GERİ ALINAMAZ; tüm prompt, abonelik, ledger kayıtları gider.",
          "Suspend oturumları anında siler — kullanıcı saniyesinde dışarı atılır.",
          "Plan değişimi mevcut periyodu sıfırlar; orantılı (proration) hesap yok.",
          "Country alanı boşsa locale'e fallback eder ('EN' gibi geçersiz değerler görünebilir).",
          "Liste 50 kullanıcı sayfasıyla çalışır; arama bu sayfa içinde yapılır (sunucu tarafı tam metin değildir).",
        ],
      },
      {
        heading: S.related,
        bullets: [
          "/pr/yonet/plans — değiştirilebilir planların kaynağı.",
          "/pr/yonet/audit — user.suspend/unsuspend/changePlan/delete kayıtları.",
          "/pr/yonet/ — plan dağılımı ve aktif kullanıcı KPI'ları buradan etkilenir.",
        ],
      },
    ],
  },

  plans: {
    title: "Planlar ve Fiyatlandırma (Plans)",
    purpose:
      "Faturalama planlarını (Free, Starter, Pro, Enterprise…) tanımlar: fiyat, aylık kredi, görünürlük. Kredi maliyet kuralları tablosu da burada okunur.",
    sections: [
      {
        heading: S.when,
        bullets: [
          "Yeni plan tier'ı eklemek (Teams, Advanced gibi).",
          "Fiyat veya kredi miktarını güncellemek.",
          "Bir planı satıştan kaldırmak (mevcut aboneler period sonuna kadar kalır).",
          "Planı tamamen pasifleştirmek veya silmek.",
          "Operasyon başına kredi maliyetini gözden geçirmek.",
        ],
      },
      {
        heading: S.fields,
        bullets: [
          "Plan adı — Tekil; max 60 karakter.",
          "Slug — URL dostu; küçük harf + rakam + tire; tekil.",
          "Aylık fiyat ($) ve Yıllık fiyat ($) — 0 dahil ondalık.",
          "Aylık kredi — Kullanıcının her yenilemede aldığı kredi (SUBSCRIPTION_RENEWAL).",
          "Sıralama — Düşük sayı önce gösterilir.",
          "Aktif (yayında göster) — Kapalıysa pricing sayfasında görünmez, yeni satış olmaz; mevcut aboneler etkilenmez.",
          "Status badge — Live / Hidden.",
          "Price — 0 ise 'Free', enterprise slug'ı için 'Custom'.",
          "User count — Bu plana bağlı tüm Subscription sayısı (canceled dahil).",
          "Credit cost rules tablosu — Operasyon başına kredi maliyeti (sadece okuma; kod tarafından yönetilir).",
        ],
      },
      {
        heading: S.flows,
        bullets: [
          "Yeni plan: + New plan → ad/slug/fiyat/kredi/sıra → Aktif işaretli → kaydet.",
          "Yayına al: Edit → Aktif'i işaretle → kaydet. Pricing sayfasında anında görünür.",
          "Satışı durdur: Edit → Aktif kapat → kaydet. Mevcut aboneler etkilenmez.",
          "Sil: Edit → Planı sil. Aktif abone yoksa 'Evet, kalıcı sil' onayı geri alınamaz; aktif abone varsa otomatik olarak deaktive eder.",
        ],
      },
      {
        heading: S.pitfalls,
        bullets: [
          "Mevcut aboneler eski fiyatla devam eder; yeni fiyat yalnızca yenileme/yeni abonelikte uygulanır.",
          "Slug'ı değiştirmek pricing URL'lerini bozar; otomatik yönlendirme yok.",
          "Kredi maliyet kuralları tablosu burada düzenlenemez; kod tarafında tutulur.",
          "Aktif abonesi olmayan plan silinince geri dönüş yok.",
        ],
      },
      {
        heading: S.related,
        bullets: [
          "/pr/yonet/users — kullanıcılara atanabilen plan kaynağı.",
          "/pr/yonet/ — plan dağılımı ve MRR.",
          "Public /pricing — burada görünür/gizli yaptıklarınız ekranda anında değişir.",
        ],
      },
    ],
  },

  "agent-roles": {
    title: "Agent Rolleri (v4 Engine)",
    purpose:
      "5 çekirdek pipeline rolüne (Intent Analyzer, Synthesizer, Safety Checker, Embedder, Distiller) AI motoru atar. Hardcode model YOK — atamalar tamamen burada yapılır. RoleBrief few-shot örnekleri sayesinde küçük modeller bile %100 performansla çalışabilir.",
    sections: [
      {
        heading: S.when,
        bullets: [
          "Pipeline'ı ilk kurarken: INTENT_ANALYZER ve SYNTHESIZER zorunlu.",
          "Sağlayıcı değiştirmek (örn. Anthropic Haiku → OpenAI GPT-4o-mini).",
          "Bir rolü geçici olarak kapatmak (Safety Checker'ı atlamak gibi).",
          "Rolün davranışını ayarlamak için RoleBrief sistem promptunu düzenlemek.",
        ],
      },
      {
        heading: S.fields,
        bullets: [
          "Intent Analyzer — Kullanıcı isteğini yapısal intent JSON'una çevirir. Hızlı/ucuz model önerilir (Haiku, GPT-4o-mini, Gemini Flash).",
          "Synthesizer — Pipeline kalbi: Constitution + Persona + RAG + intent'i birleştirip nihai promptu üretir. Kalite modeli önerilir (Sonnet, GPT-4o, Gemini 2.5 Pro).",
          "Safety Checker — PII, jailbreak, etik ihlallerini tarar; sadece risk yüksek olduğunda çağrılır. Orta seviye model.",
          "Embedder — RAG için embedding üretir. UYARI: Burada atama YAPMA, /pr/yonet/embedding-engines üzerinden 'isDefault' bayrağıyla yönetilir.",
          "Distiller — Training Resources'tan Constitution/Persona/AntiPattern güncelleme önerileri üretir. Büyük model önerilir (Opus, GPT-4).",
          "RoleBrief sistem prompt editörü — Modal; min 50, max 20000 karakter; kayıt anında cache invalidate.",
          "isActive toggle — Atamayı kaybetmeden rolü pasifleştirir; pipeline atlar.",
        ],
      },
      {
        heading: S.flows,
        bullets: [
          "İlk kurulum: /pr/yonet/engines'te motor + API key oluştur → buraya gel → INTENT_ANALYZER ve SYNTHESIZER ata → Save.",
          "Sağlayıcı değiştir: dropdown'dan yeni motoru seç → Save. Few-shot örnekler yeni modele uyum sağlar.",
          "Rol davranışı ayarla: Edit prompt… → metni düzenle → Save prompt. Cache anında invalidate edilir.",
          "Doğrulamayı kapat: Safety Checker'ı toggle ile kapat. Hızlı ama riskli.",
        ],
      },
      {
        heading: S.pitfalls,
        bullets: [
          "INTENT_ANALYZER veya SYNTHESIZER atanmazsa pipeline sessizce çöker.",
          "Motor pasif veya API key yoksa ⚠ ile işaretlenir; atama kaydı başarısız olur.",
          "RoleBrief seed yoksa (yeni DB) atama 'RoleBrief seed missing' ile düşer — pnpm db:seed çalıştır.",
          "EMBEDDER buradan atanmaz — embedding-engines üzerinden yönetilir.",
          "SYNTHESIZER pasifleşirse prompt üretimi tamamen durur.",
        ],
      },
      {
        heading: S.related,
        bullets: [
          "/pr/yonet/engines — buradan önce motor + API key oluşturulmalı.",
          "/pr/yonet/embedding-engines — EMBEDDER rolü buradan yönetilir.",
          "/pr/yonet/personas — SYNTHESIZER'a Persona blokları enjekte edilir.",
          "/pr/yonet/constitution — Aktif Constitution SYNTHESIZER'a otomatik eklenir.",
          "/pr/yonet/training/distillations — DISTILLER önerileri buraya düşer.",
        ],
      },
    ],
  },

  constitution: {
    title: "Anayasa (Constitution)",
    purpose:
      "Synthesizer'ın her üretimde kullandığı sistem kuralları belgesinin tüm versiyonlarını gösterir. Versiyonlar değişmezdir (immutable); aynı anda yalnızca biri aktif olabilir. Bu sayfa yalnızca okumadır — değişiklikler Training Distillations onay akışından gelir.",
    sections: [
      {
        heading: S.when,
        bullets: [
          "Sistem kurallarının geçmişini ve değişimini gözden geçirmek.",
          "Şu anda canlıda hangi Constitution sürümünün olduğunu doğrulamak.",
          "Distillation onayları sonrası yeni sürümün gerçekten aktif olduğunu kontrol etmek.",
        ],
      },
      {
        heading: S.fields,
        bullets: [
          "Versiyon etiketi — Tekil slug (v1, v2.1 gibi).",
          "İçerik — Synthesizer'a enjekte edilen tam sistem promptu (katlanır blokta görüntülenir).",
          "isActive — Aynı anda tek 'Aktif' rozet.",
          "Changelog — Önceki sürüme göre ne değişti.",
          "createdAt / activatedAt — Oluşturma ve etkinleştirme zaman damgaları.",
        ],
      },
      {
        heading: S.flows,
        bullets: [
          "Canlı sürümü kontrol et: 'Aktif' rozetli kartı bul → 'İçeriği göster' ile tam metni oku.",
          "Sürüm geçmişi: kartlar etkinleştirme tarihine göre sıralanır (yeni en üstte).",
          "Değişiklik takibi: changelog notlarını oku.",
        ],
      },
      {
        heading: S.pitfalls,
        bullets: [
          "Buradan düzenleme yapılmaz; yeni Constitution Training Distillations'tan CONSTITUTION_UPDATE onayıyla yazılır.",
          "Hiçbir Constitution aktif değilse Synthesizer boş sistem promptuyla çalışır (üretim kalitesi düşer).",
          "Yeni DB'de seed yoksa sayfa 'pnpm db:seed' uyarısı gösterir.",
        ],
      },
      {
        heading: S.related,
        bullets: [
          "/pr/yonet/training/distillations — Constitution güncellemeleri burada onaylanır.",
          "/pr/yonet/personas — Personalar Constitution ile birlikte enjekte edilir.",
          "/pr/yonet/agent-roles — SYNTHESIZER aktif Constitution'ı kullanır.",
        ],
      },
    ],
  },

  personas: {
    title: "Uzman Personalar (Personas)",
    purpose:
      "Synthesizer'ın intent.domain ile eşleşen alan uzmanlarını (SEO, copywriting, e-posta vb.) sistem promptuna enjekte etmesini sağlar. CRUD, sıralama, dışa/içe aktarım, kullanım istatistikleri ve soft-delete koruması içerir.",
    sections: [
      {
        heading: S.when,
        bullets: [
          "Yeni alan uzmanlığı eklemek (örn: 'Senior SEO Strategist', domainSlug=seo-content).",
          "Persona body, jargon, framework veya antiPattern'lerini güncellemek.",
          "Bir personayı geçici pasifleştirmek (geçmiş trace'leri korunur).",
          "Yedek almak / batch kurulum için JSON dışa-içe aktarmak.",
          "'Orphan domain' uyarısı: intent analyzer karşılığı persona olmayan bir domain üretmiş.",
        ],
      },
      {
        heading: S.fields,
        bullets: [
          "domainSlug — Zorunlu, tekil, DEĞİŞMEZ. intent.domain ile eşleşir; pattern [a-z0-9-]+.",
          "name — Görünen ad (örn. 'Senior SEO Strategist').",
          "body — 50–4000 karakter; Synthesizer sistem promptuna olduğu gibi enjekte edilir.",
          "jargon — Max 30 etiket (alan terimleri).",
          "frameworks — Max 30 (AIDA, RICE, STAR…).",
          "antiPatterns — Max 30 (bu alana özgü kaçınılacaklar).",
          "notes — Dahili not.",
          "isActive — Pasif personalar yeni üretimden hariç tutulur, geçmiş trace'lerde kalır.",
          "sortOrder — Sıralama; ↑/↓ butonuyla değiştirilir.",
          "usageCount (30g) — Trace.contextJson->>'personaSlug' sayımı.",
          "avgQuality (30g) — Trace kalite skorlarının ortalaması.",
        ],
      },
      {
        heading: S.flows,
        bullets: [
          "Yeni persona: 'Yeni Persona' → domainSlug + name + body (50+) + jargon/frameworks/antiPatterns → Oluştur.",
          "Düzenle: kart → Edit. domainSlug hariç her şey değiştirilebilir; cache anında invalidate.",
          "Soft delete (kullanılmış): Delete → 'Pasif et' (varsayılan) trace'leri korur. 'Tamamen sil' geçmişi siler.",
          "Sırala: ↑/↓ butonları sortOrder'ı değiştirir.",
          "Dışa aktar: Export → JSON indir. İçe aktar: Import → JSON yapıştır → upsert / skip-existing seç.",
        ],
      },
      {
        heading: S.pitfalls,
        bullets: [
          "domainSlug değiştirilemez; gerekirse sil + yeniden oluştur.",
          "Body 50 karakterden kısa olamaz.",
          "Aşırı uzun jargon/framework listeleri Synthesizer promptunu şişirir.",
          "İmport JSON şemaya uymazsa parse hatası verir.",
        ],
      },
      {
        heading: S.related,
        bullets: [
          "/pr/yonet/training/distillations — PERSONA_UPDATE önerileri buradan gelir.",
          "/pr/yonet/antipatterns — Global antipattern kuralları (bu sayfadakilerden farklı).",
          "/pr/yonet/agent-roles — SYNTHESIZER aktif personaları enjekte eder.",
          "/pr/yonet/traces — Kullanım sayım ve kalite skorlarının kaynağı.",
        ],
      },
    ],
  },

  antipatterns: {
    title: "Anti-Patternlar (Anti-Patterns)",
    purpose:
      "Synthesizer çıktısının doğrulandığı yasaklı davranış/desen kataloğu. Her kural domain'e özgü (veya global) regex/literal eşleşmedir. Bu sayfa okumadır — yeni kurallar Training Distillations onayıyla eklenir.",
    sections: [
      {
        heading: S.when,
        bullets: [
          "Mevcut kuralları gözden geçirmek (hangileri 'block', hangileri 'warn').",
          "Domain'e özgü kuralları doğrulamak (e-posta için ayrı, SEO için ayrı).",
          "Yeni distillation onayları sonrası kural setinin nasıl büyüdüğünü izlemek.",
        ],
      },
      {
        heading: S.fields,
        bullets: [
          "Pattern — Literal string veya regex (isRegex'e göre).",
          "isRegex — true ise pattern regex olarak değerlendirilir.",
          "domainSlug — Bu kural sadece bu domain'e uygulanır; null ise GLOBAL.",
          "Severity — 'warn' (logla) veya 'block' (sentezi reddet).",
          "Rationale — Neden yasak (örn. 'agresif CTA spam riskini artırır').",
          "isActive — Pasif kurallar doğrulamada atlanır.",
        ],
      },
      {
        heading: S.flows,
        bullets: [
          "Aktif kuralları tara: severity'ye göre sırala, rationale'i oku.",
          "Domain kurallarını bul: domainSlug sütunu null = global, doluysa o alana özel.",
          "Block-severity sayısı → toplam kural sayısı = doğrulama sıkılığı.",
        ],
      },
      {
        heading: S.pitfalls,
        bullets: [
          "Buradan eklenmez/silinmez; sadece Training Distillations → ANTIPATTERN onayıyla yazılır.",
          "Geçersiz regex doğrulama anında üretimi kırar.",
          "Çok geniş 'block' kuralları sentezi imkânsız hale getirebilir.",
          "Anchor'sız regex (^$ olmayan) yanlış substring'leri yakalar.",
        ],
      },
      {
        heading: S.related,
        bullets: [
          "/pr/yonet/training/distillations — kuralların kaynağı.",
          "/pr/yonet/personas — her personanın kendi antiPatterns dizisi vardır (bunlardan farklı).",
          "/pr/yonet/agent-roles — SYNTHESIZER çıktısı bu kurallara göre doğrulanır.",
        ],
      },
    ],
  },

  "training-resources": {
    title: "Eğitim Kaynakları (Training Resources)",
    purpose:
      "Distiller'ın işlediği admin-ekleme veri kaynakları (URL, RSS, sitemap, manuel metin, dosya yükleme). Her kaynak hangi personalara hizmet ettiğini, ne sıklıkta yenileneceğini ve durumunu tutar.",
    sections: [
      {
        heading: S.when,
        bullets: [
          "Marka rehberi, stil kılavuzu, blog yazısı gibi yeni eğitim kaynakları eklemek.",
          "RSS feed / sitemap için yenileme sıklığı belirlemek.",
          "Bir kaynağı belirli personalara hedeflemek (örn. SEO rehberi → seo-content).",
          "Kaynağı silmeden geçici durdurmak (Pause).",
          "Üretilen snapshot ve distillation sayılarını izlemek.",
        ],
      },
      {
        heading: S.fields,
        bullets: [
          "Type — URL | RSS | SITEMAP | MANUAL_TEXT | UPLOAD.",
          "URL — URL/RSS/SITEMAP için zorunlu; MANUAL_TEXT/UPLOAD için boş.",
          "Title / Description — Görünen ad ve kısa açıklama.",
          "targetPersonaSlugs — Virgül ayrılmış; mevcut ExpertPersona.domainSlug ile eşleşmeli.",
          "targetTags — Kategorik etiketler.",
          "refreshPolicy — MANUAL | DAILY | WEEKLY | MONTHLY.",
          "Status — ACTIVE (kuyrukta) | PAUSED | ERROR | ARCHIVED.",
          "lastFetchedAt / snapshotCount / distillationCount — Salt okunur metrikler.",
        ],
      },
      {
        heading: S.flows,
        bullets: [
          "Yeni kaynak: New resource → Type seç → title/URL/target personas/refresh → Save.",
          "RSS feed: Type=RSS, URL=feed.xml, target persona, refresh=DAILY → her makale otomatik snapshot olur.",
          "Manuel metin: Type=MANUAL_TEXT, URL boş, content=metin → MANUAL refresh.",
          "Pause: durdur → Status PAUSED, distiller atlar.",
          "Sil: kaynakla ilişkili snapshot ve distillation'lar kaskadla silinir (geri alınamaz).",
        ],
      },
      {
        heading: S.pitfalls,
        bullets: [
          "Hatalı URL → 'url validation failed'.",
          "URL/RSS/SITEMAP'te URL boş bırakılamaz.",
          "Olmayan persona slug'larını hedeflemek sessizce yok sayılır.",
          "Silme kaskadı geri dönüşsüz.",
          "STATUS=ERROR'dan otomatik retry UI yok; cron veya pnpm script gerekir.",
          "MANUAL_TEXT kaynakları kendiliğinden yenilenmez; Edit ile güncellenmeli.",
        ],
      },
      {
        heading: S.related,
        bullets: [
          "/pr/yonet/training/distillations — buradan üretilen önerilerin kuyruğu.",
          "/pr/yonet/personas — targetPersonaSlugs buraya işaret eder.",
          "/pr/yonet/agent-roles — DISTILLER rolü bu kaynakları işler.",
        ],
      },
    ],
  },

  "training-distillations": {
    title: "Damıtım Kuyruğu (Distillations)",
    purpose:
      "Distiller'ın Training Resources'tan ürettiği iyileştirme önerileri (Constitution/Persona/AntiPattern/Exemplar) için inceleme ve onay kuyruğu. Onaylananlar arka planda hedef tablolara yazılır.",
    sections: [
      {
        heading: S.when,
        bullets: [
          "Distiller önerilerini gözden geçirip onaylamak.",
          "Düşük kalite veya konu dışı önerileri gerekçe ile reddetmek.",
          "Onay/red oranlarını ve kaynak izlerini takip etmek.",
        ],
      },
      {
        heading: S.fields,
        bullets: [
          "Type — CONSTITUTION_UPDATE | PERSONA_UPDATE | ANTIPATTERN | EXEMPLAR.",
          "Status — PENDING | APPROVED | REJECTED | APPLIED (arka plan iş tamamlandı).",
          "targetSlug — PERSONA_UPDATE için domainSlug; CONSTITUTION_UPDATE için null.",
          "proposalJson — Önerinin tam yapılandırılmış içeriği (katlanır blok).",
          "Rationale — Distiller'ın neden ürettiğini açıkladığı not.",
          "reviewNotes — Admin'in onay/red gerekçesi.",
          "resourceTitle — Kaynak Training Resource başlığı.",
          "createdAt — Üretilme zamanı.",
        ],
      },
      {
        heading: S.flows,
        bullets: [
          "PENDING'leri filtrele → öneriyi oku → 'Onaylar JSON' bloğunu aç.",
          "Onayla: opsiyonel not → APPROVED → arka plan APPLIED'a çevirip hedefi yazar.",
          "Reddet: gerekçe (zorunlu) → REJECTED.",
        ],
      },
      {
        heading: S.pitfalls,
        bullets: [
          "Geçersiz domainSlug ile PERSONA_UPDATE onayı APPROVED kalır ama APPLIED olmaz (orphan).",
          "Geçersiz regex'li ANTIPATTERN onayı APPLIED anında üretimi kırar.",
          "APPLIED final durumdur; geri alma yok — yanlışsa hedef kaydı manuel düzelt/sil.",
          "Hızlı toplu onaylama Constitution/Persona kalitesini bozabilir.",
        ],
      },
      {
        heading: S.related,
        bullets: [
          "/pr/yonet/training/resources — kaynak.",
          "/pr/yonet/personas — PERSONA_UPDATE buraya yazar.",
          "/pr/yonet/constitution — CONSTITUTION_UPDATE yeni sürüm yazar.",
          "/pr/yonet/antipatterns — ANTIPATTERN buraya yazar.",
          "/pr/yonet/agent-roles — DISTILLER rolü önerileri üretir.",
        ],
      },
    ],
  },

  traces: {
    title: "Üretim İzleri (Generation Traces)",
    purpose:
      "Son 50 AI üretiminin gerçek-zamanlı denetim kaydı. Her trace tüm 6 pipeline aşamasının (preprocessing, intent, context, synthesis, validation, finalize) girdi/çıktısını saklar. Salt okunur — debug ve izleme için.",
    sections: [
      {
        heading: S.when,
        bullets: [
          "Pipeline başarısızlıklarını araştırmak (status=error).",
          "Üretim başına latency'yi izlemek (totalLatencyMs).",
          "Hangi persona/motorların kullanıldığını doğrulamak.",
          "Safety validation'ın bir şeyi yakalayıp yakalamadığını kontrol etmek.",
          "Bir promptun retry geçmişini takip etmek (iterationOf).",
        ],
      },
      {
        heading: S.fields,
        bullets: [
          "Time — createdAt zaman damgası.",
          "Status — ok | error.",
          "Modality — text | image | video vb.",
          "Latency — totalLatencyMs.",
          "Iteration — iterationOf doluysa retry; orijinal trace ID'sini gösterir.",
          "Trace ID — İlk 12 karakter (kısaltılmış).",
          "DB'de ayrıca: promptId, userId, intentJson, contextJson, synthesisJson, validationJson, finalJson.",
        ],
      },
      {
        heading: S.flows,
        bullets: [
          "Son üretimleri tara: error veya >10s latency olanları işaretle.",
          "Persona kullanımını gör: contextJson->>'personaSlug' (Personas sayfasındaki istatistiklerin kaynağı).",
          "Latency spike: totalLatencyMs sıralaması ile dış API gecikmelerini tespit et.",
        ],
      },
      {
        heading: S.pitfalls,
        bullets: [
          "Yalnızca son 50 trace görünür; daha eskisi DB query gerektirir.",
          "Filtreleme UI'ı yok (status, userId, modality bazlı).",
          "Detay sayfası henüz yok; tıklama bir şey yapmaz.",
          "status=error hata aşamasını söylemez; finalJson.errorMessage'a bakılmalı.",
        ],
      },
      {
        heading: S.related,
        bullets: [
          "/pr/yonet/personas — kullanım istatistikleri buradan beslenir.",
          "/pr/yonet/agent-roles — atamalar trace'lerde hangi motorun göründüğünü belirler.",
        ],
      },
    ],
  },

  templates: {
    title: "Şablonlar (Templates)",
    purpose:
      "Sistem genelinde kullanılan prompt şablonlarını yönetir. Şablonlar değişkenli ({{var}}) tekrar kullanılabilir prompt yapılarıdır; modaliteye göre AI motoru atamasına bağlanır.",
    sections: [
      {
        heading: S.when,
        bullets: [
          "Yeni iş akışları için şablon eklemek/düzenlemek.",
          "Statü zincirinden (DRAFT → REVIEW → PUBLISHED) geçirmek.",
          "JSON ile toplu içe aktarmak.",
          "30 günlük kullanım sayılarına göre yüksek değerli şablonları izlemek.",
          "Aktif kullanılan bir şablonu silmek (soft delete devreye girer).",
        ],
      },
      {
        heading: S.fields,
        bullets: [
          "Title — Zorunlu, max 120; modalite başına tekil.",
          "Description — Max 500.",
          "Category — Zorunlu, max 60; taksonomi ile eşleşir.",
          "Modality — text|image|code|audio|video.",
          "Engine — Önerilen motor adı (bilgi amaçlı, runtime'da zorlanmaz).",
          "Template body — Max 20000; {{var}} placeholder regex /[a-zA-Z_][a-zA-Z0-9_]*/.",
          "Variables — Body'den otomatik tespit + manuel ekleme.",
          "Version — Max 20, varsayılan v1.0.",
          "Status — DRAFT | REVIEW | PUBLISHED (isActive'i belirler).",
          "Sort order — Düşük önce.",
        ],
      },
      {
        heading: S.flows,
        bullets: [
          "Yeni şablon: New template → Title/Category/Modality + body → Create.",
          "Yayına al: Status badge → PUBLISHED.",
          "Toplu içe aktar: Import → JSON yapıştır → (title, modality) çiftiyle upsert.",
          "Aktif şablonu pasifleştir: Delete → kullanım varsa DRAFT'a düşürülür (soft delete); yoksa tamamen silinir.",
        ],
      },
      {
        heading: S.pitfalls,
        bullets: [
          "{{Var}} eşleşmeleri büyük/küçük harfe duyarlı.",
          "Modaliteyi değiştirmek mevcut kategori bağlarını migrate etmez.",
          "İçe aktarımda satır hatası diğerlerini geri almaz.",
          "Tespit edilen değişkenler manuel kaldırılamaz; body'den çıkarılmalı.",
        ],
      },
      {
        heading: S.related,
        bullets: [
          "/pr/yonet/taxonomy — kategori kaynağı.",
          "/pr/yonet/engines — motor adlarının kaynağı.",
          "/pr/yonet/mapping — modalite → motor yönlendirme.",
          "/pr/yonet/target-engines — şablonun ürettiği prompt'u tüketen hedef AI'lar.",
          "/pr/yonet/questions — şablon değişkenlerini doldurur.",
        ],
      },
    ],
  },

  engines: {
    title: "AI Motorları (AI Engines)",
    purpose:
      "LLM ve medya motorlarının (Anthropic, OpenAI, Google vb.) DB kaydı: provider, model ID, birim maliyeti ve şifrelenmiş API anahtarı. KOD HARDCODE YOK — tüm motor seçimleri buradan yapılır.",
    sections: [
      {
        heading: S.when,
        bullets: [
          "Yeni LLM/medya sağlayıcısı kaydetmek (şablonlar/mapping referans verebilsin diye).",
          "Süresi dolmuş veya rotasyona giren API anahtarını güncellemek.",
          "Bir motoru silmeden devre dışı bırakmak.",
          "costPerUnit ile maliyet izleme.",
        ],
      },
      {
        heading: S.fields,
        bullets: [
          "Name — Görünen ad, max 80.",
          "Provider — anthropic | openai | google | deepseek | openrouter | elevenlabs | runway | midjourney | other.",
          "Model ID — API çağrısında kullanılan tam ID, max 60.",
          "costPerUnit — USD; varsayılan 0.001.",
          "Unit type — 1k_tokens | image | audio_minute | video_second.",
          "Encrypted API key — AES-256-GCM; UI'da plaintext görünmez.",
          "Aktif toggle — Yeni motorlar varsayılan olarak KAPALI gelir.",
        ],
      },
      {
        heading: S.flows,
        bullets: [
          "Yeni LLM kaydet: Connect engine → ad/provider/modelId → ekle → Add key → API anahtarı yapıştır.",
          "Anahtar rotasyonu: Update key → yeni anahtar → kaydet.",
          "Devre dışı bırak: Aktif toggle'ı kapat (DB'de kalır, dropdown'lardan kaybolur).",
          "Maliyet karşılaştır: Maliyet sütununu provider akordeonu altında tara.",
          "Bağlantı testi: Mapping sayfasında 'Test' ile gerçek API çağrısı yap.",
        ],
      },
      {
        heading: S.pitfalls,
        bullets: [
          "Yeni motor varsayılan PASİF; etkinleştirmeyi unutma.",
          "API key olmadan motor çalışmaz.",
          "Mapping/template tarafından kullanılan motoru silmek o ilişkileri bozar (cascade temizlik yok).",
          "Provider alanı oluşturma sonrası değiştirilemez.",
          "Model ID girildiği gibi kaydedilir; sağlayıcıda gerçek var mı doğrulanmaz — Mapping testiyle anlaşılır.",
        ],
      },
      {
        heading: S.related,
        bullets: [
          "/pr/yonet/agent-roles — buradaki motorlar v4 rollerine atanır.",
          "/pr/yonet/mapping — modalite → motor yönlendirme.",
          "/pr/yonet/embedding-engines — embedding motorları ayrı yönetilir.",
          "/pr/yonet/library/settings — translation engine seçimi buradaki listeden gelir.",
        ],
      },
    ],
  },

  mapping: {
    title: "Modalite Eşleme (Mapping)",
    purpose:
      "Geriye-uyumluluk yönlendirme katmanı: her modalite (text, image, audio…) için birincil motor, fallback, soru-üretici (questioner) ve doğrulayıcı (validator) atar. Yeni iş akışlarında şablon-seviye atama bunu geçebilir.",
    sections: [
      {
        heading: S.when,
        bullets: [
          "Her modalite için birincil üretim motorunu atamak.",
          "Birincil arızasında devreye girecek fallback'i tanımlamak.",
          "Bağlamı toplayan questioner ve çıktıyı doğrulayan validator atamak.",
          "Yayına almadan önce motoru test etmek.",
          "Bir modaliteyi tamamen kapatmak.",
        ],
      },
      {
        heading: S.fields,
        bullets: [
          "Modality — text|code|image|audio|video|music; oluşturma sonrası değişmez.",
          "Primary ID — Üretim motoru (zorunlu).",
          "Fallback ID — Birincil düşerse otomatik seçilir; primary'den farklı olmalı.",
          "Questioner ID — Bağlam toplama; boş ise primary kullanılır.",
          "Validator ID — Çıktı kalite kontrolü; boş ise atlanır.",
          "Aktif — Kapatılırsa o modalitedeki şablonlar çalışmaz.",
          "Test — Birincile test prompt gönderir, latency + önizleme döner.",
        ],
      },
      {
        heading: S.flows,
        bullets: [
          "Pipeline kur: her modalitede Primary + (Fallback) seç → Kaydet.",
          "Doğrula: Test → başarı + latency mesajı; hata varsa Engines'te API key kontrol et.",
          "Failover: Primary=Anthropic, Fallback=OpenAI → otomatik geçiş.",
          "Modaliteyi kapat: Aktif kapat → kaydet (tüm bağlı şablonlar durur).",
        ],
      },
      {
        heading: S.pitfalls,
        bullets: [
          "Engines'te bir motoru pasifleştirirsen mapping hâlâ ona referans verir; çağrı çalışmaz.",
          "Fallback primary ile aynı olmamalı; UI kontrolü görsel.",
          "Test sadece primary'i sınar; fallback/validator zincirini test etmez.",
          "Anlık değişiklik etkili — production'da saat dışı dene.",
        ],
      },
      {
        heading: S.related,
        bullets: [
          "/pr/yonet/engines — atanacak motorlar buradan gelir.",
          "/pr/yonet/templates — şablonlar mapping'in primary'sini devralır.",
          "/pr/yonet/target-engines — buradaki target'lar farklı kavramdır (downstream).",
        ],
      },
    ],
  },

  "target-engines": {
    title: "Hedef AI'lar (Target Engines)",
    purpose:
      "Üretilen promptun gönderileceği son kullanıcı AI'larını (ChatGPT, Midjourney, Sora vb.) tanımlar. Her hedef modaliteye, slug'a, ada, stil ipucuna ve opsiyonel ikona sahiptir. Sistem promptu o AI'ın formatına uyarlar.",
    sections: [
      {
        heading: S.when,
        bullets: [
          "Yeni downstream servisi eklemek (yeni Midjourney sürümü gibi).",
          "Bir hedefi geçici devre dışı bırakmak.",
          "Style hint'i güncellemek (örn. 'GPT-4 için JSON formatı kullan').",
          "Marka ikonu eklemek/güncellemek.",
        ],
      },
      {
        heading: S.fields,
        bullets: [
          "Slug — [a-z0-9-], oluşturma sonrası DEĞİŞMEZ.",
          "Name — Görünen ad, max 120.",
          "Modality — text|code|image|video|audio|music.",
          "Prompt style hint — Max 2000; bu AI için biçim talimatı (kullanıcıya görünmez).",
          "Icon URL — Public URL.",
          "Active — Kapalı = kullanıcı dropdown'undan kaybolur.",
          "Sort order — Otomatik artan (manuel reorder UI yok).",
        ],
      },
      {
        heading: S.flows,
        bullets: [
          "Yeni hedef ekle: form alanlarını doldur → Add.",
          "Geçici kapat: Active checkbox'ı kapat (otomatik kaydedilir).",
          "Kalıcı sil: Delete → onayla (soft delete yok).",
        ],
      },
      {
        heading: S.pitfalls,
        bullets: [
          "Inline edit yok: slug/name/style hint için sil-yeniden oluştur şart.",
          "Soft delete yok: silinince kullanıcı geçmişi orphan kalır.",
          "Kırık icon URL'leri sessizce yüklenmez.",
          "Modalite listesi sabit; yeni modalite eklenirse kod değişikliği gerekir.",
        ],
      },
      {
        heading: S.related,
        bullets: [
          "/pr/yonet/templates — şablon promptları bu hedeflere gider.",
          "/pr/yonet/engines — production motorları (bu sayfa kullanıcı-yüzü hedefler).",
          "/pr/yonet/library/[id] — library promptlarına Target AI atanır.",
        ],
      },
    ],
  },

  questions: {
    title: "Sorular (Questions)",
    purpose:
      "Kullanıcıya gösterilen, şablon değişkenlerini ({{var}}) doldurmak için bağlam toplayan soru kataloğu. Çoktan seçmeli (options) veya serbest metin olabilir; modaliteye göre filtrelenir.",
    sections: [
      {
        heading: S.when,
        bullets: [
          "Şablonlar için yeni bağlam değişkenleri toplamak.",
          "Çoktan seçmeli seçenekler eklemek.",
          "Önemli soruların weight'ini yükseltmek.",
          "Soruyu silmeden geçici devre dışı bırakmak.",
        ],
      },
      {
        heading: S.fields,
        bullets: [
          "Modality — text|code|image|video|audio|music.",
          "Category — Gruplama etiketi (örn. 'Audience', 'Tone'); serbest metin.",
          "Question — Kullanıcıya gösterilen tam metin (max 500).",
          "Options — Virgülle ayrılmış (max 8, her biri max 100). Boşsa serbest metin.",
          "Weight — Tamsayı, varsayılan 0; yüksek = öncelik.",
          "Active — Kapalı = kullanıcıya gösterilmez.",
        ],
      },
      {
        heading: S.flows,
        bullets: [
          "Çoktan seçmeli: modality + question + 'Kısa, Orta, Uzun' gibi options → Add.",
          "Serbest metin: options'ı boş bırak → Add.",
          "Önceliklendir: weight=10 (diğerleri 0) → en önce sorulur.",
          "Devre dışı bırak: Active'i kapat.",
        ],
      },
      {
        heading: S.pitfalls,
        bullets: [
          "Options virgülde split edilir, trim YOK — ' Kısa' ile 'Kısa' farklı kabul edilir.",
          "Backend max 8 option ile sınırlı; UI fazlasını kabul etse de keser.",
          "Soruyu silmek geri alınamaz; kullanım izlenmiyor.",
          "Weight sınırsız; negatif değerler downstream sıralamayı bozabilir.",
        ],
      },
      {
        heading: S.related,
        bullets: [
          "/pr/yonet/templates — yanıtlar {{var}} olarak şablonlara akar.",
          "/pr/yonet/mapping — questioner motoru bu soruları sorar.",
        ],
      },
    ],
  },

  taxonomy: {
    title: "Taksonomi (Kategori Ağacı)",
    purpose:
      "Şablonları modalite başına 2 seviyeli hiyerarşik kategori ağacında düzenler. Her kategorinin slug'ı, adı ve şablon sayımı vardır. Sıralama, gizleme, soft-delete koruması içerir.",
    sections: [
      {
        heading: S.when,
        bullets: [
          "Şablonları kullanım amacına göre gruplamak (Social, Code, Brand).",
          "Alt kategoriler eklemek (Social → LinkedIn, Twitter…).",
          "Şablonları kırmadan kategoriyi gizlemek.",
          "Kategorileri ↑/↓ ile sıralamak.",
          "Boş kategoriyi silmek.",
        ],
      },
      {
        heading: S.fields,
        bullets: [
          "Modality — Oluşturma sonrası değişmez.",
          "Slug — [a-z0-9-], modalite içinde tekil, max 60, DEĞİŞMEZ.",
          "Name — Max 100.",
          "Description — Max 500.",
          "Parent ID — Maksimum 1 seviye iç içe (torun kategori yok).",
          "Active — Kapalı = şablon seçicilerinde görünmez.",
          "Sort order — ↑/↓ ile değişir.",
          "Template count — O kategoriyi referans veren şablon sayısı (salt okunur).",
        ],
      },
      {
        heading: S.flows,
        bullets: [
          "Üst kategori: Add → ad → kaydet.",
          "Alt kategori: + butonuyla ekle (parent otomatik).",
          "Sırala: ↑/↓.",
          "Şablonları kırmadan gizle: Active'i kapat.",
          "Sil: 0 şablonlu boş kategori → kalıcı silinir; şablon varsa otomatik deaktive edilir (soft delete).",
        ],
      },
      {
        heading: S.pitfalls,
        bullets: [
          "Slug ve modalite değişmez; düzeltmek için sil + yeniden oluştur.",
          "Maksimum 1 seviye nesting; daha derin oluşturulamaz.",
          "Soft-delete'te orphan template'lerin eski categoryId'si kalır.",
          "Reorder yalnızca aynı parent altındaki kardeşler arasında.",
        ],
      },
      {
        heading: S.related,
        bullets: [
          "/pr/yonet/templates — şablonların category alanı bu sluga işaret eder.",
        ],
      },
    ],
  },

  "library-list": {
    title: "Prompt Library (Liste)",
    purpose:
      "Tüm prompt kütüphanesini gözden geçirir: filtreleme, arama, tekil ve toplu işlemler (embed/translate). Canlı ilerleme göstergesi (2 sn poll) ile uzun süren işleri izler.",
    sections: [
      {
        heading: S.when,
        bullets: [
          "İçe aktarım sonrası gelen REVIEW promptlarını gözden geçirmek.",
          "Toplu embed/translate işlerini izlemek.",
          "Modality veya status'a göre filtrelemek; başlık/içerik aramak.",
          "Embedlenmemiş promptları toplu işlemek.",
          "İngilizce olmayanları toplu çevirmek.",
        ],
      },
      {
        heading: S.fields,
        bullets: [
          "Tablo: Prompt (başlık + kaynak), Modality, Status, Score (0-100), Len, Vec (embed var/yok).",
          "Status: REVIEW (mavi) | VERIFIED | GOLD (sarı) | ARCHIVED | REJECTED.",
          "Search — Başlık + içerik metninde substring (case-insensitive).",
          "Modality filter — text|image|video|audio|code.",
          "Status butonları — sayım gösterir, tıkla = filtrele.",
          "Sayfa başına 50 satır.",
        ],
      },
      {
        heading: S.flows,
        bullets: [
          "İçe aktar: 'Import prompts' → upload → parse/translate/embed özet.",
          "İncele: status=REVIEW filtre → başlığa tıkla.",
          "Embedlenmemişleri embedle: 'Embed unembedded' → canlı done/failed/total/scanned sayımı.",
          "Çeviri başlat: 'Start translation' → otomatik dil tespiti + çeviri (idempotent — yeniden başlatılabilir).",
          "Statü değiştir: detayda butona tıkla, save yok (anında uygulanır).",
        ],
      },
      {
        heading: S.pitfalls,
        bullets: [
          "Default embedding/translation engine yoksa toplu işler sonsuz döner — önce Settings → Library AI ve embedding-engines.",
          "Pause özelliği yok; durdurabilir, yeniden başlatabilirsin (idempotent).",
          "Arama içerik bazlı, büyük kütüphanede yavaş.",
          "Detaydan silme geri alınamaz.",
        ],
      },
      {
        heading: S.related,
        bullets: [
          "/pr/yonet/library/[id] — tekil düzenleme.",
          "/pr/yonet/library/import — dosya yükleme.",
          "/pr/yonet/library/settings — translation engine seçimi.",
          "/pr/yonet/embedding-engines — embedding motorları.",
        ],
      },
    ],
  },

  "library-detail": {
    title: "Library — Tekil Prompt",
    purpose:
      "Tek bir library promptunun metadata'sını düzenler (başlık, içerik, etiket, hedef AI, kalite skoru), tekil çevirme/embed ve silme yapar.",
    sections: [
      {
        heading: S.when,
        bullets: [
          "Başlık/içerik düzeltmek.",
          "Intent etiketleri eklemek.",
          "Hedef AI bağlamak (TargetEngine).",
          "Kalite skoru atamak (curator sıralama için).",
          "Statü (REVIEW/VERIFIED/GOLD/ARCHIVED/REJECTED) değiştirmek.",
          "Promptu silmek (geri alınamaz).",
        ],
      },
      {
        heading: S.fields,
        bullets: [
          "Title — Opsiyonel; boşsa listede 'Untitled'.",
          "Prompt * — Asıl prompt metni; kayıtta contentLength güncellenir.",
          "Expected output — Örnek/başarı kriteri.",
          "Modality — text|image|video|audio|code.",
          "Sub-category — Etiket.",
          "Target AI — TargetEngine seçimi; boş = (generic).",
          "Quality score — 0-100 veya null.",
          "Intent tags — Virgülle ayrılmış.",
          "Notes — Dahili.",
          "Status butonları — anında uygulanır, save'e gerek yok.",
        ],
      },
      {
        heading: S.flows,
        bullets: [
          "Cilala: title/tags/score → Save.",
          "Statü değiştir: butona tıkla → anında.",
          "Re-embed: prompt metnini düzenle → Save → Embed.",
          "Çevir: Translate → otomatik dil tespiti; İngilizce ise 'Already English'.",
          "Yayına hazırla: status=VERIFIED/GOLD + Target AI + intent tags.",
        ],
      },
      {
        heading: S.pitfalls,
        bullets: [
          "Trash GERİ ALINAMAZ.",
          "Status değişimi save'i atlar; iki kez tıklarsan iki kez uygulanır.",
          "Prompt metnini değiştirmek otomatik re-embed yapmaz.",
          "Embedding engine yoksa Embed sessizce başarısız.",
        ],
      },
      {
        heading: S.related,
        bullets: [
          "/pr/yonet/library — liste.",
          "/pr/yonet/library/settings — translation AI.",
          "/pr/yonet/embedding-engines — embedding motorları.",
        ],
      },
    ],
  },

  "library-import": {
    title: "Library — İçe Aktar (Import)",
    purpose:
      "Toplu prompt dosyalarını yükler (.md, .json, .jsonl, .csv, .yaml, .txt): parse eder, dedup yapar, otomatik çevirir, opsiyonel olarak otomatik embedler ve REVIEW statüsünde kaydeder.",
    sections: [
      {
        heading: S.when,
        bullets: [
          "Tek seferlik seed: küratörlü veri seti yüklemek.",
          "Düzenli güncelleme: dış kaynaklardan yeni promptlar.",
          "Dry run ile parse + dedup'i doğrulamak.",
          "Etki önizlemesi: parsed/translated/saved/embedded sayıları.",
        ],
      },
      {
        heading: S.fields,
        bullets: [
          "File picker — .md, .json, .jsonl, .csv, .yaml, .yml, .txt.",
          "Source label — prompt.source'a yazılır (örn. 'admin_upload', 'seed_internal_v2').",
          "Default modality — Dosyada modality eksikse uygulanır (varsayılan text).",
          "Auto-embed — Embedding engine varsa etkin.",
          "Dry run — Sadece parse + doğrula, kaydetme.",
          "Stats card — Toplam prompt, verified/gold, in-review, modality dağılımı.",
        ],
      },
      {
        heading: S.flows,
        bullets: [
          "Hızlı içe aktar: dosya seç → auto-embed açık → Import.",
          "Dry run: hatayı + dedup sayısını gör → kapatıp gerçek import.",
          "Translate edilmiş corpus: önce Settings → Library AI ayarla → import (non-EN otomatik EN'ye).",
          "Büyük veri: auto-embed kapat, sonra liste sayfasından 'Embed unembedded' ile yap.",
        ],
      },
      {
        heading: S.pitfalls,
        bullets: [
          "Translation engine yoksa non-EN olduğu gibi kaydedilir.",
          "Dedup SHA-256 hash bazlı — sadece TAM eşleşmeler.",
          "Auto-embed sadece DEFAULT embedding engine'i kullanır.",
          "Parse hataları satır bazlı; başarılılar kaydedilir.",
          "Çok büyük dosyalar (>10k) tek istek timeout edebilir; böl.",
        ],
      },
      {
        heading: S.related,
        bullets: [
          "/pr/yonet/library — sonuçlar burada görünür.",
          "/pr/yonet/library/settings — translation engine.",
          "/pr/yonet/embedding-engines — default embedding engine.",
        ],
      },
    ],
  },

  "library-settings": {
    title: "Library AI (Translation Engine)",
    purpose:
      "Library içe aktarımında otomatik kullanılacak çeviri motorunu (translation engine) seçer. Aktif AI motorları radio liste olarak gösterilir; '(not set)' ile çeviri kapatılır.",
    sections: [
      {
        heading: S.when,
        bullets: [
          "Library'yi non-EN destekli kullanmaya başlamak.",
          "Çeviri kalitesini iyileştirmek için motor değiştirmek (GPT-4 → Claude).",
          "Çeviriyi kapatıp non-EN promptları olduğu gibi almak.",
        ],
      },
      {
        heading: S.fields,
        bullets: [
          "Translation Engine seçici — Tüm aktif AIEngine'lar (provider/model gösterir).",
          "(not set) seçeneği — Çeviri devre dışı.",
          "Save butonu — appSetting 'translation_engine_id' anahtarına yazar.",
        ],
      },
      {
        heading: S.flows,
        bullets: [
          "İlk kurulum: Engines'te API key ekle → buraya gel → motoru seç → Save.",
          "Motor değiştir: yeni radio → Save (yalnızca gelecekteki içe aktarımlara uygulanır).",
          "Kapat: '(not set)' → Save.",
        ],
      },
      {
        heading: S.pitfalls,
        bullets: [
          "Aktif motor yoksa 'Engines'e git, API key ekle' uyarısı çıkar.",
          "Motor değiştirmek geçmişte çevrilmişleri yeniden çevirmez.",
          "AI engine isActive=true olmalı.",
        ],
      },
      {
        heading: S.related,
        bullets: [
          "/pr/yonet/engines — AI motor + API key.",
          "/pr/yonet/library/import — bu ayarı kullanır.",
          "/pr/yonet/embedding-engines — ayrı (embedding için).",
        ],
      },
    ],
  },

  "embedding-engines": {
    title: "Embedding Motorları",
    purpose:
      "Library'de semantik arama ve benzerlik için kullanılan vektör embedding modellerini (OpenAI, Voyage, Cohere…) yönetir: API key, default seçimi, aktif/pasif, ekleme sihirbazı.",
    sections: [
      {
        heading: S.when,
        bullets: [
          "İlk kurulum: arama/similarity için embedding motoru eklemek.",
          "Birden fazla sağlayıcı tutmak (maliyet/performans dengesi).",
          "Default seçmek (auto-embed ve toplu embed bunu kullanır).",
          "API key güncellemek; motoru aktif/pasif yapmak; silmek.",
        ],
      },
      {
        heading: S.fields,
        bullets: [
          "Engine kartları — Provider rozeti (renk kodlu), ad, status dot, default rozeti, modelId, dim, cost.",
          "API key alanı — Password input + 'Save key' / 'Replace key'.",
          "Get key linki — Sağlayıcının API key sayfasına direkt link.",
          "Sihirbaz (3 adım) — Provider seç → Model seç → API key + opsiyonel ad/notes.",
          "Star (⭐) — Default ata.",
          "Aktif/Pasif toggle — Status dot.",
          "Sil — Default olmayanlar için.",
        ],
      },
      {
        heading: S.flows,
        bullets: [
          "İlk motor: Add → OpenAI → text-embedding-3-small → API key → Add.",
          "Default ata: Star ikonu → otomatik isActive=true.",
          "Anahtar güncelle: kartı aç → Replace key.",
          "Yedek sağlayıcı ekle: OpenAI yanına Voyage → gerektiğinde default değiştir.",
        ],
      },
      {
        heading: S.pitfalls,
        bullets: [
          "Aynı anda tek default; yeni default eskisini iptal eder.",
          "Default motor silinemez — önce başkasını default yap.",
          "API key AES-256-GCM şifreli, asla plaintext görünmez.",
          "Aktif embedding engine yoksa import'taki auto-embed devre dışı.",
          "Default değiştirmek geçmiş embedding'leri etkilemez.",
        ],
      },
      {
        heading: S.related,
        bullets: [
          "/pr/yonet/library — toplu embed default'u kullanır.",
          "/pr/yonet/library/import — auto-embed default'u kullanır.",
          "/pr/yonet/agent-roles — EMBEDDER rolü buradan beslenir (ayrı sayfada atama yok).",
        ],
      },
    ],
  },

  blog: {
    title: "Blog",
    purpose:
      "Blog yazılarını CRUD ile yönetir. Yaşam döngüsü: DRAFT → REVIEW → PUBLISHED → ARCHIVED. Yazarı, görüntülenme sayısını ve yayın tarihini izler.",
    sections: [
      {
        heading: S.when,
        bullets: [
          "Yeni yazı (başlık, slug, excerpt, markdown body) eklemek.",
          "Statüler arası geçiş yapmak.",
          "Slug'ı koruyarak içeriği güncellemek.",
          "Yazıyı kalıcı silmek (soft delete YOK).",
          "Görüntülenme ve yazar atıfını izlemek.",
        ],
      },
      {
        heading: S.fields,
        bullets: [
          "Title — 1–200, zorunlu; oluştururken slug otomatik üretir.",
          "Slug — 1–120, [a-z0-9-]; tekil, manuel düzenlenebilir.",
          "Excerpt — 0–500; listelerde gösterilir.",
          "Body — 1–50000 markdown.",
          "Status — DRAFT | REVIEW | PUBLISHED | ARCHIVED.",
          "Author — Oluşturan admin e-postası, otomatik atanır.",
          "Views — Sayaç, salt okunur.",
          "Published At — İlk PUBLISHED'a geçişte NOW set edilir.",
        ],
      },
      {
        heading: S.flows,
        bullets: [
          "Yayınla: New post → doldur → Status=Published → Save (publishedAt damgalanır).",
          "Draft → Review → Publish döngüsü: Edit ile statü ilerlet.",
          "Yayınlanmışı güncelle: Edit → metni değiştir → Save (slug değiştirme!).",
          "Arşivle: Status=Archived → public görmez.",
        ],
      },
      {
        heading: S.pitfalls,
        bullets: [
          "Slug'ı yayın sonrası değiştirmek dış linkleri kırar; yönlendirme yok.",
          "Markdown doğrulanmaz; bozuksa public sayfada hata.",
          "Delete kalıcıdır; soft delete yok.",
          "Statü geçişlerinde gating yok; ARCHIVED → PUBLISHED da mümkün.",
          "Tekrar PUBLISHED'a geçirmek publishedAt'i NOW'a günceller (idempotent değil).",
        ],
      },
      {
        heading: S.related,
        bullets: [
          "/pr/yonet/i18n — yazılarda i18n anahtarları varsa çeviri.",
          "/pr/yonet/emails — benzer modal-edit deseni.",
        ],
      },
    ],
  },

  i18n: {
    title: "Diller (Languages / i18n)",
    purpose:
      "21+ locale için çeviri mesajlarını yönetir. Coverage % İngilizce baz'a göre tamamlanmayı gösterir. Gettext .po dosyası ile toplu içe aktarım destekler.",
    sections: [
      {
        heading: S.when,
        bullets: [
          "Yeni dil varyantı eklemek (örn. 'pt-BR').",
          "Harici çeviri aracından (.po) toplu çeviri içe almak.",
          "Coverage % izleyip eksik dilleri tespit etmek.",
          "Bir locale'i silmek (sadece 'en' silinemez).",
          "Dry-run ile importu önizlemek, sonra commit etmek.",
        ],
      },
      {
        heading: S.fields,
        bullets: [
          "Code — 'xx' veya 'xx-XX'; regex /^[a-z]{2}(-[A-Z]{2})?$/.",
          "Name — NAMES haritasından (örn. en→English); bilinmeyen kodlar büyük harf gösterilir.",
          "Coverage — (strings/baseStrings)*100, max 100.",
          "Strings — Bu locale'deki çevrilmiş anahtar sayısı.",
          "Base Strings — en.json anahtar sayısı (referans).",
          "RTL — ar/he/fa/ur için true.",
        ],
      },
      {
        heading: S.flows,
        bullets: [
          "Yeni dil: 'Add language' → kod gir → en.json kopyalanır, coverage %0.",
          "PO içe aktar: 'Import .po' → dosya seç → dry-run önizleme (yeni/güncellenecek/atlanacak) → onayla.",
          "Tamamlanmayı izle: yüzde çubuğu yeşil = 100%.",
          "Locale sil: 'Delete locale' (en hariç) → onay → dosya kalkar.",
        ],
      },
      {
        heading: S.pitfalls,
        bullets: [
          "'en' silinemez (baz).",
          "Atomik yazım için temp+rename; süreç çakılırsa temp dosya kalabilir.",
          "Coverage yalnızca leaf string'leri sayar; yapı farklılığı yanlış oran üretebilir.",
          "PO yapısı doğrulanmaz; yanlış çeviriler aynen kabul edilir.",
          "RTL bayrağı sadece kod tabanlı (he/ar/fa/ur).",
          "Dry-run yazmaz; bağlantı koparsa retry gerekir.",
        ],
      },
      {
        heading: S.related,
        bullets: [
          "/pr/yonet/blog — yazı içerikleri i18n anahtarı kullanıyorsa eşleşmeli.",
          "/pr/yonet/emails — şablonlar locale bazlıdır; locale eksikse send düşer.",
        ],
      },
    ],
  },

  emails: {
    title: "E-posta Şablonları (Emails)",
    purpose:
      "Transactional e-posta şablonlarını oluşturur, düzenler ve test eder. Slug bazlı gruplanır; her slug+locale tekildir. HTML + opsiyonel plain-text + sentCount sayacı tutar.",
    sections: [
      {
        heading: S.when,
        bullets: [
          "Yeni e-posta türü (örn. 'password-reset-email') tanımlamak.",
          "Subject/HTML/plain-text düzenlemek.",
          "Şablonu aktif/pasif yapmak.",
          "Test alıcıya örnek değişkenlerle önizleme göndermek.",
          "Sent count'a göre kullanım analizi yapmak.",
        ],
      },
      {
        heading: S.fields,
        bullets: [
          "Slug — [a-z0-9-], 1–60. (slug, locale) tekil.",
          "Locale — 'xx' / 'xx-XX', varsayılan 'en'.",
          "Subject — 1–200, {{var}} desteği.",
          "Body HTML — 1–50000, {{var}} desteği, dangerouslySetInnerHTML ile render.",
          "Body Text — 0–50000, opsiyonel fallback.",
          "Active — Kapalı = gönderilmez.",
          "Sent Count — Salt okunur sayaç.",
          "Updated At — Son düzenleme.",
        ],
      },
      {
        heading: S.flows,
        bullets: [
          "Locale'li hoşgeldin: slug=welcome, locale=tr → subject + HTML + active → Save. Diğer locale'ler için tekrarla.",
          "Test gönder: Edit → Send test → alıcı e-posta → varsayılan değişkenlerle gönderilir.",
          "Locale tek tek pasifleştir: o locale'in Edit'inde isActive=false.",
          "İçerik güncelle: Edit → Subject + HTML → Save (plain-text manuel senkronla).",
        ],
      },
      {
        heading: S.pitfalls,
        bullets: [
          "(slug, locale) tekil — aynı çift ile ikinci kayıt P2002 hatası.",
          "HTML olduğu gibi render — kötü HTML postaları bozar.",
          "{{var}} basit string.replaceAll; iç içe / kaçırılan parantez fail.",
          "Bilinmeyen değişken yerine literal '{{x}}' kalır.",
          "Plain-text otomatik üretilmez; manuel senkron gerekir.",
          "Delete kalıcı; isActive=false ile arşivle.",
          "Locale yoksa ilgili send düşer.",
        ],
      },
      {
        heading: S.related,
        bullets: [
          "/pr/yonet/i18n — locale yönetimi.",
          "/pr/yonet/blog — i18n anahtarları paylaşılabilir.",
        ],
      },
    ],
  },

  analytics: {
    title: "Analitik (Analytics)",
    purpose:
      "30 günlük yuvarlanan pencerede platform kullanım metriklerini gösterir: ziyaretçi trendi, signup dönüşüm, trial→paid, churn ve coğrafi dağılım. Gerçek DB kaynaklarından (PageView, User, Subscription, GenerationTrace, AnalyticsEvent) hesaplanır.",
    sections: [
      {
        heading: S.when,
        bullets: [
          "Haftalık/aylık büyüme kontrolü.",
          "Üç aylık huni sağlığı raporu.",
          "Yeni pazar analizi (hangi ülkeler büyüyor).",
          "Fiyat/pazarlama değişikliği öncesi-sonrası dönüşüm karşılaştırması.",
          "Churn pattern: retention riski tespiti.",
        ],
      },
      {
        heading: S.fields,
        bullets: [
          "Visitors — 30g farklı session sayısı; delta önceki 30g.",
          "Sign-up rate — (yeni user / visitor) %.",
          "Trial → paid — (yeni paid sub / yeni user) %.",
          "Churn (30d) — (cancel / başlangıçta aktif) %.",
          "Funnel (5 adım) — Visit landing → Click 'Try free' → Created account → First generation → Paid upgrade. Her % visitor'a göre.",
          "Top countries — locale→country eşlemesi (12 ülke), her birinde sayım + %.",
        ],
      },
      {
        heading: S.flows,
        bullets: [
          "Haftalık snapshot: KPI delta'larını tara; visitor +%10 = sağlıklı.",
          "Trial→paid düşerse fiyat değişikliği veya API kırıkları için audit/api log incele.",
          "Coğrafi büyüme: Top Countries'te ani sıçramalar → localization kontrol.",
          "Churn alarmı: %8+ ise iptal nedenlerini abuse'tan çek.",
          "Funnel sızıntısı: 'Click try-free' yüksek ama 'Created account' düşükse signup UX/email verification kontrol.",
        ],
      },
      {
        heading: S.pitfalls,
        bullets: [
          "Visitor verisi gece batch'i ile akar — günün canlı verisi yarın görünür.",
          "Funnel %'leri kümülatif değil; her adım visitor'a oranlanır.",
          "Locale→country yaklaşıktır; IP geolocation değil.",
          "Churn yalnızca status=CANCELED'i sayar; trial expiry hariç.",
          "Cohort/segment filtre yok; DB query gerekir.",
        ],
      },
      {
        heading: S.related,
        bullets: [
          "/pr/yonet/system-settings — free tier ayarları dönüşümü etkiler.",
          "/pr/yonet/api — dönüşüm düşüşünde API uptime'ını doğrula.",
          "/pr/yonet/audit — config değişikliklerini izle.",
          "/pr/yonet/abuse — politika ihlalleri churn ile ilişkili olabilir.",
        ],
      },
    ],
  },

  abuse: {
    title: "Suistimal & Raporlar (Abuse)",
    purpose:
      "Kullanıcı raporlarının (spam, ihlal, rate-limit, bug, diğer) merkezi triyaj kuyruğu. Statü (OPEN, INVESTIGATING, RESOLVED, DISMISSED) ve çözen admin kim/ne zaman bilgisi saklanır. Son 100 rapor yüklenir; her eylem audit log'a yazılır.",
    sections: [
      {
        heading: S.when,
        bullets: [
          "Gelen kullanıcı raporlarını triyaj etmek.",
          "Bug veya feature talebi şikayetleri.",
          "Rate-limit istisnası talepleri.",
          "Çözüm sonrası audit doğrulama.",
        ],
      },
      {
        heading: S.fields,
        bullets: [
          "ID — UUID, ilk 8 karakter gösterilir.",
          "Type — SPAM | POLICY_VIOLATION | RATE_LIMIT | BUG | OTHER (oluşturma sonrası değişmez).",
          "Severity — LOW | MED | HIGH | CRITICAL (renkli rozet).",
          "Target — 'targetType:targetId' (örn. 'user:abc123').",
          "Reporter — Raporu açan kullanıcı e-postası; admin oluşturursa null.",
          "When — Göreli zaman ('3h ago').",
          "Status — OPEN/INVESTIGATING/RESOLVED/DISMISSED. RESOLVED/DISMISSED'a geçişte resolvedAt + resolvedBy otomatik.",
          "Description — Max 2000.",
        ],
      },
      {
        heading: S.flows,
        bullets: [
          "Triyaj: OPEN → oku → DISMISSED (geçersiz) veya INVESTIGATING.",
          "Escalate: kayıt güncelle, dış kanaldan abuse takımına ilet → RESOLVED.",
          "Rate-limit istisnası: api logları kontrol → /pr/yonet/system-settings'te whitelist → RESOLVED.",
          "Bug: tekrarla → düzeltme yayınlandıysa RESOLVED, yoksa DISMISSED.",
          "Sil: onay → audit 'abuse.delete' yazılır, rapor kalıcı kaybolur.",
        ],
      },
      {
        heading: S.pitfalls,
        bullets: [
          "Type/Severity/Target/Description değişmez; düzeltmek için sil + yeniden oluştur.",
          "Reporter null olduğunda (admin oluşturduğunda) tabloda '—' görünür.",
          "Silme geri alınamaz; audit kalır ama detay kaybolur.",
          "Sayfa 100 raporla sınırlı; eski raporlar kuyruktan düşer.",
          "Statü geri çevrilirse resolvedAt/By temizlenir; eski damga kaybolur.",
          "targetType/Id serbest metin; standart koymak iyi olur.",
        ],
      },
      {
        heading: S.related,
        bullets: [
          "/pr/yonet/api — RATE_LIMIT raporlarını trafikle eşleştir.",
          "/pr/yonet/audit — resolvedBy ile admin eylem geçmişini kesiştir.",
          "/pr/yonet/analytics — POLICY_VIOLATION pikleri churn ile ilişkilidir.",
        ],
      },
    ],
  },

  api: {
    title: "API Logları (API Logs)",
    purpose:
      "Son 100 API çağrısının canlı kuyruğu (5sn poll, pause/resume): metod, path, status, latency, çağıran kim. 24 saatlik özet KPI ve saatlik histogram ile hata patlamalarını görür.",
    sections: [
      {
        heading: S.when,
        bullets: [
          "Kullanıcı 'API çağrım başarısız' diyor → e-posta filtre ile son çağrıları bul.",
          "Performance: yavaş endpoint veya cascading failure.",
          "Rate-limit doğrulama: 429 sayım takibi.",
          "Çağıran kimliği bulma (e-posta veya key prefix).",
          "Operasyonel uyarı: error24h tırmanıyorsa altyapı sorunu.",
        ],
      },
      {
        heading: S.fields,
        bullets: [
          "24h calls / 24h errors — Pencere KPI'ları (5sn günceller); errors >0 ise kırmızı.",
          "Hourly histogram — 24 bar; mavi=toplam, kırmızı segment=hata.",
          "Status filter — all | 2xx | 3xx | 4xx | 5xx.",
          "Path filter — case-sensitive substring.",
          "User filter — case-insensitive (e-posta veya API key prefix).",
          "Tablo: Time, Method, Path, Caller (email veya 'sk-abc…'), Status, Latency.",
          "Pause/Resume + Manuel Refresh.",
        ],
      },
      {
        heading: S.flows,
        bullets: [
          "Kullanıcı şikayeti: User filtre = e-posta → Refresh → Status sütunu (401/403?).",
          "Error spike: 24h errors yükseliyor → histogram saatini bul → Status=5xx → Path tara.",
          "Latency: User filtrele → Latency desc sırala → median ölç.",
          "Rate-limit testi: Pause → load test → 4xx sayımına bak.",
        ],
      },
      {
        heading: S.pitfalls,
        bullets: [
          "Sadece son 100 satır; eski çağrı yaşlanırsa görünmez.",
          "5 sn staleness; yüksek frekans için Pause + manuel Refresh.",
          "Filter substring çok geniş ise yavaş; spesifik gir.",
          "Histogram saatleri büyük olasılıkla UTC; tablo local TZ — kafa karıştırır.",
          "Caller e-posta açıkça görünür (GDPR hassasiyeti — RBAC değerlendir).",
          "Body/Response içeriği yok; sadece metadata.",
        ],
      },
      {
        heading: S.related,
        bullets: [
          "/pr/yonet/system-settings — Limits (rate-limit ayarları).",
          "/pr/yonet/audit — apiKey.* eylemlerini kesiştir.",
          "/pr/yonet/abuse — RATE_LIMIT raporları.",
        ],
      },
    ],
  },

  "system-settings": {
    title: "Sistem Ayarları (Settings)",
    purpose:
      "Platform geneli yapılandırma: ücretsiz kademe kotaları, plan başına rate-limit, branding renkleri ve webhook endpoint'leri. Değişiklikler anlık uygulanır; audit log tutulur.",
    sections: [
      {
        heading: S.when,
        bullets: [
          "Free trial deneyimini ayarlamak (limit + teaser blur %).",
          "Yeni plan tier rate-limit eklemek.",
          "Branding renklerini değiştirmek.",
          "Yeni webhook partneri eklemek/event eşlemek.",
          "Acil feature gate: free limit=0 ile self-service'i durdurmak.",
        ],
      },
      {
        heading: S.fields,
        bullets: [
          "General: Site URL, Support email (UI gösterir, gerçek persistans yok), Allow signups, Require email verification.",
          "Branding: Primary color (#3b3a6e default), Accent color (#c98a3a default).",
          "Limits — Ücretsiz prompt limiti (≥0 tamsayı), Sayım kapsamı (lifetime|monthly), Teaser yüzdesi (1-100).",
          "Limits → Rate limits tablosu — UI önizleme, kalıcı kaydetme henüz yok.",
          "Webhooks — Endpoint listesi (mock data); 'Add webhook' implementasyonu pending.",
        ],
      },
      {
        heading: S.flows,
        bullets: [
          "Free tier başlat: limit=2, lifetime, teaser=10% → izle → conversion düşükse teaser'ı %30'a çıkar.",
          "Pazara uyarla: TR=monthly+10, US=lifetime+2 dene.",
          "Acil kapat: limit=0 → tüm free istekler 403 alır + Allow signups kapat.",
          "Branding A/B: Primary color değiştir → audit'te 'appSetting.set' kaydı.",
        ],
      },
      {
        heading: S.pitfalls,
        bullets: [
          "Transactional consistency yok: 3 ayardan biri yarıda kalabilir; audit'le doğrula.",
          "Sayım kapsamı değişimi geçmiş kullanımı sıfırlamaz.",
          "Teaser blur frontend (CSS); kullanıcı inspect ile devre dışı bırakabilir — server-side enforcement gerekir.",
          "Rate limit Save henüz wire'lı değil; refresh'te kaybolur.",
          "Branding renk değişimi cache nedeniyle kullanıcılarda gecikmeli görünebilir.",
          "Webhook delivery monitoring yok.",
          "Email verification toggle'ı zaten doğrulanmış kullanıcıyı tekrar doğrulatmaz.",
        ],
      },
      {
        heading: S.related,
        bullets: [
          "/pr/yonet/analytics — teaser/limit etkisini conversion'da gözle.",
          "/pr/yonet/abuse — limit=0 sonrası abuse pikleri.",
          "/pr/yonet/audit — 'appSetting.set*' eylemleri.",
        ],
      },
    ],
  },

  audit: {
    title: "Denetim Günlüğü (Audit Log)",
    purpose:
      "Tüm admin ve sistem eylemlerinin değiştirilemez (append-only) defteri. Her durum değişikliği aktör, zaman, hedef kaynak ve IP ile loglanır. Compliance, post-mortem ve hesap verebilirlik için.",
    sections: [
      {
        heading: S.when,
        bullets: [
          "Olay sonrası: 'X kullanıcısı ne zaman ve kim tarafından silindi?'",
          "Compliance audit: '90 günde kullanıcı verilerine yapılan tüm eylemler'.",
          "Forensic: 'Bu API key'i kim oluşturdu?'",
          "Erişim doğrulama: yetkisi olmayan biri delete yapmış mı.",
          "Hesap verebilirlik: aktör 1 saatte 100 değişiklik yaptı — yetkili miydi?",
        ],
      },
      {
        heading: S.fields,
        bullets: [
          "When — createdAt (local TZ).",
          "Actor — admin e-postası; sistem eylemi 'system' gösterir.",
          "Action — namespace.verb (örn. 'user.delete', 'appSetting.setFreePromptConfig').",
          "Target — 'targetType:targetId' (UUID kısaltılır 16 + …).",
          "IP — Source IP (proxy doğrulamasına bağlı; spoofing riski).",
          "Filtreler — Action prefix (case-sensitive), Actor email contains (case-insensitive); URL query'ye yazılır.",
        ],
      },
      {
        heading: S.flows,
        bullets: [
          "Post-mortem: Actor=alice → satırları zamana göre tara → Target='user:X' bul.",
          "Compliance: action='plan.' → Q1 tarih aralığını gözle (UI tarih filtresi yok).",
          "API key forensics: action='apiKey.' → Target sütununda key prefix bul.",
          "Erişim audit: action='user.delete' → admin olmayan e-posta varsa security.",
        ],
      },
      {
        heading: S.pitfalls,
        bullets: [
          "Audit'in audit'i yok; tüm adminler her şeyi görür (PII hassas roller için RBAC değerlendir).",
          "IP X-Forwarded-For'dan gelir; proxy validate edilmiyorsa güvenilmez.",
          "Sadece son 100 satır görünür; tam compliance için DB export.",
          "Action filtresi prefix-exact; 'abort' yazınca 'abuse.create' eşleşmez.",
          "targetId kısaltılır; tam UUID için DB.",
          "Meta JSON tabloda gösterilmez (eski/yeni değer için DB).",
          "Saat dilimi: createdAt UTC, render local — karışabilir.",
        ],
      },
      {
        heading: S.related,
        bullets: [
          "/pr/yonet/abuse — 'abuse.*' eylemlerini kesiştir.",
          "/pr/yonet/system-settings — 'appSetting.*' kayıtları.",
          "/pr/yonet/api — IP ↔ API log eşleşmesi.",
        ],
      },
    ],
  },
};
