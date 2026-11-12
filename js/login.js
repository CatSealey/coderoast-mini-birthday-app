import '../css/styles.css';
import { validateLogin } from './login-logic.js';

const form = document.querySelector('#loginForm');
const username = document.querySelector('#loginUsername');
const password = document.querySelector('#loginPassword');
const errorMessage = document.querySelector('#loginError');
const loginScreen = document.querySelector('#loginScreen');
const client = document.querySelector('#clientShell');
const submit = document.querySelector('#loginSubmit');
const configuredPassword = import.meta.env.VITE_APP_PASSWORD;
let startGame;

submit.disabled = true;
if (!configuredPassword) {
  errorMessage.textContent = 'The app password has not been configured. See the project README for setup.';
} else {
  import('./app.js').then((module) => {
    startGame = module.startGame;
    submit.disabled = false;
  }).catch((error) => {
    console.error('Could not load the birthday adventure.', error);
    errorMessage.textContent = 'The game could not load. Please reload the page and try again.';
  });
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!startGame || submit.disabled) return;
  const result = validateLogin(username.value, password.value, configuredPassword);
  if (result.error) {
    errorMessage.textContent = result.error;
    return;
  }

  submit.disabled = true;
  errorMessage.textContent = '';
  password.value = '';
  try {
    loginScreen.hidden = true;
    client.hidden = false;
    startGame(result.characterName);
    document.querySelector('#worldCanvas').focus();
  } catch (error) {
    console.error('Could not start the birthday adventure.', error);
    client.hidden = true;
    loginScreen.hidden = false;
    errorMessage.textContent = 'The game could not start. Please reload the page and try again.';
  }
});
