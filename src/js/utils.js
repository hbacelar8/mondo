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

/**
 * Extract variables from page's URL
 * @returns {Array} Array of variables
 */
function getUrlVars() {
    let vars = []

    window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function (_, key, value) {
        vars[key] = value
    })

    return vars
}

/**
 * Extract a specific variable from page's URL
 * @param {string} parameter Parameter's name
 * @param {*} defaultvalue Value to set if parameter not found
 */
export function getUrlParam(parameter, defaultvalue) {
    let urlParameter = defaultvalue

    if (window.location.href.indexOf(parameter) > -1) {
        urlParameter = getUrlVars()[parameter]
    }

    return urlParameter
}

/**
 * Convert a duration in seconds to days, hours and minutes
 * @param {number} seconds Duration in seconds
 */
export function convertSecondsToDHM(seconds) {
    seconds = Number(seconds);

    var d = Math.floor(seconds / (3600 * 24));
    var h = Math.floor(seconds % (3600 * 24) / 3600);
    var m = Math.floor(seconds % 3600 / 60);

    var dDisplay = d > 0 ? d + 'd ' : "";
    var hDisplay = h > 0 ? h + 'h ' : "";
    var mDisplay = m > 0 ? m + 'm' : "";

    return dDisplay + hDisplay + mDisplay;
}