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

    const doc = new PDFDocument({
      size: 'A4',
      margin: 40,
      bufferPages: true // penting untuk page numbers
    });
    doc.pipe(res);

    // Helpers
    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const startX = doc.page.margins.left;
    let cursorY = doc.y;

    const rupiah = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(n);
    const formatDate = (d) => {
      if (!d) return '-';
      const dt = new Date(d);
      return `${dt.getDate()}/${dt.getMonth()+1}/${dt.getFullYear()}`;
    };

    // Kolom: ID, Nama Penginput, Jenis, Item, Nominal, Tanggal
    const colWidths = {
      id: 140,
      name: 100,
      type: 60,
      item: 120,
      nominal: 90,
      date: 60
    };
    // jika total > pageWidth, sesuaikan (skala)
    const totalColsWidth = Object.values(colWidths).reduce((a,b)=>a+b,0);
    if (totalColsWidth > pageWidth) {
      const scale = pageWidth / totalColsWidth;
      for (const k in colWidths) colWidths[k] = Math.floor(colWidths[k] * scale);
    }

    // Draw header (title + printed date)
    doc.font('Helvetica-Bold').fontSize(16).text('Laporan Transaksi', { align: 'center' });
    const printedAt = new Date();
    doc.font('Helvetica').fontSize(9).text(`Dicetak: ${printedAt.toLocaleString('id-ID')}`, doc.page.width - doc.page.margins.right - 200, doc.y - 18, { align: 'right', width: 200 });
    doc.moveDown(1);

    // Table top position and styling
    cursorY = doc.y;
    const rowHeight = 20;
    const headerBgColor = '#f2f2f2';
    const stripeBg = '#f7f7f7';
    const borderColor = '#d9d9d9';
    const textColor = '#000';

    // Draw table header background rect
    doc.save();
    doc.rect(startX, cursorY, pageWidth, rowHeight).fill(headerBgColor);
    doc.restore();

    // Draw header text (center for some columns)
    doc.fillColor('#000').font('Helvetica-Bold').fontSize(10);
    let x = startX;
    doc.text('ID', x + 4, cursorY + 5, { width: colWidths.id - 8, align: 'left' });
    x += colWidths.id;
    doc.text('Nama\n', x + 4, cursorY + 3, { width: colWidths.name - 8, align: 'center' });
    x += colWidths.name;
    doc.text('Jenis', x + 4, cursorY + 5, { width: colWidths.type - 8, align: 'center' });
    x += colWidths.type;
    doc.text('Item', x + 4, cursorY + 5, { width: colWidths.item - 8, align: 'center' });
    x += colWidths.item;
    doc.text('Nominal', x + 4, cursorY + 5, { width: colWidths.nominal - 8, align: 'center' });
    x += colWidths.nominal;
    doc.text('Tanggal', x + 4, cursorY + 5, { width: colWidths.date - 8, align: 'center' });

    // Draw header bottom border
    doc.moveTo(startX, cursorY + rowHeight).lineTo(startX + pageWidth, cursorY + rowHeight).strokeColor(borderColor).lineWidth(0.5).stroke();

    // Advance Y
    cursorY += rowHeight;

    doc.font('Helvetica').fontSize(10);

    // Function to make a new page and redraw header (for multi-page)
    const newPageAndHeader = () => {
      doc.addPage();
      cursorY = doc.y;
      // title on new page header
      doc.font('Helvetica-Bold').fontSize(12).text('Laporan Transaksi', { align: 'center' });
      doc.moveDown(0.5);
      cursorY = doc.y;
      // draw table header again
      doc.save();
      doc.rect(startX, cursorY, pageWidth, rowHeight).fill(headerBgColor);
      doc.restore();
      doc.fillColor('#000').font('Helvetica-Bold').fontSize(10);
      let xx = startX;
      doc.text('ID', xx + 4, cursorY + 5, { width: colWidths.id - 8, align: 'left' }); xx += colWidths.id;
      doc.text('Nama\n', xx + 4, cursorY + 3, { width: colWidths.name - 8, align: 'center' }); xx += colWidths.name;
      doc.text('Jenis', xx + 4, cursorY + 5, { width: colWidths.type - 8, align: 'center' }); xx += colWidths.type;
      doc.text('Item', xx + 4, cursorY + 5, { width: colWidths.item - 8, align: 'center' }); xx += colWidths.item;
      doc.text('Nominal', xx + 4, cursorY + 5, { width: colWidths.nominal - 8, align: 'center' }); xx += colWidths.nominal;
      doc.text('Tanggal', xx + 4, cursorY + 5, { width: colWidths.date - 8, align: 'center' });
      doc.moveTo(startX, cursorY + rowHeight).lineTo(startX + pageWidth, cursorY + rowHeight).strokeColor(borderColor).lineWidth(0.5).stroke();
      cursorY += rowHeight;
      doc.font('Helvetica').fontSize(10);
    };

    // Function to check page overflow
    const ensureSpace = (needed) => {
      if (cursorY + needed > doc.page.height - doc.page.margins.bottom - 30) {
        newPageAndHeader();
      }
    };

    // Draw rows
    data.forEach((t, idx) => {
      // Pre-calc item text wrap height (rough)
      const idText = String(t._id);
      const nameText = t.inputBy || '-';
      const typeText = t.type || '-';
      const itemText = t.itemType || '-';
      const nominalText = rupiah(t.price || 0);
      const dateText = formatDate(t.date);

      // Estimate lines for wrapped text (simple approach)
      const measureWidth = (text, width, fontSize=10) => {
        // approximate char per line = width / (fontSize * 0.55)
        const approxCharsPerLine = Math.floor(width / (fontSize * 0.55));
        const lines = Math.ceil(String(text).length / Math.max(1, approxCharsPerLine));
        return lines;
      };

      const nameLines = measureWidth(nameText, colWidths.name - 8);
      const itemLines = measureWidth(itemText, colWidths.item - 8);
      const idLines = measureWidth(idText, colWidths.id - 8);
      const lines = Math.max(1, nameLines, itemLines, idLines);
      const thisRowHeight = Math.max(rowHeight, lines * 12 + 8);

      ensureSpace(thisRowHeight + 4);

      // background stripe
      if (idx % 2 === 0) {
        doc.save();
        doc.rect(startX, cursorY, pageWidth, thisRowHeight).fill(stripeBg);
        doc.restore();
      }

      // draw cell texts
      let posX = startX;
      doc.fillColor(textColor).font('Helvetica').fontSize(9);

      doc.text(idText, posX + 4, cursorY + 6, { width: colWidths.id - 8, align: 'left' });
      posX += colWidths.id;

      doc.text(nameText, posX + 4, cursorY + 6, { width: colWidths.name - 8, align: 'center' });
      posX += colWidths.name;

      doc.text(typeText, posX + 4, cursorY + 6, { width: colWidths.type - 8, align: 'center' });
      posX += colWidths.type;

      doc.text(itemText, posX + 4, cursorY + 6, { width: colWidths.item - 8, align: 'left' });
      posX += colWidths.item;

      doc.text(nominalText, posX + 4, cursorY + 6, { width: colWidths.nominal - 8, align: 'right' });
      posX += colWidths.nominal;

      doc.text(dateText, posX + 4, cursorY + 6, { width: colWidths.date - 8, align: 'center' });

      // draw row bottom border
      doc.moveTo(startX, cursorY + thisRowHeight).lineTo(startX + pageWidth, cursorY + thisRowHeight).strokeColor(borderColor).lineWidth(0.4).stroke();

      cursorY += thisRowHeight;
    });

    // Footer: page numbers (requires bufferPages)
    const pages = doc.bufferedPageRange(); // { start: 0, count: N }
    for (let i = pages.start; i < pages.start + pages.count; i++) {
      doc.switchToPage(i);
      const p = i - pages.start + 1;
      doc.font('Helvetica').fontSize(8).fillColor('#999')
        .text(`Halaman ${p} / ${pages.count}`, 0, doc.page.height - doc.page.margins.bottom + 6, { align: 'center' });
    }

    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal export PDF', error: err.message });
  }
});

export default app;


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

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`🌐 Dashboard ready: http://localhost:${PORT}`));