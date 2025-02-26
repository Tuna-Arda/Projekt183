// Event-Listener für Login-Felder
document.getElementById('username').addEventListener('input', checkLoginFields);
document.getElementById('password').addEventListener('input', checkLoginFields);

function checkLoginFields() {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const submitButton = document.getElementById('submitBtn');

  // Regex für Passwort-Validierung (mindestens 6 Zeichen)
  const passwordRegex = /^.{6,}$/;

  // Überprüfen, ob beide Felder ausgefüllt sind und das Passwort die Mindestlänge erfüllt
  if (username !== '' && password !== '' && passwordRegex.test(password)) {
    submitButton.disabled = false; // Aktivieren des Submit-Buttons
  } else {
    submitButton.disabled = true; // Button deaktiviert lassen
  }
}

// Login-Submit-Funktion
const loginUser = async () => {
  const data = {
    username: document.getElementById('username').value,
    password: document.getElementById('password').value
  };

  try {
    const response = await fetch('http://127.0.0.1:3002/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    const result = await response.json();
    console.log(result);
    // Hier kannst du auf Erfolg oder Fehler reagieren
  } catch (error) {
    console.error('Fehler beim Login:', error);
  }
};

// Event-Listener für den Login-Button
document.getElementById('submitBtn').addEventListener('click', loginUser);
