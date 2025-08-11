console.log('index.js is working');

document.addEventListener('DOMContentLoaded', function () {

    const baseApiUrl = 'http://localhost/Hospital_Billing-cubillan_branch/api';
    const loginForm = document.getElementById('loginForm');

    if (!loginForm) {
        console.error('Login form not found');
        return;
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();

        try {
            const response = await axios.post(`${baseApiUrl}/login.php`, {
                operation: 'loginUser',
                json: JSON.stringify({
                    username: username,
                    password: password,
                })
            });
            const data = response.data;
            console.log('Login response: ', data);

            if (data.success) {
                localStorage.setItem('user', JSON.stringify(data));
                window.location.href = './components/dashboard.html';
            }
        } catch (error) {
            console.error('Axios error: ', error);
            if (error.response) {
                document.getElementById('error-message').textContent = error.response.data.message || error.response.statusText;
            } else {
                document.getElementById('error-message').textContent = 'Network error. Please try again.';
            }
        }
    });
});
