// ============================
// PAGE: ALTERAR SENHA
// ============================

function changePasswordPage() {

    const role = localStorage.getItem("role");

    return `
        <div class="admin-page">          

        <header class="page-header">
                <h2 class="page-title">Alterar senha</h2>
                <p class="page-lead">${role === 'admin'
            ? 'Defina uma nova senha para a sua conta de administrador.'
            : 'Informe a senha atual e a nova senha para continuar.'}</p>
            </header>
            
            <div class="change-password-card card" style="max-width: 400px; display: flex; flex-direction: column; gap: 10px;">
                                
                <input type="${role === 'user' ? `password` : 'hidden'}" id="oldPassword" placeholder="Senha atual" class="input-field" ${role === 'user' ? 'autocomplete="current-password"' : ''}>
                 
                <input type="password" id="newPassword" placeholder="Nova senha" class="input-field" required autocomplete="new-password">
                <input type="password" id="confirmPassword" placeholder="Confirmar nova senha" class="input-field" required autocomplete="new-password">

                <div class="modal-actions" style="justify-content: flex-end;">
                    <button class="danger-btn" onclick="clearChangePasswordForm()">Cancelar</button>
                    <button class="primary-btn" onclick="submitChangePassword()">Salvar</button>
                </div>                
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
}

// ============================
// API
// ============================

async function submitChangePassword() {
    const oldPassword = document.getElementById('oldPassword').value.trim();
    const newPassword = document.getElementById('newPassword').value.trim();
    const confirmPassword = document.getElementById('confirmPassword').value.trim();

    const role = localStorage.getItem("role");
    const userId = localStorage.getItem("userId");

    // validação básica
    if (!newPassword || !confirmPassword || (role === 'user' && !oldPassword)) {
        toast('Preencha todos os campos', 'error')
        return;
    }

    if (newPassword !== confirmPassword) {
        toast('As senhas não coincidem', 'error')
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

        let men = "";
        // checa se deu sucesso
        if (res.data.success) {
            men = res.data.message === 'Password has been reset successfully' ? 'Senha alterada com sucesso!' : res.data.message || 'Senha alterada com sucesso!';
            toast(men, 'success')
            // limpa o formulário após 1.5 segundos
            setTimeout(() => {
                clearChangePasswordForm();
            }, 1500);
        } else {
            // trata os erros do backend
            const errorMsg = res.data.error;
            if (errorMsg === 'User not found') {
                men = 'Usuário não encontrado';
            } else if (errorMsg === 'Old password is incorrect') {
                men = 'Senha atual incorreta';
            } else {
                men = messageEl.innerText = errorMsg || 'Erro ao alterar senha';
            }

            toast(men, 'error')
        }

    } catch (err) {
        console.error(err);
        toast('Erro ao conectar com o servidor.', 'error')
    }
}