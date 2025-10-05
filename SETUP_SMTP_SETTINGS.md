# Setup SMTP Settings

## 1. Database Migration

Jalankan SQL ini di Supabase SQL Editor:

```sql
-- Add SMTP settings columns to app_settings table
ALTER TABLE app_settings
ADD COLUMN IF NOT EXISTS smtp_host TEXT,
ADD COLUMN IF NOT EXISTS smtp_port INTEGER DEFAULT 587,
ADD COLUMN IF NOT EXISTS smtp_user TEXT,
ADD COLUMN IF NOT EXISTS smtp_pass TEXT,
ADD COLUMN IF NOT EXISTS smtp_from TEXT;

-- Add comment to columns
COMMENT ON COLUMN app_settings.smtp_host IS 'SMTP server hostname';
COMMENT ON COLUMN app_settings.smtp_port IS 'SMTP server port (default: 587)';
COMMENT ON COLUMN app_settings.smtp_user IS 'SMTP authentication username';
COMMENT ON COLUMN app_settings.smtp_pass IS 'SMTP authentication password (encrypted)';
COMMENT ON COLUMN app_settings.smtp_from IS 'Default FROM email address and name';
```

## 2. Konfigurasi SMTP di Settings

1. Buka aplikasi di http://localhost:3003
2. Login ke dashboard
3. Masuk ke menu **Settings**
4. Scroll ke bagian **Email Configuration (SMTP)**
5. Isi form dengan credentials SMTP Anda:
   - **SMTP Host**: `blizzard.mxrouting.net`
   - **SMTP Port**: `587`
   - **SMTP Username**: `budget@k3monspace.com`
   - **SMTP Password**: `Lemon@123#`
   - **From Address**: `Budget Tracker <budget@k3monspace.com>`
6. Klik **Send Test Email** untuk test koneksi
7. Jika berhasil, klik **Save Settings**

## 3. Test Budget Alerts

1. Buat budget di menu Budget (misal: Food Rp 1,000,000)
2. Tambahkan transaksi expense di kategori yang sama sampai mencapai 80% atau 100%
3. Sistem akan otomatis mengirim email alert
4. Cek notification bell di navbar untuk melihat alert

## 4. Environment Variables (Optional)

Jika tidak ingin simpan SMTP di database, bisa gunakan `.env.local`:

```env
SMTP_HOST=blizzard.mxrouting.net
SMTP_PORT=587
SMTP_USER=budget@k3monspace.com
SMTP_PASS=Lemon@123#
SMTP_FROM=Budget Tracker <budget@k3monspace.com>
```

Settings di database akan override env variables jika ada.

## Troubleshooting

### Test Email Gagal
- Pastikan SMTP credentials benar
- Cek firewall tidak block port 587
- Gunakan app-specific password jika pakai Gmail
- Pastikan SMTP server support TLS (port 587) atau SSL (port 465)

### Budget Alert Tidak Terkirim
- Pastikan budget alerts enabled di database (tabel `budget_alerts`)
- Cek console browser untuk error
- Pastikan SMTP sudah dikonfigurasi dengan benar
- Cek apakah notifikasi muncul di bell icon

### SMTP Connection Timeout
- Coba ganti port (587 → 465 atau sebaliknya)
- Pastikan internet connection stabil
- Cek apakah ISP block SMTP ports
