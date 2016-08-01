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


var conf = {
    NODE_TLS_REJECT_UNAUTHORIZED: process.env.NODE_TLS_REJECT_UNAUTHORIZED,
    STORAGE_NAME: process.env.STORAGE_NAME,
    STORAGE_ACCESS_KEY: process.env.STORAGE_ACCESS_KEY,
    STORAGE_TABLE_NAME: process.env.STORAGE_TABLE_NAME,
    OPENWEATHER_APPID: process.env.OPENWEATHER_APPID
}

module.exports = {
    helpMessage: "Here's what I can do:\n\n" +
    "* Create new tasks by saying something like 'add a new task to go to the gym'\n" +
    "* List your existing tasks by saying something like 'what do I have to do?'\n" +
    "* Finish an existing task by saying something like 'remove go to the gym'",
    canceled: 'Sure... No problem.',
    saveTaskCreated: "Created a new task called '%(task)s'",
    saveTaskMissing: 'What would you like to name the task?',
    listTaskList: 'Tasks\n%s',
    listTaskItem: '%(index)d. %(task)s\n',
    listNoTasks: 'You have no tasks.',
    finishTaskMissing: "Which task would you like to delete?",
    finishTaskDone: "Removed '%(task)s' from your task list."
}

module.exports.STRINGS = 
{
    TABLE_SHAREDKEY_SIGNATURE_TEMPLATE : "GET\n" + "\n" + "\n" + "%s\n" + "/%s/%s()"
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
module.exports.conf = conf;
module.exports.capitalize = capitalize;