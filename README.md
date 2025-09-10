# 📒 Catatan Keuangan Bot

Bot pencatatan keuangan berbasis **WhatsApp** dengan tampilan catatan melalui **dashboard web**.  
Hanya **nomor WhatsApp** dan **grup WhatsApp** yang sudah terdaftar di konfigurasi yang dapat melakukan input.  

---

## ✨ Fitur Utama
- ✅ **Keamanan Akses**
  - Hanya nomor dan grup yang diizinkan (`ALLOWED_NUMBERS`, `ALLOWED_GROUPS`) bisa menambah/menghapus data.
- 📥 **Input via WhatsApp**
  - `+10000 gaji` → tambah pemasukan Rp10.000 dengan keterangan *gaji*
  - `-5000 makan` → tambah pengeluaran Rp5.000 dengan keterangan *makan*
  - `hapus 3` → hapus catatan dengan ID `3`
  - `saldo` → tampilkan saldo terkini
- 📊 **Dashboard Web**
  - Lihat daftar pemasukan & pengeluaran
  - Ringkasan saldo terkini
  - Ekspor laporan ke **Excel** atau **PDF**

---

## 🛠️ Teknologi
- **Node.js + Express** → Backend API  
- **MongoDB (Mongoose)** → Database  
- **Baileys** → WhatsApp Bot  
- **ExcelJS & PDFKit** → Ekspor laporan  
- **dotenv, cors, morgan** → Utility  

> Dependensi lengkap tersedia di `package.json`. Jalankan `npm install` untuk menginstal semuanya.

---

## 🚀 Cara Menjalankan
1. Clone repo:
   ```bash
   git clone https://github.com/gilangarta06/Catatan-keuangan.git
   cd Catatan-keuangan
Install dependencies:

bash
Copy code
npm install
Buat file .env (jangan di-commit). Gunakan contoh dari .env.example:

env
Copy code
# Database
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/<dbname>?retryWrites=true&w=majority

# Server
PORT=8080

# WhatsApp Access
# Nomor WA yang boleh input (pisahkan dengan koma, format E.164)
ALLOWED_NUMBERS=628xxxxxxxxxx,628yyyyyyyyyy

# Grup WA yang boleh input
ALLOWED_GROUPS=120xxxxxxxxxx@g.us
Jalankan aplikasi:

bash
Copy code
node index.js
📖 Cara Penggunaan
Pastikan nomor/grup Anda terdaftar di .env (ALLOWED_NUMBERS / ALLOWED_GROUPS).

Kirim pesan ke WA bot dengan format:

+jumlah keterangan → catat pemasukan

-jumlah keterangan → catat pengeluaran

hapus ID → hapus catatan berdasarkan ID

saldo → lihat saldo terakhir

Akses dashboard web untuk memantau catatan keuangan.
