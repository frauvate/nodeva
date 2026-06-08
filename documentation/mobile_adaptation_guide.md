# Mobil Uygulama Şablon Entegrasyon ve Uyarlama Kılavuzu

Bu kılavuz, web platformunda gerçekleştirilen yeni şablon entegrasyonlarını (Zihin Haritası, Kanban Panosu, Zaman Çizelgesi / Gantt), tasarım yeniliklerini, sürükleme/boyutlandırma mekanizmalarını ve yapay zeka (AI) güncellemelerini mobil (React Native / Expo) kod tabanına adım adım uyarlayabilmeniz için hazırlanmıştır.

---

## 1. Zihin Haritası Şablonu (Mindmap) Entegrasyonu

Web tarafında zihin haritası şablonu, serbest akıştan farklı olarak merkezden çevreye dallanan hiyerarşik bir yapıdadır.

### Mobilde Yapılması Gerekenler:
1. **Şablon Aktivasyonu:** 
   * Mobil şablon seçici ekranında Zihin Haritası (`mindmap`) seçeneğini aktifleştirin.
2. **Düğüm Tiplerinin Tanımlanması:**
   * Üç adet yeni düğüm tipi oluşturulmalıdır:
     * `mindmap_root`: Merkez Konu (panoda yalnızca bir tane bulunabilir).
     * `mindmap_main`: Ana başlıklar (Merkez konuya bağlanır).
     * `mindmap_sub`: Alt başlıklar (Ana başlıklara bağlanır).
3. **Görsel Düzenlemeler:**
   * Düğümlerin kenarlıklarını oval/bulutumsu yapın. Bağlantı oklarının (`edges`), zihin haritası modunda köşeli kırılmalar yerine yumuşak bezier eğrileri (`bezier curves`) olarak çizilmesini sağlayın.
   * Okların düğüm sınırlarına tam oturması için, ok uçlarının koordinatlarını düğümün dış çerçeve sınırlarına (`edge boundary coordinates`) göre hesaplayın.
4. **Özellikler Paneli (Property Panel):**
   * Mindmap düğümleri seçildiğinde, gereksiz içerik düzenleme seçeneğini gizleyin.
   * Mindmap panolarında da not eklenebilmesini (Not ekleme butonunun açılmasını) sağlayın.

---

## 2. Kanban Panosu (Kanban Board) Entegrasyonu

Kanban pano türü, görevlerin durum bazlı dikey sütunlarda takip edildiği yapıdadır.

### Mobilde Yapılması Gerekenler:
1. **Sütun Yapısı ve Kaydırma:**
   * Üç dikey sütun oluşturun: **Yapılacaklar** (`todo`), **Devam Edenler** (`in_progress`), **Tamamlananlar** (`done`).
   * Mobilde dikey sütunların yan yana sığabilmesi için yatay kaydırma (`ScrollView horizontal={true}`) yapısı kullanın.
2. **Sürükle-Bırak (Drag and Drop):**
   * Kullanıcı bir görevi tutup dikey sütunlar arasında sürükleyebilmelidir. Sütun üzerine bırakıldığında, görevin `data.status` değeri (sırasıyla `todo`, `in_progress`, `done`) güncellenmeli ve API'ye `PUT /boards/{board_id}` isteği atılarak kaydedilmelidir.
3. **Görev ve Not Ekleme:**
   * Her sütunun altında veya üstünde "Görev Ekle" ve "Not Ekle" butonları yer almalıdır.
   * Emojiler yerine tamamen temiz SVG ikonlar kullanılmalıdır.
4. **Responsive Tasarım:**
   * Sol navigasyon menüsü veya detay paneli açıldığında sütunların ezilmemesi için flex genişliklerini animasyonlu ve esnek (`flex-shrink`) tutun.

---

## 3. Zaman Çizelgesi / Gantt Şeması (Timeline) Entegrasyonu

Zaman Çizelgesi şablonu, dikey bir görev listesi ile sağ tarafta yatay takvim grid'inin birleşiminden oluşur.

### Mobilde Yapılması Gerekenler:
1. **Gantt Veri Modeli:**
   * Görev veri modeline (`NodeData` / `data`) şu alanları ekleyin:
     * `startDate`: Başlangıç Tarihi (`"YYYY-MM-DD"` formatında string).
     * `endDate`: Bitiş Tarihi (`"YYYY-MM-DD"` formatında string).
     * `progress`: İlerleme durumu (0 ile 100 arasında integer).
2. **Çift Ay Yan Yana Görünüm (Dual-Month Grid):**
   * Sağ taraftaki takvim grid'ini **aktif ay** ve **bir sonraki ay** olmak üzere yan yana iki ayı gösterecek şekilde kurun (Toplam ~60 gün).
   * Ay isimlerini en üst satıra (Örn: "Haziran 2026" | "Temmuz 2026") yazın.
   * Gün numarası satırını sırayla `1..30` ve `1..31` şeklinde render edin.
3. **Yakınlaştırma / Sütun Daraltma (Gantt Scaling/Zoom):**
   * Kullanıcının gün hücre genişliğini değiştirebilmesi için bir yakınlaştırma sürgüsü (`Slider`) ekleyin. Genişlik değeri `15` ile `85` birim arasında değişebilmelidir.
   * Hücre daraltıldığında takvim grid'i yana doğru orantılı büzülmeli, böylece iki ayın tamamı ekrana sığabilmelidir.
4. **Zaman Dilimi Filtrelemesi (Viewport Filtration):**
   * Sol görev listesinde ve sağ takvim satırlarında **yalnızca aktif gösterilen 2 aylık pencereye denk gelen** görevleri filtreleyip gösterin (`visibleNodes`).
   * Tarih aralığı dışındaki görevler listede kalabalık yapmamalıdır. Kullanıcı önceki/sonraki aylara geçtiğinde o ayın görevleri listelenmelidir.
   * Ay geçişlerinde, seçili görev ekran dışı kalırsa seçimi temizleyin (`setSelectedNodeId(null)`).
5. **Görev Çubuğu Sürükleme ve Yeniden Boyutlandırma:**
   * **Taşıma (Move Mode):** Çubuğun gövdesinden tutulup yatay sürüklendiğinde, gün farkı (`deltaDays = Math.round(dx / columnWidth)`) hesaplanıp hem `startDate` hem de `endDate` aynı miktarda güncellenmeli.
   * **Boyutlandırma (Resize Mode):** Çubuğun sol ve sağ uçlarına yerleştirilen tetikleyiciler (`resize handles`) aracılığıyla, sürükleme yönüne göre sırasıyla sadece `startDate` veya sadece `endDate` güncellenmeli.
   * **Pointer Event Kontrolü:** Mobilde `PanResponder` veya `react-native-gesture-handler` kullanarak dokunma (press), sürükleme (drag) ve bırakma (release) anlarını dinleyin. Dokunma anında başlangıç tarih yedeğini (`initialStartDate`, `initialEndDate`) tutun, hareket anında yerel state'i güncelleyin, bırakma anında `PUT` API isteğini gönderin.
   * **Görsel Cues:** Sürükleme anında çubuğun opaklığını düşürün ve gölge verin. Sürükleme bittiğinde veritabanına kaydedin.
6. **Tarih Girişi Yazma Düzeltmesi (Editable Date Inputs):**
   * Özellikler panelindeki tarih seçicilerin klavye ile yazma/düzenleme modundayken kilitlenmesini önlemek için:
     * Karakter değişimini (`onChange`) yerel state'e yazın.
     * Değişikliği veritabanına kaydetme (PUT) işlemini ise girdiden çıkıldığında (`onBlur`) tetikleyin.
     * Boş değerlerde varsayılan tarihe dönüp kilitlememesi için nullish coalescing (`value={startDate ?? ''}`) kullanın.
7. **Dinamik Bugün Çizgisi:**
   * Bugünün tarihi aktif 2 aylık penceredeyse, kırmızı kesikli bir çizgiyle bugün göstergesi çizin. Pozisyonu `(gün - 1) * sutunGenisligi + (sutunGenisligi / 2)` olarak hesaplayın.

---

## 4. Şablona Özel Yapay Zeka (AI) İş Akışı Kuralları

Web API backend tarafında Gemini API istekleri şablon tipine göre özelleştirilmiştir. Mobilde AI ile üretim panelini açarken bu yapıya sadık kalınmalıdır.

### API İstek Yapısı:
AI iş akışı üretimi için `POST /boards/{board_id}/generate_ai` endpoint'ine `{ "prompt": "kullanıcı girdisi" }` gönderilir. Backend, panonun şablon türünü algılayıp Gemini'ye özel kurallar dikte eder:
* **flowchart:** `flow_start`, `flow_process`, `flow_decision`, `flow_data`, `flow_end` düğüm tipleriyle bağlı diyagram üretir.
* **mindmap:** Düğüm tipleri `mindmap_root` (1 adet), `mindmap_main` ve `mindmap_sub` olarak radial dallanan ağaç koordinatlarıyla üretilir.
* **kanban:** Kenar bağlantısı (edges) olmayan, durumları (`status`) `todo`, `in_progress` veya `done` olarak dağıtılmış görev düğümleri üretir.
* **timeline:** `startDate`, `endDate`, `progress` yüzdesi içeren ve kronolojik sıralı görev düğümleri üretir.

Mobil uygulamada AI üret butonları tıklandığında, ilgili pano şablonunun veri modelinin (tarihler, statüler, mindmap tipleri) backend'den gelen JSON'a uygun olarak düzgünce işlendiğinden ve hata vermeden render edildiğinden emin olun.
