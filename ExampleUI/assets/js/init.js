function initAuthForms() {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('login-username').value;
            const password = document.getElementById('login-password').value;
            
            try {
                await auth.login(username, password);
                window.location.href = 'dashboard.html';
            } catch (error) {
                console.error('Login error:', error);
                document.getElementById('login-message').textContent = `Login failed: ${error.message}`;
                document.getElementById('login-message').className = 'message error';
            }
        });
    }
    
    if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const usernameInput = document.getElementById('register-username');
        const passwordInput = document.getElementById('register-password');
        const confirmPasswordInput = document.getElementById('register-password-confirm');
        
        if (!usernameInput || !passwordInput || !confirmPasswordInput) {
            document.getElementById('register-message').textContent = 'Form fields not found';
            document.getElementById('register-message').className = 'message error';
            return;
        }
        
        const username = usernameInput.value || '';
        const password = passwordInput.value || '';
        const confirmPassword = confirmPasswordInput.value || '';
        
        if (password !== confirmPassword) {
            document.getElementById('register-message').textContent = 'Passwords do not match';
            document.getElementById('register-message').className = 'message error';
            return;
        }
        
        try {
            await auth.register(username, password, confirmPassword);
                document.getElementById('register-message').textContent = 'Registration successful! You can now log in.';
                document.getElementById('register-message').className = 'message success';
                
                document.querySelector('.tab[data-tab="login"]').click();
                
                document.getElementById('login-username').value = username;
            } catch (error) {
                console.error('Registration error:', error);
                document.getElementById('register-message').textContent = `Registration failed: ${error.message}`;
                document.getElementById('register-message').className = 'message error';
            }
        });
    }
}

function showError(message) {
    const infoDiv = document.getElementById('blockchain-info');
    if (infoDiv) {
        infoDiv.innerHTML = `<div class="error-message">${message}</div>`;
    }
}