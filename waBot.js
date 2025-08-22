import dotenv from 'dotenv';
import mongoose from 'mongoose';
import qrcode from 'qrcode-terminal';
import Transaction from './models/Transaction.js';
import { 
  makeWASocket, 
  useMultiFileAuthState, 
  DisconnectReason, 
  fetchLatestBaileysVersion 
} from '@whiskeysockets/baileys';

dotenv.config();

// ====== Helpers ======
const allowedNumbers = (process.env.ALLOWED_NUMBERS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

// ubah "62812xxxx" -> "62812xxxx@s.whatsapp.net"
const allowedJids = new Set(allowedNumbers.map(n => `${n}@s.whatsapp.net`));

const currency = n =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(n);

function parseText(msg) {
  if (!msg) return '';
  if (msg.conversation) return msg.conversation.trim();
  if (msg.extendedTextMessage?.text) return msg.extendedTextMessage.text.trim();
  if (msg.imageMessage?.caption) return msg.imageMessage.caption.trim();
  return '';
}

function mapType(cmd) {
  if (cmd === 'pemasukan') return 'masuk';
  if (cmd === 'pengeluaran') return 'keluar';
  return cmd;
}

// ====== Main ======
async function start() {
  try {
    // DB connect
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('MONGODB_URI belum di .env');
    await mongoose.connect(uri);
    console.log('✅ MongoDB connected (bot)');

    // WA auth state
    const { state, saveCreds } = await useMultiFileAuthState('wa-session');
    const { version } = await fetchLatestBaileysVersion().catch(() => ({ version: undefined }));

    const sock = makeWASocket({ auth: state, version });
    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        console.log('📷 QR code diterima, scan pakai WhatsApp mobile:');
        qrcode.generate(qr, { small: true });
      }

      if (connection === 'open') console.log('🤖 WA bot connected');

      if (connection === 'close') {
        const code = lastDisconnect?.error?.output?.statusCode;
        if (code !== DisconnectReason.loggedOut) {
          console.log('↻ Reconnecting in 3s...');
          setTimeout(() => start().catch(console.error), 3000);
        } else {
          console.log('🔒 Logged out. Hapus folder "wa-session" untuk login ulang.');
        }
      }
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
      const m = messages?.[0];
      if (!m || !m.message) return;

      // identifikasi pengirim
      const jid = m.key.remoteJid; // grup atau pribadi
      const senderJid = m.key.participant || jid; // di personal participant undefined
      if (!allowedJids.has(senderJid)) return; // whitelist only

      const text = parseText(m.message);
      if (!text) return;

      const [rawCmd, rawNominal, ...rest] = text.split(' ');
      const cmd = rawCmd?.toLowerCase();

      try {
        // ====== tambah pemasukan/pengeluaran ======
        if (cmd === 'pemasukan' || cmd === 'pengeluaran') {
          if (!rawNominal) {
            await sock.sendMessage(jid, { text: 'Format: pemasukan <nominal> <keterangan>' });
            return;
          }

          const nominal = parseInt(String(rawNominal).replace(/[^0-9]/g, ''), 10);
          if (isNaN(nominal)) {
            await sock.sendMessage(jid, { text: 'Nominal tidak valid. Contoh: pemasukan 50000 jual kopi' });
            return;
          }

          const keterangan = rest.join(' ').trim() || '-';
          const inputBy = m.pushName || senderJid.split('@')[0];
          const type = mapType(cmd);

          const trx = await Transaction.create({
            inputBy,
            type,
            itemType: keterangan,
            price: nominal,
            date: new Date()
          });

          await sock.sendMessage(jid, {
            text: `✅ ${cmd} ${currency(nominal)} (${keterangan}) dicatat.\nID: ${trx._id}`
          });
          return;
        }

        // ====== hapus ======
        if (cmd === 'hapus') {
          const id = rawNominal;
          if (!id) {
            await sock.sendMessage(jid, { text: 'Format: hapus <id_transaksi>' });
            return;
          }
          const del = await Transaction.findByIdAndDelete(id);
          if (!del) {
            await sock.sendMessage(jid, { text: `❌ Transaksi ID ${id} tidak ditemukan.` });
          } else {
            await sock.sendMessage(jid, { text: `🗑️ Transaksi ID ${id} berhasil dihapus.` });
          }
          return;
        }

      } catch (e) {
        console.error(e);
        await sock.sendMessage(jid, { text: `❌ Error: ${e.message}` });
      }
    });

  } catch (err) {
    console.error('Fatal error start():', err);
  }
}

start().catch(console.error);