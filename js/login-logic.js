export function validateLogin(username, password, configuredPassword) {
  const characterName = username.trim();
  if (!configuredPassword) return { error: 'The app password has not been configured.' };
  const hasControlCharacters = [...characterName].some((character) => {
    const code = character.codePointAt(0);
    return code < 32 || code === 127;
  });
  if (!characterName || characterName.length > 20 || hasControlCharacters) {
    return { error: 'Enter a character name of 1–20 characters without control characters.' };
  }
  if (password !== configuredPassword) return { error: 'Incorrect password. Please try again.' };
  return { characterName };
}
