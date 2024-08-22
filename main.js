const { app } = require('electron');
const { create_tray } = require('./src/tray.js');
const { disconnect } = require('./src/utils/net.js');


app.on('ready', () => {
    create_tray()
})


app.on('window-all-closed', (event) => {
    event.preventDefault();
})


app.on("before-quit", async (event) => {
    await disconnect()
})