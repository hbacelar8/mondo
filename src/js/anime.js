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

import {getUrlParam, convertSecondsToDHM, compareParams} from './utils.js'
import {getTorrents} from './scrap.js'

const {remote, ipcRenderer} = require('electron')
const childProcess = require('child_process')
const anitomy = require('anitomy-js')
const pathModule = require('path')
const fs = require('fs')

const dataAnilist = localStorage.getItem('dataAnilist')
const accesCode = localStorage.getItem('accessCode')
const animeId = getUrlParam('id', null)

const updateNotification = document.querySelector('.update-frame')
const updateMessage = document.querySelector('.update-msg')
const updateCloseBtn = document.querySelector('.close-update-btn')
const updateRestartBtn = document.querySelector('.restart-update-btn')
const root = document.documentElement

var anime
var torrents = []
var localEpisodes = {}
var animeFolders = localStorage.getItem('animeFolders')
var lineColor = '#487eb0'

const MEDIA_STATUS = {
    FINISHED: 'Finished',
    RELEASING: 'Releasing',
    NOT_YET_RELEASED: 'Not Yet Released',
    CANCELLED: 'Cancelled'
}

const MEDIA_ENTRY_STATUS = {
    CURRENT: 'Watching',
    PLANNING: 'Planning',
    COMPLETED: 'Completed',
    DROPPED: 'Dropped',
    PAUSED: 'Paused',
    REPEATING: 'Repeating',
    NONE: 'Edit',
    Watching: 'CURRENT',
    Planning: 'PLANNING',
    Completed: 'COMPLETED',
    Dropped: 'DROPPED',
    Paused: 'PAUSED',
    Repeating: 'REPEATING'
}

const MEDIA_SOURCE = {
    ORIGINAL: 'Original',
    MANGA: 'Manga',
    LIGHT_NOVEL: 'Light Novel',
    VISUAL_NOVEL: 'Visual Novel',
    VIDEO_GAME: 'Video Game',
    OTHER: 'Other',
    NOVEL: 'Novel',
    DOUJINSHI: 'Doujinshi',
    ANIME: 'Anime'
}

const MEDIA_SEASON = {
    WINTER: 'Winter',
    SPRING: 'Spring',
    SUMMER: 'Summer',
    FALL: 'Fall'
}

const RELATION_TYPE = {
    ADAPTATION: 'Adaptation',
    PREQUEL: 'Prequel',
    SEQUEL: 'Sequel',
    ALTERNATIVE: 'Alternative',
    SPIN_OFF: 'Spin Off',
    SIDE_STORY: 'Side Story',
    CHARACTER: 'Character',
    SUMMARY: 'Summary',
    OTHER: 'Other',
    PARENT: 'Parent'
}

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

if (animeFolders) {
    animeFolders = JSON.parse(animeFolders)

    if (animeFolders[animeId]) {
        const selFolderInput = document.querySelector('.sel-folder-input')

        selFolderInput.value = animeFolders[animeId]
    
        fs.readdir(animeFolders[animeId], getLocalEpisodes)
    }
}

fetchAnime(animeId)

/* ---------------------------------------------------------------------------- */

/**
 * Fetch anime information from Anilist DB
 * @param {number} id Anime ID
 */
function fetchAnime(id) {
    const query = `
        query ($id: Int) {
            Media (id: $id, type: ANIME) {
                title {
                    english,
                    romaji,
                    native
                },
                format,
                status,
                startDate {
                    month,
                    year
                },
                endDate {
                    month,
                    year
                },
                season,
                seasonYear,
                episodes,
                duration,
                countryOfOrigin,
                source,
                averageScore,
                meanScore,
                popularity,
                favourites,
                studios {
                    nodes {
                        name
                    }
                },
                nextAiringEpisode {
                    timeUntilAiring,
                    episode
                },
                mediaListEntry {
                    progress,
                    status,
                    score(format: POINT_100)
                },
                coverImage {
                    large
                },
                bannerImage,
                description(asHtml: false),
                relations {
                    edges {
                        relationType,
                        node {
                            id,
                            coverImage {
                                large
                            }
                        }
                    }
                }
            }
        }
    `;

    const variables = {
        id: id
    };

    const url = 'https://graphql.anilist.co',
        options = accesCode ? {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + accesCode,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                query: query,
                variables: variables
            })
        } : {
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
    anime = data.data.Media
    const relationsData = data.data.Media.relations.edges

    const overviewData = {
        airing: anime.nextAiringEpisode ? `Ep. ${anime.nextAiringEpisode.episode}: ${convertSecondsToDHM(anime.nextAiringEpisode.timeUntilAiring)}` : null,
        format: anime.format,
        episodes: anime.episodes,
        Episode_Duration: anime.duration ? anime.duration + 'mins': null,
        status: anime.status,
        Start_Date: anime.startDate.month ? anime.startDate.month + ', ' + anime.startDate.year : null,
        End_Date: anime.endDate.month ? anime.endDate.month + ', ' + anime.endDate.year: null,
        season: anime.season ? [anime.season, anime.seasonYear] : null,
        Average_Score: anime.averageScore ? anime.averageScore + '%': null,
        Mean_Score: anime.meanScore ? anime.meanScore + '%': null,
        popularity: anime.popularity,
        favorites: anime.favourites,
        studio: anime.studios.nodes.length ? anime.studios.nodes[0].name : null,
        source: anime.source
    }

    const animeUserInfo = {
        progress: anime.mediaListEntry ? anime.mediaListEntry.progress : 0,
        status: anime.mediaListEntry ? anime.mediaListEntry.status : 'NONE',
        score: anime.mediaListEntry ? anime.mediaListEntry.score : 0
    }

    if (anime.title.english) {
        var title = anime.title.english
    } else if (anime.title.romaji) {
        var title = anime.title.romaji
    } else {
        var title = anime.title.native
    }

    var cover = anime.coverImage.large,
        banner = anime.bannerImage,
        synopsis = anime.description

    if (synopsis) {
        synopsis = synopsis.replace(/<br>|<\/br>|<i>|<\/i>|<strong>|<\/strong>|<em>|<\/em>/g, '')
    }

    addAnimeToPage(title, cover, banner, synopsis, animeUserInfo)
    addOverviewToPage(overviewData)
    addRelationsToPage(relationsData)
    setEventListeners()
    getTorrents(anime.title).then(handleTorrents)
}

/**
 * Handle error from server request
 * @param {object} error Array with error information
 */
function handleError(error) {
    alert('Error loading anime content.');
    console.error(error);
}

/**
 * Add anime to HTML
 * @param {string} title Anime's title
 * @param {string} cover Link to anime's cover image
 * @param {string} banner Link to anime's banner image
 * @param {string} synopsis Anime's synopsis
 */
function addAnimeToPage(title, cover, banner, synopsis, animeUserInfo) {
    const animeBannerDiv = document.querySelector('.banner'),
        animeCoverDiv = document.querySelector('.cover'),
        animeAboutDiv = document.querySelector('.about'),
        readMoreBtnP = document.querySelector('.read-more'),
        animeBannerImg = document.createElement('img'),
        animeCoverImg = document.createElement('img'),
        animeTitleP = document.createElement('p'),
        animeSynopsisP = document.createElement('p'),
        dropdownStatusBtn = document.querySelector('.dropdown-status-btn'),
        progressInput = document.querySelector('.progress-input'),
        scoreInput = document.querySelector('.score-input'),
        animeWatchBtn = document.createElement('a'),
        editAnimeBtn = document.createElement('a')

    animeTitleP.classList.add('title')
    animeSynopsisP.classList.add('synopsis')
    animeWatchBtn.classList.add('watch-btn')
    editAnimeBtn.classList.add('edit-btn')

    animeBannerImg.src = banner
    animeCoverImg.src = cover
    animeTitleP.innerText = title
    animeSynopsisP.innerText = synopsis
    animeSynopsisP.style.lineHeight = '25px'
    animeWatchBtn.innerHTML = `Watch Ep. ${animeUserInfo.progress == anime.episodes ? animeUserInfo.progress : animeUserInfo.progress + 1}/${anime.episodes}`
    editAnimeBtn.innerHTML = MEDIA_ENTRY_STATUS[animeUserInfo.status] + '<i class="fas fa-pen"></i>'
    dropdownStatusBtn.innerHTML = MEDIA_ENTRY_STATUS[animeUserInfo.status]
    progressInput.value = animeUserInfo.progress
    scoreInput.value = animeUserInfo.score

    animeAboutDiv.insertBefore(animeTitleP, animeAboutDiv.children[0])
    animeAboutDiv.insertBefore(animeSynopsisP, animeAboutDiv.children[1])
    animeCoverDiv.appendChild(animeCoverImg)

    if (accesCode) {
        animeCoverDiv.appendChild(animeWatchBtn)
        animeCoverDiv.appendChild(editAnimeBtn)
    }

    if (banner) {
        animeBannerDiv.appendChild(animeBannerImg)
    } else {
        const mainDiv = document.querySelector('.main')
        mainDiv.style.transform = 'translateY(-200px)'
    }

    if (animeAboutDiv.scrollHeight - animeAboutDiv.clientHeight) {
        readMoreBtnP.style.display = 'block'
    } else {
        readMoreBtnP.style.display = 'none'
    }
}

/**
 * Add anime overview information to HTML page
 * @param {object} overviewData Overview information from anime
 */
function addOverviewToPage(overviewData) {
    const overviewDiv = document.querySelector('.overview')

    for (let [key, value] of Object.entries(overviewData)) {
        switch (key) {
            case 'airing':
                if (value) {
                    var div = document.createElement('div')
                    var p1 = document.createElement('p')
                    var p2 = document.createElement('p')
                    p2.style.color = getComputedStyle(document.body).getPropertyValue('--line-color')
    
                    p1.innerText = 'Airing'
                    p2.innerText = value
    
                    div.appendChild(p1)
                    div.appendChild(p2)
                    overviewDiv.appendChild(div)
                }
                break

            case 'status':
                var div = document.createElement('div')
                var p1 = document.createElement('p')
                var p2 = document.createElement('p')

                p1.innerText = 'Status'
                p2.innerText = MEDIA_STATUS[value]

                div.appendChild(p1)
                div.appendChild(p2)
                overviewDiv.appendChild(div)
                break

            case 'season':
                if (value) {
                    var div = document.createElement('div')
                    var p1 = document.createElement('p')
                    var p2 = document.createElement('p')
    
                    p1.innerText = 'Season'
                    p2.innerText = MEDIA_SEASON[value[0]] + ', ' + value[1]
    
                    div.appendChild(p1)
                    div.appendChild(p2)
                    overviewDiv.appendChild(div)
                }
                break
            
            case 'source':
                if (value) {
                    var div = document.createElement('div')
                    var p1 = document.createElement('p')
                    var p2 = document.createElement('p')
    
                    p1.innerText = 'Source'
                    p2.innerText = MEDIA_SOURCE[value]
    
                    div.appendChild(p1)
                    div.appendChild(p2)
                    overviewDiv.appendChild(div)
                }
                break

            default:
                if (value) {
                    var div = document.createElement('div')
                    var p1 = document.createElement('p')
                    var p2 = document.createElement('p')
    
                    p1.innerText = (key.charAt(0).toUpperCase() + key.slice(1)).replace('_', ' ')
                    p2.innerText = value
    
                    div.appendChild(p1)
                    div.appendChild(p2)
                    overviewDiv.appendChild(div)
                }
                break
        }
    }
}

/**
 * Add anime relations information to HTML page
 * @param {object} relationsData Anime relations info
 */
function addRelationsToPage(relationsData) {
    const animeRelationsDiv = document.querySelector('.anime-relations')

    for (let i = 0; i < relationsData.length; i++) {
        if (relationsData[i].relationType == 'ADAPTATION') {
            continue
        }

        let relationDiv = document.createElement('div')
        let relationImg = document.createElement('img')
        let relationP = document.createElement('p')

        relationDiv.classList.add('relation-div')
        relationImg.src = relationsData[i].node.coverImage.large
        relationP.innerText = RELATION_TYPE[relationsData[i].relationType]
        relationDiv.id = relationsData[i].node.id

        relationDiv.appendChild(relationImg)
        relationDiv.appendChild(relationP)
        animeRelationsDiv.appendChild(relationDiv)
    }
}

/**
 * Set general event listeners
 */
function setEventListeners() {
    const animeAboutDiv = document.querySelector('.about'),
        readMoreBtnP = document.querySelector('.read-more'),
        readMoreBtnA = document.querySelector('.button'),
        menuTabs = document.getElementsByClassName('tab'),
        tabContent = document.getElementsByClassName('tab-content'),
        relations = document.getElementsByClassName('relation-div'),
        tableThs = document.getElementsByTagName('TH'),
        editBtn = document.querySelector('.edit-btn'),
        editBox = document.querySelector('.edit-box'),
        closeEditBox = document.querySelector('.close-edit-box'),
        dropdownStatusBtn = document.querySelector('.dropdown-status-btn'),
        dropdownStatusMenu = document.querySelector('.dropdown-status-menu'),
        dropdownBtnA = dropdownStatusMenu.getElementsByTagName('a'),
        progressInput = document.querySelector('.progress-input'),
        scoreInput = document.querySelector('.score-input'),
        saveEditBtn = document.querySelector('.save-btn'),
        selFolderBtn = document.querySelector('.sel-folder-btn'),
        selFolderInput = document.querySelector('.sel-folder-input'),
        playBtn = document.querySelector('.watch-btn')

    updateCloseBtn.addEventListener('click', () => {
        updateNotification.classList.add('hidden')
    })

    updateRestartBtn.addEventListener('click', () => {
        ipcRenderer.send('restart-app')
    })

    readMoreBtnA.addEventListener('click', function () {
        animeAboutDiv.style.height = 'unset'
        readMoreBtnP.style.display = 'none'
    })

    Array.prototype.forEach.call(menuTabs, tab => {
        tab.addEventListener('click', function () {
            const target = document.querySelector(tab.dataset.tabTarget)

            Array.prototype.forEach.call(tabContent, content => {
                content.classList.remove('active')
            })

            target.classList.add('active')
        })
    })

    window.addEventListener('resize', function () {
        animeAboutDiv.style.height = '185px'

        if (animeAboutDiv.scrollHeight - animeAboutDiv.clientHeight) {
            readMoreBtnP.style.display = 'block'
        } else {
            readMoreBtnP.style.display = 'none'
        }
    })

    for (let i = 0; i < relations.length; i++) {
        relations[i].addEventListener('click', () => {
            window.location.href = `anime.html?id=${relations[i].id}`
        })
    }

    for (let i = 0; i < tableThs.length; i++) {
        if (i != 4) {
            tableThs[i].setAttribute('data-after', '▲')

            tableThs[i].addEventListener('click', () => {
                var tableTrs = document.getElementsByTagName('TR')
                let length = tableTrs.length
    
                for (let i = 1; i < length; i++) {
                    tableTrs[1].remove()
                }
    
                if (tableThs[i].getAttribute('data-after') == '▲') {
                    tableThs[i].setAttribute('data-after', '▼')
    
                    handleTorrents(torrents.sort(compareParams(tableThs[i].id, 'desc')))
                } else {
                    tableThs[i].setAttribute('data-after', '▲')
    
                    handleTorrents(torrents.sort(compareParams(tableThs[i].id, 'asc')))
                }
            })
        }
    }

    if (editBtn) {
        editBtn.addEventListener('click', () => {
            editBox.style.height = '430px'
        })
    }

    closeEditBox.addEventListener('click', () => {
        editBox.style.height = '0'
    })

    dropdownStatusBtn.addEventListener('click', () => {
        dropdownStatusMenu.style.height = '150px'
    })

    for (let i = 0; i < dropdownBtnA.length; i++) {
        dropdownBtnA[i].addEventListener('click', () => {
            dropdownStatusBtn.innerHTML = dropdownBtnA[i].innerText
        })
    }

    progressInput.addEventListener('input', () => {
        if (progressInput.value > anime.episodes) {
            progressInput.value = anime.episodes
        } else if (progressInput.value < 0) {
            progressInput.value = 0
        } else {
            progressInput.value = Math.floor(progressInput.value)
        }
    })

    scoreInput.addEventListener('input', () => {
        if (scoreInput.value > 100) {
            scoreInput.value = 100
        } else if (scoreInput.value < 0) {
            scoreInput.value = 0
        } else {
            scoreInput.value = Math.floor(scoreInput.value)
        }
    })

    saveEditBtn.addEventListener('click', () => {
        let newStatus = dropdownStatusBtn.innerHTML
        let newProgress = progressInput.value
        let newScore = scoreInput.value

        pushEditToAnilist(newStatus, newProgress, newScore)
    })

    selFolderBtn.addEventListener('click', () => {
        const path = remote.dialog.showOpenDialogSync({
            properties: ['openDirectory']
        })[0].replace(/\\/g, '/')

        if (path) {
            selFolderInput.value = path ? path : ''
            saveAnimeFolder(path)
        }
    })

    if (playBtn) {
        playBtn.addEventListener('click', () => {
            if (animeFolders) {
                if (animeFolders[animeId]) {
                    playAnime()
                } else {
                    alert('In order to play the episode, you must first set the anime folder containing its episodes in the Configure tab.')
                }
            } else {
                alert('In order to play the episode, you must first set the anime folder containing its episodes in the Configure tab.')
            }
        })
    }

    document.addEventListener('keydown', (evt) => {
        if (evt.key == 'Escape') {
            editBox.style.height = '0'
        }
    })

    document.addEventListener('click', (event) => {
        if (!dropdownStatusBtn.contains(event.target)) {
            dropdownStatusMenu.style.height = '0'
        }
    })
}

/**
 * Add anime list count to side menu
 * @param {object} animeLists Object conatining all anime lists
 */
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

/**
 * Funtion to handle watch button
 */
function playAnime() {
    const episodeToWatch = anime.mediaListEntry.progress + 1
    const updateDiscordData = {
        details: anime.title.english ? anime.title.english : anime.title.romaji,
        state: `Episode ${episodeToWatch} of ${anime.episodes}`
    }

    ipcRenderer.send('updateDiscord', updateDiscordData);

    childProcess.spawnSync(localEpisodes[episodeToWatch], {shell: true})

    ipcRenderer.send('updateDiscord', {
        details: '',
        state: 'Idling'
    })

    if (confirm(`Mark episode ${episodeToWatch} as watched?`)) {
        anime.mediaListEntry.progress += 1

        if (episodeToWatch + 1 <= anime.episodes) {
            pushEpisodeToAnilist(episodeToWatch)
        } else {
            pushAnimeFinishedToAnilist()
        }
    }
}

/**
 * Add torrents table to HTML page
 * @param {object} data List of torrents information
 */
function handleTorrents(data) {
    const table = document.querySelector('.table-content')
    const loadingIcon = document.querySelector('.lds-dual-ring')

    // Avoid updating gloval variable torrents when sorting
    if (torrents.length != data.length || torrents.length == 75) {
        Array.prototype.push.apply(torrents, data)
    }

    for (let i = 0; i < data.length; i++) {
        let tr = document.createElement('tr')
        let sourceTd = document.createElement('td')
        let nameTd = document.createElement('td')
        let episodeTd = document.createElement('td')
        let videoTd = document.createElement('td')
        let linkTd = document.createElement('td')
        let sizeTd = document.createElement('td')
        let seedTd = document.createElement('td')
        let leechTd = document.createElement('td')
        let downloadTd = document.createElement('td')
        let downloadLink = document.createElement('a')
        let magneticLink = document.createElement('a')

        sourceTd.innerHTML = data[i].source
        nameTd.innerHTML = data[i].name
        episodeTd.innerHTML = data[i].episode
        videoTd.innerHTML = data[i].video
        sizeTd.innerHTML = data[i].size
        seedTd.innerHTML = data[i].seeds
        leechTd.innerHTML = data[i].leechs
        downloadTd.innerHTML = data[i].downloadNumber
        downloadLink.href = data[i].downloadLink
        magneticLink.href = data[i].magneticLink
        downloadLink.innerHTML = '<i class="fas fa-download"></i>'
        magneticLink.innerHTML = '<i class="fas fa-magnet"></i>'

        linkTd.appendChild(downloadLink)
        linkTd.appendChild(magneticLink)
        
        tr.appendChild(sourceTd)
        tr.appendChild(nameTd)
        tr.appendChild(episodeTd)
        tr.appendChild(videoTd)
        tr.appendChild(linkTd)
        tr.appendChild(sizeTd)
        tr.appendChild(seedTd)
        tr.appendChild(leechTd)
        tr.appendChild(downloadTd)

        table.appendChild(tr)
    }

    loadingIcon.style.display = 'none'
}

/**
 * Update data on Anilist
 * @param {String} status New anime status
 * @param {Number} progress New anime episode progress
 * @param {Number} score New anime score
 */
function pushEditToAnilist(status, progress, score) {
    if (status == 'Delete') {
        pushAnimeDeletedToAnilist()
        return
    }

    const query = `
        mutation ($mediaId: Int, $status: MediaListStatus, $scoreRaw: Int, $progress: Int) {
            SaveMediaListEntry (mediaId: $mediaId, status: $status, scoreRaw: $scoreRaw, progress: $progress) {
                id
                status
            }
        }
        `;

    const variables = {
        mediaId: animeId,
        status: MEDIA_ENTRY_STATUS[status],
        scoreRaw: score,
        progress: progress
    };
    
    const url = 'https://graphql.anilist.co',
        options = {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + accesCode,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                query: query,
                variables: variables
            })
        };

    fetch(url, options).then(handleResponse)
        .then(handlePushEditToAnilist)
        .catch(handleError);
}

function pushEpisodeToAnilist(episode) {
    const query = `
        mutation ($mediaId: Int, $progress: Int) {
            SaveMediaListEntry (mediaId: $mediaId, progress: $progress) {
                id
                status
            }
        }
        `;
    
    const variables = {
        mediaId: animeId,
        progress: episode
    };
    
    const url = 'https://graphql.anilist.co',
        options = {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + accesCode,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                query: query,
                variables: variables
            })
        };

    fetch(url, options).then(handleResponse)
        .then(handlePushEpisodeToAnilist)
        .catch(handleError);
}

function pushAnimeFinishedToAnilist() {
    const query = `
        mutation ($mediaId: Int, $progress: Int,  $status: MediaListStatus) {
            SaveMediaListEntry (mediaId: $mediaId, progress: $progress,  status: $status) {
                id
                status
            }
        }
        `;
    
    const variables = {
        mediaId: animeId,
        progress: anime.episodes,
        status: MEDIA_ENTRY_STATUS['Completed']
    };
    
    const url = 'https://graphql.anilist.co',
        options = {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + accesCode,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                query: query,
                variables: variables
            })
        };

    fetch(url, options).then(handleResponse)
        .then(handlePushAnimeFinishedToAnilist)
        .catch(handleError);
}

function pushAnimeDeletedToAnilist() {
    var query = `
        mutation ($mediaId: Int) {
            SaveMediaListEntry  (mediaId: $mediaId) {
                id
            }
        }
        `;

    var variables = {
        mediaId: animeId
    };

    const url = 'https://graphql.anilist.co',
        options = {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + accesCode,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                query: query,
                variables: variables
            })
        };

    fetch(url, options).then(handleResponse)
        .then(handlePushAnimeDeletedToAnilist)
        .catch(handleError);
}

/**
 * Callback function after pushing edit to Anilist
 * @param {object} data Anilist data
 */
function handlePushEditToAnilist(data) {
    const saveEditBtn = document.querySelector('.save-btn')

    saveEditBtn.innerHTML = 'Saved'

    localStorage.removeItem('dataAnilist')
}

/**
 * Callback function after pushing episode progress to Anilist
 * @param {object} data Anilist data
 */
function handlePushEpisodeToAnilist(data) {
    const watchBtn = document.querySelector('.watch-btn')
    const progressInput = document.querySelector('.progress-input')

    watchBtn.innerHTML = `Watch Ep. ${anime.mediaListEntry.progress + 1}/${anime.episodes}`
    progressInput.value = anime.mediaListEntry.progress + 1

    localStorage.removeItem('dataAnilist')
}

/**
 * Callback function after pushing anime finished to Anilist
 * @param {object} data Anilist data
 */
function handlePushAnimeFinishedToAnilist(data) {
    const watchBtn = document.querySelector('.watch-btn')
    const progressInput = document.querySelector('.progress-input')
    const dropdownStatusBtn = document.querySelector('.dropdown-status-btn')
    const editAnimeBtn = document.querySelector('.edit-btn')

    watchBtn.innerHTML = `Watch Ep. ${anime.mediaListEntry.progress}/${anime.episodes}`
    progressInput.value = anime.mediaListEntry.progress
    dropdownStatusBtn.innerHTML = MEDIA_ENTRY_STATUS['COMPLETED']
    editAnimeBtn.innerHTML = MEDIA_ENTRY_STATUS['COMPLETED'] + '<i class="fas fa-pen"></i>'

    localStorage.removeItem('dataAnilist')
}

function handlePushAnimeDeletedToAnilist(data) {
    var query = `
        mutation ($id: Int) {
            DeleteMediaListEntry (id: $id) {
                deleted
            }
        }
        `;

    var variables = {
        id: data.data.SaveMediaListEntry.id
    };

    const url = 'https://graphql.anilist.co',
        options = {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + accesCode,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                query: query,
                variables: variables
            })
        };

    fetch(url, options).then(handleResponse)
        .then(handlePushEditToAnilist)
        .catch(handleError);
}

/**
 * Save anime folder
 * @param {String} path Path to anime folder
 */
function saveAnimeFolder(path) {
    if (animeFolders) {
        animeFolders[animeId] = path
    } else {
        animeFolders = {}
        animeFolders[animeId] = path
    }

    localStorage.setItem('animeFolders', JSON.stringify(animeFolders))

    fs.readdir(animeFolders[animeId], getLocalEpisodes)
}

function getLocalEpisodes(_, files) {
    files.forEach((file) => {
        let parsedFile = anitomy.parseSync(file)
        let episodePath = pathModule.join(animeFolders[animeId], file).replace(/\\/g, '/')

        localEpisodes[parseInt(parsedFile.episode_number, 10)] = `"${episodePath}"`
    })
}
