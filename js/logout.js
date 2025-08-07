console.log('logout.js loaded');

document.addEventListener('DOMContentLoaded', () => {

    document.addEventListener('click', async (e) => {
        if (e.target.id === 'logout-btn') {
            const baseApiUrl = 'http://localhost/hospital_billing/api';

            try {
                await axios.post(`${baseApiUrl}/logout.php`);
                localStorage.removeItem('user');
                window.location.href = '../index.html';
            } catch (error) {
                console.error('Logout failed: ', error);
                alert('Logout failed. Please try again.');
            }
        }
    });
});