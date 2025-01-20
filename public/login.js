document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const submitButton = loginForm.querySelector('button[type="submit"]');

    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            submitButton.disabled = true;
            submitButton.innerHTML = '<div class="loading"></div>';

            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || '登录失败');
            }

            // 登录成功，跳转到管理页面
            window.location.href = '/admin.html';

        } catch (error) {
            console.error('Login failed:', error);
            alert(error.message || '登录失败，请重试');
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = '登录';
        }
    });
}); 