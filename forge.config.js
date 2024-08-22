const path = require('path');


module.exports = {
    packagerConfig: {},
    makers: [
        {
            name: '@electron-forge/maker-squirrel',
            config: {
                name: "ScrcpyTray",
                setupIcon: path.join(__dirname, "assets", "icon.ico"),
                authors: "B",
                exe: "scrcpytray.exe",
                setupExe: "ScrcpyTrayInstaller.exe"
            }
        }
    ]
}
