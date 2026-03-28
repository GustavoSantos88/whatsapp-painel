function loadPage(page) {

    checkAuth()

    const role = localStorage.getItem("role")

    if (role === "admin") {
        document.getElementById("adminBtn").style.display = "block"
    }

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

}
