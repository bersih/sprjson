//Hardcoded Vars for the request
var queryUrl = process.env.QUERY_URL || "http://daftarj.spr.gov.my/DAFTARJ/DaftarjBM.aspx";
var requestUrl = process.env.REQUEST_URL || 'http://daftarj.spr.gov.my/DAFTARJ';

var request = require('request');
var cheerio = require('cheerio');
var express = require('express');
var app     = express();
var port    = process.env.PORT || 3000;

//Routes
app.get('/', function(req, res){
    res.status(200).json({'api': 'SPR-JSON', 'version': '1.0.1', 'status': 'healthy' });
});

app.get('/ic/:icNum', function(req, res){ //TODO -- FIX CALLBACK HELL. Implement promises
    //Create the Form vars
    var requestForm = {};
    request.get(requestUrl, function(err, response, body){
        if (err){
            res.status(500).json({'error': err});
        } else {
            var keys = {};
            getKeys(response, body, res, keys);
            requestForm = {
                'Semak': "Semak",
                '__EVENTVALIDATION': keys["eventValidation"],
                '__VIEWSTATE': keys["viewState"],
                'txtIC': req.params.icNum
            };

            request.post({
                url: queryUrl,
                form: requestForm,
                },
                function(err, response, body){
                    if (err){
                        res.status(500).json({'error': err});
                        console.log(err);
                    } else{
                        processForm(response, body, res);
                    }
                }
            );
        }
    });
});


//Begin server listening
var server = app.listen(port, function(){
    console.log("server listening on port %s", port);
});


function processForm(response, body, res){
    if (body.indexOf('Record not found.') !== -1){
        res.status(404).json({'error': 'Record not found'});
    } else{
        var $ = cheerio.load(body);
        var userData = {};

        //Insert userdata
        userData["newIC"] = $("#LabelIC")[0]["children"][0]["data"];
        userData["oldIC"] = ($("#LabelIClama")[0]["children"][0] === undefined) ? '' : $("#LabelIClama")[0]["children"][0]["data"];
        userData["name"] = $("#Labelnama")[0]["children"][0]["data"];
        birthdate = $("#LabelTlahir")[0]["children"][0]["data"];
        userData['birthdate'] = new Date(birthdate.substr(birthdate.length - 4) + "-" + userData["newIC"].substr(2,2) + "-" + userData["newIC"].substr(4,2));
        if ($("#Labeljantina")[0]["children"][0]["data"] == 'LELAKI'){
            userData['gender'] = 'male';
        } else{
            userData['gender'] = 'female';
        }
        userData['localityString'] = $("#Labellokaliti")[0]["children"][0]["data"];
        localityNumArray = userData['localityString'].split(" - ")[0].split("/").map(function(s) { return String.prototype.trim.apply(s); }); //Trims each item in array
        userData['locality'] = {
            'num': localityNumArray[3],
            'label': $("#Labellokaliti")[0]["children"][0]["data"].split(" - ")[1].trim(" ")
        };
        userData['votingDistrict'] = {
            'num': localityNumArray[2],
            'label': $("#Labeldm")[0]["children"][0]["data"].split(" - ")[1].trim(" ")
        };
        userData['DUN'] = {
            'num': localityNumArray[1],
            'label': $("#Labeldun")[0]["children"][0]["data"].split(" - ")[1].trim(" ")
        };
        userData['parliament'] = {
            'num': localityNumArray[0],
            'label': $("#Labelpar")[0]["children"][0]["data"].split(" - ")[1].trim(" ")
        };
        userData['state'] = $("#Labelnegeri")[0]["children"][0]["data"];
        //Unknown function for now
        userData['status'] = $("#LABELSTATUSDPI")[0]["children"][0]["data"];

        res.status(200).json(userData);
    }
}

function getKeys(response, body, res, keys){
    var $ = cheerio.load(body);
    keys['viewState'] = $("#__VIEWSTATE").attr('value');
    keys['eventValidation'] = $("#__EVENTVALIDATION").attr('value');
}