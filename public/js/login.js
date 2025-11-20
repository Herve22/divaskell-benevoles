// Basculer entre les onglets Login/Register
function switchTab(tab) {
  const loginPanel = document.getElementById('loginPanel');
  const registerPanel = document.getElementById('registerPanel');
  const tabs = document.querySelectorAll('.tab-btn');

  if (tab === 'login') {
    loginPanel.classList.add('active');
    registerPanel.classList.remove('active');
    tabs[0].classList.add('active');
    tabs[1].classList.remove('active');
    
    // Clear messages
    document.getElementById('message').textContent = '';
    document.getElementById('register-message').textContent = '';
  } else {
    registerPanel.classList.add('active');
    loginPanel.classList.remove('active');
    tabs[1].classList.add('active');
    tabs[0].classList.remove('active');
    
    // Clear messages
    document.getElementById('message').textContent = '';
    document.getElementById('register-message').textContent = '';
  }
}

// Toggle password visibility
function togglePassword(inputId, icon) {
  const input = document.getElementById(inputId);
  if (input.type === 'password') {
    input.type = 'text';
    icon.classList.remove('bi-eye');
    icon.classList.add('bi-eye-slash');
  } else {
    input.type = 'password';
    icon.classList.remove('bi-eye-slash');
    icon.classList.add('bi-eye');
  }
}
