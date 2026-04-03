// server.js
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const axios = require('axios');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ============ CLOUDFLARE TURNSTILE (GERÇEK) ============
const CLOUDFLARE_SITE_KEY = '0x4AAAAAAC0NaCTuWrK90LGk';
const CLOUDFLARE_SECRET_KEY = '0x4AAAAAAC0NaM4R9AJin_RNeEDEejAvhNY';
// =====================================================

// Cloudflare doğrulama fonksiyonu
async function verifyCloudflareToken(token) {
    if (!token) return false;
    try {
        const response = await axios.post('https://challenges.cloudflare.com/turnstile/v0/siteverify',
            `secret=${CLOUDFLARE_SECRET_KEY}&response=${token}`,
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );
        return response.data.success === true;
    } catch (err) {
        console.error('Cloudflare doğrulama hatası:', err.message);
        return false;
    }
}

// Kullanıcı veritabanı
const USERS_FILE = path.join(__dirname, 'users.json');
let users = {};
if (fs.existsSync(USERS_FILE)) {
    users = JSON.parse(fs.readFileSync(USERS_FILE));
}

function saveUsers() {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(session({
    secret: 'gizli-anahtar-degistir-2026',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false, maxAge: 3600000 }
}));

const requireLogin = (req, res, next) => {
    if (!req.session.userId) return res.redirect('/giris');
    next();
};

// API listesi
const apiList = [
    { id: 'isegiris', name: 'İşe Giriş', type: 'ad', api: 'isegiris' },
    { id: 'ikametgah', name: 'İkametgah', type: 'ad', api: 'ikametgah' },
    { id: 'ailebirey', name: 'Aile Bireyi', type: 'ad', api: 'ailebirey' },
    { id: 'medenicinsiyet', name: 'Medeni Hal ve Cinsiyet', type: 'ad', api: 'medenicinsiyet' },
    { id: 'tc-isegiris', name: 'TC İşe Giriş', type: 'tc', api: 'tc-isegiris' },
    { id: 'tc-ikametgah', name: 'TC İkametgah', type: 'tc', api: 'tc-ikametgah' },
    { id: 'tc-ailebirey', name: 'TC Aile Birey', type: 'tc', api: 'tc-ailebirey' },
    { id: 'tc-medenicinsiyet', name: 'TC Medeni Hal ve Cinsiyet', type: 'tc', api: 'tc-medenicinsiyet' },
    { id: 'tc', name: 'TC Sorgu', type: 'tc', api: 'tc' },
    { id: 'tc2', name: 'TC Sorgu 2', type: 'tc', api: 'tc2' },
    { id: 'vesika', name: 'Vesika Bilgisi', type: 'tc', api: 'vesika' },
    { id: 'aile', name: 'Aile Bilgisi', type: 'tc', api: 'aile' },
    { id: 'sulale', name: 'Sülale Bilgisi', type: 'tc', api: 'sulale' },
    { id: 'hane', name: 'Hane Bilgisi', type: 'tc', api: 'hane' },
    { id: 'isyeri', name: 'İşyeri Bilgisi', type: 'tc', api: 'isyeri' },
    { id: 'ad', name: 'İsim Sorgu', type: 'ad', api: 'ad' },
    { id: 'query', name: 'Kapsamlı Sorgu (İl Filtreli)', type: 'ozel', api: 'query' },
    { id: 'gsm', name: 'GSM Sorgu', type: 'gsm', api: 'gsm' },
    { id: 'gsm2', name: 'GSM Sorgu 2', type: 'gsm', api: 'gsm2' },
    { id: 'plaka', name: 'Plaka Sorgu', type: 'plaka', api: 'plaka' },
    { id: 'soyagaci', name: '🌳 Soy Ağacı', type: 'tc', api: 'soyagaci' }
];

// ============ GİRİŞ SAYFASI (Cloudflare Turnstile ile) ============
app.get('/giris', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>SEVEMEZSİNİZ | Giriş</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
                font-family: 'Segoe UI', 'Arial', sans-serif;
                background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #0f0f23 100%);
                min-height: 100vh;
                display: flex;
                justify-content: center;
                align-items: center;
                padding: 20px;
            }
            .container {
                background: rgba(0,0,0,0.85);
                backdrop-filter: blur(10px);
                border-radius: 20px;
                padding: 40px;
                max-width: 450px;
                width: 100%;
                border: 1px solid rgba(255,0,0,0.3);
                box-shadow: 0 0 40px rgba(255,0,0,0.2);
            }
            h2 {
                text-align: center;
                color: #ff3333;
                font-size: 28px;
                margin-bottom: 10px;
                letter-spacing: 2px;
            }
            .sub {
                text-align: center;
                color: #667eea;
                margin-bottom: 30px;
                font-size: 12px;
            }
            input {
                width: 100%;
                padding: 14px;
                margin: 10px 0;
                background: #1a1a2e;
                border: 1px solid #333;
                border-radius: 10px;
                color: white;
                font-size: 16px;
                transition: all 0.3s;
            }
            input:focus {
                outline: none;
                border-color: #ff3333;
                box-shadow: 0 0 10px rgba(255,51,51,0.3);
            }
            button {
                width: 100%;
                padding: 14px;
                margin: 20px 0;
                background: linear-gradient(90deg, #ff3333, #cc0000);
                color: white;
                border: none;
                border-radius: 10px;
                font-size: 18px;
                font-weight: bold;
                cursor: pointer;
                transition: transform 0.2s;
            }
            button:hover { transform: scale(1.02); }
            .link {
                text-align: center;
                margin-top: 20px;
                color: #667eea;
            }
            .link a {
                color: #ff3333;
                text-decoration: none;
            }
            .error {
                background: rgba(255,0,0,0.2);
                border: 1px solid #ff3333;
                color: #ff6666;
                padding: 10px;
                border-radius: 8px;
                text-align: center;
                margin-bottom: 15px;
            }
            .cf-turnstile {
                display: flex;
                justify-content: center;
                margin: 15px 0;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h2>🔐 SEVEMEZSİNİZ</h2>
            <div class="sub">Sorgu Sistemi v1.0</div>
            ${req.query.error ? '<div class="error">❌ '+req.query.error+'</div>' : ''}
            <form method="POST" action="/giris">
                <input type="text" name="username" placeholder="Kullanıcı Adı" required>
                <input type="password" name="password" placeholder="Şifre" required>
                <div class="cf-turnstile" data-sitekey="${CLOUDFLARE_SITE_KEY}"></div>
                <button type="submit">🚀 GİRİŞ YAP</button>
            </form>
            <div class="link">Hesabın yok mu? <a href="/kayit">Kayıt Ol</a></div>
        </div>
    </body>
    </html>
    `);
});

// ============ KAYIT SAYFASI (Cloudflare Turnstile ile) ============
app.get('/kayit', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>SEVEMEZSİNİZ | Kayıt</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
                font-family: 'Segoe UI', 'Arial', sans-serif;
                background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #0f0f23 100%);
                min-height: 100vh;
                display: flex;
                justify-content: center;
                align-items: center;
                padding: 20px;
            }
            .container {
                background: rgba(0,0,0,0.85);
                backdrop-filter: blur(10px);
                border-radius: 20px;
                padding: 40px;
                max-width: 450px;
                width: 100%;
                border: 1px solid rgba(255,0,0,0.3);
                box-shadow: 0 0 40px rgba(255,0,0,0.2);
            }
            h2 {
                text-align: center;
                color: #667eea;
                font-size: 28px;
                margin-bottom: 10px;
            }
            .sub {
                text-align: center;
                color: #ff3333;
                margin-bottom: 30px;
                font-size: 12px;
            }
            input {
                width: 100%;
                padding: 14px;
                margin: 10px 0;
                background: #1a1a2e;
                border: 1px solid #333;
                border-radius: 10px;
                color: white;
                font-size: 16px;
            }
            input:focus {
                outline: none;
                border-color: #667eea;
                box-shadow: 0 0 10px rgba(102,126,234,0.3);
            }
            button {
                width: 100%;
                padding: 14px;
                margin: 20px 0;
                background: linear-gradient(90deg, #667eea, #764ba2);
                color: white;
                border: none;
                border-radius: 10px;
                font-size: 18px;
                font-weight: bold;
                cursor: pointer;
            }
            .link {
                text-align: center;
                margin-top: 20px;
                color: #667eea;
            }
            .link a { color: #ff3333; text-decoration: none; }
            .error {
                background: rgba(255,0,0,0.2);
                border: 1px solid #ff3333;
                color: #ff6666;
                padding: 10px;
                border-radius: 8px;
                text-align: center;
                margin-bottom: 15px;
            }
            .cf-turnstile { display: flex; justify-content: center; margin: 15px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <h2>📝 KAYIT OL</h2>
            <div class="sub">Aramıza Katıl</div>
            ${req.query.error ? '<div class="error">❌ '+req.query.error+'</div>' : ''}
            <form method="POST" action="/kayit">
                <input type="text" name="username" placeholder="Kullanıcı Adı" required>
                <input type="password" name="password" placeholder="Şifre" required>
                <input type="password" name="confirm" placeholder="Şifre Tekrar" required>
                <div class="cf-turnstile" data-sitekey="${CLOUDFLARE_SITE_KEY}"></div>
                <button type="submit">✅ KAYIT OL</button>
            </form>
            <div class="link">Zaten hesabın var mı? <a href="/giris">Giriş Yap</a></div>
        </div>
    </body>
    </html>
    `);
});

// ============ GİRİŞ İŞLEMİ (Cloudflare doğrulamalı) ============
app.post('/giris', async (req, res) => {
    const { username, password, 'cf-turnstile-response': captchaToken } = req.body;
    
    // Cloudflare doğrulaması
    const isHuman = await verifyCloudflareToken(captchaToken);
    if (!isHuman) {
        return res.redirect('/giris?error=Robot doğrulaması başarısız!');
    }
    
    const user = users[username];
    if (!user) return res.redirect('/giris?error=Kullanıcı bulunamadı');
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.redirect('/giris?error=Hatalı şifre');
    
    req.session.userId = username;
    req.session.captchaPassed = Date.now();
    res.redirect('/dashboard');
});

// ============ KAYIT İŞLEMİ (Cloudflare doğrulamalı) ============
app.post('/kayit', async (req, res) => {
    const { username, password, confirm, 'cf-turnstile-response': captchaToken } = req.body;
    
    // Cloudflare doğrulaması
    const isHuman = await verifyCloudflareToken(captchaToken);
    if (!isHuman) {
        return res.redirect('/kayit?error=Robot doğrulaması başarısız!');
    }
    
    if (password !== confirm) return res.redirect('/kayit?error=Şifreler eşleşmiyor');
    if (users[username]) return res.redirect('/kayit?error=Bu kullanıcı adı zaten var');
    
    const hash = await bcrypt.hash(password, 10);
    users[username] = { password: hash };
    saveUsers();
    res.redirect('/giris?success=Kayıt başarılı, giriş yapabilirsiniz');
});

// ============ DASHBOARD (Havalı Tasarım) ============
app.get('/dashboard', requireLogin, (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>SEVEMEZSİNİZ | Dashboard</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
                font-family: 'Segoe UI', 'Arial', sans-serif;
                background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%);
                min-height: 100vh;
                padding: 20px;
            }
            .header {
                background: linear-gradient(135deg, #000000, #1a0000);
                padding: 25px;
                border-radius: 20px;
                margin-bottom: 30px;
                border: 1px solid rgba(255,0,0,0.3);
                box-shadow: 0 5px 20px rgba(0,0,0,0.5);
            }
            h1 {
                color: #ff3333;
                font-size: 2.5em;
                text-align: center;
                letter-spacing: 3px;
                text-shadow: 0 0 20px rgba(255,51,51,0.5);
            }
            .subtitle {
                text-align: center;
                color: #667eea;
                margin-top: 10px;
            }
            .logout {
                float: right;
                background: linear-gradient(90deg, #dc3545, #c82333);
                color: white;
                padding: 8px 20px;
                text-decoration: none;
                border-radius: 25px;
                font-weight: bold;
                transition: 0.3s;
            }
            .logout:hover { opacity: 0.8; transform: scale(0.98); }
            .grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
                gap: 15px;
            }
            .api-btn {
                background: linear-gradient(135deg, #1a1a2e, #0f0f23);
                border: 1px solid #333;
                padding: 18px 12px;
                border-radius: 15px;
                font-size: 14px;
                font-weight: bold;
                color: #fff;
                cursor: pointer;
                transition: all 0.3s;
                text-align: center;
            }
            .api-btn.tc { border-left: 4px solid #28a745; }
            .api-btn.ad { border-left: 4px solid #007bff; }
            .api-btn.gsm { border-left: 4px solid #ffc107; }
            .api-btn.plaka { border-left: 4px solid #17a2b8; }
            .api-btn.ozel { border-left: 4px solid #ff00cc; }
            .api-btn:hover {
                transform: translateY(-5px);
                border-color: #ff3333;
                box-shadow: 0 5px 20px rgba(255,51,51,0.3);
            }
            @media (max-width: 600px) {
                .grid { grid-template-columns: repeat(2, 1fr); }
                h1 { font-size: 1.5em; }
            }
        </style>
    </head>
    <body>
        <div class="header">
            <a href="/cikis" class="logout">🚪 Çıkış</a>
            <h1>🔴 SEVEMEZSİNİZ</h1>
            <div class="subtitle">Sorgu Sistemi | Hoşgeldin, ${req.session.userId}</div>
        </div>
        <div class="grid">
            ${apiList.map(api => `<button class="api-btn ${api.type}" onclick="window.location.href='/sorgu/${api.id}'">${api.name}</button>`).join('')}
        </div>
    </body>
    </html>
    `);
});

// ============ SORGU SAYFALARI ============
apiList.forEach(api => {
    app.get(`/sorgu/${api.id}`, requireLogin, (req, res) => {
        // KAPSAMLI SORGU (İl Filtreli)
        if (api.id === 'query') {
            res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>SEVEMEZSİNİZ | ${api.name}</title>
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body {
                        font-family: 'Segoe UI', Arial, sans-serif;
                        background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%);
                        min-height: 100vh;
                        padding: 20px;
                    }
                    .container {
                        max-width: 650px;
                        margin: 0 auto;
                        background: rgba(0,0,0,0.85);
                        backdrop-filter: blur(10px);
                        padding: 30px;
                        border-radius: 20px;
                        border: 1px solid rgba(255,0,0,0.3);
                    }
                    .back {
                        color: #667eea;
                        text-decoration: none;
                        display: inline-block;
                        margin-bottom: 20px;
                    }
                    h2 { color: #ff3333; margin-bottom: 20px; }
                    input, button {
                        width: 100%;
                        padding: 12px;
                        margin: 8px 0;
                        background: #1a1a2e;
                        border: 1px solid #333;
                        border-radius: 10px;
                        color: white;
                        font-size: 16px;
                    }
                    input:focus {
                        outline: none;
                        border-color: #ff3333;
                    }
                    button {
                        background: linear-gradient(90deg, #ff3333, #cc0000);
                        color: white;
                        font-weight: bold;
                        cursor: pointer;
                        border: none;
                    }
                    .result-box, .error-box {
                        display: none;
                        padding: 15px;
                        border-radius: 10px;
                        margin-top: 20px;
                        white-space: pre-wrap;
                        font-family: monospace;
                        font-size: 13px;
                    }
                    .result-box {
                        background: #0a0a0a;
                        border-left: 4px solid #28a745;
                        color: #00ff88;
                    }
                    .error-box {
                        background: rgba(255,0,0,0.2);
                        border-left: 4px solid #ff3333;
                        color: #ff6666;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <a href="/dashboard" class="back">← Ana Sayfa</a>
                    <h2>🔍 ${api.name}</h2>
                    <form id="sorguForm" onsubmit="sorgula(event)">
                        <input type="text" id="name" placeholder="İsim" required>
                        <input type="text" id="surname" placeholder="Soyisim" required>
                        <input type="text" id="city" placeholder="İl (Örn: İstanbul, Diyarbakır)" required>
                        <button type="submit">🔍 FİLTRELİ SORGULA</button>
                    </form>
  
