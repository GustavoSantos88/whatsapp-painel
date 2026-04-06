let currentSession = null
let currentChatNumber = null

let conversationsCache = {}
let unreadCounter = {}
let selectedMedia = null
let sendingMessage = false
let pollingInterval = null

let messagesPageActive = false


/* =========================
   FORMATAR DATA
========================= */
function formatTime(date) {
    const d = new Date(date)
    return d.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit"
    })
}

function formatDay(date) {
    const d = new Date(date)
    return d.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    })
}


/* =========================
   NORMALIZA NUMERO
========================= */
function normalizeNumber(number) {
    if (!number) return null
    number = number
        .replace('@c.us', '')
        .replace('@s.whatsapp.net', '')
        .replace('@lid', '')
        .replace(/\D/g, '')

    if (!number.startsWith("55")) {
        number = "55" + number
    }

    const ddd = number.substring(2, 4)
    let phone = number.substring(4)

    if (phone.length === 8) {
        phone = "9" + phone
    }

    number = "55" + ddd + phone
    return number
}


/* =========================
   MEDIA RENDER
========================= */
function renderMediaMessage(url, fileName) {
    if (!url) return ""
    const ext = fileName?.split('.').pop()?.toLowerCase()

    if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) {
        return `<img src="${url}" style="max-width:160px;border-radius:8px">`
    }
    if (["mp4", "webm"].includes(ext)) {
        return `<video controls width="160"><source src="${url}"></video>`
    }
    if (["mp3", "wav", "ogg"].includes(ext)) {
        return `<audio controls src="${url}"></audio>`
    }
    if (ext === "pdf" || url.includes(".pdf") || url.startsWith("data:application/pdf")) {
        return `
        <div class="chat-pdf">
            <iframe src="${url}" style="width:160px;height:160px;border:none;border-radius:8px;background:#fff;"></iframe>
            <div style="margin-top:4px;font-size:10px">📄 ${fileName || "PDF"}</div>
        </div>`
    }
    return `<a href="${url}" target="_blank">📎 ${fileName}</a>`
}


/* =========================
   PREVIEW
========================= */
function renderMediaPreview(files) {
    return files.map((file, index) => {
        const url = URL.createObjectURL(file)
        return `
            <div style="position:relative; display:inline-block; margin:5px;">
                <span onclick="removeSingleMedia(${index})" style="position:absolute; top:-6px; right:-6px; background:#ff4d4f; color:#fff; width:18px; height:18px; border-radius:50%; font-size:12px; display:flex; align-items:center; justify-content:center; cursor:pointer; z-index:10;">×</span>
                ${renderMediaMessage(url, file.name)}
            </div>`
    }).join("")
}

function removeSingleMedia(index) {
    if (!selectedMedia) return
    selectedMedia.splice(index, 1)
    const preview = document.getElementById("mediaPreview")
    if (!selectedMedia.length) {
        removeMedia()
        return
    }
    preview.innerHTML = renderMediaPreview(selectedMedia)
}


/* =========================
   PAGE (LAYOUT CORRIGIDO)
========================= */
function messagesPage() {
    messagesPageActive = true
    setTimeout(initMessagesPage, 50)

    return `
    <h1>Mensagem</h1>
    
    <div class="chat-layout">
        <!-- Barra Lateral de Conversas -->
        <div class="chat-conversations">
            <select id="msgSession" style="padding:15px; border:none; border-bottom:1px solid var(--border-color); background:var(--bg-card); font-weight:bold;"></select>
            <div class="chat-search" style="padding:10px; border-bottom:1px solid var(--border-color);">
                <input id="searchChat" placeholder="🔍 Buscar conversa..." style="width:100%; padding:10px; border-radius:8px; border:1px solid var(--border-color); background:var(--input-bg); color:var(--text-main);">
            </div>
            <div id="conversationsList">
                <div class="center" style="padding:20px; font-size:13px; color:var(--text-muted);">Carregando conversas...</div>
            </div>
        </div>

        <!-- Área de Mensagens -->
        <div class="chat-messages">
            <div id="chatHeader" class="chat-header" style="padding:18px; background:var(--bg-card); border-bottom:1px solid var(--border-color); font-weight:bold;">
                Selecione uma conversa
            </div>
            <div id="chatMessages">
                <div class="center" style="color:var(--text-muted);">Nenhuma conversa selecionada</div>
            </div>
            <div id="mediaPreview"></div>
            <div class="chat-input" style="padding:15px; background:var(--bg-card); border-top:1px solid var(--border-color); display:flex; gap:10px; align-items:center;">
                <input type="file" id="chatFile" multiple style="display:none">
                <button class="primary-btn" style="margin:0; padding:10px;" onclick="document.getElementById('chatFile').click()">📎</button>
                <input id="chatText" placeholder="Escreva uma mensagem..." style="flex:1; padding:12px; border-radius:8px; border:1px solid var(--border-color); background:var(--input-bg); color:var(--text-main);">
                <button class="primary-btn" style="margin:0; padding:10px 20px;" onclick="sendChatMessage()">Enviar</button>
            </div>
        </div>
    </div>`
}

/* =========================
   SELECIONAR CHAT (NOVA FUNÇÃO ESSENCIAL)
========================= */
function selectChat(number) {
    currentChatNumber = number
    document.getElementById("chatHeader").innerText = "Conversando com: " + number

    // Atualiza a classe 'active' na lista lateral
    renderConversations()

    // Renderiza as mensagens desse contato
    if (typeof renderMessages === "function") {
        renderMessages()
    }

    // Scroll para o final
    const msgDiv = document.getElementById("chatMessages")
    if (msgDiv) {
        setTimeout(() => msgDiv.scrollTop = msgDiv.scrollHeight, 100)
    }
}

/* =========================
   DESTROY PAGE
========================= */
function destroyMessagesPage() {
    messagesPageActive = false
    if (pollingInterval) {
        clearInterval(pollingInterval)
        pollingInterval = null
    }
}


/* =========================
   INIT
========================= */

async function initMessagesPage() {

    if (!document.getElementById("msgSession")) return

    await loadMessageSessions()

    const chatFile = document.getElementById("chatFile")
    const chatText = document.getElementById("chatText")
    const searchChat = document.getElementById("searchChat")

    if (chatFile) {
        chatFile.addEventListener("change", handleFile)
    }

    if (chatText) {
        chatText.addEventListener("keydown", e => {

            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                sendChatMessage()
            }

        })
    }

    if (searchChat) {
        searchChat.addEventListener("input", renderConversations)
    }

    startPolling()

}


/* =========================
   SESSOES
========================= */

async function loadMessageSessions() {

    const select = document.getElementById("msgSession")
    if (!select) return

    const res = await axios.get(CONFIG.API_URL + "/sessions")
    console.log(res.data.data)
    select.innerHTML = res.data.data.map(s =>
        `<option value="${s.session_id}">${s.session_id}</option>`
    ).join("")

    select.addEventListener("change", loadConversations)

    loadConversations()

}


/* =========================
   LOAD CONVERSAS
========================= */

async function loadConversations() {

    const select = document.getElementById("msgSession")

    if (!select) return
    if (!select.value) return

    const sessionId = select.value

    currentSession = sessionId



    const res = await axios.get(CONFIG.API_URL + "/" + sessionId + "?limit=200")

    const messages = res.data.data

    const grouped = {}

    messages.forEach(m => {

        const number = getContactNumber(m)

        if (!grouped[number]) grouped[number] = []

        grouped[number].push(m)

    })

    conversationsCache = grouped

    renderConversations()

}

function getContactNumber(m) {

    const from = normalizeNumber(m.from)
    const to = normalizeNumber(m.contact_number)

    // regra: o contato é sempre o número diferente entre os dois
    if (!from) return to
    if (!to) return from

    // se forem diferentes, pega o que NÃO é a instância (direction ajuda)
    if (m.direction === "received") {
        return from
    }

    return to
}


/* =========================
   RENDER LISTA
========================= */

function renderConversations() {

    const container = document.getElementById("conversationsList")
    const searchInput = document.getElementById("searchChat")

    if (!container || !searchInput) return

    const search = searchInput.value.toLowerCase()

    const numbers = Object.keys(conversationsCache)

    numbers.sort((a, b) => {

        const lastA = conversationsCache[a].slice(-1)[0]
        const lastB = conversationsCache[b].slice(-1)[0]

        return new Date(lastB.timestamp) - new Date(lastA.timestamp)

    })

    container.innerHTML = numbers
        .filter(n => n.includes(search))
        .map(n => {

            const last = conversationsCache[n].slice(-1)[0]

            const unread = unreadCounter[n] || 0

            return `

<div class="chat-conversation" onclick="openChat('${n}')">

<div class="conv-info">

<strong>${n}</strong>

<div class="conv-last">
${last?.body || "📎 mídia"}
</div>

</div>

<div style="display:flex;flex-direction:column;align-items:flex-end">

<div class="conv-time">
${formatTime(last?.timestamp)}
</div>

${unread > 0 ? `<span class="chat-unread">${unread}</span>` : ""}

</div>

</div>

`

        }).join("")

}


/* =========================
   OPEN CHAT
========================= */

function openChat(number) {

    currentChatNumber = normalizeNumber(number)

    unreadCounter[number] = 0

    const header = document.getElementById("chatHeader")
    if (header) header.innerHTML = number

    renderChat(conversationsCache[number] || [])

    renderConversations()

}


/* =========================
   RENDER CHAT
========================= */

function renderChat(messages) {

    const container = document.getElementById("chatMessages")
    if (!container) return

    messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))

    let lastDay = null

    container.innerHTML = messages.map(m => {

        const day = formatDay(m.timestamp)

        let daySeparator = ""

        if (day !== lastDay) {
            daySeparator = `<div class="msg-day">${day}</div>`
            lastDay = day
        }

        const type = m.direction === "sent" ? "chat-sent" : "chat-received"

        let media = ""

        if (m.has_media && m.media_path) {

            let url = ""
            let fileName = ""

            if (m.media_path.startsWith("blob:")) {

                url = m.media_path
                fileName = m.file_name || "arquivo"

            } else {

                if (m.media_path) {
                    let path = m.media_path.replace(/^\/+/, "")
                    url = CONFIG.SOCKET_URL + `/uploads/${m.session_id}/` + path
                    fileName = path.split('/').pop()
                }
            }

            media = renderMediaMessage(url, fileName)

        }

        return `

${daySeparator}

<div class="chat-message ${type}">

<div class="chat-bubble">

${media}

${m.body || ""}

</div>

<div class="msg-meta">

<span>${formatTime(m.timestamp)}</span>

<span>${m.status || ""}</span>

</div>

</div>

`

    }).join("")

    container.scrollTop = container.scrollHeight

}

/* =========================
   FILE
========================= */

function handleFile(e) {

    selectedMedia = Array.from(e.target.files)

    if (!selectedMedia || !selectedMedia.length) return

    const preview = document.getElementById("mediaPreview")
    if (!preview) return

    preview.style.display = "block"

    preview.innerHTML = renderMediaPreview(selectedMedia)

}

function removeMedia() {

    selectedMedia = null

    const input = document.getElementById("chatFile")
    if (input) input.value = ""

    const preview = document.getElementById("mediaPreview")
    if (preview) preview.style.display = "none"

}

/* =========================
   POLLING
========================= */

function startPolling() {

    if (pollingInterval) clearInterval(pollingInterval)

    pollingInterval = setInterval(async () => {

        if (!messagesPageActive) return
        if (!currentSession) return

        const res = await axios.get(CONFIG.API_URL + "/" + currentSession + "?limit=50")

        const messages = res.data.data

        messages.forEach(m => {

            const number = getContactNumber(m)

            if (!conversationsCache[number]) {
                conversationsCache[number] = []
            }

            const exists = conversationsCache[number].find(x => x.id === m.id)

            if (!exists) {

                conversationsCache[number].push(m)

                if (number !== currentChatNumber) {
                    unreadCounter[number] = (unreadCounter[number] || 0) + 1
                }

            }

        })

        renderConversations()

        if (currentChatNumber) {
            renderChat(conversationsCache[currentChatNumber])
        }

    }, 4000)

}

/* =========================
   ENVIAR MENSAGEM
========================= */

async function sendChatMessage() {

    if (sendingMessage) return

    const textInput = document.getElementById("chatText")

    if (!currentSession || !currentChatNumber) {
        alert("Selecione uma conversa")
        return
    }

    const message = textInput.value.trim()

    if (!message && !selectedMedia) return

    sendingMessage = true

    try {

        const formData = new FormData()

        formData.append("sessionId", currentSession)
        formData.append("number", currentChatNumber)
        console.log("Número enviado:", currentChatNumber)

        if (message) {
            formData.append("message", message)
        }

        if (selectedMedia) {
            selectedMedia.forEach(file => {
                formData.append("files", file)
            })
        }

        await axios.post(CONFIG.API_URL + "/send", formData, {
            headers: {
                "Content-Type": "multipart/form-data"
            }
        })

        /* limpar input */

        textInput.value = ""

        if (selectedMedia) {
            removeMedia()
        }

    } catch (err) {

        console.error("Erro ao enviar mensagem", err)

        alert("Erro ao enviar mensagem")

    }

    sendingMessage = false
}