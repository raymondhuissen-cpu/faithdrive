async function requireSession() {
  try {
    const res = await fetch('/api/session');
    const data = await res.json();
    if (!data.authenticated) {
      window.location.replace('login.html');
      return false;
    }
    return true;
  } catch {
    window.location.replace('login.html');
    return false;
  }
}

async function logout() {
  await fetch('/api/logout', { method: 'POST' });
  window.location.replace('login.html');
}
