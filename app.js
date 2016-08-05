var restify = require('restify');
var builder = require('botbuilder');
var util = require('util');
var defs = require("./botmisc.js");
var botextapis = require('./botextapis.js');
var async = require('async');
//require('request').debug = true;
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
server.listen(process.env.port || process.env.PORT || 3978, function () {
   console.log('%s listening to %s', server.name, server.url); 
});
  
// Create chat bot
var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});
var bot = new builder.UniversalBot(connector);
server.post('/api/messages', connector.listen());

// Serve a static web page 
server.get(/.*/, restify.serveStatic({ 
 	'directory': '.', 
 	'default': 'index.html' 
})); 

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

intents.matches(/^S/i, [
    function (session) {
        session.beginDialog('/game');
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
        session.send(defs.sayHello);
        builder.Prompts.text(session, defs.helpMessage);
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
        else if (results.response === "E") 
        {
            session.beginDialog('/game');
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
        if (session.userData.foundMember.related.length === 0)
            session.send(defs.registerMember);
        else
            session.send(defs.resgisterNextMember);
        builder.Prompts.text(session,"Nom ?");
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
        builder.Prompts.time(session,util.format('Date de naissance de %s ?', session.userData.foundMember.related[session.userData.foundMember.related.length - 1].prenom));
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
        builder.Prompts.text(session,"Pouvez-vous me rappeler votre numéro de licence ?");
    },
    function (session, results, next) {
        session.send(util.format("Je recherche les informations vous concernant pour le numéro %s. Un petit instant", results.response));
        setTimeout(function() {
            botextapis.GetUserDataV1(errorCallback, results.response, function(errorCallback, memberInfo){
               
                session.userData.foundMember = memberInfo.value[0];
                if (session.userData.foundMember != null)
                {
                    session.send("J'ai retrouvé ces éléments:");
                    var stringToFill = util.format("%s %s, résidant à l'adresse %s %s %s",
                        session.userData.foundMember.nom,
                        session.userData.foundMember.prenom,
                        session.userData.foundMember.adresse1,
                        session.userData.foundMember.cp,
                        session.userData.foundMember.ville);
                    session.userData.SearchOk = true;
                    session.send(stringToFill);
                    
                    builder.Prompts.confirm(session,"Etes-vous bien la personne concernée ?");
                }
                else
                {
                    session.userData.SearchOk = false;
                    session.send("Le numéro saisi n'a pas permis de vous identifier. Merci de renouveler votre demande après vérification.");
                    next();
                }
            });
        }, 1000);
        
    },
    function (session, results) {
        if (session.userData.SearchOk == false )
        {
            session.endDialog({ resumed: builder.ResumeReason.canceled });
        }
        else if (results.response == true)
        {
            session.send("merci... Nous allons maintenant procéder à la vérification des informations à notre disposition");
            var promptMsg = util.format("Habitez-vous toujours au %s %s %s", session.userData.foundMember.adresse1, session.userData.foundMember.cp, session.userData.foundMember.ville);
            builder.Prompts.confirm(session, promptMsg);
        }
        else {
             session.send("Très bien, c'est curieux... Je vais tenter de vous contacter ultérieurement pour vérifier cela. Désolé de cet incident. A bientôt");
             session.endDialogWithResult();
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
    function (session, results) {
        builder.Prompts.number(session,'Pourriez-vous donner une note sur la qualité de mon service (0 à 5) ?');
    },
    function (session, results, next) {
        session.userData.foundMember.SurveyMark = results.response;
        next();
    },
    function (session, results, next) {
        var jsonNotif = { EventDateTime : new Date().toISOString(), SurveyType : "Registration", SurveyMark : session.userData.foundMember.SurveyMark, FirstName : session.userData.foundMember.prenom, LastName : session.userData.foundMember.nom, NumberOfRegistrations : session.userData.foundMember.related.length };
        botextapis.SendRegistrationMessage(errorCallback, jsonNotif, function (err, msg){
            
        });
        session.endDialog("Merci et à bientôt !!!");
    }
]);



bot.dialog('/meteo', [
    function (session) {
        
        builder.Prompts.text(session,"La météo, bien sûr... Dans quelle ville ?");
    },
    function (session, results) {
        //session.send('Bonjour %s !', results.response);
        session.userData.meteoData = { City : "", Country : "", Latitude : "", Longitude : "", SurveyType : "MeteoData", EventDateTime : "" };
        session.userData.meteoData.City = results.response;
        builder.Prompts.text(session,util.format('%s, dans quel pays ? Je ne suis pas fort en géographie', session.userData.meteoData.City));
    },
    function (session, results, next) {
        //session.send('Bonjour %s !', results.response);
        session.userData.meteoData.Country = results.response;

        session.send(util.format('Je consulte immédiatement la météo de %s, %s', session.userData.meteoData.City, session.userData.meteoData.Country ));
                
        botextapis.GetMeteoData(errorCallback, session.userData.meteoData.City, session.userData.meteoData.Country , function(errorCallback, meteoData){
            session.userData.meteoData.Latitude = meteoData.coord.lat;
            session.userData.meteoData.Longitude = meteoData.coord.lon;
            var msg = new builder.Message(session)
            .textFormat(builder.TextFormat.markdown)
            .attachments([
                // This is the actual hero card. For each card you can add the
                // specific options like title, text and so on.
                new builder.HeroCard(session)
                    .title(defs.capitalize(session.userData.meteoData.City) + ", " + defs.capitalize(session.userData.meteoData.Country))
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
    function (session, results, next) {
        session.userData.meteoData.EventDateTime = new Date().toISOString();
        console.log("MeteoData:" + session.userData.meteoData);
        botextapis.SendMeteoMessage(errorCallback, session.userData.meteoData, function (err, msg){
            if(err)
            {
                //session.send("Une erreur est survenue quelque part...");
            }    
        });
        
        session.endDialog("Merci et à bientôt !!!");
    }
]);



bot.dialog('/game', [
    function (session) {
        
        builder.Prompts.choice(session,"Nous allons jouer à un jeu... Pouvez-vous me donner un chiffre entre 1 et 10 ?", "1|2|3|4|5|6|7|8|9|10" );  
    },
    function (session, results, next) {
        session.userData.surveyData = { SurveyType : "NumberChoice", ChosenNumber : -1 , PeopleAge : "", PeopleGender : "", previousPlayer : "", astonished : "", SurveyMark : "", EventDateTime : "" };
        //session.send('Bonjour %s !', results.response);
        console.log(results.response.entity);
        var numberRes = parseInt(results.response.entity);
        if (numberRes > 0 && numberRes <= 10)
        {
            session.userData.surveyData.ChosenNumber = numberRes;
            next();
        }
        else
        {
            session.send( numberRes + " n'est pas compris entre 1 et 10. Pouvez-vous retenter ?")
        }
    },
    function (session, results) {
        //session.send('Bonjour %s !', results.response);
        builder.Prompts.choice(session, "Pouvez-vous m'indiquer votre âge dans les tranches suivantes ?", ["1-20", "21-30","31-40","51-60","61-80 ou plus"] );
        session.userData.surveyData.PeopleAge = results.response.entity;
    },
    function (session, results) {
        //session.send('Bonjour %s !', results.response);
        builder.Prompts.choice(session, "Etes-vous un homme ou une femme ?", ["Homme","Femme"] );
        session.userData.surveyData.PeopleGender = results.response;
    },
    function (session, results) {
        builder.Prompts.confirm(session, "Avez-vous déjà joué ici avec moi ?");
        
    },
    function (session, results) {
        console.log(results.response);
        session.userData.surveyData.previousPlayer = results.response.entity;
        builder.Prompts.confirm(session, "Vous aviez choisi le nombre [" + session.userData.surveyData.ChosenNumber + "], n'est-ce pas ? Multipliez ce chifre par 2, ajoutez 8, divisez le par 2 et retranché le chiffre pensé au début par le chiffre obtenu ici... Etes-vous prêt pour la suite ?" );
    },
    function (session, results) {
        builder.Prompts.confirm(session, "Pour le nombre trouvé, faites lui correspondre la lettre de l'alphabet (Par exemple, 1 - A, 2 - B etc.... Etes-vous prêt ?");
    },
    function (session, results) {
        //session.send('Bonjour %s !', results.response);
        builder.Prompts.confirm(session, "Pensez très fort à un animal commençant par cette lettre. Etes-vous prêt ?");
    },
    function (session, results) {
        //session.send('Bonjour %s !', results.response);
        builder.Prompts.confirm(session, "Pensez à un pays qui commencerait par la lettre qui suit cette première lettre. Par exemple, si vous aviez trouvé A, pensez très fort à un pays qui commence par la lettre B etc.... Etes-vous prêt ?");
    },
    function (session, results) {
        //session.send('Bonjour %s !', results.response);
        builder.Prompts.confirm(session, "Enfin, pensez très fort à la couleur de l'animal que vous aviez choisi. Etes-vous prêt ?");
    },
    function (session, results) {
        session.send("Voyons, êtes vous réellement certain que l'on puisse trouver des éléphants gris au Danemark ?");
        setTimeout(function() {
            builder.Prompts.confirm(session,'Amusant non ? Vous ai-je épaté ?');
        }, 3000);
    },
    function (session, results) {
        session.userData.surveyData.astonished = results.response;
        builder.Prompts.number(session,'Pourriez-vous donner une note sur la qualité de votre expérience (0 à 5) ?');
    },
    function (session, results, next) {
        session.userData.surveyData.SurveyMark = results.response;
        next();
    },
    function (session, results, next) {
        session.userData.surveyData.EventDateTime = new Date().toISOString();
        console.log("SurveyData");
        if (session.userData.surveyData.astonished === true)
            botextapis.SendSurveyMessage(errorCallback, session.userData.surveyData, function (err, msg){
            
        });
        session.endDialog("Merci et à bientôt !!!");
    } 
]);
