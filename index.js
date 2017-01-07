'use strict';
const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs'));
const path = require('path');
const jwt = Promise.promisifyAll(require('jsonwebtoken'));
const http2 = require('spdy');
const https = require('https');
const config = require('./config');

async function main(){
  const termID = config.termID;
  const keyID = config.keyID;
  const bundleID = config.bundleID;
  const privateKey = config.privateKey;
  const isDev = true;

  try{
    const deviceTokens = await readJSON(path.join(__dirname, 'deviceTokens.json'));
    const content = await readJSON(path.join(__dirname, 'content.json'));
    const jobs = deviceTokens.map(deviceToken => {
      return {deviceToken, content: JSON.stringify(content)};
    });
    const agent = http2.createAgent({
      host: getAPNSHostName(isDev),
      port: 443,
    });

    for(const job of jobs){
      const begin = Date.now();
      try{
        await sendAPNS(agent, termID, keyID, privateKey, bundleID, isDev, job.deviceToken, job.content);
      }catch(ex){
        console.log('error: ' + ex.body);
        console.log(ex.stack);
      }
      const end = Date.now();
      console.log('send: ' + (end - begin));
    }
    agent.close();
  }catch(ex){
    console.log('error');
    console.log(ex);
    console.log(ex.stack);
  }
}
function sendAPNS(agent, termID, keyID, privateKey, bundleID, isDev, deviceToken, content){
  return new Promise(function(resolve, reject){
    // https://developer.apple.com/jp/documentation/NetworkingInternet/Conceptual/RemoteNotificationsPG/Chapters/APNsProviderAPI.html
    const token = jwt.sign({iss: termID, iat: Math.floor(Date.now() / 1000)}, privateKey, {
      algorithm: 'ES256',
      header: {
        kid: keyID,
      },
    });
    const headers = {
      'apns-topic': bundleID,
      'apns-priority': 10,
      // 'apns-id': ...,
      'Authorization': 'Bearer ' + token,
    };
    const options = {
      method: 'POST',
      host: getAPNSHostName(isDev),
      path: '/3/device/' + deviceToken,
      headers,
      agent,
    };

    const req = https.request(options, res => {
      let body = '';
      res.on('data', function(chunk){
        body += chunk;
      });
      res.on('end', function(chunk){
        if(chunk){
          body += chunk;
        }
        if(res.statusCode === 200){
          resolve();
        }else{
          reject({
            code: res.statusCode,
            id: res.headers['apns-id'],
            body: body,
          });
        }
      });
      req.on('error', error => {
        reject(error);
      });
    });
    req.write(content);
    req.end();
  });
}
function getAPNSHostName(isDev){
  return isDev ? 'api.development.push.apple.com' : 'api.push.apple.com';
}
async function readJSON(path){
  const data = await fs.readFileAsync(path);
  return JSON.parse(data);
}

main();
