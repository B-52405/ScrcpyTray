const { app } = require('electron');
const { create_tray, controller_error_handler, killing_the_server_handler } = require('./src/tray.js');
const { disconnect } = require('./src/utils/net.js');


app.on('ready', () => {
    create_tray()
})


app.on('window-all-closed', (event) => {
    event.preventDefault();
})


app.on("controller_error", async () => {
    await controller_error_handler()
})


app.on("killing_the_server", () => {
    killing_the_server_handler()
})


app.on("before-quit", async (event) => {
    await disconnect()
})
