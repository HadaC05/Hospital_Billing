console.log('index.js is working');

document.addEventListener('DOMContentLoaded', function () {

    const baseApiUrl = `${window.location.origin}/hospital_billing/api`;
    const loginForm = document.getElementById('loginForm');
    const passwordInput = document.getElementById('password');
    const togglePasswordBtn = document.getElementById('togglePassword');
    const togglePasswordIcon = document.getElementById('togglePasswordIcon');

    if (!loginForm) {
        console.error('Login form not found');
        return;
    }

    // Toggle password visibility
    if (togglePasswordBtn && passwordInput && togglePasswordIcon) {
        togglePasswordBtn.addEventListener('click', () => {
            const isPassword = passwordInput.getAttribute('type') === 'password';
            passwordInput.setAttribute('type', isPassword ? 'text' : 'password');
            togglePasswordBtn.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
            // Swap icon
            togglePasswordIcon.classList.toggle('fa-eye');
            togglePasswordIcon.classList.toggle('fa-eye-slash');
        });
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
