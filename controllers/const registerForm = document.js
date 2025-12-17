const registerForm = document.getElementById('registerForm');
const message = document.getElementById('regMessage');

registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;

    try {
        const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });

        const data = await res.json();

        if (res.ok) {
            // Đăng ký thành công
            message.style.color = 'green';
            message.innerText = "Đăng ký thành công! Đang chuyển trang...";
            
            // Chờ 1.5 giây rồi chuyển về trang đăng nhập
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
        } else {
            // Lỗi (Email trùng, thiếu thông tin...)
            message.style.color = 'red';
            message.innerText = data.message;
        }

    } catch (error) {
        console.error(error);
        message.style.color = 'red';
        message.innerText = "Lỗi kết nối server!";
    }
});