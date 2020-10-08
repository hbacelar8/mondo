const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const client = require('discord-rich-presence')('763579990209855559');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1600,
    height: 800,
    frame: false,
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true
    }
  });

  // and load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, 'views/watching.html'));
  mainWindow.setMenuBarVisibility(false)
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

client.updatePresence({
	state: 'Idling',
	startTimestamp: Date.now(),
	largeImageKey: 'mondo',
	smallImageKey: 'ani',
	instance: true
});

// Attach listener in the main process with the given ID
ipcMain.on('updateDiscord', (event, arg) => {
	if (arg.state == 'Idling') {
		client.updatePresence({
			state: arg.state,
			startTimestamp: Date.now(),
			largeImageKey: 'mondo',
			smallImageKey: 'ani',
			instance: true
		});
	} else {
		client.updatePresence({
			details: arg.details,
			state: arg.state,
			startTimestamp: Date.now(),
			largeImageKey: 'mondo',
			smallImageKey: 'ani',
			instance: true
		});
	}
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
