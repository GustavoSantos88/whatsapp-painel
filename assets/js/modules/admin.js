// ============================
// STATE
// ============================

let usersCache = []

// ============================
// PAGE
// ============================

function adminPage() {
    return `
        <div class="admin-page">

            <header class="page-header admin-header">
                <div>
                    <h2 class="page-title">Administração</h2>
                    <p class="page-lead">Usuários, planos e permissões do painel.</p>
                </div>
                <button type="button" class="primary-btn" style="margin-bottom:0;" onclick="openUserModal()">+ Novo usuário</button>
            </header>

            <input 
                type="text" 
                placeholder="Buscar usuário..." 
                class="search-input"
                oninput="filterUsers(this.value)"
            />

            <div class="table-wrapper">
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Nome</th>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Plano</th>
                            <th>Status</th>
                            <th>Criado</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody id="usersTable"></tbody>
                </table>
            </div>

            <!-- MODAL -->
            <div id="userModal" class="modal hidden">
                <div class="modal-content">
                    <h2 id="modalTitle">Novo Usuário</h2>

                    <input type="hidden" id="userId">

                    <input type="text" id="userName" placeholder="Nome" autofocus required>
                    <input type="email" id="userEmail" placeholder="Email" required>

                    <select id="userRole" class="input-field" required>
                        <option value="">Selecione o role</option>
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                    </select>

                    <select id="userPlan" class="input-field" required>
                        <option value="">Selecione o plano</option>
                        <option value="free">Free (1 instância)</option>
                        <option value="pro">Pro (5 instâncias)</option>
                        <option value="enterprise">Enterprise (ilimitado)</option>
                    </select>

                    <select id="userStatus" class="input-field" required>
                        <option value="">Selecione o status</option>
                        <option value="active">Ativo</option>
                        <option value="inactive">Inativo</option>
                    </select>

                    <div class="modal-actions">
                        <button class="danger-btn" onclick="closeUserModal()">Cancelar</button>
                        <button class="primary-btn" onclick="saveUser()">Salvar</button>
                    </div>
                </div>
            </div>

        </div>
    `
}

// ============================
// INIT
// ============================

function initAdminPage() {
    const container = document.querySelector('.app-content')

    if (!container) {
        console.error('Container .app-content não encontrado')
        return
    }

    container.innerHTML = adminPage()
    loadUsers()
}

// ============================
// API
// ============================

async function loadUsers() {
    try {
        const res = await axios.get(CONFIG.API_URL + "/admin/users")

        usersCache = res.data?.data || []

        renderUsers(usersCache)

    } catch (err) {
        console.error('Erro ao carregar usuários', err)
    }
}

// ============================
// RENDER
// ============================
function formatDate(date) {
    if (!date) return "-"

    return new Date(date).toLocaleString("pt-BR", {
        timeZone: "America/Sao_Paulo",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    })
}

function isOlderThan24h(date) {
    if (!date) return false

    const diff = Date.now() - new Date(date).getTime()
    return diff > 24 * 60 * 60 * 1000
}

function renderUsers(users) {
    const table = document.getElementById('usersTable')

    if (!table) return

    if (!users || !users.length) {
        table.innerHTML = `<tr><td colspan="7">Nenhum usuário</td></tr>`
        return
    }

    table.innerHTML = users.map(user =>
        `
        <tr style="${isOlderThan24h(user.createdAt) && user.plan === 'free' ? 'color: red;' : ''}">
            <td>${user.id}</td>
            <td>${user.name}</td>
            <td>${user.email}</td>
            <td>${user.role}</td>
            <td>${user.plan}</td>
            <td>${user.status}</td>
           <td>
                ${formatDate(user.createdAt)}
            </td>
            <td class="actions">
                <button class="btn-edit" onclick="editUser(${user.id})">Editar</button>
                <button class="btn-delete" onclick="deleteUser(${user.id})">Excluir</button>
            </td>
        </tr>
    `).join('')
}

// ============================
// FILTER
// ============================

function filterUsers(search) {
    const filtered = usersCache.filter(u =>
        (u.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (u.email || '').toLowerCase().includes(search.toLowerCase())
    )

    renderUsers(filtered)
}

// ============================
// MODAL
// ============================

function openUserModal(user = null) {
    document.getElementById('userModal').classList.remove('hidden')

    if (user) {
        document.getElementById('modalTitle').innerText = 'Editar Usuário'

        document.getElementById('userId').value = user.id
        document.getElementById('userName').value = user.name
        document.getElementById('userEmail').value = user.email
        document.getElementById('userRole').value = user.role || ''
        document.getElementById('userPlan').value = user.plan || ''
        document.getElementById('userStatus').value = user.status || ''

    } else {
        document.getElementById('modalTitle').innerText = 'Novo Usuário'

        document.getElementById('userId').value = ''
        document.getElementById('userName').value = ''
        document.getElementById('userEmail').value = ''
        document.getElementById('userRole').value = ''
        document.getElementById('userPlan').value = ''
        document.getElementById('userStatus').value = ''
    }
}

function closeUserModal() {
    document.getElementById('userModal').classList.add('hidden')
}

function editUser(id) {
    const user = usersCache.find(u => u.id === id)
    openUserModal(user)
}

// ============================
// CRUD
// ============================

async function saveUser() {
    const id = document.getElementById('userId').value
    const name = document.getElementById('userName').value.trim()
    const email = document.getElementById('userEmail').value.trim()
    const role = document.getElementById('userRole').value
    const plan = document.getElementById('userPlan').value
    const status = document.getElementById('userStatus').value
    const password = "123456";

    if (!name || !email || !role || !plan || !status) {
        alert('Preencha todos os campos')
        return
    }

    if (!email.includes('@')) {
        alert('Email inválido')
        return
    }

    try {
        const payload = { name, email, password, role, plan, status }

        if (id) {
            await axios.put(CONFIG.API_URL + `/admin/users/${id}`, payload)
        } else {
            await axios.post(CONFIG.API_URL + `/admin/users`, payload)
        }

        closeUserModal()
        loadUsers()

    } catch (err) {
        console.error('Erro ao salvar', err)
    }
}

async function deleteUser(id) {
    if (!confirm('Tem certeza que deseja excluir?')) return

    try {
        await axios.delete(CONFIG.API_URL + `/admin/users/${id}`)
        loadUsers()
    } catch (err) {
        console.error('Erro ao deletar', err)
    }
}