# Deployment Commands untuk Production Server

## Jika Permission Denied pada `./deploy.sh`

### Solusi 1: Jalankan dengan bash eksplisit
```bash
bash deploy.sh
```

### Solusi 2: Gunakan sudo (jika diperlukan)
```bash
sudo bash deploy.sh
```

### Solusi 3: Fix permission manual
```bash
chmod +x deploy.sh
./deploy.sh
```

## Manual Deployment (Step by Step)

Jika script tidak bisa dijalankan, gunakan perintah manual berikut:

### 1. Install Dependencies
```bash
npm ci --only=production
```

### 2. Build Application
```bash
npm run build
```

### 3. Install PM2 (jika belum ada)
```bash
sudo npm install -g pm2
# atau tanpa sudo:
npm install -g pm2
```

### 4. Create Logs Directory
```bash
mkdir -p logs
chmod 755 logs
```

### 5. Stop Existing App (jika ada)
```bash
pm2 stop monthly-budget-dashboard
pm2 delete monthly-budget-dashboard
```

### 6. Start Application
```bash
pm2 start ecosystem.config.js --env production
```

### 7. Save PM2 Configuration
```bash
pm2 save
pm2 startup
```

## Alternatif Simple Start (Tanpa ecosystem.config.js)

```bash
pm2 start npm --name "monthly-budget-dashboard" -- start -- --port 3344
```

## Troubleshooting

### Jika npm install gagal:
```bash
sudo npm install -g pm2
```

### Jika PM2 permission denied:
```bash
# Option 1: Install as user
npm config set prefix ~/.npm-global
export PATH=~/.npm-global/bin:$PATH
npm install -g pm2

# Option 2: Use npx
npx pm2 start ecosystem.config.js --env production
```

### Jika port 3344 sudah digunakan:
```bash
# Cek proses yang menggunakan port
sudo netstat -tlnp | grep :3344
# atau
sudo lsof -i :3344

# Kill proses
sudo kill -9 <PID>
```

## Environment Variables

Pastikan file `.env.local` ada dan berisi:
```bash
NODE_ENV=production
PORT=3344
# tambahkan env variables lainnya sesuai kebutuhan
```