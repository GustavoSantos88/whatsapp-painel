function dashboardPage() {

    return `
        <h1>Dashboard</h1>

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
        </div>
    `
}

async function loadDashboardData() {

    try {

        const res = await axios.get(CONFIG.API_URL + "/dashboard/metrics")

        console.log("Resposta API:", res.data)

        if (!res.data.success) {
            throw new Error("Erro na API")
        }

        const data = res.data.data  // AQUI ESTÁ A CORREÇÃO

        document.getElementById("dashboardLoading").style.display = "none"
        document.getElementById("dashboardGrid").style.display = "grid"

        document.getElementById("totalSessions").innerText =
            data.sessions?.total ?? 0

        document.getElementById("connectedSessions").innerText =
            data.sessions?.connected ?? 0

        document.getElementById("totalMessages").innerText =
            data.messages?.total ?? 0

        document.getElementById("sentMessages").innerText =
            data.messages?.sent ?? 0

        document.getElementById("receivedMessages").innerText =
            data.messages?.received ?? 0

        document.getElementById("userPlan").innerText =
            data.plan ?? "-"

    } catch (err) {

        document.getElementById("dashboardLoading").innerText =
            "Erro ao carregar métricas"

        console.log("Erro dashboard:", err)
    }
}

