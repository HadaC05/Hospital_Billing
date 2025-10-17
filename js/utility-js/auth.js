const baseApiUrl = "http://localhost/HOSPITAL_BILLING/API";

document.addEventListener("DOMContentLoaded", () => {
  // Check if user is logged in
  if (!isLoggedIn()) {
    // Redirect to login page if not on login page
    if (!window.location.pathname.includes('login.html')) {
      window.location.href = 'login.html';
    }
  } else {
    // Set up logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', logout);
    }

    // Display user info
    displayUserInfo();
  }
});

// Login function
async function login(username, password) {
  try {
    const response = await axios.post(`${baseApiUrl}/UserAPI.php`, {
      operation: 'login',
      json: JSON.stringify({
        username: username,
        password: password
      })
    });

    const data = response.data;
    console.log('Login Response:', data);

    if (data.status === 'success') {
      // Store token and user info in localStorage
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('permissions', JSON.stringify(data.permissions));

      // Redirect based on user role
      const role = data.user.role_name;
      let dashboardPath = './module/dashboard-html/';

      switch (role) {
        case 'Admin':
          dashboardPath += 'admin-dashboard.html';
          break;
        case 'Doctor':
          dashboardPath += 'doctor-dashboard.html';
          break;
        case 'Nurse':
          dashboardPath += 'nurse-dashboard.html';
          break;
        case 'Lab Technician':
          dashboardPath += 'lab-dashboard.html';
          break;
        case 'Pharmacist':
          dashboardPath += 'pharmacist-dashboard.html';
          break;
        case 'Cashier':
          // Cashier doesn't have a specific dashboard, redirect to biller dashboard
          dashboardPath += 'biller-dashboard.html';
          break;
        case 'Billing Staff':
          dashboardPath += 'biller-dashboard.html';
          break;
        case 'Therapist':
          // Therapist doesn't have a specific dashboard, redirect to receptionist dashboard
          dashboardPath += 'receptionist-dashboard.html';
          break;
        default:
          // Default fallback to admin dashboard
          dashboardPath += 'admin-dashboard.html';
          break;
      }

      console.log(`Redirecting ${role} to: ${dashboardPath}`);
      window.location.href = dashboardPath;
      return data;
    } else {
      showNotification(data.message, 'danger');
      return data;
    }
  } catch (error) {
    console.error('Login request failed:', error);
    showNotification('Login failed. Please check your credentials.', 'danger');
    return { status: 'error', message: 'Network error' };
  }
}

// Logout function
async function logout() {
  try {
    const token = localStorage.getItem('authToken');
    const response = await axios.post(`${baseApiUrl}/UserAPI.php`, {
      operation: 'logout',
      token: token
    });

    const data = response.data;
    console.log('Logout Response:', data);

    if (data.status === 'success') {
      // Clear localStorage
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      localStorage.removeItem('permissions');

      // Redirect to login page
      window.location.href = 'login.html';
      return data;
    } else {
      showNotification(data.message, 'danger');
      return data;
    }
  } catch (error) {
    console.error('Logout request failed:', error);
    showNotification('Logout failed.', 'danger');
    return { status: 'error', message: 'Network error' };
  }
}

// Check if user is logged in
function isLoggedIn() {
  return localStorage.getItem('authToken') !== null;
}

// Get current user
function getCurrentUser() {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
}

// Get user permissions
function getUserPermissions() {
  const permissions = localStorage.getItem('permissions');
  return permissions ? JSON.parse(permissions) : [];
}

// Check if user has specific permission
function hasPermission(permissionName) {
  const permissions = getUserPermissions();
  return permissions.some(p => p.name === permissionName);
}

// Display user info in the UI
function displayUserInfo() {
  const user = getCurrentUser();
  if (user) {
    const userInfoElements = document.querySelectorAll('.user-info');
    userInfoElements.forEach(element => {
      element.textContent = `${user.first_name} ${user.last_name}`;
    });

    const userRoleElements = document.querySelectorAll('.user-role');
    userRoleElements.forEach(element => {
      element.textContent = user.role_name;
    });
  }
}

// Handle login form submission
document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;

      if (!username || !password) {
        showNotification('Please enter both username and password', 'warning');
        return;
      }

      disableButton('login-btn');

      const result = await login(username, password);

      enableButton('login-btn', 'Login');
    });
  }
});