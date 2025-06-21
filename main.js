import { Database } from './db.js';

document.addEventListener('DOMContentLoaded', () => {
    const db = new Database();

    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const showLoginBtn = document.getElementById('show-login');
    const showRegisterBtn = document.getElementById('show-register');
    const messageDiv = document.getElementById('form-message');

    showLoginBtn.addEventListener('click', showLoginForm);
    showRegisterBtn.addEventListener('click', showRegisterForm);

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;

        const user = await db.getUser(username);

        if (user && user.password === password) {
            messageDiv.textContent = 'เข้าสู่ระบบสำเร็จ!';
            messageDiv.style.color = 'green';
            sessionStorage.setItem('currentUser', JSON.stringify(user));
            window.location.href = 'dashboard.html';
        } else {
            messageDiv.textContent = 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง';
            messageDiv.style.color = 'red';
        }
    });

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fullName = document.getElementById('reg-fullname').value;
        const age = document.getElementById('reg-age').value;
        const username = document.getElementById('reg-username').value;
        const password = document.getElementById('reg-password').value;
        
        const existingUser = await db.getUser(username);
        if (existingUser) {
            messageDiv.textContent = 'มีชื่อผู้ใช้นี้ในระบบแล้ว';
            messageDiv.style.color = 'red';
            return;
        }

        const newUser = { fullName, age: parseInt(age), username, password, profilePic: 'assets/default-profile.png' };
        await db.addUser(newUser);
        
        messageDiv.textContent = 'สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบ';
        messageDiv.style.color = 'green';
        registerForm.reset();
        showLoginForm();
    });

    function showLoginForm() {
        showLoginBtn.classList.add('active');
        showRegisterBtn.classList.remove('active');
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
        messageDiv.textContent = '';
    }

    function showRegisterForm() {
        showLoginBtn.classList.remove('active');
        showRegisterBtn.classList.add('active');
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
        messageDiv.textContent = '';
    }
}); 