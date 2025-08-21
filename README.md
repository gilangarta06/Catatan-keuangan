**Instalasi & Menjalankan secara lokal**

Clone repository:
```git clone https://github.com/gilangarta06/Catatan-keuangan.git
cd Catatan-keuangan```

Instal dependensi:
```npm install```
atau
yarn
Konfigurasi environment:
Salin file .env.example menjadi .env dan isi nilai-nilai yang dibutuhkan (seperti koneksi database, PORT, dsb).
Contoh:
cp .env.example .env
Buka .env dan isi variabel sesuai kebutuhan.
Menjalankan aplikasi:
Jika tersedia script pengembangan:
npm run dev
atau
npm start
Alternatif:
node server.js
Buka browser ke http://localhost:PORT (PORT sesuai .env atau default di console).
Konfigurasi environment

File .env.example tersedia di repo — silakan lihat dan isi .env.
Biasanya variabel penting: koneksi DB (mis. MONGO_URI), PORT, secrets untuk session/jwt jika ada. Periksa server.js dan routes untuk mengetahui variabel yang diperlukan.
