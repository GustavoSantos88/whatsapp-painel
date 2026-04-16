/* =========================
   PAGE - WEBHOOKS
========================= */
function webhooksPage() {
    // Inicializa as funções após um pequeno delay para garantir que o DOM renderizou
    setTimeout(() => {
        loadWebhooks();
        loadWebhookSessions();
    }, 50);

    return `
        <h2 style="margin-top: 2px;">Gerenciar Webhooks</h2>

        <div class="webhook-form-card">
            <h3>Configurar Novo Webhook</h3>
            <div class="webhook-form-grid">
                
                <div class="form-group" style="flex: 1;">
                    <label>Sessão do WhatsApp:</label>
                    <select id="webhookSessionSelect" class="input-field">
                        <option value="">Carregando sessões...</option>
                    </select>
                </div>

                <div class="form-group" style="flex: 2;">
                    <label>URL de Destino (Endpoint):</label>
                    <input type="text" id="webhookUrlInput" placeholder="https://seu-sistema.com" class="input-field">
                </div>

                <button class="primary-btn" onclick="createWebhook()" style="margin-bottom: 0; height: 42px;">
                    + Criar Webhook
                </button>
            </div>
        </div>

        <div id="webhooksLoading" class="center" style="height: 100px;">
            <div class="loader-spinner"></div>
        </div>

        <div id="webhooksList" class="sessions-grid" style="display:none;"></div>
    `;
}

/* =========================
   LOAD SESSIONS (Regra de 1 ou Várias)
========================= */
async function loadWebhookSessions() {
    const select = document.getElementById("webhookSessionSelect");
    if (!select) return;

    try {
        const res = await axios.get(CONFIG.API_URL + "/sessions");
        const sessions = res.data.data || [];

        if (sessions.length === 0) {
            select.innerHTML = '<option value="">Nenhuma sessão ativa</option>';
            select.disabled = true;
            return;
        }

        // Popula o select
        select.innerHTML = sessions.map(s =>
            `<option value="${s.session_id}">${s.profile_name ? s.profile_name : '+' + s.phone_number}</option>`
        ).join("");

        // REGRA SOLICITADA: 
        // Se houver apenas uma sessão, seleciona e bloqueia.
        if (sessions.length === 1) {
            select.value = sessions[0].session_id;
            select.disabled = true;
        } else {
            select.disabled = false;
        }

    } catch (err) {
        console.error("Erro ao carregar sessões:", err);
        select.innerHTML = '<option value="">Erro ao carregar sessões</option>';
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
            list.innerHTML = "<div class='card' style='grid-column: 1/-1; text-align: center; color: var(--text-muted);'>Nenhum webhook configurado para sua conta.</div>";
            return;
        }

        list.innerHTML = webhooks.map(renderWebhookCard).join("");
    } catch (err) {
        loading.innerHTML = "<p style='color:red;'>Erro ao carregar lista de webhooks.</p>";
    }
}

function renderWebhookCard(webhook) {
    return `
        <div class="card session-card" style="min-height: auto; padding: 20px;">
            <div class="session-header">
                <h3 style="margin:0;">Webhook #${webhook.id}</h3>
                <span class="status green">Ativo</span>
            </div>
            <div style="margin: 15px 0;">
                <p style="margin: 5px 0;"><strong>Sessão:</strong> ${webhook.session_id}</p>
                <p style="margin: 5px 0;"><strong>Evento:</strong> <code>${webhook.event_type}</code></p>
                <p style="margin: 5px 0;"><strong>URL Destino:</strong></p>
                <span class="webhook-card-url">${webhook.url}</span>
            </div>
            <div class="session-actions" style="margin-top: 10px;">
                <button class="danger-btn" onclick="deleteWebhook('${webhook.id}')" style="width: 100%;">
                    Remover Webhook
                </button>
            </div>
        </div>
    `;
}

/* =========================
   CREATE & DELETE
========================= */
async function createWebhook() {
    const select = document.getElementById("webhookSessionSelect");
    const urlInput = document.getElementById("webhookUrlInput");

    const sessionId = select.value;
    const url = urlInput.value;

    if (!sessionId || !url) {
        alert("Preencha a URL e certifique-se de que há uma sessão selecionada.");
        return;
    }

    try {
        const res = await axios.post(CONFIG.SOCKET_URL + "/webhookEndpoints", {
            session_id: sessionId,
            url: url,
            event_type: "message.received"
        });

        if (res.data && res.data.id) {
            alert("Webhook criado com sucesso!");
            urlInput.value = "";
            loadWebhooks();
        }
    } catch (err) {
        alert("Erro: " + (err.response?.data?.error || "Falha na conexão"));
    }
}

async function deleteWebhook(id) {
    if (!confirm(`Deseja realmente remover o Webhook #${id}?`)) return;
    try {
        await axios.delete(CONFIG.SOCKET_URL + "/webhookEndpoints/" + id);
        loadWebhooks();
    } catch (err) {
        alert("Erro ao excluir webhook.");
    }
}
