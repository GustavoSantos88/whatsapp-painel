/* =========================
   PAGE - WEBHOOKS
========================= */
function webhooksPage() {
    // Adicionei o Select de Sessão e o Input de URL diretamente no topo da página
    return `
        <h1>Gerenciar Webhooks</h1>

        <div class="card" style="margin-bottom: 20px; padding: 20px; background: #f9f9f9; border: 1px solid #ddd;">
            <h3>Configurar Novo Webhook</h3>
            <div style="display: flex; gap: 15px; flex-wrap: wrap; align-items: flex-end; margin-top: 15px;">
                
                <div style="flex: 1; min-width: 200px;">
                    <label style="display:block; margin-bottom:5px; font-weight:bold;">Sessão:</label>
                    <select id="webhookSessionSelect" class="input-field" style="width:100%; padding:8px;"></select>
                </div>

                <div style="flex: 2; min-width: 250px;">
                    <label style="display:block; margin-bottom:5px; font-weight:bold;">URL de Destino:</label>
                    <input type="text" id="webhookUrlInput" placeholder="https://seu-sistema.com" class="input-field" style="width:100%; padding:8px;">
                </div>

                <button class="primary-btn" onclick="createWebhook()" style="height: 40px;">
                    + Criar Webhook
                </button>
            </div>
        </div>

        <div id="webhooksLoading">Carregando webhooks ativos...</div>
        <div id="webhooksList" class="sessions-grid" style="display:none;"></div>
    `;
}

/* =========================
   LOAD SESSIONS (Para o Select)
========================= */
async function loadWebhookSessions() {
    const select = document.getElementById("webhookSessionSelect");
    if (!select) return;

    try {
        // Busca as sessões da mesma forma que na sua outra página
        const res = await axios.get(CONFIG.API_URL + "/sessions");
        const sessions = res.data.data || [];

        if (sessions.length === 0) {
            select.innerHTML = '<option value="">Nenhuma sessão encontrada</option>';
            select.disabled = true;
            return;
        }

        // Popula o select
        select.innerHTML = sessions.map(s =>
            `<option value="${s.session_id}">${s.session_id}</option>`
        ).join("");

        // REGRA: Se tiver apenas 1 sessão, seleciona e bloqueia. Se tiver mais, libera.
        if (sessions.length === 1) {
            select.value = sessions[0].session_id;
            select.disabled = true; // Bloqueado pois só tem uma opção
            select.style.backgroundColor = "#eee";
        } else {
            select.disabled = false;
            select.style.backgroundColor = "#fff";
        }

    } catch (err) {
        console.error("Erro ao carregar sessões no webhook:", err);
        select.innerHTML = '<option value="">Erro ao carregar</option>';
    }
}

/* =========================
   CREATE WEBHOOK
========================= */
async function createWebhook() {
    const sessionId = document.getElementById("webhookSessionSelect").value;
    const url = document.getElementById("webhookUrlInput").value;

    if (!sessionId || !url) {
        alert("Por favor, selecione uma sessão e informe a URL.");
        return;
    }

    try {
        const res = await axios.post(
            CONFIG.SOCKET_URL + "/webhookEndpoints",
            {
                session_id: sessionId,
                url: url,
                event_type: "message.received" // Evento padrão
            }
        );

        if (res.data && res.data.id) {
            alert("Webhook cadastrado com sucesso!");
            document.getElementById("webhookUrlInput").value = ""; // Limpa campo URL
            loadWebhooks(); // Recarrega a lista abaixo
        }

    } catch (err) {
        console.error(err.response?.data || err);
        alert("Erro ao criar: " + (err.response?.data?.error || "Verifique o console"));
    }
}

/* =========================
   LOAD LIST (LISTA EXISTENTE)
========================= */
async function loadWebhooks() {
    const loading = document.getElementById("webhooksLoading");
    const list = document.getElementById("webhooksList");
    if (!loading || !list) return;

    try {
        const res = await axios.get(CONFIG.SOCKET_URL + "/webhookEndpoints");
        const webhooks = res.data || [];

        loading.style.display = "none";
        list.style.display = "grid";

        if (webhooks.length === 0) {
            list.innerHTML = "<p>Nenhum webhook cadastrado ainda.</p>";
            return;
        }

        list.innerHTML = webhooks.map(renderWebhookCard).join("");
    } catch (err) {
        loading.innerText = "Erro ao carregar lista de webhooks.";
    }
}

function renderWebhookCard(webhook) {
    return `
        <div class="card session-card">
            <div class="session-header">
                <h3>Webhook #${webhook.id}</h3>
            </div>
            <p><strong>Session:</strong> ${webhook.session_id}</p>
            <p><strong>URL:</strong><br><small style="word-break: break-all;">${webhook.url}</small></p>
            <div class="session-actions">
                <button class="danger-btn" onclick="deleteWebhook('${webhook.id}')">Excluir</button>
            </div>
        </div>
    `;
}

async function deleteWebhook(id) {
    if (!confirm(`Excluir webhook #${id}?`)) return;
    try {
        await axios.delete(CONFIG.SOCKET_URL + "/webhookEndpoints/" + id);
        loadWebhooks();
    } catch (err) {
        alert("Erro ao excluir");
    }
}
