import {placesService} from '../index.js';
export {autoCompletify, getPlace}
/****************************************************************************************************************************************************************************
FUNCTION: autoCompletify

This function converts a standard text input HTML element to a Google Places Autocomplete text input.
****************************************************************************************************************************************************************************/
async function autoCompletify(textInput) {
    // set Google Places Autocomplete options
    const options = {
        componentRestrictions: { country: "us" },
        fields: ["address_components", "geometry", "name"],
    };
    // instantiate a new Autocomplete box using the textInput HTML
    const auto = new google.maps.places.Autocomplete(textInput);
}
/*****************************************************************************************************************************************************************************
FUNCTION: getPlace

This function sends a user inputted address or place string inside of a FindPlaceFromQueryRequest to the Google Places Service using the findPlaceFromQuery method.

A Promise object is returned that will resolve when the response from Google's servers is complete.

If the response status is OK, then the state of the promise is fulfilled, and the promise results to a JSON containing the latitude and longitude values of the inputted address.
Else the state of the promise object is changed to 'rejected' and the result is the entire response with a negative HTTP status.
NOTE: The methods of all Google Maps Javascript API services, besides the Places Service, return Promises.
    Source: https://developers.google.com/maps/documentation/javascript/promises
    
    In order to maintain a consistent design for how this code handles asynchronous function calls, I chose to wrap this function's response in a Promise object.
    This stackoverflow answer helped me understand this process: https://stackoverflow.com/a/47893027

****************************************************************************************************************************************************************************/
function getPlace(address) {

    // create a FindPlaceFromQueryRequest
    // query: the user inputted location string
    // fields: the fields we would like the service to respond with, in this case: the name and coordinates of the location
    var request = {
        query: address,
        fields: ['name', 'geometry'],
    };

    // return a Promise object that sends a findPlaceFromQuery request using the Places Service
    // the promise object results to the latitude and longitude of the inputted address (if the request is successful)
    return new Promise((resolve, reject) => {
        placesService.findPlaceFromQuery(
            request,
            (response, status) => {
                console.log(status);
                console.log(response);
                if (status === 'OK') {
                    // the response is a list of places in an order determined by what Google deems as most likely to be the correct location (given the inputted string)
                    // in this case, the first place in the list is chosen, and its coordinates are captured in a dictionary
                    // the Promise object is resolved with this value
                    resolve({
                        lat: response[0].geometry.location.lat(),
                        lng: response[0].geometry.location.lng(),
                    });
                }
                else {
                    reject(status);
                }
            }
        )
    });
}