// sessions.js

if (!window.qrCache) window.qrCache = {};

function setupSocketListeners() {
    const socket = window.socket;
    if (!socket) {
        setTimeout(setupSocketListeners, 1000);
        return;
    }

    socket.off("qr_code");
    socket.on("qr_code", ({ sessionId, qrImageBase64 }) => {
        console.log("📥 [SOCKET] QR Recebido:", sessionId);
        window.qrCache[sessionId] = qrImageBase64;
        const card = document.getElementById(`session_${sessionId}`);
        if (card) renderQRCode(card, qrImageBase64);
    });

    socket.off("session_status_update");
    socket.on("session_status_update", (data) => {
        updateSessionStatus(data.sessionId, data.status);
    });
}

function sessionsPage() {
    setupSocketListeners();
    return `
        <h1>Conexões WhatsApp</h1>

        <div class="sessions-view">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px;">
               
                <button class="primary-btn" onclick="createSession()" style="margin-bottom:0; background: #25d366;">
                    + Nova Instância
                </button>
            </div>
            <div id="sessionsLoading" style="text-align:center; padding: 60px;">
                <div class="loader-spinner" style="margin: 0 auto;"></div>
                <p style="margin-top: 15px; color: #666;">Carregando sessões...</p>
            </div>
            <div id="sessionsList" class="sessions-grid" style="display:none;"></div>
        </div>
    `;
}

async function loadSessions() {
    if (window.socket && window.socket.connected) {
        const userId = localStorage.getItem("userId");
        if (userId) window.socket.emit("join", `user_${userId}`);
    }

    const loading = document.getElementById("sessionsLoading");
    const list = document.getElementById("sessionsList");
    if (!loading || !list) return;

    try {
        const res = await axios.get(`${CONFIG.API_URL}/sessions`);
        const sessions = res.data.data || [];

        loading.style.display = "none";
        list.style.display = "grid";
        list.innerHTML = sessions.length ? sessions.map(s => renderSessionCard(s)).join("") : "<p>Nenhuma conexão ativa.</p>";

        sessions.forEach(session => {
            const sid = session.session_id;
            const qr = window.qrCache[sid] || session.last_qr;
            if (qr && session.status !== 'connected') {
                renderQRCode(document.getElementById(`session_${sid}`), qr);
            } else if (session.status === "connecting") {
                window.socket.emit("request_session_qr", { sessionId: sid });
            }
        });
    } catch (err) { console.error(err); }
}

function renderSessionCard(session) {
    const isConnecting = session.status === "connecting" || session.status === "pending";
    const isConnected = session.status === "connected";
    const statusClass = isConnected ? "green" : isConnecting ? "orange" : "red";

    return `
        <div class="card session-card" id="session_${session.session_id}">
            <div class="session-header">
                <div style="display: flex; flex-direction: column;">
                    <span style="font-weight: 700; color: #111827;">WhatsApp Web</span>
                    <small style="color: #6b7280;">ID: ${session.session_id.substring(0, 8)}</small>
                </div>
                <span class="status ${statusClass}">${session.status}</span>
            </div>

            <div class="qr-container">
                ${isConnected ?
            '<div style="text-align:center;"><span style="font-size: 50px;">✅</span><p style="color:#059669; font-weight:bold; margin-top:10px;">Conectado</p></div>' :
            isConnecting ?
                '<div class="loader-spinner"></div><p style="margin-top:15px; font-size: 13px; color: #4b5563;">Gerando QR Code...</p>' :
                '<p style="color: #9ca3af;">Desconectado</p>'
        }
            </div>

            <div class="session-actions" style="margin-top:20px; display:flex; gap:10px;">
                ${!isConnected ? `
                    <button class="primary-btn" style="flex: 2; margin-bottom: 0; background:#25d366;" 
                            onclick="window.socket.emit('request_session_qr', {sessionId:'${session.session_id}'})">
                        🔄 Atualizar
                    </button>
                ` : ''}
                <button class="danger-btn" style="flex: 1;" onclick="deleteSession('${session.session_id}')">
                    Excluir
                </button>
            </div>
        </div>
    `;
}

function renderQRCode(card, b64) {
    if (!card) return;
    const container = card.querySelector(".qr-container");
    const status = card.querySelector(".status").innerText.toLowerCase();

    if (status === "connected") return;

    if (container) {
        container.innerHTML = `
            <img src="${b64}" alt="QR Code">
            <p style="color: #6366f1; font-size: 12px; margin-top: 10px; font-weight: 600;">Escaneie o código no celular</p>
        `;
        container.style.border = "2px solid #6366f144";
        container.style.background = "#fff";
    }
}

function updateSessionStatus(sessionId, status) {
    const card = document.getElementById(`session_${sessionId}`);
    if (!card) return;

    const span = card.querySelector(".status");
    const container = card.querySelector(".qr-container");
    const actions = card.querySelector(".session-actions");

    if (span) {
        span.innerText = status;
        span.className = `status ${status === 'connected' ? 'green' : 'orange'}`;
    }

    if (status === "connected") {
        if (container) {
            container.innerHTML = '<div style="text-align:center;"><span style="font-size: 50px;">✅</span><p style="color:#059669; font-weight:bold; margin-top:10px;">Conectado</p></div>';
            container.style.background = "#f0fdf4";
            container.style.border = "1px solid #bbf7d0";
        }
        if (actions) {
            const refreshBtn = actions.querySelector(".primary-btn");
            if (refreshBtn) refreshBtn.remove();
        }
        delete window.qrCache[sessionId];
    }
}

async function createSession() {
    const btn = event.currentTarget;
    try {
        btn.disabled = true;
        btn.innerText = "Criando...";
        const res = await axios.post(`${CONFIG.API_URL}/sessions/connect`, {});
        if (res.data.success) await loadSessions();
    } catch (err) {
        alert("Erro ao criar. Verifique o limite de sessões.");
    } finally {
        btn.disabled = false;
        btn.innerText = "+ Nova Instância";
    }
}

async function deleteSession(id) {
    if (!confirm("Remover esta conexão?")) return;
    try {
        await axios.delete(`${CONFIG.API_URL}/sessions/${id}`);
        delete window.qrCache[id];
        loadSessions();
    } catch (err) { alert("Erro ao deletar."); }
}
