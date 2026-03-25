const express = require('express');


const app = express();
app.use(express.json())
app.use(express.urlencoded({ extended: true}))

const PORT = process.env.PORT || 3000;
const targetDir = process.argv[2];

const configureFilePath = targetDir !== undefined ? targetDir + '/configure.json' : 'configure.json';
const presetFilePath = targetDir !== undefined ? targetDir + '/preset.json' : 'preset.json';

const logger = (() => {

    const instance = {};

    const output = (msg, option) => {
        console.log(msg + ':' + JSON.stringify(option !== null && option !== undefined ? option : {}));
    };

    instance.or = (flg, msg1, msg2, option) => {
        if(flg) output(msg1, option);
        else output(msg2, option);
    };
    instance.log = (msg, option) => {
        output(msg, option);
    };

    return instance;
})();

const configure = ((confPath) => {
    const fs = require('fs');
    
    const exist = fs.existsSync(confPath);
    logger.or(exist, 'exist configure file', 'not exist configure file, create configure file', {path:confPath});

    if(exist == false) {
        const json = {"casheDir" : "/cache","storageDir" : "/storage","binarry" : "/usr/local/bin/yt-dlp"};
        logger.log('create configure file', {path:confPath, json:json});
        fs.writeFileSync(confPath, JSON.stringify(json, null , "\t"), 'utf8');
    }

    logger.log('load configure file', {path:confPath});
    const configure = JSON.parse(fs.readFileSync(confPath, 'utf8'));
    logger.log('configure data', configure);

    return configure;
})(configureFilePath);

((prestPath) => {
    const fs = require('fs');
    const exist = fs.existsSync(prestPath);
    logger.or(exist, 'exist preset file', 'not exist preset file, create preset file', {path:prestPath});
    
    if(exist == false) {
        const json = {
            "default" : {
                use : false,
                dlpath : 'temp',
                filename : '%(title)s.%(ext)s',
                options : []
            }
        };
        logger.log('create preset file', {path:prestPath, json:json});
        fs.writeFileSync(prestPath, JSON.stringify(json, null , "\t"), 'utf8');
    }

})(presetFilePath);

((targetDir) => {
    const fs = require('fs');

    const entries = fs.readdirSync(targetDir);
    logger.log('start clean cache dir', {path:targetDir});
    for (let i = 0; i < entries.length; i++) {
        const fileName = entries[i];
        logger.log('  unlink file', {fileName:fileName});
        fs.unlinkSync(targetDir + '/' + fileName);
    }
    logger.log('end clean cache dir', {path:targetDir});
})(configure.casheDir);

const invokeProcess = ((command, casheDir, rootDir) => {
    const crypto = require("crypto");
    const fs = require('fs').promises
    const { spawn } = require('child_process');

    const uuid = () => {
        return crypto.randomUUID();
    };

    return async (url, dlpath, filename, options) => {
        const opt_o = '-o ' + rootDir + '/' + dlpath +'/' + filename;
        const dataId = uuid();

        const processData = {
            status : 'start'
        };

        const option_text = options.join(' ');

        await fs.writeFile(casheDir + '/' + dataId + '.json', JSON.stringify(processData), 'utf8');
        await fs.writeFile(casheDir + '/' + dataId + '.txt', '', 'utf8');

        const childProcess = spawn(command, [opt_o  ,option_text, url]);
        childProcess.stdout.on('data', (chunk) => {
            fs.appendFile(casheDir + '/' + dataId + '.txt', chunk.toString(), 'utf8')
        });

        childProcess.stdout.on('close', (chunk) => {
            processData.status = 'complete';
            fs.writeFile(casheDir + '/' + dataId + '.json', JSON.stringify(processData), 'utf8');
        });

        return dataId;
    };

})(configure.binarry, configure.casheDir, configure.storageDir);

(() => {
    const fs = require('fs').promises;
    const pathModule = require('path');

    app.use('/ytdlp/static', express.static(__dirname + '/webroot'));

    app.get('/ytdlp/preset', async (req, res) => {
        try {
            const data = await fs.readFile(presetFilePath, 'utf8');
            res.json(JSON.parse(data));
        } catch (e) {
            res.json({error : e+''});
        }
        
    });

    app.get('/ytdlp/processes', async (req, res) => {
        try {
            const entries = await fs.readdir(configure.casheDir, {withFileTypes: true});
            res.json(entries.map(e => e.name).filter(e => e.endsWith('.json')).map(e => pathModule.basename(e, pathModule.extname(e))));
        } catch (e) {
            res.json({error : e+''});
        }
    });

    app.delete('/ytdlp/status/:pid', async (req, res) => {
        try {
            const dataId = req.params.pid;
            await fs.unlink(configure.casheDir + '/' + dataId + '.json');
            await fs.unlink(configure.casheDir + '/' + dataId + '.txt'); 
            res.json({dataId : dataId});
        } catch (e) {
            res.json({error : e+''});
        }
    });

    app.get('/ytdlp/status/:pid', async (req, res) => {
        try {
            const dataId = req.params.pid;
            const json = await fs.readFile(configure.casheDir + '/' + dataId + '.json', 'utf8');
            const stream = await fs.readFile(configure.casheDir + '/' + dataId + '.txt', 'utf8'); 

            res.json({
                stream : stream,
                meta : JSON.parse(json)
            });
        } catch (e) {
            res.json({error : e+''});
        }
    });

    app.post('/ytdlp/process', async (req, res) => {

        try {
            const url = req.body.url ;
            const preset_key = req.body.preset;
            const preset_data = JSON.parse(await fs.readFile('preset.json', 'utf8'));

            const preset = preset_data[preset_key];

            const processId = await invokeProcess(url, preset.dlpath, preset.filename, preset.options);
            res.json({processId:processId});
        } catch (e) {
            res.json({error : e+''});
        }
    });

})();

app.listen(PORT, () => {
    logger.log('start web server.', {port:PORT});
});