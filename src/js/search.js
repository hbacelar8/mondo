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

import { getUrlParam } from './utils.js'

const dataAnilist = localStorage.getItem('dataAnilist')
const searchStr = getUrlParam('str', null).replace(/%20/g, ' ')
const searchBar = document.querySelector('.anime-search')
const {remote, ipcRenderer} = require('electron')

const updateNotification = document.querySelector('.update-frame')
const updateMessage = document.querySelector('.update-msg')
const updateCloseBtn = document.querySelector('.close-update-btn')
const updateRestartBtn = document.querySelector('.restart-update-btn')
const root = document.documentElement

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

fetchSearch(searchStr)
setEventListeners()

/**
 * Fetch information from Anilist API
 * @param {String} search String to search
 */
function fetchSearch(search) {
    const query = `
        query ($perPage: Int, $search: String) {
            Page (perPage: $perPage) {
                pageInfo {
                    total,
                    currentPage,
                    lastPage,
                    hasNextPage,
                    perPage
                }
                media (search: $search, type: ANIME) {
                    id,
                    title {
                        english(stylised: false),
                        romaji,
                        native
                    },
                    coverImage {
                        large
                    }
                }
            }
        }
    `;

    const variables = {
        search: search,
        perPage: 50
    };

    const url = 'https://graphql.anilist.co',
        options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                query: query,
                variables: variables
            })
        };

    fetch(url, options).then(handleResponse)
                       .then(handleData)
                       .catch(handleError);
}

/**
 * Handle response from server
 * @param {object} response server's response
 */
function handleResponse(response) {
    return response.json().then(function (json) {
        return response.ok ? json : Promise.reject(json);
    });
}

/**
 * Handle data received from server
 * @param {object} data Data received from server
 */
function handleData(data) {
    const searchList = data.data.Page.media

    searchList.forEach(function (media) {
        if (media.title.english) {
            var title = media.title.english
        } else if (media.title.romaji) {
            var title = media.title.romaji
        } else {
            var title = media.title.native
        }

        var id = media.id
        var cover = media.coverImage.large

        addAnimeToView(id, title, cover)
    })
}

/**
 * Handle error from server request
 * @param {object} error Array with error information
 */
function handleError(error) {
    alert('Error, check console');
    console.error(error);
}

/**
 * Add anime to HTML
 * @param {number} id Anime ID
 * @param {string} title Anime title
 * @param {string} cover Link to anime cover image
 */
function addAnimeToView(id, title, cover) {
    const animeWrap = document.querySelector('.anime-wrap'),
        animeDiv = document.createElement('div'),
        animeImg = document.createElement('img'),
        animeP = document.createElement('p')

    animeDiv.classList.add('anime')
    animeImg.src = cover
    animeImg.loading = 'lazy'
    animeP.innerText = title

    animeDiv.appendChild(animeImg)
    animeDiv.appendChild(animeP)

    animeDiv.addEventListener('click', function() {
        window.location.href = `anime.html?id=${id}`
    })

    animeWrap.appendChild(animeDiv)
}

/**
 * Set general event listeners
 */
function setEventListeners() {
    updateCloseBtn.addEventListener('click', () => {
        updateNotification.classList.add('hidden')
    })

    updateRestartBtn.addEventListener('click', () => {
        ipcRenderer.send('restart-app')
    })

    searchBar.addEventListener('input', function () {
        const animeDivs = document.getElementsByClassName('anime')
    
        for (let i = 0; i < animeDivs.length; i ++) {
            const animeTitle = animeDivs[i].getElementsByTagName('p')[0]
            const titleText = animeTitle.textContent || animeTitle.innerHTML
    
            if (titleText.toUpperCase().indexOf(searchBar.value.toUpperCase()) > -1) {
                animeDivs[i].style.display = '';
            } else {
                animeDivs[i].style.display = 'none'
            }
        }
    })
    
    searchBar.addEventListener('keydown', function (event) {
        if (event.key == 'Enter') {
            window.location.href = `search.html?str=${searchBar.value}`
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
