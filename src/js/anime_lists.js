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

const dataAnilist = localStorage.getItem('dataAnilist')
const usernameAnilist = localStorage.getItem('anilistUsername')
const updateNotification = document.querySelector('.update-frame')
const updateMessage = document.querySelector('.update-msg')
const updateCloseBtn = document.querySelector('.close-update-btn')
const updateRestartBtn = document.querySelector('.restart-update-btn')
const {remote, ipcRenderer} = require('electron')
const root = document.documentElement

var currentPageList
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
    //ipcRenderer.removeAllListeners('update-available')
    console.log(updateNotification)
    updateNotification.classList.remove('hidden')
})

ipcRenderer.on('update_downloaded', () => {
    ipcRenderer.removeAllListeners('update_downloaded')
    updateMessage.innerText = 'Update downloaded. It will be installed on restart. Restart now?'
    updateCloseBtn.classList.add('hidden')
    updateRestartBtn.classList.remove('hidden')
    updateNotification.classList.remove('hidden')
})

if (localStorage.getItem('lineColor')) {
    lineColor = localStorage.getItem('lineColor')

    root.style.setProperty('--line-color', lineColor)
}

if (dataAnilist) {
    handleData(JSON.parse(dataAnilist))
} else {
    if (usernameAnilist) {
        fetchMediaCollection(usernameAnilist)
    } else {
        addNoListToView()
    }
}

setEventListeners()

/**
 * Fetch information from Anilist API
 * @param {String} username Username
 */
function fetchMediaCollection(username) {
    const query = `
        query ($username: String) {
            MediaListCollection (userName: $username, type: ANIME) {
                lists {
                    name,
                    entries {
                        score,
                        progress,
                        updatedAt,
                        createdAt,
                        media {
                            id,
                            title {
                                english(stylised: false),
                                romaji,
                                native
                            },
                            episodes,
                            coverImage {
                                large
                            }
                        }
                    }
                    isSplitCompletedList,
                    status
                }
            }
        }
    `;

    const variables = {
        username: username
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
    const currentPage = window.location.pathname.split('/').pop()
    const lists = data.data.MediaListCollection.lists
    const animeLists = {
        watching: null,
        completed: new Array(),
        planning: null,
        paused: null,
        dropped: null
    }

    if (!dataAnilist) {
        localStorage.setItem('dataAnilist', JSON.stringify(data))
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
        let completedLists = animeLists.completed.length

        animeLists.completed = animeLists.completed.concat(...animeLists.completed)

        for (let i = 0; i < completedLists; i++) {
            animeLists.completed.splice(0, 1)
        }
    }

    switch (currentPage) {
        case 'watching.html':
            currentPageList = animeLists.watching
            break;

        case 'completed.html':
            currentPageList = animeLists.completed
            break;

        case 'planning.html':
            currentPageList = animeLists.planning
            break;

        case 'paused.html':
            currentPageList = animeLists.paused
            break;

        case 'dropped.html':
            currentPageList = animeLists.dropped
            break;

        default:
            break;
    }

    if (currentPageList) {
        currentPageList.forEach(function (list) {
            if (list.media.title.english) {
                var animeTitle = list.media.title.english
            } else if (list.media.title.romaji) {
                var animeTitle = list.media.title.romaji
            } else {
                var animeTitle = list.media.title.native
            }

            const animeId = list.media.id
            const animeCover = list.media.coverImage.large
            const animeEpisodes = list.media.episodes
            const userProgress = list.progress
            const userScore = list.score

            addAnimeToView(
                animeId,
                animeTitle,
                animeCover,
                animeEpisodes,
                userProgress,
                userScore
            )
        })
    } else {
        addNoListToView()
    }

    addAnimeListCounters(animeLists)
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
 * @param {number} episodes The amount of episodes the anime has when completed
 * @param {number} progress The amount of episodes seen by the user
 * @param {number} score The score of the anime given by the user
 */
function addAnimeToView(id, title, cover, episodes, progress, score) {
    const animeWrap = document.getElementsByClassName('anime-wrap')[0]
    const newAnimeDiv = document.createElement('div')
    const newAnimeImg = document.createElement('img')
    const newAnimeP = document.createElement('p')
    const newAnimeSpan1 = document.createElement('span')
    const newAnimeSpan2 = document.createElement('span')

    newAnimeDiv.classList.add('anime')
    newAnimeImg.src = cover
    newAnimeImg.loading = 'lazy'
    newAnimeP.innerText = title
    newAnimeSpan1.innerText = `${progress}/${episodes ? episodes : '?'}`
    newAnimeSpan2.innerText = score == 0 ? '-' : score

    newAnimeDiv.appendChild(newAnimeImg)
    newAnimeDiv.appendChild(newAnimeP)
    newAnimeDiv.appendChild(newAnimeSpan1)
    newAnimeDiv.appendChild(newAnimeSpan2)

    newAnimeDiv.addEventListener('click', function () {
        window.location.href = `anime.html?id=${id}`
    })

    animeWrap.appendChild(newAnimeDiv)
}

/**
 * Set general event listeners
 */
function setEventListeners() {
    const searchBar = document.querySelector('.anime-search')
    const sortBtn = document.querySelector('.sort-btn')
    const options = document.querySelector('.options')
    const optionsA = options.getElementsByTagName('a')

    updateCloseBtn.addEventListener('click', () => {
        updateNotification.classList.add('hidden')
    })

    updateRestartBtn.addEventListener('click', () => {
        ipcRenderer.send('restart-app')
    })

    searchBar.addEventListener('input', function () {
        const animeDivs = document.getElementsByClassName('anime')

        for (let i = 0; i < animeDivs.length; i++) {
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

    sortBtn.addEventListener('click', () => {
        const arrowUp = sortBtn.getElementsByTagName('i')[0]

        if (options.style.maxHeight != '200px') {
            arrowUp.style.transform = 'translateY(3px) rotate(180deg)'
            options.style.maxHeight = '200px'
        } else {
            arrowUp.style.transform = 'translateY(3px) rotate(0deg)'
            options.style.maxHeight = '0'
        }
    })

    for (let i = 0; i < optionsA.length; i++) {
        optionsA[i].addEventListener('click', () => {
            const animeDivs = document.querySelectorAll('.anime')

            sortBtn.innerHTML = optionsA[i].innerHTML + '<i class="fas fa-angle-up"></i>'
            options.style.maxHeight = '0'

            if (currentPageList) {
                for (let i = 0; i < animeDivs.length; i++) {
                    animeDivs[i].remove()
                }

                currentPageList.sort(compareParams(optionsA[i].id, optionsA[i].id == 'media.title.english' ? 'asc' : 'desc'))

                currentPageList.forEach(function (list) {
                    if (list.media.title.english) {
                        var animeTitle = list.media.title.english
                    } else if (list.media.title.romaji) {
                        var animeTitle = list.media.title.romaji
                    } else {
                        var animeTitle = list.media.title.native
                    }
        
                    const animeId = list.media.id
                    const animeCover = list.media.coverImage.large
                    const animeEpisodes = list.media.episodes
                    const userProgress = list.progress
                    const userScore = list.score
        
                    addAnimeToView(
                        animeId,
                        animeTitle,
                        animeCover,
                        animeEpisodes,
                        userProgress,
                        userScore
                    )
                })
            }
        })
    }
}

/**
 * Displays a message when no anime content to show
 */
function addNoListToView() {
    const animeWrap = document.querySelector('.anime-wrap')
    const noListDiv = document.createElement('div')

    noListDiv.classList.add('no-list')
    noListDiv.innerHTML = 'Nothing to show around here'

    animeWrap.appendChild(noListDiv)
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

function compareParams(key, order = 'asc') {
    key = key.split('.')

	return function innerSort(a, b) {
        var varA, varB

        if (!a.hasOwnProperty(key[0]) || !b.hasOwnProperty(key[0])) {
			return 0;
        }

        varA = a[key[0]]
        varB = b[key[0]]

        if (key.length > 1) {
            for (let i = 1; i < key.length; i++) {
                varA = varA[key[i]]
                varB = varB[key[i]]
            }
        }

		varA = (typeof varA === 'string') ? varA.toUpperCase() : varA;
		varB = (typeof varB === 'string') ? varB.toUpperCase() : varB;
		let comparison = 0;

		if (varA > varB) {
			comparison = 1;
		} else if (varA < varB) {
			comparison = -1;
		}

		return (
			(order === 'desc') ? (comparison * -1) : comparison
		);
	};
}
