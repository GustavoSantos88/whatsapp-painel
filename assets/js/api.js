axios.interceptors.request.use(config => {
    const token = localStorage.getItem("token")
    const role = localStorage.getItem("role")

    if (token && role) {
        if (role === 'admin') {
            config.headers["X-ADMIN-KEY"] = token
        } else {
            // default: user
            config.headers["X-API-KEY"] = token
        }
    }

    // console.table(config.headers)
    return config
})