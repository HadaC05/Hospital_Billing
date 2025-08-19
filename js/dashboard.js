console.log('dashboard.js is working');

document.addEventListener('DOMContentLoaded', () => {
    const user = JSON.parse(localStorage.getItem('user'));
    const welcomeMessage = document.getElementById('welcomeMessage') || document.getElementById('welcome-msg');

    if (!user) {
        console.error('No user data found. Redirecting to login.');
        window.location.href = '../index.html';
        return;
    }

    if (welcomeMessage) {
        welcomeMessage.textContent = `Welcome, ${user.full_name || 'User'}`;
    }
});