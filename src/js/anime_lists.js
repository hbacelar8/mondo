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
const searchBar = document.querySelector('.anime-search')

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
    const animeLists = data.data.MediaListCollection.lists

    if (!dataAnilist) {
        localStorage.setItem('dataAnilist', JSON.stringify(data))
    }

    switch (currentPage) {
        case 'watching.html':
            for (let i = 0; i < animeLists.length; i++) {
                if (animeLists[i].name == 'Watching') {
                    var animeList = animeLists[i].entries
                    break;
                }
            }
            break;

        case 'completed.html':
            var animeList = new Array()

            for (let i = 0; i < animeLists.length; i++) {
                if (animeLists[i].name.includes('Completed')) {
                    animeList.push(animeLists[i].entries)
                }
            }
            break;

        case 'planning.html':
            for (let i = 0; i < animeLists.length; i++) {
                if (animeLists[i].name == 'Planning') {
                    var animeList = animeLists[i].entries
                    break;
                }
            }
            break;

        case 'paused.html':
            for (let i = 0; i < animeLists.length; i++) {
                if (animeLists[i].name == 'Paused') {
                    var animeList = animeLists[i].entries
                    break;
                }
            }
            break;

        case 'dropped.html':
            for (let i = 0; i < animeLists.length; i++) {
                if (animeLists[i].name == 'Dropped') {
                    var animeList = animeLists[i].entries
                    break;
                }
            }
            break;

        default:
            break;
    }

    if (currentPage == 'completed.html') {
        if (animeList.length) {
            animeList.forEach(function (list) {
                for (let i = 0; i < list.length; i++) {
                    if (list[i].media.title.english) {
                        var animeTitle = list[i].media.title.english
                    } else if (list[i].media.title.romaji) {
                        var animeTitle = list[i].media.title.romaji
                    } else {
                        var animeTitle = list[i].media.title.native
                    }

                    const animeId = list[i].media.id
                    const animeCover = list[i].media.coverImage.large
                    const animeEpisodes = list[i].media.episodes
                    const userProgress = list[i].progress
                    const userScore = list[i].score

                    addAnimeToView(
                        animeId,
                        animeTitle,
                        animeCover,
                        animeEpisodes,
                        userProgress,
                        userScore
                    )
                }
            })
        } else {
            addNoListToView()
        }

        return
    }

    if (animeList) {
        animeList.forEach(function (list) {
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
    animeWrap = document.getElementsByClassName('anime-wrap')[0]
    newAnimeDiv = document.createElement('div')
    newAnimeImg = document.createElement('img')
    newAnimeP = document.createElement('p')
    newAnimeSpan1 = document.createElement('span')
    newAnimeSpan2 = document.createElement('span')

    newAnimeDiv.classList.add('anime')
    newAnimeImg.src = cover
    newAnimeImg.loading = 'lazy'
    newAnimeP.innerText = title
    newAnimeSpan1.innerText = `${progress}/${episodes}`
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
