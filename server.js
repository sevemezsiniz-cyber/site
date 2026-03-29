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

// Kullanıcı veritabanı
const USERS_FILE = path.join(__dirname, 'users.json');

// Kullanıcıları yükle
let users = {};
if (fs.existsSync(USERS_FILE)) {
    users = JSON.parse(fs.readFileSync(USERS_FILE));
}

// Kullanıcıları kaydet
function saveUsers() {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(session({
    secret: 'gizli-anahtar-buraya',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

// Oturum kontrolü
const requireLogin = (req, res, next) => {
    if (!req.session.userId) {
        return res.redirect('/giris');
    }
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
    { id: 'query', name: 'Kapsamlı Sorgu', type: 'ad', api: 'query' },
    { id: 'gsm', name: 'GSM Sorgu', type: 'gsm', api: 'gsm' },
    { id: 'gsm2', name: 'GSM Sorgu 2', type: 'gsm', api: 'gsm2' },
    { id: 'plaka', name: 'Plaka Sorgu', type: 'plaka', api: 'plaka' }
];

// Ana sayfa
app.get('/', (req, res) => {
    if (req.session.userId) return res.redirect('/dashboard');
    res.redirect('/giris');
});

// Giriş sayfası
app.get('/giris', (req, res) => {
    res.send(`
        <!DOCTYPE html><html><head><title>Giriş Yap</title><meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
        body { font-family: Arial; background: #f0f2f5; padding: 20px; }
        .container { max-width: 400px; margin: 50px auto; background: white; padding: 30px; border-radius: 10px; }
        h2 { text-align: center; color: #333; }
        input, button { width: 100%; padding: 12px; margin: 8px 0; border-radius:5px; box-sizing: border-box; }
        button { background: #1877f2; color: white; border:none; cursor:pointer; }
        .link { text-align: center; margin-top: 15px; }
        .error { color:red; text-align:center; }
        </style></head><body>
        <div class="container">
        <h2>🔐 Giriş Yap</h2>
        ${req.query.error ? '<div class="error">'+req.query.error+'</div>' : ''}
        <form method="POST" action="/giris">
        <input type="text" name="username" placeholder="Kullanıcı Adı" required>
        <input type="password" name="password" placeholder="Şifre" required>
        <button type="submit">Giriş Yap</button>
        </form>
        <div class="link">Hesabın yok mu? <a href="/kayit">Kayıt Ol</a></div>
        </div></body></html>
    `);
});

// Kayıt sayfası
app.get('/kayit', (req, res) => {
    res.send(`
        <!DOCTYPE html><html><head><title>Kayıt Ol</title><meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
        body { font-family: Arial; background: #f0f2f5; padding: 20px; }
        .container { max-width: 400px; margin: 50px auto; background: white; padding: 30px; border-radius: 10px; }
        h2 { text-align: center; color: #333; }
        input, button { width: 100%; padding: 12px; margin: 8px 0; border-radius:5px; box-sizing: border-box; }
        button { background: #42b72a; color: white; border:none; cursor:pointer; }
        .link { text-align: center; margin-top: 15px; }
        .error { color:red; text-align:center; }
        </style></head><body>
        <div class="container">
        <h2>📝 Kayıt Ol</h2>
        ${req.query.error ? '<div class="error">'+req.query.error+'</div>' : ''}
        <form method="POST" action="/kayit">
        <input type="text" name="username" placeholder="Kullanıcı Adı" required>
        <input type="password" name="password" placeholder="Şifre" required>
        <input type="password" name="confirm" placeholder="Şifre Tekrar" required>
        <button type="submit">Kayıt Ol</button>
        </form>
        <div class="link">Zaten hesabın var mı? <a href="/giris">Giriş Yap</a></div>
        </div></body></html>
    `);
});

// Kayıt işlemi
app.post('/kayit', async (req,res) => {
    const { username, password, confirm } = req.body;
    if(password!==confirm) return res.redirect('/kayit?error=Şifreler eşleşmiyor');
    if(users[username]) return res.redirect('/kayit?error=Bu kullanıcı adı zaten var');
    const hash = await bcrypt.hash(password,10);
    users[username]={password:hash};
    saveUsers();
    res.redirect('/giris?success=Kayıt başarılı, giriş yapabilirsiniz');
});

// Giriş işlemi
app.post('/giris', async (req,res)=>{
    const {username,password} = req.body;
    const user = users[username];
    if(!user) return res.redirect('/giris?error=Kullanıcı bulunamadı');
    const valid = await bcrypt.compare(password,user.password);
    if(!valid) return res.redirect('/giris?error=Hatalı şifre');
    req.session.userId=username;
    res.redirect('/dashboard');
});

// Dashboard
app.get('/dashboard', requireLogin, (req,res)=>{
    res.send(`
    <!DOCTYPE html><html><head><title>Ana Sayfa</title><meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
    body{font-family:Arial;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);min-height:100vh;padding:20px;}
    .header{background:white;padding:30px;border-radius:15px;margin-bottom:30px;text-align:center;}
    h1{color:#ff4444;font-size:3em;margin:0;word-break:break-word;}
    .subtitle{color:#666;margin-top:10px;}
    .logout{float:right;background:#dc3545;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;}
    .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;margin-top:20px;}
    .api-btn{background:white;border:none;padding:15px;border-radius:10px;font-size:14px;font-weight:bold;color:#333;cursor:pointer;box-shadow:0 2px 4px rgba(0,0,0,0.1);}
    .api-btn.tc{border-left:5px solid #28a745;}
    .api-btn.ad{border-left:5px solid #007bff;}
    .api-btn.gsm{border-left:5px solid #ffc107;}
    .api-btn.plaka{border-left:5px solid #dc3545;}
    .api-btn:hover{transform:translateY(-3px);}
    @media(max-width:600px){.grid{grid-template-columns:repeat(2,1fr);}h1{font-size:2em;}}
    </style></head><body>
    <div class="header">
    <a href="/cikis" class="logout">Çıkış</a>
    <h1>/SEVEMEZSİNİZ</h1>
    <div class="subtitle">Hoşgeldin, ${req.session.userId}</div>
    </div>
    <div class="grid">
    ${apiList.map(api=>`<button class="api-btn ${api.type}" onclick="window.location.href='/sorgu/${api.id}'">${api.name}</button>`).join('')}
    </div>
    </body></html>
    `);
});

// Sorgu sayfaları
apiList.forEach(api=>{
    app.get(`/sorgu/${api.id}`,requireLogin,(req,res)=>{
        res.send(`
        <!DOCTYPE html><html><head><title>${api.name}</title><meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
        body{font-family:Arial;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);min-height:100vh;padding:20px;}
        .container{max-width:600px;margin:0 auto;background:white;padding:30px;border-radius:15px;}
        input,button{width:100%;padding:10px;margin:5px 0;border-radius:5px;}
        button{background:#667eea;color:white;border:none;cursor:pointer;}
        .result-box,.error-box{display:none;padding:15px;border-radius:10px;margin-top:20px;white-space:pre-wrap;}
        .result-box{background:#f8f9fa;border-left:4px solid #667eea;font-family:monospace;}
        .error-box{background:#fee;border-left:4px solid #f00;color:#c00;}
        </style></head><body>
        <div class="container">
        <a href="/dashboard">← Ana Sayfa</a>
        <h2>${api.name}</h2>
        <form id="sorguForm" onsubmit="sorgula(event)">
        ${api.type==='ad'?`<input id="name" placeholder="İsim" required><input id="surname" placeholder="Soyisim" required>`:`<input id="input" placeholder="${api.type==='tc'?'TC No':api.type==='gsm'?'GSM':'Plaka'}" required>`}
        <button type="submit">🔍 Sorgula</button>
        </form>
        <div id="resultBox" class="result-box"></div>
        <div id="errorBox" class="error-box"></div>
        </div>
        <script>
        async function sorgula(e){
            e.preventDefault();
            const resultBox=document.getElementById('resultBox');
            const errorBox=document.getElementById('errorBox');
            resultBox.style.display='none';errorBox.style.display='none';
            let url='/api/proxy/${api.api}?';
            ${api.type==='tc'?'url+="tc="+encodeURIComponent(document.getElementById("input").value);':''}
            ${api.type==='gsm'?'url+="gsm="+encodeURIComponent(document.getElementById("input").value);':''}
            ${api.type==='plaka'?'url+="plaka="+encodeURIComponent(document.getElementById("input").value);':''}
            ${api.type==='ad'?`url+="name="+encodeURIComponent(document.getElementById("name").value)+"&surname="+encodeURIComponent(document.getElementById("surname").value);`:''}
            url+='&format=text';
            try{
                const res=await fetch(url);
                const text=await res.text();
                if(res.ok){resultBox.textContent=text;resultBox.style.display='block';}
                else{errorBox.textContent='Hata: '+text;errorBox.style.display='block';}
            }catch(err){errorBox.textContent='Bağlantı Hatası: '+err.message;errorBox.style.display='block';}
        }
        </script>
        </body></html>
        `);
    });
});

// Proxy API
app.get('/api/proxy/:endpoint', async (req,res)=>{
    const {endpoint}=req.params;
    try{
        const params = new URLSearchParams(req.query).toString();
        const url = `https://apilerimya.onrender.com/${endpoint}?${params}`;
        const response = await axios.get(url, {timeout:10000, headers:{'User-Agent':'Mozilla/5.0'}});
        res.set('Content-Type','text/plain');res.send(response.data);
    }catch(err){
        if(err.response) res.status(err.response.status).send(err.response.data);
        else if(err.request) res.status(503).send('API servisine ulaşılamıyor');
        else res.status(500).send('Sunucu Hatası: '+err.message);
    }
});

// Çıkış
app.get('/cikis', (req,res)=>{
    req.session.destroy(()=>{res.redirect('/giris');});
});

// Sunucuyu başlat
app.listen(PORT,'0.0.0.0',()=>{console.log(`🌐 Sunucu çalışıyor: http://localhost:${PORT}`);});
