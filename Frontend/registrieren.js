// Event-Listener für Registrierungs-Felder
document.getElementById('registerUsername').addEventListener('input', checkRegisterFields);
document.getElementById('email').addEventListener('input', checkRegisterFields);
document.getElementById('registerPassword').addEventListener('input', checkRegisterFields);
document.getElementById('birthday').addEventListener('input', checkRegisterFields);

function checkRegisterFields() {
  const username = document.getElementById('registerUsername').value;
  const email = document.getElementById('email').value;
  const password = document.getElementById('registerPassword').value;
  const birthday = document.getElementById('birthday').value;
  const submitButton = document.getElementById('registerBtn');

  // Regex für Passwort-Validierung (mindestens 15 Zeichen)
  const passwordRegex = /^.{15,}$/;

  // Überprüfen, ob alle Felder ausgefüllt sind und das Passwort die Mindestlänge erfüllt
  if (username !== '' && email !== '' && password !== '' && birthday !== '' && passwordRegex.test(password)) {
    submitButton.disabled = false; // Aktivieren des Submit-Buttons
  } else {
    submitButton.disabled = true; // Button deaktiviert lassen
  }
}

// Registrierung-Submit-Funktion
const registerUser = async () => {
  const data = {
    username: document.getElementById('registerUsername').value,
    email: document.getElementById('email').value,
    password: document.getElementById('registerPassword').value,
    birthday: document.getElementById('birthday').value
  };

  try {
    const response = await fetch('http://127.0.0.1:3002/register', {
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
    console.error('Fehler beim Registrieren:', error);
  }
};

// Event-Listener für den Registrieren-Button
document.getElementById('registerBtn').addEventListener('click', registerUser);
