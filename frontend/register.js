document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('register-form');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const notification = document.getElementById('notification');

    const showNotification = (message, isError = false) => {
        notification.textContent = message;
        notification.style.backgroundColor = isError ? '#e74c3c' : '#4c2a85';
        notification.classList.add('show');
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    };

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = usernameInput.value;
        const password = passwordInput.value;

        if (password.length < 6) {
            showNotification('パスワードは6文字以上で入力してください。', true);
            return;
        }

        try {
            const res = await fetch(`${API_BASE_URL}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || '登録に失敗しました。');
            }

            showNotification('登録が成功しました。ログインページに移動します。');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);

        } catch (err) {
            showNotification(err.message, true);
        }
    });
});
