const path = require('path');
const { Notification } = require('electron');
const { Logger } = require('./utils/log.js');


const assets_path = path.join(__dirname, "..", "assets")
const icon_path = path.join(assets_path, "icon.png")
const logger = new Logger(path.basename(__filename))


function notification(title, body) {
    logger.log(`Notification: "${body}".`)
    const notification = new Notification({
        title: title,
        body: body,
        icon: icon_path,
        timeoutType: "default"
    })
    notification.show()
}


module.exports = {
    notification
}
