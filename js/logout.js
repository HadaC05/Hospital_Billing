console.log('logout.js loaded');

document.addEventListener('DOMContentLoaded', () => {

    const baseApiUrl = 'http://localhost/hospital_billing/api';
    const logoutBtn = document.getElementById('logout-btn');


    logoutBtn.addEventListener('click', async () => {

        try {
            await axios.post(`${baseApiUrl}/logout.php`);

            localStorage.removeItem('user');

            window.location.href = '../index.html';
        } catch (error) {
            console.error('Logout failed: ', error);
            alert('Logout  failed. Please try again.');
        }
    });
});