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
                <h3>Webhook ${webhook.id}</h3>
            </div>

            <p><strong>Session:</strong> ${webhook.session_id}</p>

            <p><strong>Evento:</strong> ${webhook.event_type}</p>

            <p><strong>URL:</strong><br>${webhook.url}</p>

            <div class="session-actions">

                <button onclick="deleteWebhook('${webhook.id}')">
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

    const name = prompt("Nome do webhook")
    if (!name) return

    const url = prompt("URL do webhook")
    if (!url) return

    try {

        const res = await axios.post(
            CONFIG.SOCKET_URL + "/webhookEndpoints",
            { name, url }
        )

        if (!res.data.success) {
            throw new Error("Erro ao criar webhook")
        }

        alert("Webhook criado com sucesso")

        loadWebhooks()

    } catch (err) {

        console.error(err.response?.data || err)

        alert("Erro ao criar webhook")

    }

}


/* =========================
   DELETE
========================= */

async function deleteWebhook(id) {

    if (!confirm("Deseja realmente excluir este webhook?"))
        return

    try {

        await axios.delete(CONFIG.SOCKET_URL + "/webhookEndpoints/" + id)

        loadWebhooks()

    } catch (err) {

        console.error(err)

        alert("Erro ao excluir webhook")

    }

}