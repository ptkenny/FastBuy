var express = require('express');
var router = express.Router();
var amazon = require('amazon-product-api');
const request = require('request');

// No env vars for now, damn laziness.
let amazonClient = amazon.createClient({
    awsId: "CENSORED",
    awsSecret: "CENSORED",
    awsTag: "CENSORED"
});

function sendSearchError(res) {
    return res.render('searcherror', { title: 'No Items Found' });
    // return res.send("There were no results found for the given search parameters.");
}

function sendSearchError(res, err) {
    return res.render('searcherror', { title: 'No Items Found' });
    // return res.send("There were no results found for the given search parameters.");
}

/* 
*   Originally had all this code in another function, the res copy was 
*   making the send double headers so I can't do that anymore...
*   Sorry to anyone who reads this.
*/ 

router.all('/', function (req, res, next) {
    let info = req.body;
    let useMinimumPrice = !info.minimumprice == "";
    let useMaximumPrice = !info.maximumprice == "";
    let minPrice = parseFloat(info.minimumprice);
    let maxPrice = parseFloat(info.maximumprice);
    
    // Would have else if here, but this format is easier to read,
    // and doesn't have any effect either way in the end.
    
    if (info.selection === "amazon") {
        let results = amazonClient.itemSearch({
            keywords: info.search,
            responseGroup: 'ItemAttributes,Offers'
        }).then( results => {

            for (var r of results) {
                if (!r["OfferSummary"]) continue;
                
                let price = parseFloat(r["OfferSummary"][0]["LowestNewPrice"][0]["Amount"][0]) / 100.0;

                if(useMaximumPrice && useMinimumPrice) {
                    if (price >= minPrice && price <= maxPrice) {
                        return res.redirect(r["DetailPageURL"][0]);
                    }
                } else if (useMinimumPrice) {
                    if (price >= minPrice) {
                        return res.redirect(r["DetailPageURL"][0]);
                    }
                } else if(useMaximumPrice) {
                    if (price <= maxPrice) {
                        return res.redirect(r["DetailPageURL"][0]);
                    }
                } else {
                    return res.redirect(r["DetailPageURL"][0]);
                }
            }

            return sendSearchError(res);
        }).catch( err => {
            return sendSearchError(res, err);
        });
    } 
    
    if (info.selection === "ebay") {
        let ebayURL = `http://svcs.ebay.com/services/search/FindingService/v1?OPERATION-NAME=findItemsByKeywords&SERVICE-VERSION=1.0.0&SECURITY-APPNAME=PatrickK-fastbuy-PRD-ab7eb28a6-4289a10c&RESPONSE-DATA-FORMAT=JSON&REST-PAYLOAD&keywords=${info.search}&affiliate.trackingId=5338111591&affiliate.networkId=9`;
        request({ url: ebayURL, json: true }, (err, req, json) => {
            for (var i of json["findItemsByKeywordsResponse"][0]["searchResult"][0]["item"]) {
                let price = parseFloat(i["sellingStatus"][0]["convertedCurrentPrice"][0]["__value__"]); 

                if(useMaximumPrice && useMinimumPrice) {
                    if(price >= minPrice && price <= maxPrice) {
                        return res.redirect(i["viewItemURL"][0]);
                    }
                } else if (useMinimumPrice) {
                    if (price >= minPrice) {
                        return res.redirect(i["viewItemURL"][0]);
                    }
                } else if(useMaximumPrice) {
                    if (price <= maxPrice) {
                        return res.redirect(i["viewItemURL"][0]);
                    }
                } else {
                    return res.redirect(i["viewItemURL"][0]);
                }
            }

            return sendSearchError(res);
        });

    }

});

module.exports = router;