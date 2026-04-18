function login() {
    const email = document.getElementById('email').value
    const password = document.getElementById('password').value

    axios.post(CONFIG.API_URL + "/user/login", { email, password })
        .then(res => {

            if (!res.data.success) {
                toast('Login inválido', 'error')
                return
            }

            const userData = res.data.data

            if (!userData.token) {
                toast('Resposta de login inválida: token ausente.', 'error')
                return
            }

            localStorage.setItem("token", userData.role === 'user' ? userData.token : 'A3f5j72f9lkh7')
            localStorage.setItem("role", userData.role)
            localStorage.setItem("userId", userData.id)
            localStorage.setItem("plan", userData.plan)
            localStorage.setItem("name", userData.name)

            window.location.href = "app.html"
        })
        .catch((err) => {
            const errorMsg = err.response?.data?.error

            if (err.response?.status === 403) {
                toast(errorMsg || 'Seu acesso expirou', 'error')
                return
            }

            if (err.response?.status === 401) {
                toast('Email ou senha inválidos', 'error')
                return
            }

            toast(errorMsg || 'Erro ao fazer login', 'error')
        })
}

function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("userId");
    localStorage.removeItem("plan");
    localStorage.removeItem("name");
    localStorage.removeItem("currentPage");

    // NÃO remove o theme
    window.location.href = "index.html";
}


function checkAuth() {
    const token = localStorage.getItem("token")
    if (!token) window.location.href = "index.html"
}

function toggleTheme() {
    const body = document.body
    const current = body.classList.contains("dark") ? "dark" : "light"

    body.classList.remove(current)
    body.classList.add(current === "dark" ? "light" : "dark")

    localStorage.setItem("theme", body.classList.contains("dark") ? "dark" : "light")
}

document.addEventListener("DOMContentLoaded", () => {
    const saved = localStorage.getItem("theme")
    if (saved) {
        document.body.classList.remove("light", "dark")
        document.body.classList.add(saved)
    }
})

// Captura o evento de Enter apenas se estivermos na página de login
document.addEventListener("DOMContentLoaded", function () {
    const email = document.getElementById("email");
    const senha = document.getElementById("password");

    if (email && senha) {
        document.addEventListener("keydown", function (event) {
            if (event.key === "Enter") {
                validarCampos();
            }
        });
    }
});

function validarCampos() {
    const email = document.getElementById('email')
    const senha = document.getElementById('password')

    if (!email || !senha) {
        return
    }

    if (!email.value) {
        toast('Por favor, preencha o email.', 'error')
        email.focus()
        return
    }
    if (!email.checkValidity()) {
        toast('Digite um email válido.', 'error')
        email.focus()
        return
    }

    if (!senha.value) {
        toast('Por favor, preencha a senha.', 'error')
        senha.focus()
        return
    }

    login()
}

axios.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            const onLoginPage = document.getElementById('email')
            if (!onLoginPage) {
                logout()
            }
        }
        return Promise.reject(error)
    },
)

