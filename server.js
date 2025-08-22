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

// MongoDB
const URI = process.env.MONGODB_URI;
if (!URI) {
  console.error('MONGODB_URI belum di-set di .env');
  process.exit(1);
}
mongoose.connect(URI).then(() => console.log('✅ MongoDB connected')).catch((e) => {
  console.error('❌ MongoDB error:', e.message);
  process.exit(1);
});

// API
app.use('/api/transactions', transactionsRouter);

// Export PDF
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
    if (from || to) {
      doc.moveDown(0.5).fontSize(10)
        .text(`Periode: ${from || '-'} s/d ${to || '-'}`, { align: 'center' });
    }

    const headers = ['Nama', 'Jenis', 'Item', 'Harga', 'Tanggal'];
    const widths  = [120, 60, 160, 90, 90];
    doc.moveDown(1);
    headers.forEach((h, i) => doc.fontSize(10).text(h, { continued: i < headers.length - 1, width: widths[i] }));
    doc.moveTo(40, doc.y + 2).lineTo(555, doc.y + 2).stroke();

    const rupiah = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(n);
    doc.moveDown(0.5);

    data.forEach(t => {
      const row = [
        t.inputBy,
        t.type,
        t.itemType,
        rupiah(t.price),
        new Date(t.date).toLocaleDateString('id-ID')
      ];
      row.forEach((val, i) => doc.fontSize(10).text(String(val), { continued: i < row.length - 1, width: widths[i] }));
    });

    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal export PDF' });
  }
});

// Export Excel
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
      { header: 'Jenis', key: 'type', width: 12 },
      { header: 'Item', key: 'itemType', width: 25 },
      { header: 'Harga', key: 'price', width: 15 },
      { header: 'Tanggal', key: 'date', width: 16 }
    ];
    data.forEach(t => {
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
app.listen(PORT, () => console.log(`🌐 Dashboard ready: http://localhost:${PORT}`));