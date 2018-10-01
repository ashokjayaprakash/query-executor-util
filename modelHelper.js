'use strict'
const oracledb = require('oracledb');

function modelHelper(){}

modelHelper.prototype.createConnectionPool = () => {
    oracledb.poolMin = 0;
    oracledb.poolMax = 10;
    oracledb.autoCommit = true;
    oracledb.fetchAsString = [oracledb.CLOB];
	oracledb.maxRows = 150000;
    let self = this;
    return new Promise((resolve, reject) => {
        oracledb.createPool(
            {
                poolAlias: process.env.DB_POOL_ALIAS,
                user: process.env.DB_USER,
                password: process.env.DB_PASSWORD,
                connectString: process.env.DB_URL
            },
            function (err, connPool) {
                if (err) {
                    reject(err);
                } else {
                    self.pool = connPool;
                    self.pool.getConnection((error, connection) => {
                        if (error) {
                            reject(error);
                        } 
                        else {
                            connection.close();
                            resolve(connPool);
                        } 
                    });
                }
            });
    });
}
/** Since this is an external module that will be required
 *  we will need to set/save the connection pool 'sis' 
 *  which was created in server.js using portal-conn-pool.js
 */
modelHelper.prototype.setConnectionPool = (pool) => {
    this.pool = pool;
}

/**
 * overrideResolve - boolean value indicating whether the resolve value is to be overriden
 * newResolveValue - Promise value to be sent if overrideResolve is set to true
 */

modelHelper.prototype.promisify = (query,bindParams,overrideResolve,newResolveValue) => {
    var self = this;

    function replaceParameters(query) {
        return query.replace(/@([a-z_0-9]+)\b/gi, function (_, paramName) {
            return ':' + paramName;
        });
    }

    return new Promise(function (resolve, reject) {
        self.pool.getConnection((err, connection) => {
            if(err){
                return reject(err);
            }
            connection.execute(query, bindParams, {outFormat: oracledb.OBJECT}, (err, result) => {
                if(err){
                    reject(err);
                    connection.close();
                } else {
                    resolve(result);                        
                    connection.close();
                }
            })
        });
    });
}

module.exports = new modelHelper();
