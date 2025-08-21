import express from 'express';
import Transaction from '../models/Transaction.js';

const router = express.Router();

// Util: build date filter
function buildDateFilter(from, to) {
  const filter = {};
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(from);
    if (to) {
      const end = new Date(to);
      // set to end of day
      end.setHours(23, 59, 59, 999);
      filter.date.$lte = end;
    }
  }
  return filter;
}

// CREATE
router.post('/', async (req, res) => {
  try {
    const { inputBy, type, itemType, price, date } = req.body;

    // Basic validation
    if (!inputBy || !type || !itemType || price === undefined || price === null || !date) {
      return res.status(400).json({ message: 'Semua field wajib diisi.' });
    }
    if (!['masuk', 'keluar'].includes(type)) {
      return res.status(400).json({ message: 'Jenis transaksi tidak valid.' });
    }
    const priceNum = Number(price);
    if (Number.isNaN(priceNum)) {
      return res.status(400).json({ message: 'Harga harus berupa angka.' });
    }

    const trx = await Transaction.create({
      inputBy: String(inputBy).trim(),
      type,
      itemType: String(itemType).trim(),
      price: priceNum,
      date: new Date(date)
    });
    res.status(201).json(trx);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal menambahkan transaksi.' });
  }
});

// READ (with optional date range)
router.get('/', async (req, res) => {
  try {
    const { from, to } = req.query;
    const filter = buildDateFilter(from, to);

    const list = await Transaction.find(filter)
      .sort({ date: -1, createdAt: -1 });

    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal mengambil data transaksi.' });
  }
});

// DELETE
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Transaction.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: 'Transaksi tidak ditemukan.' });
    res.json({ message: 'Transaksi dihapus.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal menghapus transaksi.' });
  }
});

export default router;