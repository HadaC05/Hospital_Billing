console.log('index.js is working');

document.addEventListener('DOMContentLoaded', function () {

    const baseApiUrl = `${window.location.origin}/hospital_billing/api`;
    const loginForm = document.getElementById('loginForm');

    // Password visibility toggle
    function setupPasswordToggles() {
        document.querySelectorAll('.password-toggle').forEach((btn) => {
            btn.addEventListener('click', () => {
                const targetId = btn.getAttribute('data-target');
                const input = document.getElementById(targetId);
                if (!input) return;
                const isPassword = input.type === 'password';
                input.type = isPassword ? 'text' : 'password';

                const icon = btn.querySelector('i');
                if (icon) {
                    icon.classList.toggle('fa-eye', !isPassword);
                    icon.classList.toggle('fa-eye-slash', isPassword);
                }
                btn.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
            });
        });
    }
    setupPasswordToggles();

    if (!loginForm) {
        console.error('Login form not found');
        return;
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();

        // Clear previous error messages
        document.getElementById('error-message').textContent = '';

        console.log('Attempting login with:', { username, password });
        console.log('API URL:', baseApiUrl);

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
                console.log('User data stored, redirecting to dashboard...');
                window.location.href = './components/dashboard.html';
            } else {
                // Handle unsuccessful login
                document.getElementById('error-message').textContent = data.message || 'Login failed';
            }
        } catch (error) {
            console.error('Axios error: ', error);
            if (error.response) {
                console.error('Response status:', error.response.status);
                console.error('Response data:', error.response.data);
                document.getElementById('error-message').textContent = error.response.data.message || error.response.statusText;
            } else if (error.request) {
                console.error('Request error:', error.request);
                document.getElementById('error-message').textContent = 'Network error. Please check your connection.';
            } else {
                console.error('Error setting up request:', error.message);
                document.getElementById('error-message').textContent = 'Network error. Please try again.';
            }
        }
    });
});
