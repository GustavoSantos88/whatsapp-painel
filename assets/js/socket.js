// garante variável global
window.socket = null

function initSocket() {

    // evita reconectar várias vezes
    if (window.socket) return

    window.socket = io(CONFIG.SOCKET_URL)

    window.socket.on("connect", () => {

        console.log("Socket conectado")

        const userId = localStorage.getItem("userId")

        if (userId) {
            window.socket.emit("join", userId)
        }

    })

    window.socket.on("session_ready", data => {

        alert("Sessão conectada: " + data.sessionId)

    })

}

document.addEventListener("DOMContentLoaded", () => {

    if (localStorage.getItem("token")) {
        initSocket()
    }

})