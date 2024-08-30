const { app } = require('electron');
const { create_tray, device_disconnected_handler, connection_lost_handler } = require('./src/tray.js');
const { disconnect } = require('./src/utils/connect.js');


app.on('ready', () => {
    create_tray()
})


app.on('window-all-closed', (event) => {
    event.preventDefault();
})


app.on("device_disconnected", async () => {
    await device_disconnected_handler()
})


app.on("connection_lost", async () => {
    await connection_lost_handler()
})


app.on("before-quit", async () => {
    await disconnect()
})
