const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const axios = require('axios');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const CLOUDFLARE_SITE_KEY = '0x4AAAAAAC0NaCTuWrK90LGk';
const CLOUDFLARE_SECRET_KEY = '0x4AAAAAAC0NaM4R9AJin_RNeEDEejAvhNY';

async function verifyCloudflareToken(token) {
    if (!token) return false;
    try {
        const response = await axios.post('https://challenges.cloudflare.com/turnstile/v0/siteverify',
            `secret=${CLOUDFLARE_SECRET_KEY}&response=${token}`,
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );
        return response.data.success === true;
    } catch (err) {
        console.error('Cloudflare hatasi:', err.message);
        return false;
    }
}

const USERS_FILE = path.join(__dirname, 'users.json');
let users = {};
if (fs.existsSync(USERS_FILE)) {
    users = JSON.parse(fs.readFileSync(USERS_FILE));
}

function saveUsers() {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(session({
    secret: 'gizli-anahtar-2026',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false, maxAge: 3600000 }
}));

const requireLogin = (req, res, next) => {
    if (!req.session.userId) return res.redirect('/giris');
    next();
};

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
    { id: 'query', name: 'Kapsamli Sorgu', type: 'ozel', api: 'query' },
    { id: 'gsm', name: 'GSM Sorgu', type: 'gsm', api: 'gsm' },
    { id: 'gsm2', name: 'GSM Sorgu 2', type: 'gsm', api: 'gsm2' },
    { id: 'plaka', name: 'Plaka Sorgu', type: 'plaka', api: 'plaka' },
    { id: 'soyagaci', name: 'Soy Agaci', type: 'tc', api: 'soyagaci' }
];

app.get('/', (req, res) => {
    if (req.session.userId) return res.redirect('/dashboard');
    res.redirect('/giris');
});

app.get('/giris', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>SEVEMEZSINIZ | Giris</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
        <style>
            *{margin:0;padding:0;box-sizing:border-box;}
            body{font-family:Arial;background:linear-gradient(135deg,#0a0a0a 0%,#1a1a2e 100%);min-height:100vh;display:flex;justify-content:center;align-items:center;padding:20px;}
            .container{background:rgba(0,0,0,0.85);border-radius:20px;padding:40px;max-width:450px;width:100%;border:1px solid rgba(255,0,0,0.3);}
            h2{text-align:center;color:#ff3333;font-size:28px;}
            .sub{text-align:center;color:#667eea;margin-bottom:30px;}
            input{width:100%;padding:14px;margin:10px 0;background:#1a1a2e;border:1px solid #333;border-radius:10px;color:white;}
            button{width:100%;padding:14px;margin:20px 0;background:linear-gradient(90deg,#ff3333,#cc0000);color:white;border:none;border-radius:10px;font-size:18px;font-weight:bold;cursor:pointer;}
            .link{text-align:center;margin-top:20px;color:#667eea;}
            .link a{color:#ff3333;}
            .error{background:rgba(255,0,0,0.2);border:1px solid #ff3333;color:#ff6666;padding:10px;border-radius:8px;margin-bottom:15px;}
            .cf-turnstile{display:flex;justify-content:center;margin:15px 0;}
        </style>
    </head>
    <body>
        <div class="container">
            <h2>SEVEMEZSINIZ</h2>
            <div class="sub">Sorgu Sistemi</div>
            ${req.query.error ? '<div class="error">' + req.query.error + '</div>' : ''}
            <form method="POST" action="/giris">
                <input type="text" name="username" placeholder="Kullanici Adi" required>
                <input type="password" name="password" placeholder="Sifre" required>
                <div class="cf-turnstile" data-sitekey="${CLOUDFLARE_SITE_KEY}"></div>
                <button type="submit">GIRIS YAP</button>
            </form>
            <div class="link">Hesabin yok mu? <a href="/kayit">Kayit Ol</a></div>
        </div>
    </body>
    </html>
    `);
});

app.get('/kayit', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>SEVEMEZSINIZ | Kayit</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
        <style>
            *{margin:0;padding:0;box-sizing:border-box;}
            body{font-family:Arial;background:linear-gradient(135deg,#0a0a0a 0%,#1a1a2e 100%);min-height:100vh;display:flex;justify-content:center;align-items:center;padding:20px;}
            .container{background:rgba(0,0,0,0.85);border-radius:20px;padding:40px;max-width:450px;width:100%;border:1px solid rgba(102,126,234,0.3);}
            h2{text-align:center;color:#667eea;font-size:28px;}
            .sub{text-align:center;color:#ff3333;margin-bottom:30px;}
            input{width:100%;padding:14px;margin:10px 0;background:#1a1a2e;border:1px solid #333;border-radius:10px;color:white;}
            button{width:100%;padding:14px;margin:20px 0;background:linear-gradient(90deg,#667eea,#764ba2);color:white;border:none;border-radius:10px;font-size:18px;font-weight:bold;cursor:pointer;}
            .link{text-align:center;margin-top:20px;color:#667eea;}
            .link a{color:#ff3333;}
            .error{background:rgba(255,0,0,0.2);border:1px solid #ff3333;color:#ff6666;padding:10px;border-radius:8px;margin-bottom:15px;}
            .cf-turnstile{display:flex;justify-content:center;margin:15px 0;}
        </style>
    </head>
    <body>
        <div class="container">
            <h2>KAYIT OL</h2>
            <div class="sub">Aramiza Katil</div>
            ${req.query.error ? '<div class="error">' + req.query.error + '</div>' : ''}
            <form method="POST" action="/kayit">
                <input type="text" name="username" placeholder="Kullanici Adi" required>
                <input type="password" name="password" placeholder="Sifre" required>
                <input type="password" name="confirm" placeholder="Sifre Tekrar" required>
                <div class="cf-turnstile" data-sitekey="${CLOUDFLARE_SITE_KEY}"></div>
                <button type="submit">KAYIT OL</button>
            </form>
            <div class="link">Zaten hesabin var mi? <a href="/giris">Giris Yap</a></div>
        </div>
    </body>
    </html>
    `);
});

app.post('/giris', async (req, res) => {
    const { username, password, 'cf-turnstile-response': captchaToken } = req.body;
    const isHuman = await verifyCloudflareToken(captchaToken);
    if (!isHuman) return res.redirect('/giris?error=Robot dogrulamasi basarisiz');
    const user = users[username];
    if (!user) return res.redirect('/giris?error=Kullanici bulunamadi');
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.redirect('/giris?error=Hatali sifre');
    req.session.userId = username;
    res.redirect('/dashboard');
});

app.post('/kayit', async (req, res) => {
    const { username, password, confirm, 'cf-turnstile-response': captchaToken } = req.body;
    const isHuman = await verifyCloudflareToken(captchaToken);
    if (!isHuman) return res.redirect('/kayit?error=Robot dogrulamasi basarisiz');
    if (password !== confirm) return res.redirect('/kayit?error=Sifreler eslesmiyor');
    if (users[username]) return res.redirect('/kayit?error=Bu kullanici adi zaten var');
    const hash = await bcrypt.hash(password, 10);
    users[username] = { password: hash };
    saveUsers();
    res.redirect('/giris');
});

app.get('/dashboard', requireLogin, (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>SEVEMEZSINIZ | Dashboard</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            *{margin:0;padding:0;box-sizing:border-box;}
            body{font-family:Arial;background:linear-gradient(135deg,#0a0a0a 0%,#1a1a2e 100%);min-height:100vh;padding:20px;}
            .header{background:linear-gradient(135deg,#000,#1a0000);padding:25px;border-radius:20px;margin-bottom:30px;border:1px solid rgba(255,0,0,0.3);}
            h1{color:#ff3333;font-size:2.5em;text-align:center;}
            .subtitle{text-align:center;color:#667eea;margin-top:10px;}
            .logout{float:right;background:#dc3545;color:white;padding:8px 20px;text-decoration:none;border-radius:25px;}
            .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:15px;}
            .api-btn{background:linear-gradient(135deg,#1a1a2e,#0f0f23);border:1px solid #333;padding:18px;border-radius:15px;font-weight:bold;color:#fff;cursor:pointer;text-align:center;}
            .api-btn.tc{border-left:4px solid #28a745;}
            .api-btn.ad{border-left:4px solid #007bff;}
            .api-btn.gsm{border-left:4px solid #ffc107;}
            .api-btn.plaka{border-left:4px solid #17a2b8;}
            .api-btn.ozel{border-left:4px solid #ff00cc;}
            .api-btn:hover{transform:translateY(-5px);border-color:#ff3333;}
        </style>
    </head>
    <body>
        <div class="header">
            <a href="/cikis" class="logout">çıkış</a>
            <h1>SEVEMEZSINIZ</h1>
            <div class="subtitle">Sorgu Sistemi | Hosgeldin, ${req.session.userId}</div>
        </div>
        <div class="grid">
            ${apiList.map(api => `<button class="api-btn ${api.type}" onclick="window.location.href='/sorgu/${api.id}'">${api.name}</button>`).join('')}
        </div>
    </body>
    </html>
    `);
});

apiList.forEach(api => {
    app.get(`/sorgu/${api.id}`, requireLogin, (req, res) => {
        if (api.id === 'query') {
            res.send(`
            <!DOCTYPE html>
            <html>
            <head><title>SEVEMEZSINIZ | ${api.name}</title><meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                *{margin:0;padding:0;box-sizing:border-box;}
                body{font-family:Arial;background:linear-gradient(135deg,#0a0a0a 0%,#1a1a2e 100%);padding:20px;}
                .container{max-width:950px;margin:0 auto;background:rgba(0,0,0,0.85);padding:30px;border-radius:20px;border:1px solid rgba(255,0,0,0.3);}
                .back{color:#667eea;text-decoration:none;display:inline-block;margin-bottom:20px;}
                h2{color:#ff3333;margin-bottom:20px;}
                input,button{width:100%;padding:12px;margin:8px 0;background:#1a1a2e;border:1px solid #333;border-radius:10px;color:white;font-size:14px;}
                button{background:linear-gradient(90deg,#ff3333,#cc0000);font-weight:bold;cursor:pointer;border:none;}
                .result-box,.error-box{display:none;padding:20px;border-radius:10px;margin-top:20px;white-space:pre-wrap;word-wrap:break-word;overflow-x:auto;max-height:650px;overflow-y:auto;}
                .result-box{background:#0a0a0a;border-left:4px solid #28a745;color:#00ff88;font-family:'Courier New',monospace;font-size:12px;line-height:1.5;}
                .error-box{background:rgba(255,0,0,0.2);border-left:4px solid #ff3333;color:#ff6666;font-family:monospace;}
                .loading{color:#667eea;text-align:center;padding:20px;display:none;}
            </style>
            </head>
            <body>
            <div class="container">
                <a href="/dashboard" class="back">← Ana Sayfa</a>
                <h2>${api.name} (Il Filtreli)</h2>
                <form id="sorguForm" onsubmit="sorgula(event)">
                    <input type="text" id="name" placeholder="Isim" required>
                    <input type="text" id="surname" placeholder="Soyisim" required>
                    <input type="text" id="city" placeholder="Il (Ornek: Istanbul, Diyarbakir)" required>
                    <button type="submit">FILTRELI SORGULA</button>
                </form>
                <div id="loading" class="loading">Sorgulaniyor, lutfen bekleyin...</div>
                <div id="resultBox" class="result-box"></div>
                <div id="errorBox" class="error-box"></div>
            </div>
            <script>
            async function sorgula(e){
                e.preventDefault();
                const resultBox=document.getElementById('resultBox');
                const errorBox=document.getElementById('errorBox');
                const loading=document.getElementById('loading');
                resultBox.style.display='none';
                errorBox.style.display='none';
                loading.style.display='block';
                const name=document.getElementById('name').value;
                const surname=document.getElementById('surname').value;
                const city=document.getElementById('city').value;
                const url='/api/proxy/query?name='+encodeURIComponent(name)+'&surname='+encodeURIComponent(surname)+'&format=text';
                try{
                    const res=await fetch(url);
                    const text=await res.text();
                    loading.style.display='none';
                    if(!res.ok) throw new Error(text);
                    let records = [];
                    let currentRecord = [];
                    let lines = text.split('\\n');
                    for(let i = 0; i < lines.length; i++) {
                        let line = lines[i];
                        currentRecord.push(line);
                        if(line.trim() === '' || i === lines.length - 1) {
                            let recordText = currentRecord.join('\\n');
                            if(recordText.trim().length > 10) {
                                records.push(recordText);
                            }
                            currentRecord = [];
                        }
                    }
                    let filteredRecords = [];
                    for(let i = 0; i < records.length; i++) {
                        if(records[i].toLowerCase().includes(city.toLowerCase())) {
                            filteredRecords.push(records[i]);
                        }
                    }
                    if(filteredRecords.length === 0){
                        errorBox.textContent = ' "' + city + '" icin eslesen kayit bulunamadi!\\n\\nToplam ' + records.length + ' kayit incelendi.';
                        errorBox.style.display = 'block';
                    } else {
                        let sonuc = '';
                        sonuc += '================== "' + city.toUpperCase() + '" ICIN BULUNAN SONUCLAR ==================\\n\\n';
                        sonuc += 'Toplam kayit: ' + filteredRecords.length + ' adet\\n\\n';
                        for(let i = 0; i < filteredRecords.length; i++) {
                            sonuc += '========== KAYIT #' + (i+1) + ' ==========\\n';
                            sonuc += filteredRecords[i] + '\\n\\n';
                        }
                        resultBox.textContent = sonuc;
                        resultBox.style.display = 'block';
                    }
                } catch(err) {
                    loading.style.display='none';
                    errorBox.textContent = 'Sorgu hatasi: ' + err.message;
                    errorBox.style.display = 'block';
                }
            }
            </script>
            </body>
            </html>
            `);
            return;
        }
        
        if (api.id === 'soyagaci') {
            res.send(`
            <!DOCTYPE html>
            <html>
            <head><title>SEVEMEZSINIZ | ${api.name}</title><meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                *{margin:0;padding:0;box-sizing:border-box;}
                body{font-family:Arial;background:linear-gradient(135deg,#0a0a0a 0%,#1a1a2e 100%);padding:20px;}
                .container{max-width:700px;margin:0 auto;background:rgba(0,0,0,0.85);padding:30px;border-radius:20px;border:1px solid rgba(255,0,0,0.3);}
                .back{color:#667eea;text-decoration:none;}
                h2{color:#ff3333;margin-bottom:20px;}
                input,button{width:100%;padding:12px;margin:8px 0;background:#1a1a2e;border:1px solid #333;border-radius:10px;color:white;}
                button{background:linear-gradient(90deg,#28a745,#1e7e34);font-weight:bold;cursor:pointer;}
                .result-box,.error-box{display:none;padding:15px;border-radius:10px;margin-top:20px;white-space:pre-wrap;word-wrap:break-word;max-height:500px;overflow-y:auto;}
                .result-box{background:#0a0a0a;border-left:4px solid #28a745;color:#00ff88;font-family:monospace;font-size:12px;}
                .error-box{background:rgba(255,0,0,0.2);border-left:4px solid #ff3333;color:#ff6666;}
                .loading{color:#667eea;text-align:center;display:none;padding:15px;}
            </style>
            </head>
            <body>
            <div class="container">
                <a href="/dashboard" class="back">← Ana Sayfa</a>
                <h2>${api.name}</h2>
                <form id="sorguForm" onsubmit="sorgula(event)">
                    <input type="text" id="tc" placeholder="TC Kimlik No (11 haneli)" required maxlength="11" pattern="[0-9]{11}">
                    <button type="submit">SOY AGACINI GETIR</button>
                </form>
                <div id="loading" class="loading">Soy agaci sorgulaniyor...</div>
                <div id="resultBox" class="result-box"></div>
                <div id="errorBox" class="error-box"></div>
            </div>
            <script>
            async function sorgula(e){
                e.preventDefault();
                const resultBox=document.getElementById('resultBox');
                const errorBox=document.getElementById('errorBox');
                const loading=document.getElementById('loading');
                resultBox.style.display='none';
                errorBox.style.display='none';
                const tc=document.getElementById('tc').value;
                if(tc.length!==11 || !/^[0-9]+$/.test(tc)){
                    errorBox.textContent='Gecerli bir TC Kimlik No giriniz (11 haneli)';
                    errorBox.style.display='block';
                    return;
                }
                loading.style.display='block';
                try{
                    const res=await fetch('/api/proxy/soyagaci?tc='+encodeURIComponent(tc));
                    const text=await res.text();
                    loading.style.display='none';
                    if(!res.ok) throw new Err
