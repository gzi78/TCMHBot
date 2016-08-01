var restify = require('restify');
var builder = require('botbuilder');
var util = require('util');
var defs = require("./botmisc.js");
var botextapis = require('./botextapis.js');
var async = require('async');
require('request').debug = true;
var requestlib = require('request');



function errorCallback(msg, exceptionContent){
    console.log("Error occured : " + msg);
    console.log(exceptionContent);
};


//=========================================================
// Bot Setup
//=========================================================

// Setup Restify Server
var server = restify.createServer();
//server.listen(process.env.port || process.env.PORT || 3978, function () {
server.listen(3978, function () {
   console.log('%s listening to %s', server.name, server.url); 
});
  
// Create chat bot
var connector = new builder.ChatConnector({
    appId: '',//appId: process.env.MICROSOFT_APP_ID,
    appPassword: '' //appPassword: process.env.MICROSOFT_APP_PASSWORD
});
var bot = new builder.UniversalBot(connector);
server.post('/api/messages', connector.listen());

//=========================================================
// Bots Dialogs
//=========================================================

var intents = new builder.IntentDialog();
bot.dialog('/', intents);

intents.matches(/^I/i, [
    function (session) {
        session.beginDialog('/inscr');
    }
]
)

intents.matches(/^M/i, [
    function (session) {
        session.beginDialog('/meteo');
    }
]
)

intents.onDefault([
    function (session) {
        session.beginDialog('/welcome');
    }
]);

bot.dialog('/welcome', [
    function (session) {
        session.send(defs.helpMessage);
        builder.Prompts.text(session, 'Bonjour, bienvenue sur notre BOT. Pour la météo dans le monde, tapez M, pour notre service de réinscription, tapez I');
    },
    function (session, results) {
        if (results.response === "I")
        {
            session.beginDialog("/inscr");
        }
        else if (results.response === "M") 
        {
            session.beginDialog('/meteo');
        }
        else
        {
            session.beginDialog('/');
        }
    }

]);

//=========================================================
// Secondary Dialog
//=========================================================

bot.dialog('/singlemember', [
    function (session, args) {
        console.log("1 args : " + args);
        if (typeof args.nbRelated !== 'number') {
            args.nbRelated = 2;
        }
        session.dialogData.args = args;
        
        if (typeof(session.userData.foundMember.related) == 'undefined' || session.userData.foundMember.related === null)
        {
            session.userData.foundMember.related = [];
        }    
        if ("relatedIndex" in session.dialogData || isNaN(session.dialogData.relatedIndex))
        {
            session.dialogData.relatedIndex = 0;
        }
        else
        {
            session.dialogData.relatedIndex++;
        }
        
        builder.Prompts.text(session,"Nom ?" + args.nbRelated + " - " + session.dialogData.relatedIndex);
    },
    function (session, results, next) {
        var currentRelated = { nom : results.response, prenom : '', datenaissance : '', formuleadhesion : '', formulecours : '' } ;
        session.userData.foundMember.related[session.userData.foundMember.related.length] = currentRelated;
       
        next();
    },
    function (session, results) {
        builder.Prompts.text(session,'Prénom ?');
    },
    function (session, results, next) {
        session.userData.foundMember.related[session.userData.foundMember.related.length - 1].prenom = results.response;
        next();
    },
    function (session, results) {
        builder.Prompts.time(session,util.format('Date de naissance de ?', session.userData.foundMember.related[session.userData.foundMember.related.length - 1].prenom));
    },
    function (session, results, next) {  
        session.userData.foundMember.related[session.userData.foundMember.related.length - 1].datenaissance = results.response;
        next();
    },
    function (session, results) {
        builder.Prompts.choice(session,'Quelle formule d\'adhésion ?', "Adulte|Etudiant|Jeune");
    },
    function (session, results, next) {  
        session.userData.foundMember.related[session.userData.foundMember.related.length - 1].formuleAdhesion = results.response;
        next();
    },
    function (session, results) {
        session.userData.city = results.response;
        builder.Prompts.choice(session,'Quelle formule de cours ?', "PasDeCours|MiniTennis|Loisirs1H|Precompet1|Precompet2|Compet|Entrainement");
    },    
    function (session, results, next) {  
        session.userData.foundMember.related[session.userData.foundMember.related.length - 1].formuleCours = results.response;
        next();
    },
    function (session, results) {
        if (session.dialogData.args.nbRelated > 1) 
        {
            // Reprompt
            var args = session.dialogData.args;
            args.nbRelated--;
            //args.prompt = args.retryPrompt || "I didn't receive a location. Please try again.";
            //session.userData.Loops += '[a]';
            
            session.replaceDialog('/singlemember', args);
        } 
        else 
        {
            // Out of retries
            console.log("Out Of retries");
            session.endDialog({ resumed: builder.ResumeReason.notCompleted });
        }
    }
]);


//=========================================================
// Primary Dialog that will call the secondary dialog
//=========================================================

bot.dialog('/inscr', [
    function (session) {
        builder.Prompts.text(session,"Pouvez-vous me rappeler votre numéro de licence");
    },
    function (session, results) {
        session.send("Je recherche les informations vous concernant. Un petit instant");
        setTimeout(function() {
            botextapis.GetUserDataV1(errorCallback, results.response, function(errorCallback, memberInfo){
                
                session.userData.foundMember = memberInfo.value[0];
                session.send("J'ai retrouvé ces éléments:");
                var stringToFill = util.format("%s %s, résidant à l'adresse %s %s %s",
                    session.userData.foundMember.nom,
                    session.userData.foundMember.prenom,
                    session.userData.foundMember.adresse1,
                    session.userData.foundMember.cp,
                    session.userData.foundMember.ville);
                
                session.send(stringToFill);
                
                builder.Prompts.confirm(session,"Etes-vous bien la personne concernée ?");
            });
        }, 1000);
        
    },
    function (session, results) {
        if (results.response === true)
        {
            session.send("merci... Nous allons maintenant procéder à la vérification des informations à notre disposition");
            var promptMsg = util.format("Habitez-vous toujours au %s %s %s", session.userData.foundMember.adresse1, session.userData.foundMember.cp, session.userData.foundMember.ville);
            builder.Prompts.confirm(session, promptMsg);
        }
        else {
             session.send("Très bien, c'est curieux... Je vais tenter de vous contacter ultérieurement pour vérifier cela. Désolé de cet incident. A bientôt");
             session.endDialogWithResult({
                resumed: builder.ResumeReason.notCompleted
            });
        }

    },
    function (session, results, next) {
        if (results.response === false)
        {
            session.dialogData.action = "CORRECTION_ADRESSE"; 
            builder.Prompts.text(session,"Veuillez saisir votre adresse complète");
        }
        else
            next();
    },
    function (session, results, next) {
        if (session.dialogData.action = "CORRECTION_ADRESSE")
        {
            session.userData.foundMember.CorrectedAdresse = results.response;
            next();
        };
    },
    //PATTERN MODIFICATION INFORMATION DEBUT
    function (session, results) {
        builder.Prompts.confirm(session,util.format("Votre numero de téléphone domicile est-il %s", session.userData.foundMember.teldomicile));
    },
    function (session, results, next) {
        if (results.response === false)
        {
            session.dialogData.action = "CORRECTION_TELDOMICILE"; 
            builder.Prompts.text(session,"Veuillez saisir votre numéro de téléphone domicile");
        }
        else
            next();
    },
    function (session, results, next) {
        if (session.dialogData.action = "CORRECTION_TELDOMICILE")
        {
            session.userData.foundMember.CorrectedTelDomicile = results.response;
            next();
        };
    },
    //PATTERN MODIFICATION INFORMATION FIN
    
    //PATTERN MODIFICATION INFORMATION DEBUT
    function (session, results) {
        builder.Prompts.confirm(session,util.format("Votre numero de téléphone portable est-il %s", session.userData.foundMember.telmobile));
    },
    function (session, results, next) {
        if (results.response === false)
        {
            session.dialogData.action = "CORRECTION_TELPORTABLE"; 
            builder.Prompts.text(session,"Veuillez saisir votre numéro de téléphone portable");
        }
        else
            next();
    },
    function (session, results, next) {
        if (session.dialogData.action = "CORRECTION_TELPORTABLE")
        {
            session.userData.foundMember.CorrectedTelMobile = results.response;
            next();
        };
    },
    //PATTERN MODIFICATION INFORMATION FIN
    
    function (session, results) {
        builder.Prompts.number(session,"Combien de personnes pensez-vous réinscrire, vous y compris ?");
    },
    
    function (session, results) {
        session.userData.nbRequests = results.response;
        session.userData.cpt = 0;
        
        
        var actionArray = [];
        var callSingleMemberProcessCallback = function(callback) { 
            session.beginDialog('/singlemember', { nbRelated : session.userData.nbRequests, prompt: 'Please send me your current location.' });
        }

        actionArray.push(callSingleMemberProcessCallback);
            
        async.waterfall(actionArray, function(err,result){
        if (err)
            console.log("Erreur");
        });
    },
    function (session, results) {
        builder.Prompts.confirm(session,'Merci pour ces éléments. Etes-vous prêt à lancer la simulation de votre cotisation ?');
    },
    function (session, results, next) {
        session.endDialog("Merci et à bientôt !!!");
    }
    
]);



bot.dialog('/meteo', [
    function (session) {
        
        builder.Prompts.text(session,"La météo, bien sûr... Dans quelle ville ?");
    },
    function (session, results) {
        //session.send('Bonjour %s !', results.response);
        session.userData.city = results.response;
        builder.Prompts.text(session,util.format('%s, dans quel pays ? Je ne suis pas fort en géographie', session.userData.city));
    },
    function (session, results, next) {
        //session.send('Bonjour %s !', results.response);
        session.userData.country = results.response;
        
        var retTemp ;
        session.send(util.format('Je consulte immédiatement la météo de %s, %s', session.userData.city, session.userData.country ));
                
        botextapis.GetMeteoData(errorCallback, session.userData.city, session.userData.country , function(errorCallback, meteoData){
            
            var msg = new builder.Message(session)
            .textFormat(builder.TextFormat.markdown)
            .attachments([
                // This is the actual hero card. For each card you can add the
                // specific options like title, text and so on.
                new builder.HeroCard(session)
                    .title(defs.capitalize(session.userData.city) + ", " + defs.capitalize(session.userData.country))
                    .subtitle(meteoData.weather[0].description)
                    .text("Température : " + meteoData.main.temp + "°C" +
                    " - Direction du vent : " + botextapis.GetWindDirection(meteoData.wind) + 
                    " - Vitesse du vent : " + (meteoData.wind.speed * 3.6).toFixed() + "km/h" + 
                    " - Humidité : " + meteoData.main.humidity + "%")
                    .images([
                        builder.CardImage.create(session, "http://openweathermap.org/img/w/" + meteoData.weather[0].icon + ".png")
                    ])
            ]);

            // Send the message to the user and end the dialog
            session.send(msg);
            
            next(session, meteoData);
        });
        
    },
    function (session, results) {
        //session.send('Bonjour %s !', results.response);
        session.endDialogWithResult();
        }
]);

