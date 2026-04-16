const notificationSound = new Audio("https://notificationsounds.com/storage/sounds/file-sounds-1150-pristine.mp3")

let lastSeenTimestamp = {}
let currentSession = null
let currentChatNumber = null

let currentSessionId = null;
let currentInstanceNumber = null;

let conversationsCache = {}
let unreadCounter = {}
let selectedMedia = null
let sendingMessage = false
let pollingInterval = null

let messagesPageActive = false

let contactsPage = 1
let contactsLoading = false
let contactsSearch = ""
let contactsEnd = false

let audioUnlocked = false

// function showNotification(message, number) {

//     // 🔔 Notificação do sistema
//     // if ("Notification" in window && Notification.permission === "granted") {
//     //     new Notification("Nova mensagem", {
//     //         body: message,
//     //         icon: "./assets/images/logo.png" // 👈 já resolvemos o ícone aqui também
//     //     })
//     // }

//     // 🔊 SOM SEMPRE (independente da aba)
//     playNotificationSound()
// }

function showNotification(message, number) {
    // 1. O navegador está minimizado ou em outra aba?
    const isWindowHidden = document.hidden || !document.hasFocus();

    // 2. O usuário está em outra página do sistema (fora do /mensagens)?
    const isNotOnMessagesPage = !messagesPageActive;

    // 3. O usuário está na página de mensagens, mas conversando com OUTRA pessoa?
    const isDifferentChat = currentChatNumber !== number;

    // Toca som se: (Aba oculta/Sem foco) OU (Fora da tela de chat) OU (Em outro chat)
    if (isWindowHidden || isNotOnMessagesPage || isDifferentChat) {
        playNotificationSound();
    }
}


function playNotificationSound() {

    notificationSound.currentTime = 0

    const playPromise = notificationSound.play()

    if (playPromise !== undefined) {
        playPromise.catch(() => {
            console.warn("🔇 Som bloqueado pelo navegador")
        })
    }
}

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

    if (number.length < 10) return null // 🔥 evita lixo

    if (!number.startsWith("55")) {
        number = "55" + number
    }

    const ddd = number.substring(2, 4)
    let phone = number.substring(4)

    if (phone.length === 8) {
        phone = "9" + phone
    }

    return "55" + ddd + phone
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

        if (!file._previewUrl) {
            file._previewUrl = URL.createObjectURL(file)
        }

        return `
            <div style="position:relative; display:inline-block; margin:5px;">
                <span onclick="removeSingleMedia(${index})"
                    style="position:absolute; top:-6px; right:-6px; background:#ff4d4f; color:#fff; width:18px; height:18px; border-radius:50%; font-size:12px; display:flex; align-items:center; justify-content:center; cursor:pointer; z-index:10;">×</span>
                ${renderMediaMessage(file._previewUrl, file.name)}
            </div>`
    }).join("")
}

function removeSingleMedia(index) {
    if (!selectedMedia) return

    const file = selectedMedia[index]

    if (file?._previewUrl) {
        URL.revokeObjectURL(file._previewUrl)
    }

    selectedMedia.splice(index, 1)

    const preview = document.getElementById("mediaPreview")

    if (!selectedMedia.length) {
        removeMedia()
        return
    }

    preview.innerHTML = renderMediaPreview(selectedMedia)
}

function getLastMessagePreview(messages) {

    if (!messages || !messages.length) return ""

    for (let i = messages.length - 1; i >= 0; i--) {

        const m = messages[i]

        let texto = ""

        // TEXTO
        if (m.body && m.body !== '[Mídia recebida]') {
            texto = m.body
        }

        // MÍDIA
        else if (m.has_media) {

            const ext = m.file_name?.split('.').pop()?.toLowerCase()

            if (["jpg", "jpeg", "png", "webp"].includes(ext)) texto = "📷 Foto"
            else if (["mp4", "webm"].includes(ext)) texto = "🎥 Vídeo"
            else if (["mp3", "wav", "ogg"].includes(ext)) texto = "🎵 Áudio"
            else if (ext === "pdf") texto = "📄 PDF"
            else texto = "📎 Arquivo"
        }

        // 👉 AQUI entra o "Você:"
        if (texto) {
            return (m.direction === "sent" ? "Você: " : "") + texto
        }
    }

    return ""
}

// Filtra contatos válidos (remove "Sem nome" e vazios)
function isValidContact(c) {
    if (!c.name) return false

    const name = c.name.trim().toLowerCase()

    if (name === "" || name === "sem nome") return false

    return true
}

const normalizeStr = (s) => s ? s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : "";
// Busca contatos via API (somente quando usuário dispara)
async function fetchContacts(reset = false) {
    if (!currentSessionId) return;
    // Removi o bloqueio de !contactsSearch para permitir carregar a lista se necessário
    if (contactsLoading || (contactsEnd && !reset)) return;

    contactsLoading = true;

    if (reset) {
        contactsPage = 1;
        contactsEnd = false;
        const list = document.getElementById("contactsList");
        if (list) list.innerHTML = "<div style='padding:10px'>Buscando...</div>";
    }

    try {
        const res = await axios.get(CONFIG.API_URL + `/contacts/${currentSessionId}`, {
            params: {
                // Se a API falha com acento, enviamos vazio para pegar a lista e filtrar no JS
                // Ou enviamos o termo e o JS refina o que a API ignorar
                search: contactsSearch,
                page: contactsPage,
                limit: 100 // Aumentamos o range para garantir que o contato esteja no lote
            }
        });

        const data = res.data.data || res.data.contacts || res.data.result || [];

        // 1. Normalizamos o que o usuário digitou (ex: "mae")
        const searchTermNormalized = normalizeStr(contactsSearch);

        // 2. Filtro Front-end que ignora acentos (Mãe vira mae e bate com mae)
        const validContacts = data.filter(c => {
            if (!isValidContact(c)) return false;

            const nameFromApi = normalizeStr(c.name);
            // Se o nome da API normalizado contém sua busca normalizada
            return nameFromApi.indexOf(searchTermNormalized) !== -1;
        });

        if (data.length < 20) contactsEnd = true;

        if (reset) document.getElementById("contactsList").innerHTML = "";

        // Se a busca falhou mas temos o termo, avisamos
        if (!validContacts.length && contactsPage === 1) {
            document.getElementById("contactsList").innerHTML =
                "<div style='padding:10px'>Nenhum contato encontrado para '" + contactsSearch + "'</div>";
        }

        appendContacts(validContacts);
        contactsPage++;

    } catch (err) {
        console.error("Erro ao buscar contatos", err);
        document.getElementById("contactsList").innerHTML = "<div style='padding:10px;color:red;'>Erro ao carregar</div>";
    }
    contactsLoading = false;
}

// Adiciona contatos na lista (já filtrados)
function appendContacts(contacts) {

    const list = document.getElementById("contactsList")
    if (contactsPage === 1) {
        list.innerHTML = ""
    }

    if (!contacts.length && contactsPage === 1) {
        list.innerHTML = "<div style='padding:10px'>Nenhum contato válido encontrado</div>"
        return
    }

    const html = contacts.map(c => {

        const number = normalizeNumber(c.number)

        return `
            <div class="contact-item" onclick="selectContact('${number}', '${c.name}')">
                <strong>${c.name}</strong><br>
                <small>+${number}</small>
            </div>
        `
    }).join("")

    list.innerHTML += html
}

// Abre modal de contatos (não carrega nada automaticamente)
function openContacts(event) {

    if (event) event.stopPropagation() // 🔥 ESSENCIAL

    if (!currentSessionId) {
        alert("Selecione uma sessão primeiro")
        return
    }

    const modal = document.getElementById("contactsModal")

    if (modal.style.display === "flex") {
        modal.style.display = "none"
        return
    }

    modal.style.display = "flex"

    modal.innerHTML = `
        <div class="contacts-header">
            <input id="searchContact" placeholder="Digite e pressione ENTER..." spellcheck="true" lang="pt-br" />
        </div>
        <div class="contacts-list" id="contactsList">
            <div style="padding:10px;color:#666;">
                Digite um nome para buscar contatos
            </div>
        </div>
    `

    const input = document.getElementById("searchContact")
    const list = document.getElementById("contactsList")

    // 🔥 impede fechar ao clicar dentro do modal
    modal.addEventListener("click", (e) => e.stopPropagation())

    input.addEventListener("input", (e) => {

        const value = e.target.value.trim()

        if (!value) {
            contactsSearch = ""
            contactsPage = 1
            contactsEnd = false

            list.innerHTML = `
                <div style="padding:10px;color:#666;">
                    Digite um nome para buscar contatos
                </div>
            `
        }
    })

    input.addEventListener("keydown", (e) => {

        if (e.key === "Escape") {
            input.value = ""
            modal.style.display = "none"
            return
        }

        if (e.key === "Enter") {
            triggerContactSearch();
        }
    })

    input.addEventListener("blur", () => {
        triggerContactSearch()
    })
}

// Dispara busca manual (ENTER ou blur)
function triggerContactSearch() {
    const input = document.getElementById("searchContact");
    const value = input ? input.value.trim() : "";

    if (value === "") {
        contactsSearch = "";
        contactsPage = 1;
        contactsEnd = false;
        document.getElementById("contactsList").innerHTML = `<div style="padding:10px;color:#666;">Digite um nome para buscar contatos</div>`;
        return;
    }

    // Reset total para nova pesquisa
    contactsSearch = value;
    contactsPage = 1;
    contactsEnd = false;
    fetchContacts(true); // O 'true' garante que a lista antiga seja apagada
}


// Seleciona contato e abre conversa
function selectContact(number, name) {

    const normalized = normalizeNumber(number)

    if (!conversationsCache[normalized]) {
        conversationsCache[normalized] = []
    }

    currentChatNumber = normalized

    const header = document.getElementById("chatHeaderContent")
    if (header) header.innerHTML = "Conversando com: " + name

    renderChat([])

    openChat(number)

    document.getElementById("contactsModal").style.display = "none"
}

/* =========================
   EMOJIS (DINÂMICO)
========================= */
function getAllEmojis() {
    const ranges = [
        [0x1F600, 0x1F64F],
        [0x1F300, 0x1F5FF],
        [0x1F680, 0x1F6FF],
        [0x2600, 0x26FF],
        [0x2700, 0x27BF],
        [0x1F900, 0x1F9FF],
        [0x1FA70, 0x1FAFF],
    ]

    const list = []

    ranges.forEach(([start, end]) => {
        for (let i = start; i <= end; i++) {
            try {
                const emoji = String.fromCodePoint(i)
                if (emoji && emoji !== "�" && emoji !== "🫺") {
                    list.push(emoji)
                }
            } catch (e) { }
        }
    })

    return list
}

const emojis = getAllEmojis()
let emojiRendered = false

/* =========================
   TOGGLE EMOJI
========================= */
function toggleEmojiPicker() {

    const box = document.getElementById("emojiPicker")

    if (!box) return

    const isOpen = box.style.display === "block"

    if (isOpen) {
        box.style.display = "none"
        return
    }

    box.style.display = "block"

    // 🔥 renderiza apenas 1 vez
    if (!emojiRendered) {
        box.innerHTML = emojis.map(e =>
            `<span onclick="addEmoji('${e}')">${e}</span>`
        ).join("")

        emojiRendered = true
    }
}

/* =========================
   ADICIONAR EMOJI
========================= */
function addEmoji(emoji) {

    const input = document.getElementById("chatText")
    if (!input) return

    input.value += emoji
    input.focus()
}

/* =========================
   FECHAR AO CLICAR FORA
========================= */
document.addEventListener("click", (e) => {

    const emojiBox = document.getElementById("emojiPicker")
    const emojiBtn = document.getElementById("emojiBtn")

    const contactsModal = document.getElementById("contactsModal")
    const contactsBtn = document.getElementById("contactsBtn")

    /* EMOJI */
    if (emojiBox && emojiBtn) {
        const clickedEmoji =
            emojiBox.contains(e.target) ||
            emojiBtn.contains(e.target)

        if (!clickedEmoji) {
            emojiBox.style.display = "none"
        }
    }

    /* CONTATOS */
    if (contactsModal) {
        const clickedContacts =
            contactsModal.contains(e.target) ||
            (contactsBtn && contactsBtn.contains(e.target))

        if (!clickedContacts) {
            contactsModal.style.display = "none"
        }
    }

    if (audioUnlocked) return

    notificationSound.play()
        .then(() => {
            notificationSound.pause()
            notificationSound.currentTime = 0
            audioUnlocked = true
            console.log("🔊 Áudio liberado")
        })
        .catch(() => {
            console.warn("🔇 Ainda bloqueado")
        })
})

function toggleSidebar() {
    document.querySelector('.chat-conversations').classList.toggle('open')
    document.getElementById('chatOverlay').classList.toggle('show')
}

function closeSidebar() {
    document.querySelector('.chat-conversations').classList.remove('open')
    document.getElementById('chatOverlay').classList.remove('show')
}

function messagesPage() {
    messagesPageActive = true
    setTimeout(initMessagesPage, 50)

    return `
    <header class="page-header">
        <h2 class="page-title">Mensagens</h2>
        <p class="page-lead">Escolha a sessão, abra uma conversa e responda em tempo real.</p>
    </header>

    <div class="chat-layout">

        <!-- OVERLAY MOBILE -->
        <div id="chatOverlay" class="chat-overlay" onclick="closeSidebar()"></div>

        <!-- Barra Lateral -->
        <div class="chat-conversations">
            <select id="msgSession" style="padding:19px; border:none; border-bottom:1px solid var(--border-color); background:var(--bg-card); font-weight:bold;"></select>            
            
            <div class="chat-search" style="display:flex; gap:5px;">
                <input id="searchChat" placeholder="🔍 Buscar conversa..." style="flex:1; padding:5px;" spellcheck="true" lang="pt-br">                
                <button class="primary-btn" style="margin:0; padding:10px;" id="contactsBtn" onclick="openContacts(event)">Contatos</button>
            </div>

            <div id="contactsModal" class="contacts-modal"></div>

            <div id="conversationsList">
                <div class="center" style="padding:20px; font-size:13px; color:var(--text-muted);">
                    Carregando conversas...
                </div>
            </div>
        </div>

        <!-- Área de Mensagens -->
        <div class="chat-messages">

            <!-- HEADER COM BOTÃO MOBILE -->
            <div id="chatHeader" class="chat-header">
                <span class="mobile-toggle" onclick="toggleSidebar()">☰</span>

                <div id="chatHeaderContent">
                    Selecione uma conversa
                </div>
            </div>

            <div id="chatMessages">
                <div class="center" style="color:var(--text-muted);">
                    Nenhuma conversa selecionada
                </div>
            </div>

            <div id="mediaPreview"></div>             

            <div class="chat-input" style="padding:15px; background:var(--bg-card); border-top:1px solid var(--border-color); display:flex; gap:10px; align-items:center;">
                
                <input type="file" id="chatFile" multiple style="display:none">                
                <button class="primary-btn" style="margin:0; padding:10px;" onclick="document.getElementById('chatFile').click()">Anexo</button>

                <button id="emojiBtn" class="primary-btn" style="margin:0; padding:10px;" onclick="toggleEmojiPicker()">Emojis</button>
                <div id="emojiPicker" class="emoji-box"></div>

                <input id="chatText" placeholder="Escreva uma mensagem..." autofocus spellcheck="true" lang="pt-br"
                    style="flex:1; padding:12px; border-radius:8px; border:1px solid var(--border-color); background:var(--input-bg); color:var(--text-main);">

                <button class="primary-btn" style="margin:0; padding:10px 20px;" onclick="sendChatMessage()">Enviar</button>
            </div>

        </div>
        <div id="chatOverlay" class="chat-overlay" onclick="closeSidebar()"></div>
    </div>`
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
    window._pollingStarted = false
}

/* =========================
   INIT
========================= */
async function initMessagesPage() {

    loadState()  // 🔥 Carrega estado salvo
    pollingLoop()

    if (!document.getElementById("msgSession")) return

    // 🔔 pedir permissão
    // if ("Notification" in window) {

    //     if (Notification.permission === "default") {
    //         await Notification.requestPermission()
    //     }

    //     if (Notification.permission === "denied") {
    //         console.warn("🚫 Notificações bloqueadas pelo navegador")

    //         // opcional: avisar usuário
    //         setTimeout(() => {
    //             alert("Ative as notificações no navegador para receber alertas de mensagens.")
    //         }, 2000)
    //     }

    // }

    await loadMessageSessions()

    const chatFile = document.getElementById("chatFile")
    const chatText = document.getElementById("chatText")
    document.getElementById("chatText").setAttribute("spellcheck", "true");

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
        let searchTimeout = null

        searchChat.addEventListener("input", () => {
            clearTimeout(searchTimeout)

            searchTimeout = setTimeout(() => {
                renderConversations()
            }, 200)
        })
    }

    if (!window._pollingStarted) {
        window._pollingStarted = true
        pollingLoop()
    }
}

/* =========================
   SESSOES E CONVERSAS
========================= */
async function loadMessageSessions() {

    const select = document.getElementById("msgSession")
    if (!select) return

    const res = await axios.get(CONFIG.API_URL + "/sessions")
    const sessions = res.data.data || []

    select.innerHTML = sessions.map(s =>
        `<option value="${s.session_id}" data-phone="${s.phone_number}">
            ${s.profile_name ? s.profile_name : '+' + s.phone_number}
        </option>`
    ).join('')

    if (!sessions.length) return

    const firstOption = select.options[0]
    currentSessionId = firstOption.value
    currentInstanceNumber = firstOption.dataset.phone || firstOption.getAttribute('data-phone')
    currentSession = currentSessionId

    // console.log("Sessão inicial:", currentSessionId, "Número da sessão:", currentInstanceNumber)

    // Ao mudar de sessão
    select.addEventListener("change", async (e) => {
        const selectedOption = e.target.options[e.target.selectedIndex]
        currentSessionId = e.target.value
        currentInstanceNumber = selectedOption.dataset.phone
        currentSession = currentSessionId

        // Limpa conversas antigas para evitar confusão
        conversationsCache = {}
        unreadCounter = {}
        currentChatNumber = null

        await loadConversations()
    })

    // Carrega a primeira sessão
    await loadConversations()
}

/* =========================
   LOAD CONVERSAS
========================= */
async function loadConversations() {

    if (!currentSession) return

    const res = await axios.get(`${CONFIG.API_URL}/${currentSession}?limit=200`)
    const messages = res.data.data || []

    const grouped = {}

    // Agrupa mensagens por contato
    messages.forEach(m => {
        const number = getContactNumber(m)
        if (!number) return
        if (!grouped[number]) grouped[number] = []
        grouped[number].push(m)
    })

    Object.keys(grouped).forEach(number => {

        if (!conversationsCache[number]) conversationsCache[number] = []
        // Inicializa Set de IDs para evitar duplicação
        if (!conversationsCache[number]._ids) {
            conversationsCache[number]._ids = new Set(conversationsCache[number].map(x => x.id))
        }

        grouped[number].forEach(m => {
            if (!conversationsCache[number]._ids.has(m.id)) {
                conversationsCache[number]._ids.add(m.id)
                conversationsCache[number].push(m)
            }
        })

        // Ordena mensagens por timestamp
        conversationsCache[number].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    })

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

function saveState() {
    localStorage.setItem("lastSeenTimestamp", JSON.stringify(lastSeenTimestamp))
    localStorage.setItem("notifiedMessages", JSON.stringify([...notifiedMessages]))
}

function loadState() {
    const lastSeen = localStorage.getItem("lastSeenTimestamp")
    const notified = localStorage.getItem("notifiedMessages")

    if (lastSeen) lastSeenTimestamp = JSON.parse(lastSeen)
    if (notified) notifiedMessages = new Set(JSON.parse(notified))
}

/* =========================
   RENDER LISTA
========================= */
function renderConversations() {

    const container = document.getElementById("conversationsList")
    const searchInput = document.getElementById("searchChat")

    if (!container || !searchInput) return

    // const search = searchInput.value.toLowerCase().trim()
    const search = normalizeStr(searchInput.value.trim());

    const numbers = Object.keys(conversationsCache)

    // 🔥 Ordena por última mensagem (mais recente primeiro)
    numbers.sort((a, b) => {

        const lastA = conversationsCache[a]?.slice(-1)[0]
        const lastB = conversationsCache[b]?.slice(-1)[0]

        if (!lastA && !lastB) return 0
        if (!lastA) return 1
        if (!lastB) return -1

        return new Date(lastB.timestamp) - new Date(lastA.timestamp)
    })

    container.innerHTML = numbers

        // 🔥 filtro robusto (nome + número + validação)
        .filter(n => {

            const messages = conversationsCache[n]

            if (!messages || !messages.length) return false

            const contactName = (messages[messages.length - 1]?.contact_name || "").toLowerCase()

            return (
                !search ||
                n.includes(search) ||
                contactName.includes(search)
            )
        })

        .map(n => {

            const messages = conversationsCache[n]
            if (!messages || !messages.length) return ""

            const last = messages[messages.length - 1]
            if (!last) return ""

            const preview = getLastMessagePreview(messages)
            const unread = unreadCounter[n] || 0

            const contactName = last.contact_name?.trim() || `+${n}`

            return `
                <div class="chat-conversation ${unread > 0 ? 'has-unread' : ''}" onclick="openChat('${n}')">

                    <div class="conv-info">
                        <strong>${contactName}</strong>

                        <div class="conv-last">
                            ${preview.replace(/\*(.*?)\*/g, "<b>$1</b>") || ""}
                        </div>
                    </div>

                    <div style="display:flex;flex-direction:column;align-items:flex-end">

                        <div class="conv-time">
                            ${last.timestamp ? formatTime(last.timestamp) : ""}
                        </div>

                        ${unread > 0 ? `<span class="chat-unread">${unread}</span>` : ""}

                    </div>

                </div>
            `
        })
        .join("")

    // 🔥 Garantir que o scroll vá para o final depois da renderização
    const chatMessages = document.getElementById("chatMessages") // container das mensagens
    if (chatMessages) {
        requestAnimationFrame(() => {
            chatMessages.scrollTop = chatMessages.scrollHeight
        })
    }
}

/* =========================
   OPEN CHAT
========================= */
function openChat(number) {

    const normalized = normalizeNumber(number)
    currentChatNumber = normalized

    const messages = conversationsCache[normalized] || []

    if (messages.length) {
        // Atualiza o lastSeenTimestamp apenas com a última recebida
        const lastReceived = [...messages].reverse().find(m => m.direction === "received")
        if (lastReceived) {
            lastSeenTimestamp[normalized] = new Date(lastReceived.timestamp).getTime()
        }
    }

    // Zera contador de não lidos
    unreadCounter[normalized] = 0

    // Atualiza cabeçalho
    const contact_name = messages[messages.length - 1]?.contact_name
    const header = document.getElementById("chatHeaderContent")
    if (header && contact_name) header.innerHTML = "Conversando com: " + (contact_name || normalized)

    if (window.innerWidth <= 768) {
        closeSidebar()
    }

    renderChat(messages)
    renderConversations()
    saveState()
}

// Válida tipo de mensagem
function formatMessageText(text) {
    if (!text) return ""

    const urlRegex = /(https?:\/\/[^\s]+)/g
    const videoExtensions = /\.(mp4|webm|ogg)$/i

    return text
        .replace(/\*(.*?)\*/g, "<b>$1</b>")
        .replace(urlRegex, (url) => {
            // Limpa a URL de espaços ou quebras que venham junto
            const cleanUrl = url.trim().split('?')[0];


            // --- FACEBOOK ---
            if (url.includes("facebook.com")) {

                return '<a href="' + url + '" target="_blank" rel="noopener noreferrer" style="color:#4da6ff; text-decoration:underline;">' + url + '</a>';
            }

            // --- INSTAGRAM ---
            if (url.includes("instagram.com")) {
                const igUrl = cleanUrl.endsWith('/') ? cleanUrl : cleanUrl + '/';
                return '<br><iframe src="' + igUrl + 'embed/" width="100%" height="450" frameborder="0" scrolling="no" allowtransparency="true" style="border-radius:8px; margin: 10px 0; background: #fff;"></iframe><br>';
            }

            // --- VÍDEO DIRETO ---
            if (videoExtensions.test(cleanUrl)) {
                return '<br><video src="' + url + '" controls style="max-width:100%; border-radius:8px; margin: 10px 0;">Seu navegador não suporta o vídeo.</video><br>';
            }

            // Link padrão
            return '<a href="' + url + '" target="_blank" rel="noopener noreferrer" style="color:#4da6ff; text-decoration:underline;">' + url + '</a>';
        })
        .replace(/\n/g, "<br>")
}

// Válida o dia da conversa
function getDayLabel(timestamp) {

    const messageDate = new Date(timestamp)
    const today = new Date()

    const normalize = (date) => {
        const d = new Date(date)
        d.setHours(0, 0, 0, 0)
        return d
    }

    const diffTime = normalize(today) - normalize(messageDate)
    const diffDays = diffTime / (1000 * 60 * 60 * 24)

    if (diffDays === 0) return "Hoje"
    if (diffDays === 1) return "Ontem"

    // até 7 dias → nome do dia
    if (diffDays <= 7) {
        return messageDate.toLocaleDateString("pt-BR", { weekday: "long" })
    }

    // muito antigo → data completa
    return formatDay(timestamp)
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

        let dayLabel = getDayLabel(m.timestamp)

        let daySeparator = ""

        if (dayLabel !== lastDay) {
            daySeparator = `<div class="msg-day"> ${dayLabel}</div>`;
            lastDay = dayLabel
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
                ${daySeparator ? `
                    <div style="text-align:center;">
                        ${daySeparator}
                    </div>
                ` : ''}

               ${((m.body && m.body.trim() !== "") && m.body !== '[Mídia recebida]') || (m.has_media && media) ? `
                    <div class="chat-message ${type}">
                        <div class="chat-bubble">
                            ${media}                            
                            
                            ${formatMessageText(m.body)}

                            <div class="msg-meta" style="text-align: right;">
                                <span>${formatTime(m.timestamp)}</span>
                                <span>${m.status || ""}</span>
                            </div>
                        </div>
                    </div>
                ` : ''
            }
`

    }).join("")

    const isNearBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight < 100

    if (isNearBottom) {
        container.scrollTop = container.scrollHeight
    }

    const chatText = document.getElementById("chatText")
    chatText.focus()

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

    if (selectedMedia) {
        selectedMedia.forEach(file => {
            if (file?._previewUrl) {
                URL.revokeObjectURL(file._previewUrl)
            }
        })
    }

    selectedMedia = null

    const input = document.getElementById("chatFile")
    if (input) input.value = ""

    const preview = document.getElementById("mediaPreview")
    if (preview) preview.style.display = "none"
}

/* =========================
   POLLING
========================= */
let isPolling = false
let notifiedMessages = new Set()

async function pollingLoop() {
    // REMOVIDO: messagesPageActive daqui para o polling rodar em segundo plano
    if (!currentSession) {
        setTimeout(pollingLoop, 4000)
        return
    }

    if (isPolling) {
        setTimeout(pollingLoop, 4000)
        return
    }

    isPolling = true
    let hasNewMessage = false

    try {
        const res = await axios.get(`${CONFIG.API_URL}/${currentSession}?limit=50`)
        const messages = res.data?.data || []

        messages.forEach(m => {
            const number = getContactNumber(m);
            if (!number) return;

            if (!conversationsCache[number]) conversationsCache[number] = [];
            if (!conversationsCache[number]._ids) conversationsCache[number]._ids = new Set();

            if (conversationsCache[number]._ids.has(m.id)) return;

            conversationsCache[number]._ids.add(m.id);
            conversationsCache[number].push(m);
            hasNewMessage = true;

            const lastSeen = lastSeenTimestamp[number] || 0;
            const msgTime = new Date(m.timestamp).getTime();

            // Verifica se o chat está aberto E se a tela de mensagens é a que está visível
            const isChatCurrentlyVisible = messagesPageActive && (number === currentChatNumber);

            // 🔊 Lógica de Som e Notificação
            if (m.direction === "received" && msgTime > lastSeen && !notifiedMessages.has(m.id)) {
                notifiedMessages.add(m.id);
                const preview = m.body && m.body !== '[Mídia recebida]' ? m.body : "📎 Mídia";

                // Passamos o number para a função decidir se toca o som
                showNotification(preview, number);
            }

            // 🔢 Contador de Mensagens Não Lidas (atualiza mesmo em outra aba)
            if (m.direction === "received" && msgTime > lastSeen) {
                if (!isChatCurrentlyVisible) {
                    unreadCounter[number] = (unreadCounter[number] || 0) + 1;
                } else {
                    lastSeenTimestamp[number] = msgTime;
                }
                saveState();
            }
        });

        if (hasNewMessage) {
            // Ordena o cache
            Object.keys(conversationsCache).forEach(number => {
                conversationsCache[number].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
            });

            // SÓ RENDERIZA se a página de mensagens estiver ativa no projeto
            if (messagesPageActive) {
                renderConversations();
                if (currentChatNumber && conversationsCache[currentChatNumber]) {
                    renderChat(conversationsCache[currentChatNumber]);
                }
            }
        }

    } catch (e) {
        console.error("Polling error", e)
    } finally {
        isPolling = false
        setTimeout(pollingLoop, 4000)
    }
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
        // console.log("Número enviado:", currentChatNumber)

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