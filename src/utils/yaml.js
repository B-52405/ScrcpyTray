const fs = require("fs/promises");
const yaml = require("js-yaml");


async function read_yaml(file_path) {
    try {
        const content = await fs.readFile(file_path, 'utf8');
        const data = yaml.load(content)
        if (data === undefined) {
            return {}
        }
        return data
    } catch (error) {
        const data = {}
        await write_yaml(file_path, data)
    }
}


async function write_yaml(file_path, data) {
    try {
        await fs.writeFile(file_path, yaml.dump(data), 'utf8')
    } catch (error) {
        console.error(error)
    }
}


module.exports = {
    read_yaml,
    write_yaml
}
