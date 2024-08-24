const path = require('path');


module.exports = {
    packagerConfig: {
        icon: path.join(__dirname, "assets", "icon")
    },
    makers: [
        {
            name: '@electron-forge/maker-zip',
            platforms: ['win32']
        }
    ]
}
