module.exports = {
    packagerConfig: {},
    makers: [
        {
            name: '@electron-forge/maker-squirrel',
            config: {
                name: "ScrcpyTray",
                authors: "B",
                exe: "scrcpytray.exe",
                noMsi: true
            }
        }
    ]
}
