/*****************************************************************************************************************************************************************************
File Name: map.js
 
Author: Kelemen Szimonisz
Organization: Map Culture (University of Oregon, CIS422, FALL 2021)

This JavaScript file contains the MapRenderer class.
The MapRenderer class properties include the directionsService, directionsRenderer, map, and markers.
The MapRenderer class methods handle the drawing of the map, markers, and route.

Creation Date: 09/05/2022
Last Modified: 09/06/2022
****************************************************************************************************************************************************************************/
import {getMatrix, getOptimalRoute} from './matrix.js';
import {getPlace} from './places.js';
import {displayMessage} from './helpers.js';
export {MapRenderer}

class MapRenderer {
    constructor(zoom) {
        this.zoom = zoom;
        this.directionsService = new google.maps.DirectionsService();
        this.directionsRenderer = new google.maps.DirectionsRenderer({
            // stop the DirectionsRenderer from producing its own markers
            suppressMarkers: true
        });
        // Instantiate a Google Maps Javascript API interactive map and assign it to the global variable, set initial properties for the Map object
        // An HTML div is required to create the map object. <div> element with the ID 'map' from getmap.html will hold the map.
        this.map = new google.maps.Map(document.getElementById('map'), {
            // set zoom level
            // Google Maps API approximate level of detail per zoom level:
            // 1: World, 5: Landmass/continent, 10: City, 15: Streets, 20: Buildings
            zoom: this.zoom,
        });

        // Specify that directions should be rendered on the map object
        this.directionsRenderer.setMap(this.map);
        this.markers = [];
    }

    /****************************************************************************************************************************************************************************
    METHOD: addMarker

    This method uses the Google Maps Javascript API to instantiate a Marker object and initialize it with a set of coordinates and a label.
    The marker object is added to the global list: markers.
    Markers are labeled in A-Z in order of their priority in the route.
    ****************************************************************************************************************************************************************************/
    addMarker(coords, index) {
        // a list of marker label characters (A-Z)
        const labels = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

        // create a new marker, to be placed on the global map variable
        const marker = new google.maps.Marker({
            position: coords,
            label: labels[index],
            map: this.map,
        });
        // append the new Marker to the global markers list
        this.markers.push(marker);
    }
    /****************************************************************************************************************************************************************************
    METHOD: setMapOnAll
    
    This method draws all markers from the markers list onto the map.
    
    This code was taken from a Google Maps API Documentation Example
    Source: https://developers.google.com/maps/documentation/javascript/examples/marker-remove
    ****************************************************************************************************************************************************************************/
    setMapOnAll(map) {
        // add every marker from the global markers list to the map
        for (let i = 0; i < this.markers.length; i++) {
            this.markers[i].setMap(map);
        }
    }
    /****************************************************************************************************************************************************************************
    METHOD: drawRoute
    
    This method uses the Google Directions Service's route method to obtain a street-by-street path from a list of destinations.
    The DirectionsRenderer object is used to draw the route on the map.
    
    The method takes a list of destinations as input, where the first and last destinations are origins. The route will be formed by order of the list.
    ****************************************************************************************************************************************************************************/
    drawRoute(dests) {
        // the origin is the first location in the dests list
        // the origin is the starting location and ending location of our route
        var origin = dests[0];

        // remove the origin location from the list of destinations (the starting location and the ending location)
        dests = dests.slice(1, -1);

        // a list to hold the waypoint locations: the locations on the route in between the starting location and ending location
        var waypts = [];

        // create a waypoint for each destination in the list
        for (let i = 0; i < dests.length; i++) {
            // a Google DirectionsWaypoint requires two fields: location and stopover 
            waypts.push({
                location: dests[i],
                // a boolean that indicates that the waypoint is a stop on the route
                stopover: true,
            });
        }

        // create a request for round-trip directions (from origin to origin) and visit all waypoints along the way
        // waypoints are followed in order of waypts list
        // set travel mode to DRIVING (route will be drawn accordingly)
        var request = {
            origin: origin,
            destination: origin,
            waypoints: waypts,
            travelMode: 'DRIVING'
        };

        // send the request to the DirectionsService
        var self = this;
        this.directionsService.route(request, function (result, status) {
            // if the response status is OK, then draw the resulting route on the map using the DirectionsRenderer's setDirections method
            if (status == 'OK') {
                self.directionsRenderer.setDirections(result);
            }
        });
    }
    /****************************************************************************************************************************************************************************
    METHOD: clearMap
    
    This method clears any existing routes and markers from the global map object.
    ****************************************************************************************************************************************************************************/
    clearMap() {
        // dissassociate the directionsRenderer (route drawer) from the map
        this.directionsRenderer.setMap(null);
        // remove all markers from the map
        this.setMapOnAll(null);
        // delete all markers
        this.markers = [];
    }
    /****************************************************************************************************************************************************************************
    METHOD: drawMap

    This is the main method that draws an interactive map with an optimal route between an origin and a set of destinations (optimizing for either distance or duration)
    This method takes in a list of user inputted location strings, where the first and last locations are the same. (Round trip).
    It initializes the Google Maps Javascript API map, then calls the helper function getPlace to convert the user inputted destinations into coordinates.
    A marker is created at each set of coordinates (except for the final location, to not overlap with the starting location's marker -- as they are the same).
    The distance and duration matrices are obtained by calling getMatrix, a call is then made to getOptimalRoute with that function as input.
    Finally, the route is drawn on the map using drawRoute.

    matrixType can be either: 'distance' or 'duration'
    algorithm can be either: 'MST' or 'genetic'

    Note: The origin is both a starting location and an ending location on the route (the first and last index of the destinations list is the origin location). 
    ****************************************************************************************************************************************************************************/
    async drawMap(destinations, matrixType, algorithm) {
        // clear all routes and markers drawn from map
        this.clearMap();
        // reassociate the directionsRenderer with the map
        // (required after clearing)
        this.directionsRenderer.setMap(this.map);

        // a list of LatLng coordinates for each destination entered by the user
        var destCoords = [];

        // convert user inputted destination coordinates to coordinate objects
        // create a marker for each destination 
        for (let i = 0; i < destinations.length; i++) {
            // if the inputted destination is a non-empty string 
            if (destinations[i].length != 0) {
                // convert user input address to a coordinate
                // returns undefined if there is an error
                var coords = await getPlace(destinations[i]).catch((e) => {
                    console.log("getPlace request failed with status:", e);
                    // user is requesting too many coordinates too quickly
                    if (e == "OVER_QUERY_LIMIT") {
                        displayMessage("ERROR: You have requested too many queries in too short of a time. Please wait at least 30 seconds before trying again.", true);
                    }
                    // user input address returned zero results
                    else if (e == "ZERO_RESULTS") {
                        displayMessage("ERROR: A destination was entered that is not valid. Try again.", true);
                    }
                    // catch-all other errors
                    else {
                        displayMessage("ERROR: Request failed for an unknown reason. Please wait some time and try again.", true);
                    }
                    return undefined;
                });

                // if coords are not defined (due to a querying error, user input error)
                // remove the last successful route from the map when displaying error messages
                if (coords == undefined) {
                    this.clearMap();
                    return;
                }
                // add the coords to the list
                else {
                    destCoords.push(coords);
                }
            }
        }
        // the origin coordinates are the first (and last) coordinates in the list that contains all destination coords
        var originCoords = destCoords[0];

        // center the map's view on the origin location
        this.map.setCenter(originCoords);

        // obtain the distance matrix and duration matrix for the set of coordinates converted from user inputs
        var matrices = await getMatrix(destCoords).catch((e) => {
            // catch and display getMatrix request failure as an error
            // generally, this error will only occur if the user is making too many requests
            console.error(e.message);
            return undefined;
        });

        // if the matrices are undefined (there was an error obtaining them)
        // remove the last successful route from the map when displaying error messages, then stop execution
        if (matrices == undefined) {
            displayMessage("ERROR: You have requested too many queries in too short of a time. Please wait at least 30 seconds before trying again.", true);
            this.clearMap();
            return;
        }

        // the distance matrix received from the request to Google
        var distanceMatrix = matrices.distanceMatrix;
        // the duration matrix received from the request to Google
        var durationMatrix = matrices.durationMatrix;

        // if the matrices obtained from getMatrix do not have any elements with undefined distances/durations
        if (matrices.valid == true) {
            // obtain the optimal route from the origin to the waypoints and back to the origin, optimized for reducing distance traveled
            if (matrixType == "distance") {
                // this returns the order in which the destinations in the destCoords list should be traveled (by indices)
                var optimalRoute = await getOptimalRoute(algorithm, distanceMatrix, destCoords);
            }
            else {
                // obtain the optimal route from the origin to the waypoints and back to the origin, optimized for reducing time traveled
                // this returns the order in which the destinations in the destCoords list should be traveled (by indices)
                var optimalRoute = await getOptimalRoute(algorithm, durationMatrix, destCoords);
            }
        }
        else {
            displayMessage("ERROR: A destination was entered that is not connected to the origin by land. Try again.", true);
            // remove the last successful route from the map when displaying error messages, then stop execution
            this.clearMap();
            return;
        }
        // sort the destinations in order of the optimalRoute, draw the route on the map
        var sortedDestCoords = optimalRoute.map(i => destCoords[i]);

        // create a marker for each location in the sorted location in the list
        for (let i = 0; i < sortedDestCoords.length; i++) {
            // if the destination is not the final destination, then create a Marker object and add it to the global list
            // (this is to avoid overlapping the origin location with two markers
            if (i != sortedDestCoords.length - 1) {
                this.addMarker(sortedDestCoords[i], i);
            }
        }
        // draw the Markers on the map
        this.setMapOnAll(this.map);
        // draw the route on the map
        this.drawRoute(sortedDestCoords);
    }
}