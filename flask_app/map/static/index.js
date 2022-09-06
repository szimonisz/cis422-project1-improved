/*****************************************************************************************************************************************************************************
File Name: index.js
 
Author: Kelemen Szimonisz
Organization: Map Culture (University of Oregon, CIS422, FALL 2021)

This Javascript file (and its imported modules) is used by the map.html template and enables the page to:
    1. Append the number of inputs to the destination entry form when the 'Add destination' button is clicked.
    2. Handle the submit button for the destination entry form
    3. Use the Google Maps Javascript API to:
        - Initialize an interactive Google map
        - Request and receive coordinates for user inputted addresses or places (Places API)
        - Request and receive a list of distances and durations to and from each location (Distance Matrix API), then parse that information into 2D matrices 
        - Draw an optimal route (once calculated -- see part 4)
    4. Request and receive an optimal route from our backend Flask server, providing a distance or duration matrix as input
        - Draw this optimal route onto the map 

Creation Date: 10/03/2021
Last Modified: 09/06/2022

*****************************************************************************************************************************************************************************/

import { MapRenderer } from './modules/map.js';
import { autoCompletify, getPlace } from './modules/places.js';
import { displayMessage, sleep, hideElementForSeconds } from './modules/helpers.js';
export { placesService, distanceMatrixService };

/* Declare global variables: */
let mapRenderer;           /* Instance of MapRenderer class. Properties include:
                                - Google Maps Javascript API map instance 
                                - Zoom (view distance)
                                - DirectionsService
                                - DirectionsRenderer 
                                - Markers */
let distanceMatrixService; /* Communicates with the Google Maps Javascript API Distance Matrix Service. Computes travel distance for a set of destinations. */
let placesService;         /* This object communicates with the Google Maps Javascript API Places Library. Enables the app to obtain a coordinate given an address or place name */

/*****************************************************************************************************************************************************************************
FUNCTION: initMap

This function instantiates and initializes the interactive map that is provided by the Google Maps Javascript API (via the custom MapRenderer class).
All services or libraries used by the Google Maps Javascript API map are initalized here as well (Places, DistanceMatrix, Directions).

****************************************************************************************************************************************************************************/
function initMap() {
    mapRenderer = new MapRenderer(12);
    // Instantiate a Google Places Service and assign it to the respective global variable. Provide the map as input (so attributions can be rendered).
    placesService = new google.maps.places.PlacesService(mapRenderer.map);
    // Instantiate a Google DistanceMatrix Service and assign it to the respective global variable
    distanceMatrixService = new google.maps.DistanceMatrixService();
}

/****************************************************************************************************************************************************************************
EVENT LISTENERS

These are event listeners that attach to a specific element in the HTML template (or DOM object) and call a function when triggered.

****************************************************************************************************************************************************************************/
// Wait for the DOM to finish loading before manipulating it
document.addEventListener("DOMContentLoaded", function () {
    initMap();
    // the origin address text input HTML element
    var originEntry = document.getElementById('origin');

    // convert the originEntry from a text field to a Google Places Autocomplete text field
    autoCompletify(originEntry);

    // all destination address text input HTML elements 
    var destEntries = document.querySelectorAll('.dest-entry');

    // convert all destEntries from text fields to Google Places Autocomplete text fields
    for (let i = 0; i < destEntries.length; i++) {
        autoCompletify(destEntries[i]);
    }

    // the "Draw Route" submit button
    var submitButton = document.getElementById('submit-bttn');

    // the option bubbles (HTML radio inputs) for: "Distance vs. Duration" and "Prim's vs. Genetic"
    var radioDistance = document.getElementById('radio-distance');
    var radioDuration = document.getElementById('radio-duration');
    var radioMST = document.getElementById('radio-MST');
    var radioGenetic = document.getElementById('radio-genetic');

    // the div where messages are displayed to the user (either ERROR messages or HELP messages)
    var header = document.getElementById('show-error');

    // If 'submit' button is clicked:
    // Then calculate matrices, send coordinates and distances to backend, receive optimal route, draw route onto Google map
    submitButton.addEventListener('click', (e) => {
        // prevent form submission from reloading the page
        e.preventDefault();

        // hide the submitButton for 2 seconds
        // this is to prevent the user from spamming the submit button and causing a Google Request Cooldown
        hideElementForSeconds(submitButton, 2000);

        // remove any ERROR messages or HELP messages
        header.innerText = "";

        // value of the user's input to the 'Origin:' text input field
        var origin = document.getElementById('origin').value;

        // a list of elements that belong to the class 'dest-entry'
        // a.k.a. all text input elements with the label 'Destination:'
        var destEntries = document.querySelectorAll('.dest-entry');

        // a list of user inputted destinations
        var destinations = [];

        // the origin point is the starting destination, push it to the destinations list
        destinations.push(origin);

        // flag that keeps track of whether or not all of the inputted destinations are empty
        var allEmpty = true;

        // push the values of all text input elements that belong to the class 'dest-entry' to the destinations list
        for (let i = 0; i < destEntries.length; i++) {
            // If a destination entry is empty
            // change the allEmpty flag
            if (destEntries[i].value != "") {
                allEmpty = false;
            }
            destinations.push(destEntries[i].value);
        }
        // if the user did not provide any input for the origin 
        // or if the user did not provide any destination addresses
        if (origin == "" || allEmpty) {
            // display an error message and kill execution
            displayMessage("ERROR: A route requires an origin and at least one destination. Please try again.", true);
            // if the map is defined when this error occurs, then clear the map of any routes and markers
            if (mapRenderer.map !== undefined) {
                mapRenderer.clearMap();
            }
            return;
        }
        // the origin point is also the final destination, push it to the destinations list
        destinations.push(origin);


        // draw a Google Maps Javascript API interactive map that displays an optimal route between the inputted destinations
        // (starting at destinations[0] and ending at destinations[-1]

        // draw the map and route based on the options the user selected:

        // "Draw a route that minimizes distance and uses the MST algorithm"
        if (radioDistance.checked && radioMST.checked) {
            mapRenderer.drawMap(destinations, 'distance', 'MST');
        }
        // "Draw a route that minimizes time and uses the MST algorithm"
        else if (radioDuration.checked && radioMST.checked) {
            mapRenderer.drawMap(destinations, 'duration', 'MST');
        }
        // "Draw a route that minimizes distance and uses the genetic algorithm"
        else if (radioDistance.checked && radioGenetic.checked) {
            mapRenderer.drawMap(destinations, 'distance', 'genetic');
        }
        // "Draw a route that minimizes time and uses the genetic algorithm"
        else if (radioDuration.checked && radioGenetic.checked) {
            mapRenderer.drawMap(destinations, 'duration', 'genetic');
        }
    });

    // if 'add destination' button is clicked:
    // Then create a text entry input field and append it to the form 
    document.getElementById('add-dest-bttn').addEventListener('click', (e) => {
        // the number of destination entry boxes that currently exist in the HTML
        var numDests = document.querySelectorAll('.dest-entry').length + 1;

        // limit the number of destination input fields to 9
        if (numDests <= 9) {
            // create a string to be used in as an HTML id attribute, represents what 'dest' number the element is
            var destId = "dest" + String(numDests);

            // create a new HTML <label> element and set the 'for' attribute to the destId, also set the 'text' attribute to label what destination it is
            var newDestLabel = document.createElement("label");
            newDestLabel.htmlFor = destId;
            newDestLabel.textContent = "Destination " + numDests + ":";
            newDestLabel.id = "destlabel" + String(numDests);

            // create a new HTML <input> element and set the 'id' attribute to destId, 'class' attribute to 'dest-entry', 'name' attribute to destId
            var newDestInput = document.createElement("input");
            newDestInput.id = destId;
            newDestInput.className = "dest-entry";
            newDestInput.name = destId;
            autoCompletify(newDestInput);

            // create a new HTML <br> element to better format the input form
            var breakId = "break" + String(numDests);
            var breakElement = document.createElement("br");
            breakElement.id = breakId;

            // create an HTML whitespace element to help formatting
            var whitespace = document.createTextNode(" ");
            // the element on the HTML page with the id 'dest-form' 
            var destinationEntryForm = document.getElementById('dest-form');

            // append the newly created <label>, whitespace, <input>, and <br> elements to the form in that order
            destinationEntryForm.append(newDestLabel, whitespace, newDestInput, breakElement);
        }
    });

    // If 'remove destination' button is clicked:
    // Then remove the last text input HTML element from the form. (If there is only one text input element left, then just clear that element's inner text)
    document.getElementById('remove-dest-bttn').addEventListener('click', (e) => {
        // the number of destination entry boxes that currently exist in the HTML
        var numDests = document.querySelectorAll('.dest-entry').length;

        // create a string to be used as an HTML id attribute, represents what 'dest' number the element is
        var destInputId = "dest" + String(numDests);
        // get the last destination text input element in the form div
        var lastDestInput = document.getElementById(destInputId);

        // only remove a destination input if it is not the only destination left
        // always leave the first destination input because it is required for app functionality
        if (numDests > 1) {
            // create a string to be used as an HTML id attribute, represents what 'destLabel' number the element is
            var destLabelId = "destlabel" + String(numDests);
            // create a string to be used as an HTML id attribute, represents what 'break' number the element is
            var breakId = "break" + String(numDests);

            // get the last destination label element in the form div
            var lastDestLabel = document.getElementById(destLabelId);
            // get the last destination line break element in the form div
            var lastBreak = document.getElementById(breakId);

            // remove the elements from the HTML
            lastDestInput.remove();
            lastDestLabel.remove();
            lastBreak.remove();
        }

        // else if there is only one destination input
        // do not remove its input box, instead change its value to be empty
        else {
            lastDestInput.value = "";
        }

    });
    // If 'clear destinations' button is clicked:
    // Clear the inner text for all text input HTML inputs in the form
    document.getElementById('clear-dests-bttn').addEventListener('click', (e) => {
        // the number of destination entry boxes that currently exist in the HTML
        var destEntries = document.querySelectorAll('.dest-entry');

        // set the value of all destination text input fields to empty space
        for (let i = 0; i < destEntries.length; i++) {
            destEntries[i].value = "";
        }
    });

    // If the '?' (help) button is clicked:
    // Display a help message to the user that explains the difference between the genetic and MST algorithms 
    document.getElementById('help-bttn').addEventListener('click', (e) => {
        // display a message to the user
        // explain the differences between each algorithm
        displayMessage("Choosing an algorithm:\n\nIf you can wait, the Genetic algorithm will get you a close-to-optimum route.\n\nIf you're in a hurry, the Prim’s algorithm will get you an efficient route fast.", false);
    });
});
