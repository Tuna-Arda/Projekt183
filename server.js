/*************************************************************
 * server.js
 *************************************************************/
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

// Pfade für JSON-Dateien
const usersPath = path.join(__dirname, 'db', 'users.json');
const logsPath = path.join(__dirname, 'db', 'logs.json');

// Session-Einstellungen (In-Memory; NICHT für Produktion geeignet!)
app.use(session({
  secret: 'supersecretkey',  // In Produktion sicher aufbewahren
  resave: false,
  saveUninitialized: false,
  cookie: {
    // Bsp. 1 Stunde max
    maxAge: 60 * 60 * 1000
  }
}));

/*************************************************************
 * SESSION-TIMEOUT MIDDLEWARE (Idle & Absolute)
 *************************************************************/
const IDLE_TIMEOUT = 5 * 60 * 1000;       // 5 Minuten
const ABSOLUTE_TIMEOUT = 30 * 60 * 1000; // 30 Minuten

function checkSessionTimeout(req, res, next) {
  if (!req.session) return next(); // Falls keine Session existiert

  const now = Date.now();

  // Falls Session noch nie genutzt wurde, Initialwerte setzen
  if (!req.session.startTime) {
    req.session.startTime = now;
    req.session.lastActivity = now;
    return next();
  }

  // Idle-Timeout checken
  if (now - req.session.lastActivity > IDLE_TIMEOUT) {
    // Session abgelaufen (Idle)
    req.session.destroy(() => {
      return res.status(440).json({ success: false, message: 'Session abgelaufen (Idle)' });
    });
    return;
  }

  // Absolute Timeout checken
  if (now - req.session.startTime > ABSOLUTE_TIMEOUT) {
    req.session.destroy(() => {
      return res.status(440).json({ success: false, message: 'Session abgelaufen (Absolute)' });
    });
    return;
  }

  // Session updaten
  req.session.lastActivity = now;
  next();
}

app.use(checkSessionTimeout);

/*************************************************************
 * HILFSFUNKTIONEN: JSON lesen/schreiben, Logging
 *************************************************************/
function loadUsers() {
  try {
    const data = fs.readFileSync(usersPath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
}

function saveUsers(users) {
  fs.writeFileSync(usersPath, JSON.stringify(users, null, 2), 'utf8');
}

function logEvent(eventType, user, action) {
  // eventType z.B. "LOGIN", "REGISTER", "2FA"
  // user z.B. "maxmustermann"
  // action kurzer Text
  const now = new Date().toISOString();
  let logs = [];
  try {
    logs = JSON.parse(fs.readFileSync(logsPath, 'utf8'));
  } catch {
    // Falls logs.json leer
  }
  logs.push({
    timestamp: now,
    eventType,
    user,
    action
  });
  fs.writeFileSync(logsPath, JSON.stringify(logs, null, 2), 'utf8');
}

/*************************************************************
 * 1) REGISTRATION (POST /register)
 *************************************************************/
app.post('/register', (req, res) => {
  const { username, password } = req.body;

  // Input-Validierung (Minimalbeispiel)
  if (!username || !password || username.length < 3 || password.length < 3) {
    return res.status(400).json({ success: false, message: 'Ungültige Eingaben' });
  }

  const users = loadUsers();

  // Prüfen, ob User schon existiert
  if (users.some(u => u.username === username)) {
    return res.status(400).json({ success: false, message: 'Benutzer existiert bereits' });
  }

  // Passwort hashen (bcrypt)
  bcrypt.hash(password, 10)
    .then(hashed => {
      // Neuen User speichern
      const newUser = {
        id: Date.now(),
        username,
        passwordHash: hashed,
        twoFactorSecret: null,
        isTwoFactorEnabled: false
      };
      users.push(newUser);
      saveUsers(users);

      // Logging
      logEvent('REGISTER', username, 'Neuer Benutzer registriert');

      return res.json({ success: true, message: 'Registrierung erfolgreich' });
    })
    .catch(err => res.status(500).json({ success: false, message: err.message }));
});

/*************************************************************
 * 2) LOGIN (POST /login)
 *************************************************************/
app.post('/login', async (req, res) => {
  const { username, password, token } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Ungültige Eingaben' });
  }

  const users = loadUsers();
  const user = users.find(u => u.username === username);
  if (!user) {
    return res.status(401).json({ success: false, message: 'Benutzer nicht gefunden' });
  }

  // Passwort prüfen
  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    return res.status(401).json({ success: false, message: 'Falsches Passwort' });
  }

  // Falls 2FA aktiviert, Code abfragen
  if (user.isTwoFactorEnabled) {
    if (!token) {
      return res.status(401).json({ success: false, message: '2FA-Code fehlt' });
    }
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token
    });
    if (!verified) {
      return res.status(401).json({ success: false, message: 'Falscher 2FA-Code' });
    }
  }

  // Session setzen
  req.session.user = {
    id: user.id,
    username: user.username
  };

  // Logging
  logEvent('LOGIN', username, 'Login erfolgreich');

  return res.json({ success: true, message: 'Login erfolgreich' });
});

/*************************************************************
 * 3) LOGOUT (GET /logout)
 *************************************************************/
app.get('/logout', (req, res) => {
  if (req.session.user) {
    logEvent('LOGOUT', req.session.user.username, 'Logout durchgeführt');
  }
  req.session.destroy(() => {
    res.json({ success: true, message: 'Logout erfolgreich' });
  });
});

/*************************************************************
 * 4) 2FA EINRICHTEN (POST /2fa/setup)
 *    - Nur wenn User eingeloggt!
 *************************************************************/
app.post('/2fa/setup', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ success: false, message: 'Nicht eingeloggt' });
  }

  const users = loadUsers();
  const user = users.find(u => u.id === req.session.user.id);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User nicht gefunden' });
  }

  // Speakeasy Secret generieren
  const secret = speakeasy.generateSecret({ name: 'MeineApp-2FA' });

  // User-Daten aktualisieren
  user.twoFactorSecret = secret.base32;
  user.isTwoFactorEnabled = true;
  saveUsers(users);

  // QR-Code (Daten-URL) erstellen, damit der User es scannen kann
  QRCode.toDataURL(secret.otpauth_url, (err, qrCodeDataUrl) => {
    if (err) {
      return res.status(500).json({ success: false, message: err.message });
    }

    // Logging
    logEvent('2FA_SETUP', user.username, '2FA aktiviert');

    res.json({
      success: true,
      message: '2FA eingerichtet',
      qrCodeDataUrl
    });
  });
});

/*************************************************************
 * 5) OPTIONAL: 2FA CODE VERIFIZIEREN (POST /2fa/verify)
 *    - Beispiel-Endpoint, falls man z.B. an einer bestimmten
 *      Stelle erneut eine 2FA-Abfrage machen will.
 *************************************************************/
app.post('/2fa/verify', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ success: false, message: 'Nicht eingeloggt' });
  }

  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ success: false, message: '2FA-Code fehlt' });
  }

  const users = loadUsers();
  const user = users.find(u => u.id === req.session.user.id);
  if (!user || !user.isTwoFactorEnabled) {
    return res.status(400).json({ success: false, message: '2FA nicht aktiviert' });
  }

  const verified = speakeasy.totp.verify({
    secret: user.twoFactorSecret,
    encoding: 'base32',
    token
  });

  if (!verified) {
    return res.status(401).json({ success: false, message: 'Falscher 2FA-Code' });
  }

  // Logging
  logEvent('2FA_VERIFY', user.username, '2FA-Code erfolgreich verifiziert');

  res.json({ success: true, message: '2FA-Code korrekt' });
});

/*************************************************************
 * SERVER STARTEN (Static-Files + Listen)
 *************************************************************/

// Falls du deinen Frontend-Ordner statisch ausliefern willst:
app.use(express.static(path.join(__dirname, 'Frontend')));

const PORT = 3002;
app.listen(PORT, () => {
  console.log(`Server läuft auf Port ${PORT}`);
});


app.use(session({
    secret: 'supersecretkey',  // In Produktion sicher aufbewahren
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 2 * 60 * 1000  // 2 Minuten in Millisekunden
    }
  }));
  
const cors = require('cors');
app.use(cors());
