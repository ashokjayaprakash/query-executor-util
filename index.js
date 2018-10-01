require('dotenv').config();
require('./appProcess');
const db = require("./modelHelper");
const fs = require("fs");
const path = require("path");


function getFilePath() {
    const args = process.argv.slice(2);
    let filePath = "";
    for(let index in args) {
        if(args[index] && args[index].indexOf('--path') >= 0) {
            filePath = args[index].replace("--path=", '').replace(/\\/g, "/");
            if(!fs.lstatSync(filePath).isDirectory() ) {                
                throw(new Error("Invalid Project Path"));
            }
        } 
    }
    if (filePath) {
      return filePath;  
    }  
    throw(new Error("Project path argument missing"));
}

/**
 * To read all files in folder
 * @param {*} dir 
 */
const getAllFiles = dir =>
  fs.readdirSync(dir).reduce((files, file) => {
    const name = path.join(dir, file);
    const isDirectory = fs.statSync(name).isDirectory();
    return isDirectory ? [...files, ...getAllFiles(name)] : [...files, name];
  }, []);  

/**
 * To get list of queries in query.js file
 */
const getQueryList = () => {
    const FILE_PATH = getFilePath();
    let f =  getAllFiles(FILE_PATH);
    let err = "";
    const filteredFile = f.filter( a => a.indexOf("query.js") > 0 );

    let r = []
    for (let index in filteredFile) {
        const q = require(filteredFile[index]);
        const propKey = Object.getOwnPropertyNames(q)[0];
    
        const queryObject =  q[propKey];
    
        for( var queryFunc in queryObject) {
            try {
                //let squelQuery = 'explain plan for '; 
                var squelQuery = queryObject[queryFunc]();                
                squelQuery = squelQuery.replaceAll("@",":")
                const bindParams = generateBindParams(squelQuery);
                //console.log(`${queryFunc} - ${squelQuery} - ${JSON.stringify( bindParams)};`);
                r.push({
                    fileName:propKey,
                    funcName: queryFunc,
                    query: squelQuery,
                    param: bindParams
                });                
            } catch (error) {            
                err += `${queryFunc} : ${error.stack}`;
                err += "\n"
                console.log(err);            
            }            
        }
    }
    fs.writeFile("error.txt", err);
    return r;
}


String.prototype.replaceAll = function(search, replacement) {
        var target = this;
        return target.split(search).join(replacement);
}; 
     
generateBindParams = (query) => {
   
    const pattern = '(\:[a-zA-Z0-9]+)';
    let bindParams = query.match(new RegExp(pattern, 'gi')) || [];
    bindParams = new Array(bindParams.length).fill(0);
    return bindParams;    
}

executeExplainPlan = (result) => {
    return db.promisify(result.query, result.param, false, null);
};

async function init() {
    try {
        const now = new Date();
        let fileData = "";
        let data = "";
        await db.createConnectionPool();
        let result = getQueryList();
        for(let index in result) {
            try {
                fileData += '\n';
                let a = await executeExplainPlan(result[index]);    
                data = `SUCESS - ${result[index].fileName } - ${result[index].funcName} - ${result[index].query} - ${ JSON.stringify(a)}`;
                console.log(data);
                fileData += data;
                
            } catch (error) {
                data = `ERROR - ${result[index].fileName } - ${result[index].funcName} - ${result[index].query} - ${error}`;
                console.log(data);
                fileData += data; 
            }           
            
        }        
        fs.writeFile(`output-${now.toDateString()}.txt`, fileData);
    } catch (error) {
        console.log(error);
    }
    
}
init();