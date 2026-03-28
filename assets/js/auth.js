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

            localStorage.setItem("token", userData.token)
            localStorage.setItem("role", userData.role)
            localStorage.setItem("userId", userData.id)
            localStorage.setItem("plan", userData.plan)
            localStorage.setItem("name", userData.name)

            window.location.href = "app.html"
        })
        .catch(err => {
            console.log(err.response?.data)
            alert("Erro ao fazer login")
        })
}

function logout() {
    localStorage.clear()
    window.location.href = "index.html"
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