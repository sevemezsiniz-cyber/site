const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const axios = require('axios');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

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

// API listesi (tüm endpointler eklendi)
const apiList = [
    { id: 'isegiris', name: 'İşe Giriş', type: 'ad', api: 'isegiris', param: 'name-surname' },
    { id: 'ikametgah', name: 'İkametgah', type: 'ad', api: 'ikametgah', param: 'name-surname' },
    { id: 'ailebirey', name: 'Aile Bireyi', type: 'ad', api: 'ailebirey', param: 'name-surname' },
    { id: 'medenicinsiyet', name: 'Medeni Hal ve Cinsiyet', type: 'ad', api: 'medenicinsiyet', param: 'name-surname' },
    { id: 'tc-isegiris', name: 'TC İşe Giriş', type: 'tc', api: 'tc-isegiris', param: 'tc' },
    { id: 'tc-ikametgah', name: 'TC İkametgah', type: 'tc', api: 'tc-ikametgah', param: 'tc' },
    { id: 'tc-ailebirey', name: 'TC Aile Bireyi', type: 'tc', api: 'tc-ailebirey', param: 'tc' },
    { id: 'tc-medenicinsiyet', name: 'TC Medeni Hal ve Cinsiyet', type: 'tc', api: 'tc-medenicinsiyet', param: 'tc' },
    { id: 'query', name: 'Kapsamlı Sorgu', type: 'ad', api: 'query', param: 'name-surname' },
    { id: 'ad', name: 'İsim Sorgu', type: 'ad', api: 'ad', param: 'name-surname' },
    { id: 'tc', name: 'TC Sorgu', type: 'tc', api: 'tc', param: 'tc' },
    { id: 'gsm', name: 'GSM Sorgu', type: 'gsm', api: 'gsm', param: 'gsm' },
    { id: 'gsm2', name: 'GSM Sorgu 2', type: 'gsm', api: 'gsm2', param: 'gsm' },
    { id: 'plaka', name: 'Plaka Sorgu', type: 'plaka', api: 'plaka', param: 'plaka' },
    { id: 'aile', name: 'Aile Bilgisi', type: 'tc', api: 'aile', param: 'tc' },
    { id: 'sulale', name: 'Sülale Bilgisi', type: 'tc', api: 'sulale', param: 'tc' },
    { id: 'hane', name: 'Hane Bilgisi', type: 'tc', api: 'hane', param: 'tc' },
    { id: 'isyeri', name: 'İşyeri Bilgisi', type: 'tc', api: 'isyeri', param: 'tc' },
    { id: 'tc2', name: 'TC Sorgu 2', type: 'tc', api: 'tc2', param: 'tc' },
    { id: 'vesika', name: 'Vesika Bilgisi', type: 'tc', api: 'vesika', param: 'tc' },
    { id: 'text', name: 'Text Endpoint', type: 'ad', api: 'text', param: 'name-surname' },
    { id: 'raw', name: 'Raw Endpoint', type: 'ad', api: 'raw', param: 'name-surname' },
    { id: 'test', name: 'Test Endpoint', type: 'none', api: 'test', param: '' },
    { id: 'health', name: 'Health Endpoint', type: 'none', api: 'health', param: '' },
    { id: 'root', name: 'Ana Sayfa API', type: 'none', api: '', param: '' }
];

// Ana sayfa
app.get('/', (req, res) => {
    if (req.session.userId) {
        res.redirect('/dashboard');
    } else {
        res.redirect('/giris');
    }
});

// Giriş sayfası
app.get('/giris', (req, res) => {
    res.send(`<!DOCTYPE html>
<html>
<head>
<title>Giriş Yap</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
body { font-family: Arial; margin:0; padding:20px; background:#f0f2f5; }
.container { max-width:400px; margin:50px auto; background:white; padding:30px; border-radius:10px; box-shadow:0 2px 10px rgba(0,0,0,0.1); }
h2 { text-align:center; color:#333; }
input { width:100%; padding:12px; margin:8px 0; border:1px solid #ddd; border-radius:5px; box-sizing:border-box; }
button { width:100%; padding:12px; background:#1877f2; color:white; border:none; border-radius:5px; font-size:16px; cursor:pointer; margin:10px 0; }
.link { text-align:center; margin-top:15px; }
.link a { color:#1877f2; text-decoration:none; }
.error { color:red; margin:10px 0; text-align:center; }
</style>
</head>
<body>
<div class="container">
<h2>🔐 Giriş Yap</h2>
${req.query.error ? '<div class="error">' + req.query.error + '</div>' : ''}
<form method="POST" action="/giris">
<input type="text" name="username" placeholder="Kullanıcı Adı" required>
<input type="password" name="password" placeholder="Şifre" required>
<button type="submit">Giriş Yap</button>
</form>
<div class="link">
Hesabın yok mu? <a href="/kayit">Kayıt Ol</a>
</div>
</div>
</body>
</html>`);
});

// Kayıt sayfası
app.get('/kayit', (req, res) => {
    res.send(`<!DOCTYPE html>
<html>
<head>
<title>Kayıt Ol</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
body { font-family: Arial; margin:0; padding:20px; background:#f0f2f5; }
.container { max-width:400px; margin:50px auto; background:white; padding:30px; border-radius:10px; box-shadow:0 2px 10px rgba(0,0,0,0.1); }
h2 { text-align:center; color:#333; }
input { width:100%; padding:12px; margin:8px 0; border:1px solid #ddd; border-radius:5px; box-sizing:border-box; }
button { width:100%; padding:12px; background:#42b72a; color:white; border:none; border-radius:5px; font-size:16px; cursor:pointer; margin:10px 0; }
.link { text-align:center; margin-top:15px; }
.link a { color:#1877f2; text-decoration:none; }
.error { color:red; margin:10px 0; text-align:center; }
</style>
</head>
<body>
<div class="container">
<h2>📝 Kayıt Ol</h2>
${req.query.error ? '<div class="error">' + req.query.error + '</div>' : ''}
<form method="POST" action="/kayit">
<input type="text" name="username" placeholder="Kullanıcı Adı" required>
<input type="password" name="password" placeholder="Şifre" required>
<input type="password" name="confirm" placeholder="Şifre Tekrar" required>
<button type="submit">Kayıt Ol</button>
</form>
<div class="link">
Zaten hesabın var mı? <a href="/giris">Giriş Yap</a>
</div>
</div>
</body>
</html>`);
});

// Kayıt işlemi
app.post('/kayit', async (req, res) => {
    const { username, password, confirm } = req.body;
    if (password !== confirm) return res.redirect('/kayit?error=Şifreler eşleşmiyor');
    if (users[username]) return res.redirect('/kayit?error=Bu kullanıcı adı zaten var');
    const hashedPassword = await bcrypt.hash(password, 10);
    users[username] = { password: hashedPassword };
    saveUsers();
    res.redirect('/giris?success=Kayıt başarılı, giriş yapabilirsiniz');
});

// Giriş işlemi
app.post('/giris', async (req, res) => {
    const { username, password } = req.body;
    const user = users[username];
    if (!user) return res.redirect('/giris?error=Kullanıcı bulunamadı');
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.redirect('/giris?error=Hatalı şifre');
    req.session.userId = username;
    res.redirect('/dashboard');
});

// Dashboard
app.get('/dashboard', requireLogin, (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
<title>Ana Sayfa</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
body { font-family: Arial; margin:0; padding:20px; background:linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height:100vh; }
.header { background:white; padding:30px; border-radius:15px; margin-bottom:30px; text-align:center; box-shadow:0 4px 6px rgba(0,0,0,0.1); }
h1 { color:#ff4444; font-size:3em; margin:0; word-break:break-word; }
.subtitle { color:#666; margin-top:10px; }
.logout { float:right; background:#dc3545; color:white; padding:10px 20px; text-decoration:none; border-radius:5px; }
.grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(150px, 1fr)); gap:10px; margin-top:20px; }
.api-btn { background:white; border:none; padding:15px; border-radius:10px; font-size:14px; font-weight:bold; color:#333; cursor:pointer; box-shadow:0 2px 4px rgba(0,0,0,0.1); transition: transform 0.2s; }
.api-btn:hover { transform:translateY(-3px); box-shadow:0 4px 8px rgba(0,0,0,0.2); }
.api-btn.tc { border-left:5px solid #28a745; }
.api-btn.ad { border-left:5px solid #007bff; }
.api-btn.gsm { border-left:5px solid #ffc107; }
.api-btn.plaka { border-left:5px solid #dc3545; }
@media (max-width:600px) { h1{ font-size:2em; } .grid{ grid-template-columns:repeat(2, 1fr); } }
</style>
</head>
<body>
<div class="header">
<a href="/cikis" class="logout">Çıkış</a>
<h1>/SEVEMEZSİNİZ</h1>
<div class="subtitle">Hoşgeldin, ${req.session.userId}</div>
</div>
<div class="grid">
${apiList.map(api => `<button class="api-btn ${api.type}" onclick="window.location.href='/sorgu/${api.id}'">${api.name}</button>`).join('')}
</div>
</body>
</html>
    `);
});

// Sorgu sayfaları
apiList.forEach(api => {
    app.get(`/sorgu/${api.id}`, requireLogin, (req, res) => {
        res.send(`
<!DOCTYPE html>
<html>
<head>
<title>${api.name}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
body { font-family: Arial; margin:0; padding:20px; background:linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height:100vh; }
.container { max-width:600px; margin:0 auto; background:white; padding:30px; border-radius:15px; box-shadow:0 4px 6px rgba(0,0,0,0.1); }
h2 { color:#333; margin-bottom:20px; }
.back { display:inline-block; margin-bottom:20px; color:#667eea; text-decoration:none; }
.form-group { margin-bottom:15px; }
label { display:block; margin-bottom:5px; color:#555; }
input { width:100%; padding:10px; border:1px solid #ddd; border-radius:5px; font-size:16px; box-sizing:border-box; }
button { background:#667eea; color:white; border:none; padding:12px 30px; border-radius:5px; font-size:16px; cursor:pointer; width:100%; }
button:hover { background:#5a67d8; }
.result-box { margin-top:20px; padding:15px; background:#f8f9fa; border-radius:10px; border-left:4px solid #667eea; white-space:pre-wrap; font-family:monospace; display:none; max-height:400px; overflow:auto; }
.loading { display:none; text-align:center; margin:20px 0; }
.loading:after { content: '.'; animation: dots 1.5s steps(5, end) infinite; }
@keyframes dots { 0%,20%{content:'.';}40%{content:'..';}60%{content:'...';}80%,100%{content:'';} }
.error-box { margin-top:20px; padding:15px; background:#fee; border-radius:10px; border-left:4px solid #f00; color:#c00; display:none; }
</style>
</head>
<body>
<div class="container">
<a href="/dashboard" class="back">← Ana Sayfa</a>
<h2>${api.name}</h2>

<form id="sorguForm" onsubmit="sorgula(event)">
<div class="form-group">
<label>${api.type==='tc'?'TC Kimlik No':api.type==='gsm'?'GSM Numarası':api.type==='plaka'?'Plaka':api.type==='ad'?'İsim ve Soyisim':'Değer'}:</label>
${api.type==='ad'?`
<input type="text" id="name" placeholder="İsim" required style="margin-bottom:10px">
<input type="text" id="surname" placeholder="Soyisim" required>`:
api.type==='tc'||api.type==='gsm'||api.type==='plaka'?`<input type="text" id="input" placeholder="Değer girin" required>`:
`<input type="text" id="input" placeholder="Değer girin" required>`}
</div>
<button type="submit">🔍 Sorgula</button>
</form>

<div id="loading" class="loading">Sorgulanıyor</div>
<div id="resultBox" class="result-box"></div>
<div id="errorBox" class="error-box"></div>
</div>

<script>
async function sorgula(event){
event.preventDefault();
const loading=document.getElementById('loading');
const resultBox=document.getElementById('resultBox');
const errorBox=document.getElementById('errorBox');
loading.style.display='block';
resultBox.style.display='none';
errorBox.style.display='none';

let apiUrl='/api/proxy/${api.api}';
${api.type==='tc'?`apiUrl+='?tc='+encodeURIComponent(document.getElementById('input').value);`:
api.type==='gsm'?`apiUrl+='?gsm='+encodeURIComponent(document.getElementById('input').value);`:
api.type==='plaka'?`apiUrl+='?plaka='+encodeURIComponent(document.getElementById('input').value);`:
api.type==='ad'?`apiUrl+='?name='+encodeURIComponent(document.getElementById('name').value)+'&surname='+encodeURIComponent(document.getElementById('surname').value);`:
''}

apiUrl+= '&format=text';

try{
const response=await fetch(apiUrl);
const text=await response.text();
if(response.ok){
resultBox.textContent=text;
resultBox.style.display='block';
}else{
errorBox.textContent='Hata: '+text;
errorBox.style.display='block';
}
}catch(error){
errorBox.textContent='Bağlantı hatası: '+error.message;
errorBox.style.display='block';
}finally{
loading.style.display='none';
}
}
</script>
</body>
</html>
        `);
});

// Proxy API
app.get('/api/proxy/:endpoint', async (req, res) => {
