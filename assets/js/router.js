function loadPage(page) {
    checkAuth()

    const role = localStorage.getItem("role")
    if (role === "user") {
        document.getElementById("dashboardBtn").style.display = "block"
        document.getElementById("sessionsBtn").style.display = "block"
        document.getElementById("messagesBtn").style.display = "block"
        document.getElementById("webhooksBtn").style.display = "block"
    }

    if (role === "admin") {
        document.getElementById("dashboardBtn").style.display = "block"
        document.getElementById("adminBtn").style.display = "block"
    }

    document.getElementById("changePasswordBtn").style.display = "block"

    // salva a página atual
    localStorage.setItem("currentPage", page)

    const content = document.getElementById("content")
    content.innerHTML = window[page + "Page"]()

    console.log("Página carregada:", page)

    /* =========================
       LOADERS
    ========================= */
    if (page === "dashboard") {
        loadDashboardData()
    }

    if (page === "sessions") {
        loadSessions()
    }

    if (page === "messages") {
        initMessagesPage()
    }

    if (page === "webhooks") {
        loadWebhooks()
    }

    if (page === "admin") {
        initAdminPage()
    }

    if (page === "changePassword") {
        initChangePasswordPage()
    }
}

// quando a página é carregada (refresh), verifica qual estava aberta
window.addEventListener("DOMContentLoaded", () => {
    const lastPage = localStorage.getItem("currentPage") || "dashboard"
    loadPage(lastPage)
})
