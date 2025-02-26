const registerUser = async () => {
    const data = {
      username: document.getElementById('username').value,
      password: document.getElementById('password').value
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
  
  document.getElementById('registerBtn').addEventListener('click', registerUser);
  