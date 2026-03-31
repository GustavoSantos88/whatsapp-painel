/* =========================
   PAGE
========================= */
function webhooksPage() {
    return `
        <h1>Webhooks</h1>
        <button class="primary-btn" onclick="createWebhook()">
            + Criar Webhook
        </button>
        <div id="webhooksLoading">Carregando webhooks...</div>
        <div id="webhooksList" class="sessions-grid" style="display:none;"></div>
    `
}

/* =========================
   LOAD WEBHOOKS
========================= */
async function loadWebhooks() {
    console.log("loadWebhooks iniciado")
    const loading = document.getElementById("webhooksLoading")
    const list = document.getElementById("webhooksList")

    if (!loading || !list) return

    try {
        // Busca a lista de webhooks
        const res = await axios.get(CONFIG.SOCKET_URL + "/webhookEndpoints")
        console.log("API webhooks:", res.data)

        const webhooks = res.data || []
        loading.style.display = "none"
        list.style.display = "grid"

        if (webhooks.length === 0) {
            list.innerHTML = "<p>Nenhum webhook cadastrado.</p>"
            return
        }

        list.innerHTML = webhooks
            .map(renderWebhookCard)
            .join("")

    } catch (err) {
        console.error(err)
        loading.innerText = "Erro ao carregar webhooks"
    }
}

/* =========================
   CARD
========================= */
function renderWebhookCard(webhook) {
    return `
        <div class="card session-card">
            <div class="session-header">
                <h3>Webhook #${webhook.id}</h3>
            </div>
            <p><strong>Session:</strong> ${webhook.session_id}</p>
            <p><strong>Evento:</strong> ${webhook.event_type}</p>
            <p><strong>URL:</strong><br><small>${webhook.url}</small></p>
            <div class="session-actions">
                <button class="danger-btn" onclick="deleteWebhook('${webhook.id}')">
                    Excluir
                </button>
            </div>
        </div>
    `
}

/* =========================
   CREATE
========================= */
async function createWebhook() {
    // Ajustado para os campos que seu Back-end espera
    const sessionId = prompt("ID da Sessão (Session ID)")
    if (!sessionId) return

    const url = prompt("URL do Webhook (Ex: https://seu-site.com)")
    if (!url) return

    const eventType = "message.received" // Você pode mudar para prompt se quiser escolher o evento

    try {
        const res = await axios.post(
            CONFIG.SOCKET_URL + "/webhookEndpoints",
            {
                session_id: sessionId,
                url: url,
                event_type: eventType
            }
        )

        // Verificamos se retornou o objeto com ID (sucesso no seu back-end)
        if (res.data && res.data.id) {
            alert("Webhook criado com sucesso")
            loadWebhooks()
        } else {
            throw new Error("Resposta inválida do servidor")
        }

    } catch (err) {
        console.error("Erro ao criar:", err.response?.data || err)
        alert("Erro ao criar webhook: " + (err.response?.data?.error || "Verifique o console"))
    }
}

/* =========================
   DELETE
========================= */
async function deleteWebhook(id) {
    if (!confirm(`Deseja realmente excluir o webhook #${id}?`))
        return

    try {
        // Chama a rota DELETE /webhookEndpoints/:id que criamos
        await axios.delete(CONFIG.SOCKET_URL + "/webhookEndpoints/" + id)

        alert("Webhook excluído!")
        loadWebhooks()

    } catch (err) {
        console.error("Erro ao excluir:", err)
        alert("Erro ao excluir webhook")
    }
}
