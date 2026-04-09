function login() {
    const email = document.getElementById('email').value
    const password = document.getElementById('password').value

    axios.post(CONFIG.API_URL + "/user/login", { email, password })
        .then(res => {

            if (!res.data.success) {
                alert("Login inválido")
                return
            }

            const userData = res.data.data

            localStorage.setItem("token", userData.role === 'user' ? userData.token : 'A3f5j72f9lkh7')
            localStorage.setItem("role", userData.role)
            localStorage.setItem("userId", userData.id)
            localStorage.setItem("plan", userData.plan)
            localStorage.setItem("name", userData.name)

            window.location.href = "app.html"
        })
        .catch(err => {
            const errorMsg = err.response?.data?.error

            if (err.response?.status === 403) {
                alert(errorMsg || "Seu acesso expirou")
                return
            }

            if (err.response?.status === 401) {
                alert("Email ou senha inválidos")
                return
            }

            console.log(err.response?.data)
            alert(errorMsg || "Erro ao fazer login")
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
    const email = document.getElementById("email");
    const senha = document.getElementById("password");

    // Só continua se os elementos existirem
    if (!email || !senha) {
        // Não está na página de login, ignora
        return;
    }

    // Verifica se o email está preenchido e válido
    if (!email.value) {
        alert("Por favor, preencha o email.");
        email.focus();
        return;
    } else if (!email.checkValidity()) {
        alert("Digite um email válido.");
        email.focus();
        return;
    }

    // Verifica se a senha está preenchida
    if (!senha.value) {
        alert("Por favor, preencha a senha.");
        senha.focus();
        return;
    }

    // Se tudo estiver correto, chama login()
    login();
}
