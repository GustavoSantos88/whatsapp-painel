// ==============================
// SOCKET GLOBAL
// ==============================
if (!window.socket) {

    window.socket = io(CONFIG.SOCKET_URL, {
        transports: ["websocket"],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 2000
    });

}

window.socket.on("connect", () => {
    console.log("✅ Socket conectado:", window.socket.id);
});

window.socket.onAny((event, data) => {
    console.log("📡 EVENTO SOCKET:", event, data);
});


// ==============================
// CACHE
// ==============================

const pendingQRCodes = {};
const sessionCache = {};


// ==============================
// RENDER PÁGINA
// ==============================

function sessionsPage() {

    return `
        <h1>Sessões</h1>

        <button class="primary-btn" onclick="createSession()">
            + Criar Sessão
        </button>

        <div id="sessionsLoading">Carregando sessões...</div>

        <div id="sessionsList" class="sessions-grid" style="display:none;"></div>
    `;

}


// ==============================
// CARREGAR SESSÕES
// ==============================

async function loadSessions() {

    const loading = document.getElementById("sessionsLoading");
    const list = document.getElementById("sessionsList");

    if (!loading || !list) return;

    try {

        const res = await axios.get(`${CONFIG.API_URL}/sessions`);

        if (!res.data.success) {
            throw new Error(res.data.error || "Erro API");
        }

        const sessions = res.data.data || [];

        loading.style.display = "none";
        list.style.display = "grid";

        if (sessions.length === 0) {

            list.innerHTML = "<p>Nenhuma sessão criada.</p>";
            return;

        }

        sessionCache.length = 0;

        list.innerHTML = sessions
            .map(session => renderSessionCard(session))
            .join("");

        sessions.forEach(session => {

            sessionCache[session.session_id] = session;

            const qr = pendingQRCodes[session.session_id];
            if (!qr) return;

            const card = document.getElementById(`session_${session.session_id}`);

            if (card) {

                renderQRCode(card, qr);
                delete pendingQRCodes[session.session_id];

            }

        });

    } catch (err) {

        console.error("Erro ao carregar sessões:", err);
        loading.innerText = "Erro ao carregar sessões";

    }

}


// ==============================
// RENDER CARD
// ==============================

function renderSessionCard(session) {

    const statusColor =
        session.status === "connected"
            ? "green"
            : session.status === "connecting"
                ? "orange"
                : "red";

    const qrHtml = session.status === "connecting"
        ? `<div class="qr-container">
                <p>Aguardando QRCode...</p>
           </div>`
        : "";

    return `
        <div class="card session-card ${session.status === "connecting" ? "new-session" : ""}" id="session_${session.session_id}">
            
            <div class="session-header">
                <h3>${session.session_id}</h3>
                <span class="status ${statusColor}">${session.status}</span>
            </div>

            <p><strong>Webhook:</strong> ${session.webhook || "-"}</p>
            <p><strong>Tipo de Conta:</strong> ${session.is_business ? "Business" : "Pessoal"}</p>

            <div class="session-actions">
                <button onclick="deleteSession('${session.session_id}')">
                    Excluir
                </button>
            </div>

            ${qrHtml}

        </div>
    `;

}


// ==============================
// RENDER QR CODE
// ==============================

function renderQRCode(card, qrImageBase64) {

    if (!card) return;

    let container = card.querySelector(".qr-container");

    if (!container) {

        container = document.createElement("div");
        container.className = "qr-container";

        card.appendChild(container);

    }

    container.innerHTML = "";

    const text = document.createElement("p");
    text.innerText = "Escaneie o QRCode";

    const img = document.createElement("img");
    img.src = qrImageBase64;
    img.style.width = "160px";
    img.style.height = "160px";

    container.appendChild(text);
    container.appendChild(img);

}


// ==============================
// RECEBER QR CODE
// ==============================

window.socket.on("qr_code", ({ sessionId, qrImageBase64 }) => {

    console.log("📲 QRCode recebido:", sessionId);

    let card = document.getElementById(`session_${sessionId}`);

    if (!card) {

        pendingQRCodes[sessionId] = qrImageBase64;

        // tenta renderizar novamente
        setTimeout(loadSessions, 500);

        return;

    }

    renderQRCode(card, qrImageBase64);

});


// ==============================
// ATUALIZAR STATUS
// ==============================

function updateSessionStatus(sessionId, status) {

    const card = document.getElementById(`session_${sessionId}`);

    if (!card) {

        loadSessions();
        return;

    }

    const statusSpan = card.querySelector(".status");

    const color =
        status === "connected"
            ? "green"
            : status === "connecting"
                ? "orange"
                : "red";

    statusSpan.innerText = status;
    statusSpan.className = "status " + color;

    if (status === "connected") {

        const qrContainer = card.querySelector(".qr-container");

        if (qrContainer) {
            qrContainer.remove();
        }

        delete pendingQRCodes[sessionId];

    }

}


// ==============================
// SOCKET INIT
// ==============================

function initSocketForSessions() {

    if (!window.socket) return;

    const userId = localStorage.getItem("userId");

    console.log("Entrando na sala:", `user_${userId}`);

    if (userId) {

        window.socket.emit("join", `user_${userId}`);

    }

    window.socket.on("session_status_update", data => {

        console.log("🔄 Status atualizado:", data);

        updateSessionStatus(data.sessionId, data.status);

    });

}


// ==============================
// CRIAR SESSÃO
// ==============================

async function createSession() {
    try {
        const res = await axios.post(`${CONFIG.API_URL}/sessions/connect`, {})

        if (!res.data.success) {
            // Lança o erro com a mensagem do servidor
            throw new Error(res.data.error || "Erro ao criar sessão")
        }

        const userId = localStorage.getItem("userId")

        if (window.socket && userId) {
            window.socket.emit("join", `user_${userId}`)
        }

        await new Promise(r => setTimeout(r, 600))

        await loadSessions()

    } catch (err) {
        // Se for erro do Axios com response
        const errorMsg = err.response?.data?.error || err.message || "Erro ao criar sessão"
        console.error(err.response?.data || err)
        alert(errorMsg)
    }
}


// ==============================
// DELETAR SESSÃO
// ==============================

async function deleteSession(sessionId) {

    if (!confirm("Deseja realmente excluir essa sessão?")) return;

    try {

        await axios.delete(`${CONFIG.API_URL}/sessions/${sessionId}`);

        // limpa cache de QR
        delete pendingQRCodes[sessionId];

        await loadSessions();

    } catch (err) {

        console.error(err);
        alert("Erro ao excluir sessão");

    }

}


// ==============================
// INIT
// ==============================

document.addEventListener("DOMContentLoaded", () => {

    initSocketForSessions();

    loadSessions();

});