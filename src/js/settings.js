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

const {remote, ipcRenderer} = require('electron')
const dataAnilist = localStorage.getItem('dataAnilist')
const usernameAnilist = localStorage.getItem('anilistUsername')
const connectView = document.querySelectorAll('.connect-view')
const disconnectView = document.querySelectorAll('.disconnect-view')
const connectedUser = document.querySelector('.connected-user')
const root = document.documentElement

const updateNotification = document.querySelector('.update-frame')
const updateMessage = document.querySelector('.update-msg')
const updateCloseBtn = document.querySelector('.close-update-btn')
const updateRestartBtn = document.querySelector('.restart-update-btn')

var lineColor = '#487eb0'

document.querySelector('.min').addEventListener('click', () => {
    let window = remote.getCurrentWindow()
    window.minimize()
})

document.querySelector('.max').addEventListener('click', () => {
    let window = remote.getCurrentWindow()

    if (!window.isMaximized()) {
        window.maximize()    
    } else {
        window.unmaximize()
    }
})

document.querySelector('.close').addEventListener('click', () => {
    let window = remote.getCurrentWindow()
    window.close()
})

ipcRenderer.on('update_available', () => {
    ipcRenderer.removeAllListeners('update-available')
    updateNotification.classList.remove('hidden')
})

ipcRenderer.on('update_downloaded', () => {
    ipcRenderer.removeAllListeners('update_downloaded')
    updateMessage.innerText = 'Update downloaded. It will be installed on restart. Restart now?'
    updateCloseBtn.classList.add('hidden')
    updateRestartBtn.classList.remove('hidden')
})

if (usernameAnilist) {
    for (let i = 0; i < connectView.length; i++) {
        connectView[i].classList.add('hidden')
    }

    for (let i = 0; i < disconnectView.length; i++) {
        disconnectView[i].classList.remove('hidden')
    }

    connectedUser.innerHTML = `Connected as ${usernameAnilist}`
} else {
    for (let i = 0; i < connectView.length; i++) {
        connectView[i].classList.remove('hidden')
    }

    for (let i = 0; i < disconnectView.length; i++) {
        disconnectView[i].classList.add('hidden')
    }
}

if (localStorage.getItem('lineColor')) {
    lineColor = localStorage.getItem('lineColor')

    root.style.setProperty('--line-color', lineColor)
}

if (dataAnilist) {
    const lists = JSON.parse(dataAnilist).data.MediaListCollection.lists
    const animeLists = {
        watching: null,
        completed: new Array(),
        planning: null,
        paused: null,
        dropped: null
    }

    for (let i = 0; i < lists.length; i++) {
        if (lists[i].name == 'Watching') {
            animeLists.watching = lists[i].entries
        } else if (lists[i].name == 'Planning') {
            animeLists.planning = lists[i].entries
        } else if (lists[i].name == 'Paused') {
            animeLists.paused = lists[i].entries
        } else if (lists[i].name == 'Dropped') {
            animeLists.dropped = lists[i].entries
        } else {
            animeLists.completed.push(lists[i].entries)
        }
    }

    if (animeLists.completed.length) {
        animeLists.completed = animeLists.completed.concat(...animeLists.completed)
        animeLists.completed.splice(0, 1)
        animeLists.completed.splice(0, 1)
    }

    addAnimeListCounters(animeLists)
}

setEventListeners()

/**
 * Set general event listeners
 */
function setEventListeners() {
    const searchBar = document.querySelector('.anime-search')
    const loginInputs = document.getElementsByClassName('login-input')
    const loginBtn = document.querySelector('.anilist-login-btn')
    const disconnectBtn = document.querySelector('.disconnect-btn')
    const resyncBtn = document.querySelector('.resync-btn')
    const colorsBtn = document.querySelectorAll('.colors')

    updateCloseBtn.addEventListener('click', () => {
        updateNotification.classList.add('hidden')
    })

    updateRestartBtn.addEventListener('click', () => {
        ipcRenderer.send('restart-app')
    })

    searchBar.addEventListener('keydown', (event) => {
        if (event.key == 'Enter') {
            window.location.href = `search.html?str=${searchBar.value}`
        }
    })

    loginBtn.addEventListener('click', () => {
        const accessCode = loginInputs[0].value
        const username = loginInputs[1].value

        if (username && accessCode) {
            loginInputs[0].value = ''
            loginInputs[1].value = ''
    
            localStorage.setItem('anilistUsername', username)
            localStorage.setItem('accessCode', accessCode)

            for (let i = 0; i < connectView.length; i++) {
                connectView[i].classList.add('hidden')
            }

            for (let i = 0; i < disconnectView.length; i++) {
                disconnectView[i].classList.remove('hidden')
            }

            connectedUser.innerHTML = `Connected as ${username}`
        }
    })

    disconnectBtn.addEventListener('click', () => {
        localStorage.removeItem('anilistUsername')
        localStorage.removeItem('accessCode')
        localStorage.removeItem('dataAnilist')

        for (let i = 0; i < connectView.length; i++) {
            connectView[i].classList.remove('hidden')
        }

        for (let i = 0; i < disconnectView.length; i++) {
            disconnectView[i].classList.add('hidden')
        }
    })

    resyncBtn.addEventListener('click', () => {
        localStorage.removeItem('dataAnilist')
    })

    for (let i = 0; i < colorsBtn.length; i++) {
        colorsBtn[i].addEventListener('click', () => {
            localStorage.setItem('lineColor', colorsBtn[i].id)

            document.location.reload()
        })
    }

    loginInputs[1].addEventListener('keydown', (event) => {
        if (event.key == 'Enter') {
            const accessCode = loginInputs[0].value
            const username = loginInputs[1].value
    
            if (username && accessCode) {
                loginInputs[0].value = ''
                loginInputs[1].value = ''
        
                localStorage.setItem('anilistUsername', username)
                localStorage.setItem('accessCode', accessCode)
    
                for (let i = 0; i < connectView.length; i++) {
                    connectView[i].classList.add('hidden')
                }
    
                for (let i = 0; i < disconnectView.length; i++) {
                    disconnectView[i].classList.remove('hidden')
                }
    
                connectedUser.innerHTML = `Connected as ${username}`
            }
        }
    })
}

function addAnimeListCounters(animeLists) {
    const counters = document.querySelector('.anime-lists-menu').getElementsByTagName('P')

    for (let i = 0; i < counters.length; i++) {
        let listLinkName = counters[i].previousSibling.nodeValue

        switch (listLinkName) {
            case 'Watching':
                counters[i].innerHTML = animeLists.watching ? animeLists.watching.length : 0
                break;

            case 'Completed':
                counters[i].innerHTML = animeLists.completed ? animeLists.completed.length : 0
                break;

            case 'Planning':
                counters[i].innerHTML = animeLists.planning ? animeLists.planning.length : 0
                break;

            case 'Paused':
                counters[i].innerHTML = animeLists.paused ? animeLists.paused.length : 0
                break;

            case 'Dropped':
                counters[i].innerHTML = animeLists.dropped ? animeLists.dropped.length : 0
                break;
        
            default:
                break;
        }
    }
}
