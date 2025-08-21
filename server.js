import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import transactionsRouter from './routes/transactions.js';
import Transaction from './models/Transaction.js';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, 'public')));

// Koneksi MongoDB
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('MONGODB_URI belum di-set di .env');
  process.exit(1);
}

mongoose
  .connect(MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });

// Routes API
app.use('/api/transactions', transactionsRouter);

// Export PDF (respect filter ?from=YYYY-MM-DD&to=YYYY-MM-DD)
app.get('/export/pdf', async (req, res) => {
  try {
    const { from, to } = req.query;
    const filter = {};
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        filter.date.$lte = end;
      }
    }

    const data = await Transaction.find(filter).sort({ date: -1, createdAt: -1 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="transaksi.pdf"');

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    doc.pipe(res);

    doc.fontSize(16).text('Laporan Transaksi', { align: 'center' });
    doc.moveDown(0.5);
    if (from || to) {
      doc.fontSize(10).text(`Filter tanggal: ${from || '-'} s/d ${to || '-'}`, { align: 'center' });
      doc.moveDown(0.5);
    }

    const headers = ['Nama', 'Jenis', 'Item', 'Harga', 'Tanggal'];
    const colWidths = [120, 60, 140, 80, 100];

    // Header table
    doc.moveDown(0.5);
    headers.forEach((h, i) => doc.fontSize(10).text(h, { continued: i < headers.length - 1, width: colWidths[i] }));
    doc.moveDown(0.2);
    doc.moveTo(doc.x, doc.y).lineTo(550, doc.y).stroke();

    const rupiah = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(n);

    data.forEach((t) => {
      const row = [t.inputBy, t.type, t.itemType, rupiah(t.price), new Date(t.date).toLocaleDateString('id-ID')];
      row.forEach((val, i) => doc.fontSize(10).text(String(val), { continued: i < row.length - 1, width: colWidths[i] }));
    });

    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal export PDF' });
  }
});

// Export Excel (respect filter)
app.get('/export/excel', async (req, res) => {
  try {
    const { from, to } = req.query;
    const filter = {};
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        filter.date.$lte = end;
      }
    }

    const data = await Transaction.find(filter).sort({ date: -1, createdAt: -1 });

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Transaksi');
    ws.columns = [
      { header: 'Nama', key: 'inputBy', width: 25 },
      { header: 'Jenis', key: 'type', width: 10 },
      { header: 'Item', key: 'itemType', width: 25 },
      { header: 'Harga', key: 'price', width: 15 },
      { header: 'Tanggal', key: 'date', width: 15 }
    ];

    data.forEach((t) => {
      ws.addRow({
        inputBy: t.inputBy,
        type: t.type,
        itemType: t.itemType,
        price: t.price,
        date: new Date(t.date).toLocaleDateString('id-ID')
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="transaksi.xlsx"');

    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal export Excel' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
