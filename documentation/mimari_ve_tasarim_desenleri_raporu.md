# Dijital İş Akışı Yöneticisi - Kapsamlı Mimari ve Tasarım Desenleri Raporu

Bu belge, projenin uygulanmasında tercih edilen mimari kurguyu, yazılım tasarım desenlerini (design patterns) ve iletişim katmanlarını derinlemesine incelemektedir. Proje "monorepo" hissiyatı veren bir yapı ile tasarlanmış olup; Backend, Web İstemcisi ve Mobil İstemci olmak üzere birbirine tamamen veri odaklı (REST) entegre olan üç ana bileşenden oluşmaktadır.

---

## 1. Genel Sistem Mimarisi ve Veri Akışı Prensibi

Proje, güncel dağıtık sistem prensiplerinden etkilenmiş bir **İstemci-Sunucu (Client-Server)** yapısı izler. Frontend uygulamaları (Web ve Mobil), tüm iş mantığı yükünü (business logic) Backend API'sine bırakacak şekilde tasarlanmıştır. Bu tarz bir yaklaşım, "Thin Client / Thick Server" (İnce İstemci / Kalın Sunucu) modeline yakındır. 
Sistemde veri akışı şu şekilde tasarlanmıştır:
1. İstemci (Web veya Mobil) kullanıcıdan gelen aksiyonları yakalar.
2. Servis Gateway katmanı (Örn: `api.ts`), aksiyonları HTTP (REST) formatına dönüştürerek sunucuya iletir.
3. FastAPI tabanlı sunucu, veriyi DTO'lar (Data Transfer Object) üzerinden okur, yetki denetimi yapar, veritabanına yazar ve standart bir JSON yanıtı döndürür.

### Modül Cihazlandırması (Repository Yapısı)
- `backend/`: Sistem kalbi. Router'lar, entity modelleri, servis dışa vurumları.
- `frontend-web/`: Browser'da çalışan, etkileşimi (Canvas) yüksek web görünümü.
- `frontend_mobile/`: Mobil cihazlarda çalışan React Native (Expo) temelli mobil uygulama.

---

## 2. Backend Mimarisi ve Katmanları (Python & FastAPI)

Yüksek eşzamanlı işlem gücü ve veri doğrulama avantajlarından ötürü **FastAPI** framework'üne dayanmaktadır. Backend, spagetti kod oluşumunu ve bağımlılıkların karışmasını engellemek üzere **N-Tier (Çok Katmanlı) Mimari** yapısına bölünmüştür.

### Katmanlar ve Detaylı Sorumlulukları
1. **Controller / Routing Katmanı (`routes/ボード.py`, `auth.py`)**:
   Sadece HTTP Request-Response döngüsünü idare eder. Gelen isteklerin içeriğini doğrulama katmanına iletir, yetkileri kontrol eder ve spesifik servisleri tetikleyerek sonucu geri döndürür. Ağır mantıksal hesaplamalar bu katmanda **yapılmaz**.
2. **Business / Service Katmanı (`services/ai.py`)**:
   İş kurallarının (Business Rules) ve harici API'lerle (Yapay zeka modelleri gibi) iletişimin barındırıldığı izolasyon katmanıdır. Router sınıfı sadece "Bana AI çıktısını ver" der, ancak AI modelinin nasıl çağırıldığını ya da işlendiğini bilmez.
3. **Data Transfer & Entity Modelleri (`models.py`)**:
   `Pydantic` kütüphanesi ile yazılmışlardır. Dışarıdan gelen verileri (Request Payloads) parse etmek, tiplemek ve geçerli (valid) olup olmadığını denetlemekten sorumludur. Aynı zamanda oluşturulan `Board`, `Node`, `Edge` yapılarının şematik sınırlarını (schema constraints) belirleyerek veri tutarlılığını garanti eder.
4. **Data Access (Veritabanı) Katmanı (`database.py`)**:
   Veri kalıcılığını sağlayan birimdir.

### Uygulanan Tasarım Desenleri (Backend)

- **Repository Pattern (Veri Deposu Deseni)**:
  `database.py` içerisinde yer alan `MockCollection` yapısı, MongoDB'ye çok benzeyen metotlarla (`insert_one`, `find_one`, `update_one`) bir arabirim (Interface/Wrapper) sunar. İş mantıkları (Routes) arka planda verilerin nerede saklandığını (şu an lokal bir `mock_db.json` üzerinde) umursamaz, sadece Repository metotlarını çağırır. İleride sistem gerçek bir veritabanına (MondoDB, PostgreSQL) çevrildiğinde uygulamanın geri kalan hiçbir kısmı değişmeyecektir.
  
- **Dependency Injection (Bağımlılık Enjeksiyonu / DI)**:
  Özellikle kimlik doğrulama (`auth`) akışında FastAPI'nin kendi metotları olan `Depends` anahtar kelimesi ile uygulanır. Bir endpoint çağırılmadan önce istekte bulunan kullanıcının (`current_user`) doğrulanması, araya enjekte edilen (injected) fonksiyonlarla modüler olarak gerçeklenir.

- **Data Transfer Objects (DTO)**:
  Pydantic modelleri (`BoardCreate` vs.) DTO gibi çalışır. Kullanıcının doğrudan asıl veritabanı şemasına müdahalesi yerine, sadece oluşturmak veya değiştirmek istediği alanları transfer etmesini güvence altına alırlar.

---

## 3. Web İstemci Mimarisi (React, Vite & TypeScript)

Arayüz katmanında, verimliliği ve ölçeklenebilirliği nedeniyle kod yapısı modüller halinde dizayn edilmiştir. TypeScript, tip güvensiz hataların ve tanımsız property çağırmaların (undefined variables) derleme zamanında (compile time) yakalanmasına olanak tanımıştır.

### Sınıflandırma ve Desenler
- **Component-Based Architecture (Bileşen Temelli Mimari)**:
  Kompleks User Interface, atomik ve tekrar edilebilir küçük parçalara (Components) kırılmıştır. `Toolbar.tsx`, `Sidebar.tsx`, `Modal.tsx` bu yaklaşımın ürünleridir. Uygulama büyüdükçe arayüz kodunu yönetilebilir kılan en temel Reakt desenidir.
  
- **Façade Pattern (Geçiş Noktası) & API Gateway Yönelimi (`api.ts`)**:
  Sistemde istemciler backend'e doğrudan Axios veya Fetch metotlarıyla ham şekilde çıkmaz. `api.ts` isimli dosya tüm bu istekleri (URL rotaları, header konfigürasyonları ve yetki token'ları) merkezi bir katmanda kapsüller (Encapsulation). UI bileşenleri yalnızca api arabirimini çağırır.
  
- **Higher-Order Components (HOC) veya Error Boundaries (`ErrorBoundary.tsx`)**:
  Bir bileşende meydana gelebilecek runtime çökmelerinin tüm web sayfasını beyaz bir sayfaya veya crash durumuna getirmesini engellemek için bileşen ağacı bir HATA SARICISI ile kapsanmıştır. Böylece hatalı modül lokal olarak tutulur ve uygulamanın geri kalanı çalışmaya devam eder.
  
- **Client-Side Routing (SPA)**:
  `react-router-dom` aracılığıyla, sayfalar (Dashboard ve Auth) DOM bellek yenilenmesine (hard-refresh) ihtiyaç duymadan eşzamanlı ve anında ekranda belirir.

---

## 4. Mobil İstemci Mimarisi (React Native, Expo & TypeScript)

Web mimarisinin bir yansıması olup, aynı JavaScript ekosistemi ve mimari kuralları benimsenerek Native derlenecek şekilde uyarlanmıştır. 

### Ek Mimari Katmanlar ve Mobil Desenler
1. **Screen & Component Ayrımı**:
  `screens/` klasörü sayfanın tamamını (container bileşenleri), `components/` klasörü ise sayfa içerisindeki izole düğmeleri / kartları (presentational bileşenleri) temsil edecek şekilde kurgulanmıştır (Presentational & Container Component Pattern).
  
2. **Navigation Stack Management (`navigation/`)**:
  Mobil dünyasında ekran yığınları kritiktir. React Navigation kullanılarak state stack yöntemi uygulanmıştır. Kimliği doğrulanmış kullanıcılar iç yapılı rotalara aktarılırken, doğrulanmamış olanlar Giriş yapılarına bloklanırlar. (Auth Flow Pattern).
  
3. **Flux / Merkezi Durum Yönetim Desenleri (Zustand) (`store/`)**:
  - React platformları, varsayılan olarak veriyi zincirleme olarak ebeveynden çocuğa aktarır (Prop-drilling). Ancak `Canvas` gibi aynı anda onlarca Node ve Edge'in güncellenmesi gereken aktif sahnelerde bu yaklaşım yavaşlık ve aşırı karmaşa yaratır.
  - Bu sebeple sisteme, `useAuthStore` ve `useBoardStore` kullanılarak Global bir Store (Zustand tabanlı) entegre edilmiştir. 
  - **Uygulanan Model Prensibi**: Merkezi bir deponun (Global Store) tüm sistem için "**Single Source of Truth**" (Tek Doğru Bilgi Merkez) olmasıdır. Bir komponent bir Board eklediğinde, store kendini günceller ve Store'a abone (subscribed) olan tüm uygulama ekranı otomatik olarak kendini yeniden render eder (Reactive Update).

---

## Kapsamlı Mimari Değerlendirme

Sistemin bütünsel kurgusu modülerlik (Modularity) ve gevşek bağlılık (Loose Coupling) temelleri üzerine oturtulmuştur:
- **Teknoloji Seviyesinde SoA (Service Oriented Architecture)**: Frontend'lerin iş lojiğinden sıyrılarak bir presentation layer (görsel katman) haline getirilmesi ve Backend'in salt data-provider olarak tasarlanması.
- **Güvenli Sınırlar**: Tip sınırlamaları ile her 3 platformun da ahenk içerisinde (Pydantic / TS interfaceler aracılığıyla) anlaşması.
- **Bakım Kolaylığı**: Frontend ve Backend bağımsız takımlar tarafından aynı anda geliştirilip, aynı anda farklı versiyon çıkarılabilecek şekilde izole edilmiş tasarımlar barındırmaktadır.
