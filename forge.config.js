const path = require('path');


module.exports = {
    packagerConfig: {
        icon: path.join(__dirname, "assets", "icon"),
        ignore: [
            ".VSCodeCounter",
            ".github",
            ".test",
            "config.yaml",
            "README.md"
        ]
    },
    makers: [
        {
            name: '@electron-forge/maker-zip',
            platforms: ['win32']
        }
    ]
}
