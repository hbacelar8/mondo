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

const electron = require('electron')
const path = require('path')
const fs = require('fs')

class UserConfig {
  constructor(opts) {
    const userDataPath = (electron.app || electron.remote.app).getPath('userData')
    this.path = path.join(userDataPath, opts.configName + '.json')
    this.data = _parseDataFile(this.path, opts.defaults)
  }

  setUsername(username) {
    this.data.userInfo.username = username
    this._writeToFile()
  }

  getUsername() {
    return this.data.userInfo.username
  }

  setAccessCode(accessCode) {
    this.data.userInfo.accessCode = accessCode
    this._writeToFile()
  }

  getAccessCode() {
    return this.data.userInfo.accessCode
  }

  setUserAvatar(link) {
    this.data.userAvatar = link
    this._writeToFile()
  }

  getUserAvatar() {
    return this.data.userAvatar
  }

  setGridSize(gridSize) {
    this.data.gridSize = gridSize
    this._writeToFile()
  }

  getGridSize() {
    return this.data.gridSize
  }

  setSyncOnStart(sync) {
    this.data.syncOnStart = sync
    this._writeToFile()
  }

  getSyncOnStart() {
    return this.data.syncOnStart
  }

  setLineColor(color) {
    this.data.lineColor = color
    this._writeToFile()
  }

  getLineColor() {
    return this.data.lineColor
  }

  setUpdateDiscord(share) {
    this.data.updateDiscord = share
    this._writeToFile()
  }

  getUpdateDiscord() {
    return this.data.updateDiscord
  }

  resetData() {
    this.setUsername(null)
    this.setAccessCode(null)
    this.setUserAvatar(null)
    this.setGridSize(0)
    this.setSyncOnStart(false)
    this.setLineColor('#487eb0')
    this._writeToFile()
  }

  _writeToFile() {
    fs.writeFileSync(this.path, JSON.stringify(this.data))
  }
}

function _parseDataFile(filePath, defaults) {
  try {
    return JSON.parse(fs.readFileSync(filePath))
  } catch (error) {
    return defaults
  }
}

module.exports = UserConfig