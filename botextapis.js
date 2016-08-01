var util = require('util');
var http = require('http');
var https = require('https');
var crypto = require("crypto");
var defs = require("./botmisc.js");

var requestlib = require('request');

var OpenWeatherOptions = {
    host: 'api.openweathermap.org',
    port: '80',
    uri: "http://api.openweathermap.org/data/2.5/weather?q=%s,%s&lang=fr&units=metric&APPID=" + defs.conf.OPENWEATHER_APPID,
    method: 'GET'
}

var TableStorageOptions = {
    host: 'https://' + defs.conf.STORAGE_NAME + '.table.core.windows.net',
    port: '443',
    uri: 'https://' + defs.conf.STORAGE_NAME + '.table.core.windows.net/' + defs.conf.STORAGE_TABLE_NAME + '()?$filter=licence%20eq%20\'%s\'',
    method: 'GET',
    headers: {}
}

function GetAzureAuthorizationHeaderForTableStorage (req, refHeader, micb, cb) {
    console.log("GetAzureAuthorizationHeaderForTableStorage" + defs.STRINGS.TABLE_SHAREDKEY_SIGNATURE_TEMPLATE);
    var accesskey = defs.conf.STORAGE_ACCESS_KEY;
    var curUTCDateStr  = new Date().toUTCString();
  
    var stringToSign = util.format(defs.STRINGS.TABLE_SHAREDKEY_SIGNATURE_TEMPLATE, 
        curUTCDateStr, defs.conf.STORAGE_NAME, defs.conf.STORAGE_TABLE_NAME);
    console.log(stringToSign);
    // create base64 encoded signature
    var key = new Buffer(accesskey, "base64");
    var hmac = crypto.createHmac("sha256", key);
    hmac.update(stringToSign);
    var sig = hmac.digest("base64");
    
    var XMsVersion = "2015-04-05";
    var AcceptCharSet = "UTF-8";
    var DataSvcVersion = "3.0;NetFx";
    var Accept = "application/json;odata=nometadata";
    
    refHeader = JSON.parse(JSON.stringify(defs.HeaderTemplate));
    
    refHeader["x-ms-version"] = XMsVersion;
    refHeader["x-ms-date"] = curUTCDateStr;
    refHeader["Authorization"] =  util.format(refHeader["Authorization"], sig);
    refHeader["Accept"] = Accept;
    refHeader["Accept-Charset"] = AcceptCharSet;
    refHeader["DataServiceVersion"] =  DataSvcVersion;
    refHeader["MaxDataServiceVersion"] =  DataSvcVersion;
    
    var headerJSON = refHeader; 

    console.log("SIG: " + sig);
    
    cb(sig, headerJSON);
}

function callback(error, response, body) {
  if (!error && response.statusCode === 200) {
    var info = JSON.parse(body);
    console.log(info.name);
    console.log(info.main.temp);
    
  }
  else
  {
      console.log('REQUEST RESULTS:', error, body);
        console.log("Erreur");
        
        console.log(error.code);        
  }
}

function GetUserDataV1(err, numLicence, memberInfoCallback) {
    var myTableStorageOptions = JSON.parse(JSON.stringify(TableStorageOptions));
    //myTableStorageOptions.path = util.format(myTableStorageOptions.path, numLicence);
    myTableStorageOptions.uri = util.format(myTableStorageOptions.uri, numLicence);
    console.log(myTableStorageOptions);
    GetAzureAuthorizationHeaderForTableStorage (myTableStorageOptions.host, myTableStorageOptions.headers, memberInfoCallback, function(key, jsonHeader) {
        //Start Table Storagerequest
        myTableStorageOptions.headers = jsonHeader;
        
        requestlib(myTableStorageOptions, function callback(error, response, body) {
            if (!error && response.statusCode === 200) {
                var info = JSON.parse(body);
                memberInfoCallback(error, info);
            }
            else
            {
                console.log(error.code);        
            }
        });
    });
}

function GetMeteoData(err, city, country, memberInfoCallback) {
    var myTableStorageOptions = JSON.parse(JSON.stringify(TableStorageOptions));
    //myTableStorageOptions.path = util.format(myTableStorageOptions.path, numLicence);
    var myOpenWeatherOptions = JSON.parse(JSON.stringify(OpenWeatherOptions));
    myOpenWeatherOptions.uri = util.format(myOpenWeatherOptions.uri, city, country);
    console.log('MyOpenWeatherOptions');
    requestlib(myOpenWeatherOptions, function callback(error, response, body) {
        if (!error && response.statusCode === 200) {
            var info = JSON.parse(body);
            memberInfoCallback(error, info);
        }
        else
        {
            console.log(error.code);        
        }
    });
}

function GetMeteoData1(err, city, country, meteoData) {
    console.log('Before openweather call');
    var myOptions = JSON.parse(JSON.stringify(OpenWeatherOptions));
    myOptions.path = util.format(myOptions.path, city, country);
    var httpReq = http.request(myOptions, function (res) {
        var body = ""; //adding to this object
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            body += chunk; //concatenates
            console.log(body);
            if (res.statusCode >= 200) {
                var jsonMeteoSituation = JSON.parse(body);
                meteoData(null, jsonMeteoSituation);
                
            }
            else {
                console.log('Error from end response');
                err(OpenWeatherOptions);
            };
        });
        res.on('end', function () {
            if (res.statusCode >= 200) {
                var jsonMeteoSituation = JSON.parse(body);
                meteoData(null, jsonMeteoSituation);
                
            }
            else {
                console.log('Error from end response');
                err(OpenWeatherOptions);
            }
            
        });
        res.on('error', function () {
            if (res.statusCode > 200) {
                var jsonMeteoSituation = JSON.parse(body);
                meteoData(null, jsonMeteoSituation);
                
            }
            else {
                console.log('Error from error response');
                err(OpenWeatherOptions);
            }
            
        });
    });
    httpReq.on('error', (e) => {
        console.log(e.message);
        err('Error from GetMeteoData1: ' + city + ' ' + country, e.message);
    });
    httpReq.end();
}

function GetWindDirection(weatherDataWind)
{
    var deg = weatherDataWind.deg;
    if (deg >=	348.75 	&& deg <=	 11.25	) return "N"
    else if ( deg >=	11.25 	&& deg <=	 33.75	) return "NNE"
    else if ( deg >=	33.75 	&& deg <=	 56.25	) return "NE"
    else if ( deg >=	56.25 	&& deg <=	 78.75	) return "ENE"
    else if ( deg >=	78.75 	&& deg <=	 101.25	) return "E"
    else if ( deg >=	101.25 	&& deg <=	 123.75	) return "ESE"
    else if ( deg >=	123.75 	&& deg <=	 146.25	) return "SE"
    else if ( deg >=	146.25 	&& deg <=	 168.75	) return "SSE"
    else if ( deg >=	168.75 	&& deg <=	 191.25	) return "S"
    else if ( deg >=	191.25 	&& deg <=	 213.75	) return "SSO"
    else if ( deg >=	213.75 	&& deg <=	 236.25	) return "SO"
    else if ( deg >=	236.25 	&& deg <=	 258.75	) return "OSO"
    else if ( deg >=	258.75 	&& deg <=	 281.25	) return "O"
    else if ( deg >=	281.25 	&& deg <=	 303.75	) return "ONO"
    else if ( deg >=	303.75 	&& deg <=	 326.25	) return "NO"
    else if ( deg >=	326.25 	&& deg <=	 348.75	) return "NNO"
    else return "Indisponible";
}





module.exports.OpenWeatherOptions = OpenWeatherOptions;
module.exports.GetMeteoData = GetMeteoData;
module.exports.GetMeteoData1 = GetMeteoData1;
module.exports.GetAzureAuthorizationHeaderForTableStorage = GetAzureAuthorizationHeaderForTableStorage;
module.exports.GetUserDataV1 = GetUserDataV1;
module.exports.GetWindDirection = GetWindDirection;
