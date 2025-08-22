import express from 'express';
import Transaction from '../models/Transaction.js';

const router = express.Router();

// filter tanggal helper
function buildFilter(from, to) {
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
  return filter;
}

// GET list (opsional filter ?from=YYYY-MM-DD&to=YYYY-MM-DD)
router.get('/', async (req, res) => {
  try {
    const { from, to } = req.query;
    const filter = buildFilter(from, to);
    const transactions = await Transaction.find(filter).sort({ date: -1, createdAt: -1 });
    res.json(transactions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal mengambil transaksi' });
  }
});

// POST create (utk kasus selain WA kalau mau pakai API)
router.post('/', async (req, res) => {
  try {
    const { inputBy, type, itemType, price, date } = req.body;
    if (!inputBy || !type || !itemType || price == null || !date) {
      return res.status(400).json({ message: 'Semua field wajib diisi' });
    }
    if (!['masuk', 'keluar'].includes(type)) {
      return res.status(400).json({ message: 'Jenis tidak valid' });
    }
    const trx = await Transaction.create({
      inputBy: String(inputBy).trim(),
      type,
      itemType: String(itemType).trim(),
      price: Number(price),
      date: new Date(date)
    });
    res.status(201).json(trx);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: 'Gagal menambahkan transaksi' });
  }
});

// DELETE
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Transaction.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Transaksi tidak ditemukan' });
    res.json({ message: 'Transaksi berhasil dihapus' });
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: 'Gagal menghapus transaksi' });
  }
});

export default router;