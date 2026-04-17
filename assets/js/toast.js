/**
 * @param {string} message
 * @param {'info' | 'success' | 'error'} [type]
 */
function toast(message, type = 'info') {
  let container = document.getElementById('toast-container')
  if (!container) {
    container = document.createElement('div')
    container.id = 'toast-container'
    container.className = 'toast-container'
    container.setAttribute('aria-live', 'polite')
    document.body.appendChild(container)
  }

  const el = document.createElement('div')
  el.className = `toast toast--${type}`
  el.textContent = message
  container.appendChild(el)

  requestAnimationFrame(() => el.classList.add('toast--visible'))

  const dismissMs = type === 'error' ? 5500 : 4200
  setTimeout(() => {
    el.classList.remove('toast--visible')
    setTimeout(() => el.remove(), 280)
  }, dismissMs)
}
