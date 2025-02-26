document.getElementById('username').addEventListener('input', checkFields);
document.getElementById('password').addEventListener('input', checkFields);

function checkFields() {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const submitButton = document.getElementById('submitBtn');

  // Regex for password validation (at least 6 characters)
  const passwordRegex = /^.{6,}$/;

  // Check if both fields are filled out and password meets the length requirement
  if (username !== '' && password !== '' && passwordRegex.test(password)) {
    submitButton.disabled = false; // Enable the submit button
  } else {
    submitButton.disabled = true; // Keep the submit button disabled
  }
}

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
    // Here you can handle success or failure
  } catch (error) {
    console.error('Error during registration:', error);
  }
};

document.getElementById('registerBtn').addEventListener('click', registerUser);
