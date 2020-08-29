/**
 * This file is part of Mondo.
 * 
 * Mondo is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * Mondo is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with Mondo.  If not, see <https://www.gnu.org/licenses/>.
 */

const usernameAnilist = localStorage.getItem('anilistUsername')
const connectView = document.querySelector('.connect-view')
const disconnectView = document.querySelector('.disconnect-view')

if (usernameAnilist) {
    connectView.classList.remove('active')
    disconnectView.classList.add('active')
} else {
    connectView.classList.add('active')
    disconnectView.classList.remove('active')
}

setEventListeners()

/**
 * Set general event listeners
 */
function setEventListeners() {
    const searchBar = document.querySelector('.anime-search')
    const loginInputs = document.getElementsByClassName('login-input')
    const loginBtn = document.querySelector('.login-btn')
    const disconnectBtn = document.querySelector('.disconnect-btn')

    searchBar.addEventListener('keydown', (event) => {
        if (event.key == 'Enter') {
            window.location.href = `search.html?str=${searchBar.value}`
        }
    })

    loginBtn.addEventListener('click', () => {
        const connectView = document.querySelector('.connect-view')
        const disconnectView = document.querySelector('.disconnect-view')
        const username = loginInputs[0].value
        const accessCode = loginInputs[1].value

        if (username && accessCode) {
            loginInputs[0].value = ''
            loginInputs[1].value = ''
    
            localStorage.setItem('anilistUsername', username)
            localStorage.setItem('accessCode', accessCode)
    
            connectView.classList.remove('active')
            disconnectView.classList.add('active')
        }
    })

    disconnectBtn.addEventListener('click', () => {
        localStorage.removeItem('anilistUsername')
        localStorage.removeItem('accessCode')
        localStorage.removeItem('dataAnilist')

        connectView.classList.add('active')
        disconnectView.classList.remove('active')
    })
}
