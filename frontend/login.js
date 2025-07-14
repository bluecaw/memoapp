document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
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

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = usernameInput.value;
        const password = passwordInput.value;

        try {
            const res = await fetch('https://memoapp-backend.onrender.com', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'ログインに失敗しました。');
            }

            localStorage.setItem('token', data.accessToken);
            window.location.href = 'index.html'; // メインページにリダイレクト

        } catch (err) {
            showNotification(err.message, true);
        }
    });
});
