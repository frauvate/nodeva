# Nodeva - Geliştirme Ortamı Kurulum Rehberi

## Servisleri Başlatma

### 1. Backend ve Web Frontend (Terminal 1)
Proje kök dizininde (`d:\nodeva`) şu komutu çalıştır:

```powershell
npm run dev
```

Bu komut şunları başlatır:
- 🟦 **Backend (FastAPI)**: `http://localhost:8001`
- 🟪 **Web Frontend (Vite)**: `http://localhost:5173`

### 2. Mobil Uygulama (Terminal 2)
Expo CLI'nin QR kod menüsünü ve iOS simülatör seçeneklerini kullanabilmek için yeni bir terminal açıp şu komutu çalıştırın:

```powershell
npm run dev:mobile
```

Bu komut şunları başlatır:
- 🟨 **Mobil (Expo)**: Terminalde açılan QR kodu tarayabilir veya `i` tuşuna basarak iOS simülatörünü açabilirsiniz.

---

## IP Adresi Değiştiğinde Ne Yapmalı?

Telefon ve bilgisayar **aynı Wi-Fi ağında** olmalı.

### 1. Mevcut IP adresini öğren
```powershell
Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -eq 'Wi-Fi' } | Select-Object IPAddress
```

### 2. Tek bir dosyayı güncelle: `frontend_mobile/.env`
```env
EXPO_PUBLIC_API_URL=http://YENİ_IP_ADRESİ:8001
```

> Artık `api.ts` dosyasına dokunmana gerek yok.

---

## Bağımlılıkları Kur (ilk kurulum)

```powershell
# Kök bağımlılıklar (concurrently)
cd d:\nodeva
npm install

# Web frontend
cd d:\nodeva\frontend-web
npm install

# Mobil
cd d:\nodeva\frontend_mobile
npm install

# Backend (Python)
cd d:\nodeva\backend
pip install -r requirements.txt
```
