const prompt = require('prompt');
const seq    = require('seq');
const path   = require('path');
const fse    = require('fs-extra');

const BASE_PATH = '/home/rjeny/Projects/amocore/app/user/calltouchcrm/resource/widgets/testWiget/';

let folders = __dirname.split('/').reverse();

let widgetName = '';
let userName   = '';
let baseFolder = '';

if (folders[1] !== undefined && folders[1] === 'widgets') {
    console.log('Мы в папке самого виджета');
    widgetName = folders[0];
    userName   = folders[3];
} else if (folders[0] !== undefined && folders[0] === 'widgets') {
    console.log('Мы в папке виджетов');
    userName = folders[2];
} else if (folders[0] !== undefined && folders[0] === 'resource') {
    console.log('Мы в папке ресурсов');
    userName = folders[1];
} else if (folders[1] !== undefined && folders[1] === 'user') {
    console.log('Мы в папке пользователя');
    userName = folders[0];
} else if (folders.indexOf('amocore') !== -1) {
    console.log('Мы где-то в структуре папок')
}

const promptSchema = {
    properties: {
        userName: {
            pattern: /^[a-z0-9_]+$/,
            message: 'Только латиница и цифры!',
            required: true,
            default: userName
        },
        widgetName: {
            pattern: /^[a-z0-9_]+$/,
            message: 'Только латиница и цифры!',
            required: true,
            default: widgetName
        }
    }
};

seq()
    .seq(function () {
        prompt.start();
        prompt.get(promptSchema, this);
    })
    .seq(function (result) {
        userName   = result.userName;
        widgetName = result.widgetName;

        // if (widgetName.search('_' + userName) === -1) {
        //     widgetName += '_' + userName;
        // }

        folders = folders.reverse();

        for (let folderName of folders){
            if (folderName === 'amocore') {
                break;
            }
            baseFolder += folderName + '/';
        }

        baseFolder += 'amocore/app/user/' + userName + '/resource/widgets/' + widgetName + '/';

        console.log('Имя пользователя: ' + userName);
        console.log('Название виджета: ' + widgetName);

        console.log('Создаем папку' + baseFolder);
        fse.mkdirs(baseFolder, this);
    })
    .seq(function (res) {
        fse.copy(BASE_PATH + '/widget', baseFolder, this);
    })
    .seq(function (res) {
        process.exit(0);
    })
    .catch(function (err) {
        console.log(err);

        return 0;
    })
;
