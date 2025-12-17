const message = document.getElementById('message');
const regMessage = document.getElementById('regMessage');

// === XỬ LÝ LOGIN ===
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        // Hiệu ứng Loading
        const btn = loginForm.querySelector('button');
        const originalText = btn.innerText;
        btn.innerText = 'Đang xử lý...';
        btn.disabled = true;

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();
            
            if (res.ok) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                window.location.href = 'dashboard.html';
            } else {
                message.innerText = data.message || "Đăng nhập thất bại";
                message.classList.remove('text-green-500');
                message.classList.add('text-red-500');
            }
        } catch (error) {
            message.innerText = "Lỗi kết nối Server!";
        } finally {
            btn.innerText = originalText;
            btn.disabled = false;
        }
    });
}

// === XỬ LÝ REGISTER ===
const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('regName').value;
        const email = document.getElementById('regEmail').value;
        const password = document.getElementById('regPassword').value;

        const btn = registerForm.querySelector('button');
        btn.innerText = 'Đang tạo...';
        btn.disabled = true;

        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password })
            });
            const data = await res.json();

            if (res.ok) {
                regMessage.classList.remove('text-red-500');
                regMessage.classList.add('text-green-500');
                regMessage.innerText = "Đăng ký thành công! Đang chuyển hướng...";
                setTimeout(() => window.location.href = 'index.html', 1500);
            } else {
                regMessage.innerText = data.message || "Đăng ký thất bại";
            }
        } catch (error) {
            regMessage.innerText = "Lỗi kết nối Server!";
        } finally {
            btn.innerText = 'Tạo tài khoản';
            btn.disabled = false;
        }
    });
}

// === XỬ LÝ GOOGLE LOGIN ===
async function handleGoogleCredentialResponse(response) {
    try {
        const res = await fetch('/api/auth/google', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: response.credential })
        });
        const data = await res.json();
        
        if (res.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            window.location.href = 'dashboard.html';
        } else {
            // Nếu có thẻ message (ở trang login) thì hiện lỗi
            if (message) message.innerText = data.message;
            console.error("Lỗi Google:", data);
        }
    } catch (error) {
        console.error("Lỗi mạng:", error);
    }
}