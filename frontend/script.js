document.addEventListener('DOMContentLoaded', () => {
    const memoForm = document.getElementById('memo-form');
    const memoContent = document.getElementById('memo-content');
    const memoId = document.getElementById('memo-id');
    const memoList = document.getElementById('memo-list');
    const notification = document.getElementById('notification');
    const logoutBtn = document.getElementById('logout-btn');

    const API_URL = 'http://localhost:3000/api';
    const token = localStorage.getItem('token');

    // --- 認証 ---
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    const authHeader = { 'Authorization': `Bearer ${token}` };

    // --- 通知 ---
    const showNotification = (message, isError = false) => {
        notification.textContent = message;
        notification.style.backgroundColor = isError ? 'var(--delete-color)' : 'var(--header-color)';
        notification.classList.add('show');
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    };
    
    // --- サニタイズ ---
    const sanitizeHTML = (str) => {
        return str.replace(/[&<>"']/g, (match) => {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[match];
        });
    };

    // --- API呼び出し ---
    const fetchMemos = async () => {
        try {
            const res = await fetch(`${API_URL}/memos`, { headers: authHeader });
            if (res.status === 401 || res.status === 403) {
                localStorage.removeItem('token');
                window.location.href = 'login.html';
                return;
            }
            if (!res.ok) throw new Error('メモの読み込みに失敗しました。');
            const memos = await res.json();
            renderMemos(memos);
        } catch (err) {
            showNotification(err.message, true);
        }
    };

    // --- レンダリング ---
    const renderMemos = (memos) => {
        memoList.innerHTML = '';
        memos.forEach(memo => {
            const memoItem = document.createElement('div');
            memoItem.classList.add('memo-item');
            memoItem.dataset.id = memo.id;

            const content = document.createElement('p');
            content.textContent = memo.content; // APIからはサニタイズ済み or ここでtextContentなので安全

            const actions = document.createElement('div');
            actions.classList.add('memo-actions');

            const editButton = document.createElement('button');
            editButton.classList.add('edit-btn');
            editButton.textContent = '編集';
            editButton.addEventListener('click', () => editMemo(memo));

            const deleteButton = document.createElement('button');
            deleteButton.classList.add('delete-btn');
            deleteButton.textContent = '削除';
            deleteButton.addEventListener('click', () => deleteMemo(memo.id));

            actions.appendChild(editButton);
            actions.appendChild(deleteButton);
            memoItem.appendChild(content);
            memoItem.appendChild(actions);
            memoList.appendChild(memoItem);
        });
    };

    // --- イベントリスナー ---
    memoForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const content = sanitizeHTML(memoContent.value);
        const id = memoId.value;
        
        const url = id ? `${API_URL}/memos/${id}` : `${API_URL}/memos`;
        const method = id ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method,
                headers: { ...authHeader, 'Content-Type': 'application/json' },
                body: JSON.stringify({ content }),
            });
            if (!res.ok) throw new Error('保存に失敗しました。');
            
            fetchMemos();
            memoForm.reset();
            memoId.value = '';
            showNotification(id ? 'メモを更新しました' : '新しいメモを保存しました');
        } catch (err) {
            showNotification(err.message, true);
        }
    });

    const editMemo = (memo) => {
        memoContent.value = memo.content;
        memoId.value = memo.id;
        memoContent.focus();
    };

    const deleteMemo = async (id) => {
        if (confirm('本当にこのメモを削除しますか？')) {
            try {
                const res = await fetch(`${API_URL}/memos/${id}`, {
                    method: 'DELETE',
                    headers: authHeader,
                });
                if (!res.ok) throw new Error('削除に失敗しました。');
                fetchMemos();
                showNotification('メモを削除しました。');
            } catch (err) {
                showNotification(err.message, true);
            }
        }
    };

    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('token');
        window.location.href = 'login.html';
    });

    // --- 初期化 ---
    fetchMemos();
});