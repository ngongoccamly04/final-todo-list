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
            message.style.color = 'green';
            message.innerText = "Đăng ký thành công! Chuyển hướng...";
            setTimeout(() => window.location.href = 'index.html', 1500);
        } else {
            message.style.color = 'red';
            message.innerText = data.message;
        }
    } catch (error) { message.innerText = "Lỗi kết nối!"; }
});