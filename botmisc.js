var util = require('util');

var HeaderTemplate1 = {
  "x-ms-version" : "2015-04-05",
  "x-ms-date" : "",
  "Authorization" : "SharedKey botsstorage:%s",
  "Accept" : "application/json;odata=nometadata",
  "Accept-Charset" : "UTF-8",
  "DataServiceVersion" : "3.0;NetFx",
  "MaxDataServiceVersion" : "3.0;NetFx"
}


var HeaderTemplate = {
  "x-ms-version" : "2015-04-05",
  "x-ms-date" : "",
  "Authorization" : "SharedKey botsstorage:%s",
  "Accept" : "application/json;odata=nometadata",
  "Accept-Charset" : "UTF-8",
  "DataServiceVersion" : "3.0;NetFx",
  "MaxDataServiceVersion" : "3.0;NetFx"
}

var ServiceBusQueueTopicHeaderTemplate = {
    "Authorization" : "SharedAccessSignature sr=%s&sig=%s&se=%s&skn=%s"
}

var templates = 
{
    TABLE_SHAREDKEY_SIGNATURE_TEMPLATE : "GET\n" + "\n" + "\n" + "%s\n" + "/%s/%s()",
    SB_QUEUE_SIGNATURE_TEMPLATE : '%s\n%s',
    SB_QUEUE_TARGET_URI_TEMPLATE : 'https://%s.servicebus.windows.net/',
    SB_QUEUE_TARGET_ENDPOINT_TEMPLATE : '%s%s/messages?timeout=60&api-version=2013-08'
}

var conf = {
    NODE_TLS_REJECT_UNAUTHORIZED: process.env.NODE_TLS_REJECT_UNAUTHORIZED,
    STORAGE_NAME: process.env.STORAGE_NAME,
    STORAGE_ACCESS_KEY: process.env.STORAGE_ACCESS_KEY,
    STORAGE_TABLE_NAME: process.env.STORAGE_TABLE_NAME,
    OPENWEATHER_APPID: process.env.OPENWEATHER_APPID,
    SB_METEO_SVC_QUEUE_NAMESPACE: process.env.SB_METEO_SVC_QUEUE_NAMESPACE,
    SB_METEO_SVC_QUEUE_NAME: process.env.SB_METEO_SVC_QUEUE_NAME,
    SB_METEO_SVC_QUEUE_SAS_KEY_NAME: process.env.SB_METEO_SVC_QUEUE_SAS_KEY_NAME,
    SB_METEO_SVC_QUEUE_SAS_TOKEN: process.env.SB_METEO_SVC_QUEUE_SAS_TOKEN,
    SB_REGISTRATION_SVC_QUEUE_NAMESPACE: process.env.SB_REGISTRATION_SVC_QUEUE_NAMESPACE,
    SB_REGISTRATION_SVC_QUEUE_NAME: process.env.SB_REGISTRATION_SVC_QUEUE_NAME,
    SB_REGISTRATION_SVC_QUEUE_SAS_KEY_NAME: process.env.SB_REGISTRATION_SVC_QUEUE_SAS_KEY_NAME,
    SB_REGISTRATION_SVC_QUEUE_SAS_TOKEN: process.env.SB_REGISTRATION_SVC_QUEUE_SAS_TOKEN,
    SB_SURVEY_SVC_QUEUE_NAMESPACE: process.env.SB_SURVEY_SVC_QUEUE_NAMESPACE,
    SB_SURVEY_SVC_QUEUE_NAME: process.env.SB_SURVEY_SVC_QUEUE_NAME,
    SB_SURVEY_SVC_QUEUE_SAS_KEY_NAME: process.env.SB_SURVEY_SVC_QUEUE_SAS_KEY_NAME,
    SB_SURVEY_SVC_QUEUE_SAS_TOKEN: process.env.SB_SURVEY_SVC_QUEUE_SAS_TOKEN    
}

module.exports = {
    sayHello : "Bonjour, bienvenue sur notre BOT",
    helpMessage: "Voici les quelques services que je peux vous rendre:\n\n" +
    "* Pour la météo de votre ville, tapez M\n" +
    "* Pour votre demande d'inscription, tapez I\n" +
    "* Pour participer à notre enquête, tapez E",
    registerMember : "Passons à l'enregistrement de la première personne",
    resgisterNextMember : "Passons à une nouvelle personne",
    canceled: 'Sure... No problem.',
    saveTaskCreated: "Created a new task called '%(task)s'",
    saveTaskMissing: 'What would you like to name the task?',
    listTaskList: 'Tasks\n%s',
    listTaskItem: '%(index)d. %(task)s\n',
    listNoTasks: 'You have no tasks.',
    finishTaskMissing: "Which task would you like to delete?",
    finishTaskDone: "Removed '%(task)s' from your task list."
}

function capitalize(str) {
    var strVal = '';
    str = str.split(' ');
    for (var chr = 0; chr < str.length; chr++) {
        strVal += str[chr].substring(0, 1).toUpperCase() + str[chr].substring(1, str[chr].length) + ' '
    }
    return strVal
}

/*"GET\n" // VERB
+ "\n" /* Content-MD5
+ "\n" /* Content-Type
+ "%s\n" // Date  
+ "/%s/%s()"; // StorageName/TableName()*/

module.exports.HeaderTemplate1 = HeaderTemplate1;
module.exports.HeaderTemplate = HeaderTemplate;
module.exports.ServiceBusQueueTopicHeaderTemplate = ServiceBusQueueTopicHeaderTemplate;
module.exports.conf = conf;
module.exports.templates = templates;
module.exports.capitalize = capitalize;