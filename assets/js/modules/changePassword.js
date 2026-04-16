// ============================
// PAGE: ALTERAR SENHA
// ============================

function changePasswordPage() {

    const role = localStorage.getItem("role");

    return `
        <h2 style="margin-top: 2px;">Alterar Senha</h2>

        <div class="admin-page">          

            <div class="change-password-card card" style="max-width: 400px; display: flex; flex-direction: column; gap: 10px;">
                
                <input type="${role === 'user' ? `password` : 'hidden'}" id="oldPassword" placeholder="Senha atual" class="input-field" required>
                 
                <input type="password" id="newPassword" placeholder="Nova senha" class="input-field" required>
                <input type="password" id="confirmPassword" placeholder="Confirmar nova senha" class="input-field" required>

                <div class="modal-actions" style="justify-content: flex-end;">
                    <button class="danger-btn" onclick="clearChangePasswordForm()">Cancelar</button>
                    <button class="primary-btn" onclick="submitChangePassword()">Salvar</button>
                </div>

                <p id="changePasswordMessage" style="margin-top: 5px; font-size: 0.875rem;"></p>
            </div>

        </div>
    `;
}

// ============================
// INIT
// ============================

function initChangePasswordPage() {
    const container = document.querySelector('.content');
    if (!container) {
        console.error('Container .content não encontrado');
        return;
    }
    container.innerHTML = changePasswordPage();
}

// ============================
// FORM
// ============================

function clearChangePasswordForm() {
    document.getElementById('oldPassword').value = '';
    document.getElementById('newPassword').value = '';
    document.getElementById('confirmPassword').value = '';
    document.getElementById('changePasswordMessage').innerText = '';
}

// ============================
// API
// ============================

async function submitChangePassword() {
    const oldPassword = document.getElementById('oldPassword').value.trim();
    const newPassword = document.getElementById('newPassword').value.trim();
    const confirmPassword = document.getElementById('confirmPassword').value.trim();
    const messageEl = document.getElementById('changePasswordMessage');

    const role = localStorage.getItem("role");
    const userId = localStorage.getItem("userId");

    // validação básica
    if (!newPassword || !confirmPassword || (role === 'user' && !oldPassword)) {
        messageEl.innerText = 'Preencha todos os campos';
        messageEl.style.color = '#ef4444'; // vermelho
        return;
    }

    if (newPassword !== confirmPassword) {
        messageEl.innerText = 'As senhas não coincidem';
        messageEl.style.color = '#ef4444';
        return;
    }

    try {
        let res;

        if (role === 'admin') {
            // Admin altera senha de outro usuário sem precisar da antiga
            res = await axios.post(CONFIG.API_URL + '/admin/users/change-password', {
                userId,
                newPassword
            });
        } else {
            // Usuário comum precisa informar a senha antiga
            res = await axios.post(CONFIG.API_URL + '/user/reset-password', {
                userId,
                oldPassword,
                newPassword
            });
        }

        // checa se deu sucesso
        if (res.data.success) {
            messageEl.innerText = res.data.message === 'Password has been reset successfully' ? 'Senha alterada com sucesso!' : res.data.message || 'Senha alterada com sucesso!';
            messageEl.style.color = '#10b981'; // verde
            // limpa o formulário após 1.5 segundos
            setTimeout(() => {
                clearChangePasswordForm();
            }, 1500);
        } else {
            // trata os erros do backend
            const errorMsg = res.data.error;
            if (errorMsg === 'User not found') {
                messageEl.innerText = 'Usuário não encontrado';
            } else if (errorMsg === 'Old password is incorrect') {
                messageEl.innerText = 'Senha atual incorreta';
            } else {
                messageEl.innerText = errorMsg || 'Erro ao alterar senha';
            }
            messageEl.style.color = '#ef4444';
        }

    } catch (err) {
        console.error(err);
        messageEl.innerText = 'Erro ao conectar com o servidor';
        messageEl.style.color = '#ef4444';
    }
}