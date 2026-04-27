// ==============================
// INICIALIZAÇÃO GLOBAL DO SOCKET
// ==============================

// 1. Definição ultra-segura: Garante que a variável exista sem resetar para null
if (typeof window.socket === 'undefined') {
    window.socket = null;
}

function initSocket() {
    // Se o socket já existe e está conectado, não faz nada para não duplicar
    if (window.socket && window.socket.connected) {
        console.log("ℹ️ Socket já está ativo e conectado.");
        return;
    }

    // Se o socket existe mas está desconectado, tenta reconectar em vez de criar novo
    if (window.socket && !window.socket.connected) {
        console.log("🔌 Tentando reconectar socket existente...");
        window.socket.connect();
        return;
    }

    console.log("🔌 Iniciando nova conexão com o servidor de Socket...");

    // Inicializa a conexão com transporte fixo para evitar delay
    window.socket = io(CONFIG.SOCKET_URL, {               
        transports: ["polling", "websocket"], // Começa com polling e faz upgrade rápido
        upgrade: true, // Permite subir para websocket assim que estabilizar
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        autoConnect: true,
        // Adicione isso para evitar problemas de cache no handshake
        rememberUpgrade: true
    });

    // --- EVENTOS ---

    window.socket.on("connect", () => {
        console.log("✅ Socket conectado com sucesso ID:", window.socket.id);

        const userId = localStorage.getItem("userId");
        if (userId) {
            // Entra na sala para receber QRs em tempo real
            window.socket.emit("join", `user_${userId}`);
            console.log(`🏠 Sala de escuta ativa: user_${userId}`);
        }
    });

    // Evento disparado quando o QR Code chega (Ouvinte Global)
    window.socket.on("qr_code", (data) => {
        console.log("📥 QR recebido globalmente para:", data.sessionId);
        if (!window.qrCache) window.qrCache = {};
        window.qrCache[data.sessionId] = data.qrImageBase64;

        // Se a função de renderizar existir (estamos na página de sessões), executa
        if (typeof renderQRCode === "function") {
            const card = document.getElementById(`session_${data.sessionId}`);
            if (card) renderQRCode(card, data.qrImageBase64);
        }
    });

    window.socket.on("session_ready", data => {
        console.log("📱 Sessão Pronta:", data);
        if (typeof updateSessionStatus === "function") {
            updateSessionStatus(data.sessionId, "connected");
        }
    });

    window.socket.on("session_status_update", (data) => {
        if (typeof updateSessionStatus === "function") {
            updateSessionStatus(data.sessionId, data.status);
        }
    });

    window.socket.on("disconnect", (reason) => {
        console.warn("⚠️ Socket desconectado:", reason);
        if (reason === "io server disconnect") window.socket.connect();
    });
}

// Inicialização imediata
if (localStorage.getItem("token")) {
    initSocket();
}

// Backup para garantir que carregue após o DOM
document.addEventListener("DOMContentLoaded", () => {
    if (localStorage.getItem("token")) {
        initSocket();
    }
});
