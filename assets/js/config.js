const CONFIG = {
    API_URL: "https://whatsapp.techsystembrasil.com.br/api",
    SOCKET_URL: "https://whatsapp.techsystembrasil.com.br",
    BRAND_NAME: "ZapCloud"
}

window.onload = () => {

    const brand = document.getElementById("brandName")
    const sidebar = document.getElementById("brandSidebar")

    if (brand) brand.innerText = CONFIG.BRAND_NAME
    if (sidebar) sidebar.innerText = CONFIG.BRAND_NAME

    const lastPage = localStorage.getItem("currentPage") || "dashboard"
    console.log("Página inicial carregada:", lastPage)

    if (typeof loadPage === "function") {
        loadPage(lastPage)
    } else {
        // console.error("Função loadPage não encontrada")
    }

};

