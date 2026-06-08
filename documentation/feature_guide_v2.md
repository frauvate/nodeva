# Nodeva — Özellik Entegrasyon Rehberi v2
## Proje Klasörleri & Yorum Sistemi

> Bu belge, bir sonraki geliştirme ajanının Nodeva projesine iki yeni özellik eklemesi için
> hazırlanmıştır. Her bölüm; **Backend**, **Web (React + Vite)** ve **Mobil (React Native / Expo)**
> katmanlarını ayrı ayrı ele almaktadır.

---

## Genel Mimari Özeti

```
d:/nodeva/
├── backend/                   # FastAPI + MongoDB (PyMongo)
│   ├── main.py                # Router kayıtları buraya yapılır
│   ├── models.py              # Pydantic modelleri
│   ├── database.py            # MongoDB koleksiyonları
│   ├── auth.py                # get_current_user bağımlılığı
│   └── routes/
│       ├── boards.py          # Pano CRUD + AI endpoint
│       ├── teams.py           # Ekip yönetimi
│       ├── users.py           # Profil, arama, paylaşım
│       └── notifications.py   # Bildirim CRUD
│
├── frontend-web/src/          # Vite + React + TypeScript
│   ├── index.css              # CSS değişkenleri (design tokens)
│   ├── components/
│   │   ├── Canvas.tsx         # Ana tahta bileşeni (~2300 satır)
│   │   ├── Sidebar.tsx        # Sol panel: pano listesi
│   │   ├── TeamsPanel.tsx     # Ekip yönetim paneli
│   │   └── ...
│   ├── pages/
│   └── services/
│
└── frontend_mobile/src/       # Expo (React Native) + TypeScript
    ├── screens/
    │   ├── HomeScreen.tsx     # Ana ekran: pano listesi + şablon seçici
    │   └── BoardScreen.tsx    # Pano ekranı
    ├── components/
    ├── store/
    │   ├── useBoardStore.ts   # Zustand: pano state
    │   └── useTeamStore.ts    # Zustand: ekip state
    ├── services/api.ts        # Axios client — BASE_URL: http://192.168.1.105:8001
    ├── context/ThemeContext.tsx
    └── types/models.ts
```

---

## Tasarım Dili — Zorunlu Kurallar

> **Bu kurallara uymayan hiçbir bileşen kabul edilmez.**
> Mevcut tasarımla tutarlılık birinci önceliktir.

### Web CSS Değişkenleri (index.css)

```css
/* ACCENT — tek renk, gradient KULLANILMAZ */
--accent-primary:       #6366f1   (light) / #818cf8   (dark)
--accent-secondary:     #818cf8   (light) / #a5b4fc   (dark)
--accent-gradient-soft: rgba(99,102,241,0.08)

/* YÜZEY */
--glass-bg:             rgba(255,255,255,0.75)  (light) / rgba(255,255,255,0.04)  (dark)
--glass-bg-strong:      rgba(255,255,255,0.90)  (light) / rgba(255,255,255,0.07)  (dark)
--glass-border:         rgba(0,0,0,0.07)        (light) / rgba(255,255,255,0.08)  (dark)
--glass-shadow:         0 2px 16px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)
--glass-blur:           blur(20px)

/* TİPOGRAFİ */
--font-heading: 'Poppins', sans-serif  — h1/h2/h3
--font-ui:      'Inter', sans-serif    — butonlar, etiketler, gövde
--font-body:    'Roboto', sans-serif   — uzun paragraflar

/* KÖŞE YUVARLAMA */
Büyük kartlar / modaller:          border-radius: 18-20px
Küçük elemanlar (chip, badge):     border-radius: 8-12px
Butonlar:                          border-radius: 10-12px
```

### Web CSS Sınıfları

```css
.glass-panel        /* temel glassmorphism kartı (border-radius: 18px) */
.glass-panel-raised /* yükseltilmiş, daha kuvvetli gölge (border-radius: 20px) */
```

**Yeni bileşenler `glass-panel` veya `glass-panel-raised` kullanmalıdır.**
Arka plan renkleri **asla sabit hex** olmaz; her zaman CSS değişkeni kullanılır.

### Mobil Tema (ThemeContext.tsx)

```typescript
// useTheme() hook'undan alınır:
const { colors, isDark } = useTheme();

colors.background        // #ffffff / #111118
colors.surface           // rgba(255,255,255,0.75) / rgba(255,255,255,0.05)
colors.surfaceStrong     // rgba(255,255,255,0.92) / rgba(255,255,255,0.08)
colors.textPrimary       // #1e1e2e / #e2e4f0
colors.textSecondary     // #6b7280 / #8b8fa8
colors.textMuted         // #9ca3af / #5c5f72
colors.border            // rgba(0,0,0,0.07) / rgba(255,255,255,0.08)
colors.accent            // #6366f1 / #818cf8
colors.accentSoft        // rgba(99,102,241,0.08) / rgba(129,140,248,0.1)
colors.error             // #ef4444 / #f87171
colors.success           // #10b981 / #34d399
```

**Mobil ikonlar:** `@expo/vector-icons` — `Feather`, `Ionicons`, `MaterialCommunityIcons`.

### İkon Referans Tablosu

| Kullanım | Web (SVG viewBox 0 0 24 24) | Mobil (Feather) |
|---|---|---|
| Klasör kapalı | folder | `folder` |
| Klasör açık | folder-open | `folder-open` |
| Yorum | message-square | `message-square` |
| Mention | at-sign | `at-sign` |
| Beğeni | heart | `heart` |
| Yanıtla | corner-down-right | `corner-down-right` |
| Ekle | + çizgileri | `plus` |
| Düzenle | edit-2 | `edit-2` |
| Sil | trash-2 | `trash-2` |
| Kapat | x | `x` |
| Aşağı ok | chevron-down | `chevron-down` |
| Yukarı ok | chevron-up | `chevron-up` |

---

## ÖZELLİK 1: Proje Klasörleri

### 1.1 Genel Konsept

İki tür klasör:

1. **Proje Klasörü** — kullanıcının manuel oluşturduğu, panoları sürükle-bırak veya menüden içine attığı klasörler.
2. **Ekip Klasörü** — `team_id` olan her ekip için otomatik oluşturulan, o ekibe ait tüm panoları toplayan klasörler. Kullanıcı bu klasörü oluşturmaz; backend mantığı kesinlikle oluşturur.

### 1.2 Backend

#### 1.2.1 Yeni MongoDB Koleksiyonu (`database.py`)

```python
folders_collection = db["folders"]
```

#### 1.2.2 Yeni Pydantic Modelleri (`models.py`)

```python
class Folder(BaseModel):
    id: str
    user_id: str
    name: str
    color: Optional[str] = None        # ön plan rengi (CSS var adı veya hex)
    board_ids: List[str] = []          # klasördeki pano ID'leri
    is_team_folder: bool = False       # True ise team_id'ye bağlı otomatik klasör
    team_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class FolderCreate(BaseModel):
    name: str
    color: Optional[str] = None

class FolderUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None
    board_ids: Optional[List[str]] = None
```

#### 1.2.3 Yeni Route Dosyası (`routes/folders.py`)

```python
GET    /folders/
       # Kullanıcıya ait klasörleri + üyesi olduğu ekip klasörlerini listele

POST   /folders/
       # Yeni proje klasörü oluştur (FolderCreate body)

PUT    /folders/{folder_id}
       # Klasör adı / rengi / board_ids güncelle (FolderUpdate body)
       # Yetki: user_id == current_user.id
       # Ekip klasörü ise name değişikliğine yalnızca ekip sahibi izinli

DELETE /folders/{folder_id}
       # Klasörü sil; içindeki panolar silinmez

POST   /folders/{folder_id}/boards/{board_id}
       # Panoyu klasöre ekle ($push board_ids)

DELETE /folders/{folder_id}/boards/{board_id}
       # Panoyu klasörden çıkar ($pull board_ids)

GET    /folders/team/{team_id}
       # Ekip klasörünü döndür; yoksa o ekibin panolarını toplayarak oluştur
```

**Ekip klasörü otomatik oluşturma:**

```python
# GET /folders/team/{team_id} içinde:
existing = folders_collection.find_one({"team_id": team_id, "is_team_folder": True})
if existing:
    return serialize_doc(existing)

team_boards = list(boards_collection.find({"team_id": team_id}))
board_ids = [str(b["_id"]) for b in team_boards]
team = teams_collection.find_one({"id": team_id})

new_folder = {
    "user_id": team["owner_id"],
    "name": team["name"],
    "color": None,
    "board_ids": board_ids,
    "is_team_folder": True,
    "team_id": team_id,
    "created_at": datetime.utcnow(),
    "updated_at": datetime.utcnow(),
}
result = folders_collection.insert_one(new_folder)
new_folder["_id"] = result.inserted_id
return serialize_doc(new_folder)
```

#### 1.2.4 `main.py` Kayıt

```python
from routes import folders
app.include_router(folders.router)
```

---

### 1.3 Web Frontend

#### 1.3.1 Değiştirilecek Dosya: `Sidebar.tsx` + `Sidebar.css`

**Yeni UI yapısı (Sidebar içi):**

```
KİŞİSEL PANOLAR                          [+ klasör]
  📂 Tasarım Projeleri          [3 pano]  ˅
    ├── 📋 Ana Akış
    ├── 📋 Wireframe
    └── 📋 Kanban
  📂 Sprint Notları             [1 pano]  >
  📋 Genel Pano          (klasörsüz)
  📋 Proje Özeti         (klasörsüz)

EKİP KLASÖRÜ — Tasarım Ekibi             ˅
  📋 Ekip Sprint Panosu
  📋 Ekip Mindmap

EKİP KLASÖRÜ — Backend Ekibi             >
```

**Sürükle-bırak davranışı (HTML5 Drag & Drop):**

```typescript
// Pano satırına:
draggable
onDragStart={(e) => { e.dataTransfer.setData('boardId', board.id); }}

// Klasör satırına:
onDragOver={(e) => { e.preventDefault(); setDropTarget(folder.id); }}
onDrop={(e) => {
  const boardId = e.dataTransfer.getData('boardId');
  folderAPI.addBoardToFolder(folder.id, boardId).then(fetchFolders);
  setDropTarget(null);
}}
```

Drop hedefi vurgusu:

```css
.folder-row-drop-target {
  border: 2px dashed var(--accent-primary);
  border-radius: 10px;
  background: var(--accent-gradient-soft);
  transition: all 0.2s ease;
}
```

**Klasör adı inline düzenleme:**

```tsx
// Çift tıkla açılır:
onDoubleClick={() => setEditingFolderId(folder.id)}

// Düzenleme modu:
{editingFolderId === folder.id ? (
  <input
    autoFocus
    defaultValue={folder.name}
    onBlur={(e) => { folderAPI.updateFolder(folder.id, { name: e.target.value }); setEditingFolderId(null); }}
    onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') setEditingFolderId(null); }}
    style={{ fontFamily: 'var(--font-ui)', fontSize: '0.85rem', border: 'none',
      background: 'var(--glass-bg)', borderRadius: 6, padding: '2px 6px', color: 'var(--text-primary)' }}
  />
) : (
  <span>{folder.name}</span>
)}
```

**Renk nokta badge:**

```tsx
const FOLDER_COLORS = [
  'var(--accent-primary)', 'var(--node-blue-text)', 'var(--node-green-text)',
  '#a16207', '#be185d', '#c2410c',
];

<div
  className="folder-color-dot"
  style={{ backgroundColor: folder.color || 'var(--text-muted)' }}
  onClick={(e) => { e.stopPropagation(); setColorPickerFor(folder.id); }}
/>
{colorPickerFor === folder.id && (
  <div className="folder-color-picker glass-panel">
    {FOLDER_COLORS.map(c => (
      <div key={c} style={{ width: 16, height: 16, borderRadius: '50%', background: c, cursor: 'pointer' }}
        onClick={() => { folderAPI.updateFolder(folder.id, { color: c }); setColorPickerFor(null); }} />
    ))}
  </div>
)}
```

**Yeni CSS sınıfları (`Sidebar.css`):**

```css
.folder-row {
  display: flex; align-items: center; gap: 6px; padding: 6px 8px;
  border-radius: 8px; cursor: pointer; user-select: none;
  transition: background 0.15s;
}
.folder-row:hover { background: var(--accent-gradient-soft); }
.folder-row.open { font-weight: 600; }
.folder-board-indent { padding-left: 20px; border-left: 2px solid var(--glass-border-subtle); margin-left: 10px; }
.folder-color-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; cursor: pointer; }
.folder-color-picker { display: flex; gap: 6px; padding: 8px; position: absolute; z-index: 100; }
.add-folder-btn {
  background: none; border: 1px dashed var(--glass-border); border-radius: 8px;
  color: var(--text-muted); font-size: 0.8rem; cursor: pointer; padding: 4px 10px;
  transition: all 0.15s; width: 100%; margin-top: 4px;
}
.add-folder-btn:hover { border-color: var(--accent-primary); color: var(--accent-primary); }
```

#### 1.3.2 Yeni Servis (`services/` altında veya Sidebar'da)

```typescript
// Web'deki mevcut API pattern'i ne ise onu kullan (fetch veya axios).
// Sidebar.tsx üst kısmındaki mevcut import'ları inceleyin.
export const folderAPI = {
  getFolders: () => ...,
  createFolder: (name: string, color?: string) => ...,
  updateFolder: (id: string, data: Partial<FolderUpdate>) => ...,
  deleteFolder: (id: string) => ...,
  addBoardToFolder: (folderId: string, boardId: string) => ...,
  removeBoardFromFolder: (folderId: string, boardId: string) => ...,
  getTeamFolder: (teamId: string) => ...,
};
```

---

### 1.4 Mobil Frontend

#### 1.4.1 Değiştirilecek Dosya: `HomeScreen.tsx`

**Yeni tab: 'boards' görünümü, klasör tabanlı:**

```
[Kişisel Panolar]
  📂 Tasarım Projeleri    3 pano   [v]
    ├── Sprint Panosu
    └── Wireframe
  📂 Sprint Notları       1 pano   [>]
  📋 Genel Pano (klasörsüz)
  [+ Klasör Oluştur]

[Ekip Klasörleri]
  👥 Tasarım Ekibi        [v]
    ├── Ekip Sprint Panosu
```

**Sürükle-bırak yerine: "Klasöre Taşı" modal (önerilen):**

Her pano satırının sağ tarafında `⋯` (more) butonu:

```tsx
<TouchableOpacity onPress={() => { setMovingBoard(board); setMoveModalVisible(true); }}>
  <Feather name="more-horizontal" size={16} color={colors.textMuted} />
</TouchableOpacity>
```

Modal içinde klasör listesi, seçilince `folderAPI.addBoardToFolder()` çağrılır.

**Klasör kartı:**

```tsx
<TouchableOpacity
  style={[styles.folderCard, {
    backgroundColor: colors.surface,
    borderColor: folder.color ? folder.color + '40' : colors.border,
    borderWidth: folder.color ? 1.5 : 1,
  }]}
  onPress={() => toggleFolder(folder.id)}
  onLongPress={() => { setEditingFolder(folder); setFolderNameModalVisible(true); }}
>
  <Feather
    name={openFolderIds.includes(folder.id) ? 'folder-open' : 'folder'}
    size={15}
    color={folder.color || colors.accent}
  />
  <Text style={[styles.folderName, { color: colors.textPrimary }]}>{folder.name}</Text>
  <Text style={{ color: colors.textSecondary, fontSize: 11 }}>{folder.board_ids.length} pano</Text>
  <Feather
    name={openFolderIds.includes(folder.id) ? 'chevron-up' : 'chevron-down'}
    size={13}
    color={colors.textMuted}
  />
</TouchableOpacity>
```

Uzun basış ile yeniden isimlendirme modal'ı açılır.

**Yeni Store (`store/useFolderStore.ts`):**

```typescript
import { create } from 'zustand';
import { folderAPI } from '../services/api';

interface Folder {
  id: string;
  name: string;
  color?: string;
  board_ids: string[];
  is_team_folder: boolean;
  team_id?: string;
}

interface FolderState {
  folders: Folder[];
  isLoading: boolean;
  fetchFolders: () => Promise<void>;
  createFolder: (name: string, color?: string) => Promise<void>;
  updateFolder: (id: string, data: { name?: string; color?: string; board_ids?: string[] }) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
  addBoardToFolder: (folderId: string, boardId: string) => Promise<void>;
  removeBoardFromFolder: (folderId: string, boardId: string) => Promise<void>;
}

export const useFolderStore = create<FolderState>((set, get) => ({
  folders: [],
  isLoading: false,
  fetchFolders: async () => {
    set({ isLoading: true });
    try {
      const folders = await folderAPI.getFolders();
      set({ folders, isLoading: false });
    } catch { set({ isLoading: false }); }
  },
  createFolder: async (name, color) => {
    const f = await folderAPI.createFolder(name, color);
    set(s => ({ folders: [...s.folders, f] }));
  },
  updateFolder: async (id, data) => {
    await folderAPI.updateFolder(id, data);
    set(s => ({ folders: s.folders.map(f => f.id === id ? { ...f, ...data } : f) }));
  },
  deleteFolder: async (id) => {
    await folderAPI.deleteFolder(id);
    set(s => ({ folders: s.folders.filter(f => f.id !== id) }));
  },
  addBoardToFolder: async (folderId, boardId) => {
    await folderAPI.addBoardToFolder(folderId, boardId);
    set(s => ({
      folders: s.folders.map(f =>
        f.id === folderId ? { ...f, board_ids: [...f.board_ids, boardId] } : f
      )
    }));
  },
  removeBoardFromFolder: async (folderId, boardId) => {
    await folderAPI.removeBoardFromFolder(folderId, boardId);
    set(s => ({
      folders: s.folders.map(f =>
        f.id === folderId ? { ...f, board_ids: f.board_ids.filter(id => id !== boardId) } : f
      )
    }));
  },
}));
```

**`services/api.ts` — Yeni folderAPI:**

```typescript
export const folderAPI = {
  getFolders: () => api.get('/folders/').then(r => r.data),
  createFolder: (name: string, color?: string) =>
    api.post('/folders/', { name, color }).then(r => r.data),
  updateFolder: (id: string, data: any) =>
    api.put(`/folders/${id}`, data).then(r => r.data),
  deleteFolder: (id: string) => api.delete(`/folders/${id}`).then(r => r.data),
  addBoardToFolder: (folderId: string, boardId: string) =>
    api.post(`/folders/${folderId}/boards/${boardId}`).then(r => r.data),
  removeBoardFromFolder: (folderId: string, boardId: string) =>
    api.delete(`/folders/${folderId}/boards/${boardId}`).then(r => r.data),
  getTeamFolder: (teamId: string) =>
    api.get(`/folders/team/${teamId}`).then(r => r.data),
};
```

---

## ÖZELLİK 2: Yorum Sistemi

### 2.1 Genel Konsept

- Her **node** (tüm pano türlerinde) yorumlanabilir.
- Yorum özellikleri: metin, `@kullanıcı` bahsetme, yanıt (thread), beğeni.
- Bildirimler: bahsedilince → `comment_mention`, yanıtlanınca → `comment_reply`.
- Yorumlar node bazlı saklanır; `board_id` + `node_id` ile erişilir.

### 2.2 Backend

#### 2.2.1 Yeni MongoDB Koleksiyonu (`database.py`)

```python
comments_collection = db["comments"]
```

#### 2.2.2 Yeni Pydantic Modelleri (`models.py`)

```python
class CommentLike(BaseModel):
    user_id: str
    user_email: str

class Comment(BaseModel):
    id: str
    board_id: str
    node_id: str
    author_id: str
    author_email: str
    author_name: Optional[str] = ""
    text: str
    mentions: List[str] = []           # bahsedilen e-posta listesi
    parent_id: Optional[str] = None    # yanıt ise üst yorumun ID'si
    likes: List[CommentLike] = []
    is_deleted: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class CommentCreate(BaseModel):
    text: str
    mentions: List[str] = []
    parent_id: Optional[str] = None

class CommentUpdate(BaseModel):
    text: str
    mentions: List[str] = []
```

#### 2.2.3 Yeni Route Dosyası (`routes/comments.py`)

```python
GET    /boards/{board_id}/nodes/{node_id}/comments/
       # Yorumları döndür; parent_id=None olanlar üst, parent_id dolu olanlar alt

POST   /boards/{board_id}/nodes/{node_id}/comments/
       # Yorum oluştur + bildirimler
       # Mentions için: her email != author için comment_mention bildirimi
       # parent_id doluysa: üst yorumun yazarına comment_reply bildirimi

PUT    /comments/{comment_id}
       # Yorumu düzenle (yalnızca author_id == current_user.id)

DELETE /comments/{comment_id}
       # is_deleted=True yap, text="Bu yorum silindi." ata (thread bozulmasın)

POST   /comments/{comment_id}/like
       # Beğeni toggle: eğer zaten beğendiyse kaldır, değilse ekle
```

**Bildirim oluşturma (POST içinde):**

```python
# Bahsetme bildirimleri:
for email in comment_in.mentions:
    if email != user_email:
        notifications_collection.insert_one({
            "recipient_email": email,
            "type": "comment_mention",
            "title": "Bir yorumda bahsedildiniz",
            "body": f'{author_name} sizi bir yorumda etiketledi.',
            "board_id": board_id,
            "node_id": node_id,
            "assigner_email": user_email,
            "read": False,
            "created_at": datetime.utcnow(),
        })

# Yanıt bildirimi:
if comment_in.parent_id:
    parent = comments_collection.find_one({"id": comment_in.parent_id})
    if parent and parent.get("author_email") != user_email:
        notifications_collection.insert_one({
            "recipient_email": parent["author_email"],
            "type": "comment_reply",
            "title": "Yorumunuz yanıtlandı",
            "body": f'{author_name} yorumunuzu yanıtladı.',
            "board_id": board_id,
            "node_id": node_id,
            "assigner_email": user_email,
            "read": False,
            "created_at": datetime.utcnow(),
        })
```

#### 2.2.4 `main.py` Kayıt

```python
from routes import comments
app.include_router(comments.router)
```

---

### 2.3 Web Frontend

#### 2.3.1 Sağ Panel Sekme Sistemi (`Canvas.tsx`)

`selectedNodeId` dolu olduğunda sağ panel iki sekmeye bölünür:

```tsx
const [rightPanelTab, setRightPanelTab] = useState<'properties' | 'comments'>('properties');

// Panel başlığı:
<div style={{ display: 'flex', borderBottom: '1px solid var(--glass-border)', marginBottom: 12 }}>
  {(['properties', 'comments'] as const).map(tab => (
    <button
      key={tab}
      onClick={() => setRightPanelTab(tab)}
      style={{
        flex: 1, padding: '8px 0', background: 'none', border: 'none', cursor: 'pointer',
        fontFamily: 'var(--font-ui)', fontSize: '0.8rem', fontWeight: rightPanelTab === tab ? 700 : 400,
        color: rightPanelTab === tab ? 'var(--accent-primary)' : 'var(--text-secondary)',
        borderBottom: rightPanelTab === tab ? '2px solid var(--accent-primary)' : '2px solid transparent',
        transition: 'all 0.15s',
      }}
    >
      {tab === 'properties' ? 'Özellikler' : `Yorumlar${commentCount > 0 ? ` (${commentCount})` : ''}`}
    </button>
  ))}
</div>

{rightPanelTab === 'properties' && <PropertiesSection ... />}
{rightPanelTab === 'comments' && (
  <CommentsPanel
    boardId={boardId}
    nodeId={selectedNodeId}
    currentUserEmail={userEmail}
    boardMembers={boardMembers}
  />
)}
```

#### 2.3.2 Yeni Bileşen: `CommentsPanel.tsx` + `CommentsPanel.css`

**Props:**

```typescript
interface CommentsPanelProps {
  boardId: string;
  nodeId: string;
  currentUserEmail: string;
  boardMembers: { email: string; name?: string }[];
}
```

**Yorum hiyerarşisi (render):**

```
[Yorum 1]                                        ← parent_id: null
  [avatar] ad — 2 saat önce
  Metin ile @etiket açık mor renkte
  [♥ 3]  [↩ Yanıtla]  [✎ Düzenle*]  [✕ Sil*]
  └── [Yanıt 1.1]                               ← parent_id: yorum1.id
        [avatar] ad — 1 saat önce
        Yanıt metni
        [♥ 1]  [↩ Yanıtla]

[Yorum 2]  ...

─────────────────────────
[Avatar] [  Yorum yaz...  ] [Gönder]
          @mention dropdown üstte açılır
```

**@Mention autocomplete:**

```typescript
const handleTextChange = (val: string) => {
  setText(val);
  const match = val.match(/@(\w*)$/);
  if (match) {
    const q = match[1].toLowerCase();
    setMentionSuggestions(boardMembers.filter(m =>
      m.email.toLowerCase().includes(q) || (m.name || '').toLowerCase().includes(q)
    ));
    setShowDropdown(true);
  } else {
    setShowDropdown(false);
  }
};

const selectMention = (member: { email: string; name?: string }) => {
  const newText = text.replace(/@\w*$/, `@${member.email} `);
  setText(newText);
  setMentions(prev => [...prev, member.email]);
  setShowDropdown(false);
};
```

**CSS (`CommentsPanel.css`):**

```css
.comments-panel { display: flex; flex-direction: column; height: 100%; overflow: hidden; }
.comments-list { flex: 1; overflow-y: auto; padding: 0 4px; }

.comment-item { display: flex; gap: 8px; padding: 10px 0; border-bottom: 1px solid var(--glass-border); }
.comment-avatar {
  width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0;
  background: var(--accent-gradient-soft); display: flex; align-items: center; justify-content: center;
  font-size: 0.75rem; font-weight: 700; color: var(--accent-primary);
}
.comment-body { flex: 1; min-width: 0; }
.comment-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px; }
.comment-author { font-size: 0.78rem; font-weight: 700; color: var(--text-primary); }
.comment-time { font-size: 0.7rem; color: var(--text-muted); }
.comment-text { font-size: 0.82rem; color: var(--text-primary); line-height: 1.5; word-break: break-word; }
.comment-mention { color: var(--accent-primary); font-weight: 600; }
.comment-deleted { color: var(--text-muted); font-style: italic; font-size: 0.8rem; }
.comment-actions { display: flex; gap: 10px; margin-top: 4px; align-items: center; }

.comment-reply-thread {
  padding-left: 28px; border-left: 2px solid var(--glass-border-subtle); margin-left: 14px;
}

.like-btn {
  background: none; border: none; cursor: pointer; color: var(--text-muted);
  display: flex; align-items: center; gap: 3px; font-size: 0.75rem;
  transition: color 0.15s; padding: 0;
}
.like-btn.liked { color: #ef4444; }
.action-btn {
  background: none; border: none; cursor: pointer; color: var(--text-muted);
  font-size: 0.75rem; transition: color 0.15s; padding: 0;
}
.action-btn:hover { color: var(--accent-primary); }

.comment-input-area { border-top: 1px solid var(--glass-border); padding-top: 10px; margin-top: 8px; position: relative; }
.comment-input {
  width: 100%; background: var(--glass-bg); border: 1px solid var(--glass-border);
  border-radius: 10px; padding: 8px 42px 8px 12px; font-family: var(--font-ui);
  font-size: 0.82rem; color: var(--text-primary); resize: none; min-height: 36px;
  transition: border-color 0.15s;
}
.comment-input:focus { outline: none; border-color: var(--accent-primary); }
.comment-submit-btn {
  position: absolute; right: 8px; bottom: 8px;
  background: var(--accent-primary); color: #fff; border: none;
  border-radius: 7px; padding: 4px 10px; cursor: pointer; font-size: 0.78rem; font-weight: 600;
  transition: opacity 0.15s;
}
.comment-submit-btn:disabled { opacity: 0.5; cursor: default; }

.mention-dropdown {
  position: absolute; bottom: 100%; left: 0; right: 0; z-index: 200;
  background: var(--glass-bg-strong); backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border); border-radius: 10px;
  box-shadow: var(--glass-shadow-raised); overflow: hidden; max-height: 160px; overflow-y: auto;
}
.mention-item { padding: 8px 12px; cursor: pointer; font-size: 0.82rem; color: var(--text-primary); display: flex; gap: 8px; align-items: center; }
.mention-item:hover { background: var(--accent-gradient-soft); }
.mention-email { color: var(--text-muted); font-size: 0.75rem; }

.comment-badge {
  display: inline-block; background: var(--accent-primary); color: #fff;
  border-radius: 10px; font-size: 0.62rem; font-weight: 700; padding: 1px 5px; margin-left: 4px;
}
.replying-to-bar {
  background: var(--accent-gradient-soft); border-radius: 6px; padding: 4px 8px;
  font-size: 0.75rem; color: var(--accent-primary); display: flex; justify-content: space-between;
  align-items: center; margin-bottom: 6px;
}
```

---

### 2.4 Mobil Frontend

#### 2.4.1 Yeni Bileşen: `CommentsSheet.tsx`

`EditNodeSheet.tsx` ile aynı bottom sheet kalıbı (Modal + KeyboardAvoidingView + ScrollView).

```tsx
interface CommentsSheetProps {
  visible: boolean;
  boardId: string;
  nodeId: string;
  nodeTitle: string;
  boardMembers: any[];
  currentUserEmail: string;
  onClose: () => void;
}
```

**Açılış yeri (`BoardScreen.tsx`):**
`EditNodeSheet` içinin en altına "Yorumları Görüntüle" butonu eklenir:

```tsx
<TouchableOpacity
  style={[styles.commentsBtn, { borderColor: colors.border }]}
  onPress={() => { setEditSheetVisible(false); setCommentsSheetVisible(true); }}
>
  <Feather name="message-square" size={15} color={colors.accent} />
  <Text style={{ color: colors.accent, fontSize: 13, fontWeight: '600' }}>
    Yorumları Görüntüle
  </Text>
</TouchableOpacity>
```

**Mobil yorum satırı:**

```tsx
<View style={[styles.commentItem, { borderBottomColor: colors.border }]}>
  <View style={[styles.commentAvatar, { backgroundColor: colors.accentSoft }]}>
    <Text style={{ color: colors.accent, fontWeight: '800', fontSize: 11 }}>
      {(comment.author_name || comment.author_email)[0].toUpperCase()}
    </Text>
  </View>
  <View style={{ flex: 1 }}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
      <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 12 }}>
        {comment.author_name || comment.author_email.split('@')[0]}
      </Text>
      <Text style={{ color: colors.textMuted, fontSize: 10 }}>
        {formatRelativeTime(comment.created_at)}
      </Text>
    </View>
    {comment.is_deleted ? (
      <Text style={{ color: colors.textMuted, fontStyle: 'italic', fontSize: 12 }}>
        Bu yorum silindi.
      </Text>
    ) : (
      <Text style={{ color: colors.textPrimary, fontSize: 13, lineHeight: 18 }}>
        {renderMentions(comment.text, colors.accent)}
      </Text>
    )}
    {!comment.is_deleted && (
      <View style={{ flexDirection: 'row', gap: 16, marginTop: 5 }}>
        <TouchableOpacity
          style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}
          onPress={() => handleToggleLike(comment.id, comment.node_id)}
        >
          <Feather
            name="heart" size={11}
            color={comment.likes.some(l => l.user_email === currentUserEmail) ? '#ef4444' : colors.textMuted}
          />
          <Text style={{ color: colors.textMuted, fontSize: 10 }}>{comment.likes.length}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setReplyingTo(comment)}>
          <Text style={{ color: colors.accent, fontSize: 11, fontWeight: '600' }}>Yanıtla</Text>
        </TouchableOpacity>
        {comment.author_email === currentUserEmail && (
          <TouchableOpacity onPress={() => handleDeleteComment(comment.id)}>
            <Text style={{ color: colors.error, fontSize: 11 }}>Sil</Text>
          </TouchableOpacity>
        )}
      </View>
    )}
  </View>
</View>
```

**@Bahsetme (mention) — mobil:**

```typescript
const handleTextChange = (val: string) => {
  setText(val);
  const match = val.match(/@(\w*)$/);
  if (match) {
    const q = match[1].toLowerCase();
    setFilteredMembers(boardMembers.filter(m =>
      m.email.toLowerCase().includes(q) || (m.name || '').toLowerCase().includes(q)
    ));
    setShowMentions(true);
  } else {
    setShowMentions(false);
  }
};

const selectMention = (member: any) => {
  const newText = text.replace(/@\w*$/, `@${member.email} `);
  setText(newText);
  setMentions(prev => [...prev, member.email]);
  setShowMentions(false);
};
```

Mention listesi input'un **üstünde** absolute konumlu küçük bir View:

```tsx
{showMentions && filteredMembers.length > 0 && (
  <View style={[styles.mentionDropdown, {
    backgroundColor: colors.surfaceStrong,
    borderColor: colors.border,
  }]}>
    {filteredMembers.slice(0, 4).map(m => (
      <TouchableOpacity key={m.email} style={styles.mentionItem} onPress={() => selectMention(m)}>
        <View style={[styles.mentionAvatar, { backgroundColor: colors.accentSoft }]}>
          <Text style={{ color: colors.accent, fontSize: 10, fontWeight: '800' }}>
            {m.email[0].toUpperCase()}
          </Text>
        </View>
        <Text style={{ color: colors.textPrimary, fontSize: 12 }}>
          {m.name || m.email.split('@')[0]}
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: 10 }}>{m.email}</Text>
      </TouchableOpacity>
    ))}
  </View>
)}
```

**Mention metin render yardımcısı (`src/lib/renderMentions.tsx`):**

```tsx
import React from 'react';
import { Text } from 'react-native';

export const renderMentions = (text: string, accentColor: string): React.ReactNode => {
  const parts = text.split(/(@[\w.@+-]+)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('@')
          ? <Text key={i} style={{ color: accentColor, fontWeight: '600' }}>{part}</Text>
          : <Text key={i}>{part}</Text>
      )}
    </>
  );
};
```

**Tarih biçimlendirme (`src/lib/formatRelativeTime.ts`):**

```typescript
export const formatRelativeTime = (dateStr: string): string => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'şimdi';
  if (mins < 60) return `${mins} dk`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} sa`;
  return `${Math.floor(hrs / 24)} gün`;
};
```

**Yeni API (`services/api.ts`):**

```typescript
export const commentAPI = {
  getComments: (boardId: string, nodeId: string) =>
    api.get(`/boards/${boardId}/nodes/${nodeId}/comments/`).then(r => r.data),
  createComment: (boardId: string, nodeId: string, data: { text: string; mentions: string[]; parent_id?: string }) =>
    api.post(`/boards/${boardId}/nodes/${nodeId}/comments/`, data).then(r => r.data),
  updateComment: (commentId: string, data: { text: string; mentions: string[] }) =>
    api.put(`/comments/${commentId}`, data).then(r => r.data),
  deleteComment: (commentId: string) =>
    api.delete(`/comments/${commentId}`).then(r => r.data),
  toggleLike: (commentId: string) =>
    api.post(`/comments/${commentId}/like`).then(r => r.data),
};
```

**Yeni Store (`store/useCommentStore.ts`):**

```typescript
import { create } from 'zustand';
import { commentAPI } from '../services/api';

interface CommentLike { user_id: string; user_email: string; }
interface Comment {
  id: string; board_id: string; node_id: string;
  author_id: string; author_email: string; author_name: string;
  text: string; mentions: string[]; parent_id: string | null;
  likes: CommentLike[]; is_deleted: boolean; created_at: string;
}

interface CommentState {
  comments: Record<string, Comment[]>; // key: nodeId
  isLoading: boolean;
  fetchComments: (boardId: string, nodeId: string) => Promise<void>;
  addComment: (boardId: string, nodeId: string, data: any) => Promise<void>;
  editComment: (commentId: string, nodeId: string, data: any) => Promise<void>;
  removeComment: (commentId: string, nodeId: string) => Promise<void>;
  toggleLike: (commentId: string, nodeId: string, userEmail: string, userId: string) => Promise<void>;
}

export const useCommentStore = create<CommentState>((set, get) => ({
  comments: {},
  isLoading: false,
  fetchComments: async (boardId, nodeId) => {
    set({ isLoading: true });
    const data = await commentAPI.getComments(boardId, nodeId);
    set(s => ({ comments: { ...s.comments, [nodeId]: data }, isLoading: false }));
  },
  addComment: async (boardId, nodeId, data) => {
    const comment = await commentAPI.createComment(boardId, nodeId, data);
    set(s => ({ comments: { ...s.comments, [nodeId]: [...(s.comments[nodeId] || []), comment] } }));
  },
  editComment: async (commentId, nodeId, data) => {
    await commentAPI.updateComment(commentId, data);
    set(s => ({
      comments: {
        ...s.comments,
        [nodeId]: (s.comments[nodeId] || []).map(c => c.id === commentId ? { ...c, ...data } : c)
      }
    }));
  },
  removeComment: async (commentId, nodeId) => {
    await commentAPI.deleteComment(commentId);
    set(s => ({
      comments: {
        ...s.comments,
        [nodeId]: (s.comments[nodeId] || []).map(c =>
          c.id === commentId ? { ...c, is_deleted: true, text: 'Bu yorum silindi.' } : c
        )
      }
    }));
  },
  toggleLike: async (commentId, nodeId, userEmail, userId) => {
    await commentAPI.toggleLike(commentId);
    set(s => ({
      comments: {
        ...s.comments,
        [nodeId]: (s.comments[nodeId] || []).map(c => {
          if (c.id !== commentId) return c;
          const already = c.likes.some(l => l.user_email === userEmail);
          return {
            ...c,
            likes: already
              ? c.likes.filter(l => l.user_email !== userEmail)
              : [...c.likes, { user_id: userId, user_email: userEmail }]
          };
        })
      }
    }));
  },
}));
```

---

## Bildirim Sistemi Güncellemeleri

Mevcut tipler: `task_assigned`, `board_invite`
Eklenenler: `comment_mention`, `comment_reply`

**Mobil `NotificationsModal.tsx`:**

```tsx
// Mevcut type'lar yanına ekle:
const getNotifIcon = (type: string) => {
  if (type === 'task_assigned') return { name: 'check-square', color: colors.accent };
  if (type === 'board_invite')  return { name: 'users',       color: colors.success };
  if (type === 'comment_mention') return { name: 'at-sign',   color: '#8b5cf6' };
  if (type === 'comment_reply')   return { name: 'corner-down-right', color: '#f59e0b' };
  return { name: 'bell', color: colors.textMuted };
};
```

**Web `NotificationBell.tsx`:**
Aynı type switch mantığı; SVG ikonları `at-sign` (mention) ve `corner-down-right` (reply) için eklenir.

---

## Uygulama Sırası (Önerilen)

```
1.  Backend — folders_collection + Folder modelleri + routes/folders.py + main.py
2.  Backend — comments_collection + Comment modelleri + routes/comments.py + main.py
3.  Web    — folderAPI + Sidebar.tsx yeniden yapılanması + Sidebar.css
4.  Web    — CommentsPanel.tsx + CommentsPanel.css
5.  Web    — Canvas.tsx sağ panel sekme sistemi entegrasyonu
6.  Mobil  — folderAPI (api.ts) + useFolderStore.ts
7.  Mobil  — HomeScreen.tsx klasör tabanlı yapı
8.  Mobil  — commentAPI (api.ts) + useCommentStore.ts
9.  Mobil  — CommentsSheet.tsx + renderMentions + formatRelativeTime
10. Mobil  — BoardScreen.tsx "Yorumları Görüntüle" aksiyonu
11. Web+Mobil — Bildirim tiplerini NotificationBell ve NotificationsModal'a ekle
```

---

## Sık Yapılan Hatalar — Kaçınılacaklar

| Yanlış | Doğru |
|---|---|
| `background: '#6366f1'` (sabit hex) | `background: var(--accent-primary)` |
| `backgroundColor: '#6366f1'` (mobil) | `backgroundColor: colors.accent` |
| `fontFamily: 'Arial'` | `fontFamily: var(--font-ui)` (web) |
| `border-radius: 4px` (köşeli) | `border-radius: 10-18px` |
| `opacity: 0.5` sabit yazar | `color: colors.textMuted` |
| Emoji ikon bırakmak | SVG (web) veya Feather (mobil) |
| `any` tipi kullanmak | Spesifik interface tanımlamak |
| Global state Zustand dışında | `useBoardStore` / `useTeamStore` pattern'ini kopyala |
| Yalnızca inline style (web) | Ayrı `.css` dosyası oluştur |
| `console.log` bırakmak | Temizlemek |

---

## Referans Dosyalar (Okuma Zorunlu)

| Dosya | Neden Önemli |
|---|---|
| `d:/nodeva/frontend-web/src/index.css` | CSS değişkenleri, glassmorphism, tipografi |
| `d:/nodeva/frontend_mobile/src/context/ThemeContext.tsx` | Mobil renk paleti |
| `d:/nodeva/frontend-web/src/components/Sidebar.tsx` | Klasör özelliği için değiştirilecek dosya |
| `d:/nodeva/frontend_mobile/src/components/EditNodeSheet.tsx` | Bottom sheet pattern referansı |
| `d:/nodeva/backend/models.py` | Mevcut Pydantic modelleri |
| `d:/nodeva/backend/routes/boards.py` | Route pattern ve erişim kontrolü |
| `d:/nodeva/frontend_mobile/src/services/api.ts` | Axios client pattern |
| `d:/nodeva/frontend_mobile/src/store/useBoardStore.ts` | Zustand store pattern |
| `d:/nodeva/frontend_mobile/src/screens/HomeScreen.tsx` | Klasör için değiştirilecek ana ekran |
| `d:/nodeva/backend/routes/notifications.py` | Bildirim oluşturma pattern referansı |
