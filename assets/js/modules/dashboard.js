function dashboardPage() {

    const role = localStorage.getItem("role")

    return `        
        <header class="page-header">
            <h2 class="page-title">Dashboard</h2>
            <p class="page-lead">Visão geral das sessões, mensagens e uso da conta.</p>
        </header>

        <div id="dashboardLoading">Carregando métricas...</div>

        <div class="grid" id="dashboardGrid" style="display:none;">
            <div class="card stat">
                <h3>Sessões</h3>
                <p id="totalSessions">0</p>
            </div>

            <div class="card stat">
                <h3>Conectadas</h3>
                <p id="connectedSessions">0</p>
            </div>

            ${role === 'admin' ? `
            <div class="card stat expired">
                <h3>Expirada</h3>
                <p id="expiredSessions">0</p>
            </div>
            ` : ''}

            <div class="card stat">
                <h3>Total Mensagens</h3>
                <p id="totalMessages">0</p>
            </div>

            <div class="card stat">
                <h3>Enviadas</h3>
                <p id="sentMessages">0</p>
            </div>

            <div class="card stat">
                <h3>Recebidas</h3>
                <p id="receivedMessages">0</p>
            </div>            

            <div class="card stat highlight">
                <h3>Plano</h3>
                <p id="userPlan">-</p>
            </div>

             ${role === 'admin' ? `
            <div class="card stat top5">
                <h3>Top 5 Usuários</h3>
                <p id="userTop">-</p>
            </div>
            ` : ''}

        </div>
    `
}

async function loadDashboardData() {

    try {
        const role = localStorage.getItem("role")

        let endpoint = "/dashboard/metrics"

        if (role === "admin") {
            endpoint = "/admin/dashboard"
        }

        const res = await axios.get(CONFIG.API_URL + endpoint)

        console.log("Resposta API:", res.data)

        if (!res.data.success) {
            throw new Error("Erro na API")
        }

        const data = res.data.data

        document.getElementById("dashboardLoading").style.display = "none"
        document.getElementById("dashboardGrid").style.display = "grid"

        document.getElementById("totalSessions").innerText =
            data.sessions?.total ?? 0

        document.getElementById("connectedSessions").innerText =
            data.sessions?.connected ?? 0

        if (role === "admin") {
            document.getElementById("expiredSessions").innerText =
                data.sessions?.expired ?? 0
        }

        document.getElementById("totalMessages").innerText =
            data.messages?.total ?? 0

        document.getElementById("sentMessages").innerText =
            data.messages?.sent ?? 0

        document.getElementById("receivedMessages").innerText =
            data.messages?.received ?? 0

        if (role === "admin") {
            document.getElementById("userPlan").innerText =
                data.users.total ?? "-"

            const userTopEl = document.getElementById("userTop")

            if (!data.topUsers || data.topUsers.length === 0) {
                userTopEl.innerHTML = "-"
                return
            }

            userTopEl.innerHTML = data.topUsers
                .map((user, index) => `<div>#${index + 1} - ID: ${user.user_id} (${user.messageCount} msgs)</div>`)
                .join("")
        } else {
            document.getElementById("userPlan").innerText =
                data.plan ?? "-"
        }

    } catch (err) {

        document.getElementById("dashboardLoading").innerText =
            "Erro ao carregar métricas"

        console.log("Erro dashboard:", err)
    }
}

