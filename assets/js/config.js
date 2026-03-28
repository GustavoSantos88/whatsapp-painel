const CONFIG = {
    API_URL: "/api",
    SOCKET_URL: window.location.origin,
    BRAND_NAME: "ZapCloud"
}

document.addEventListener("DOMContentLoaded", () => {
    const brand = document.getElementById("brandName")
    const sidebar = document.getElementById("brandSidebar")

    if (brand) brand.innerText = CONFIG.BRAND_NAME
    if (sidebar) sidebar.innerText = CONFIG.BRAND_NAME
})