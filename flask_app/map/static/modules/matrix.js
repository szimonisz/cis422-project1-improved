import {distanceMatrixService} from '../index.js';
export {getMatrix, getOptimalRoute}

/****************************************************************************************************************************************************************************
FUNCTION: getMatrix

This function uses the getDistanceMatrix method of the Google Maps Distance Matrix Service to request a distance matrix and duration matrix and then parse/return its response.
A request is formed with:
    - a list of origin coordinates and destination coordinates
        - In order to obtain a matrix for all possible combinations: both lists contain the same set of coordinates
    - the travel mode: DRIVING
    - the unit system: METRIC

If the response status is OK, then the distance and duration matrix rows are parsed into their respective Arrays.
this is not accessible javascript
If the distance or duration of an element within the matrix is undefined, then the matrices are returned with the valid flag = false.

Some code taken from: https://developers.google.com/maps/documentation/javascript/distancematrix#distance_matrix_parsing_the_results
****************************************************************************************************************************************************************************/
async function getMatrix(dests) {
    var origin = dests[0];
    // create an n x n distance matrix
    // calculate the distance and time between the origin to each destination
    // calculate the distance and time between each destination to each other destination
    // calculate the distance and time between each destination to the origin
    // note: this also counts distance/time from a location to itself (i.e. origin to origin)
    const response = await distanceMatrixService.getDistanceMatrix({
        // origins and destinations are the same locations in the same order
        // slice the last element of the input list of destinations (this element represents the TSP's return to the origin location)
        // (we do not want our matrix to have duplicate column headers are duplicate row headers)
        origins: dests.slice(0, -1),
        destinations: dests.slice(0, -1),
        travelMode: 'DRIVING',
        unitSystem: google.maps.UnitSystem.METRIC,
    });

    // log Google's response to the console
    console.log("distanceMatrixService.getDistanceMatrix:", response);

    // instantiate distance matrix, duration matrix
    // 1D arrays, length corresponds to number of rows in the matrix produced by the response
    var distanceMatrix = new Array(response.rows.length);
    var durationMatrix = new Array(response.rows.length);

    // error handler, true by default, false if any distance/duration in the matrix is undefined
    var valid = true;

    // For each row in the matrix received from Google
    for (var i = 0; i < response.rows.length; i++) {

        // The rows' elements correspond to the pairing of the origins (rows) with the destination (columns) of the distance or duration matrix
        var rowElements = response.rows[i].elements;

        // instantiate a new array at the current index of both the distanceMatrix and durationMatrix array (creating 2D arrays)
        // the length corresponds to the number of elements in the current row
        distanceMatrix[i] = new Array(rowElements.length);
        durationMatrix[i] = new Array(rowElements.length);

        // for each element in the current row of Google's matrix response
        for (var j = 0; j < rowElements.length; j++) {
            // Element at row i, column j of Google's matrix response 
            var element = rowElements[j];

            // if the distance or duration between two waypoints are undefined
            // (returned from google)
            if (element.distance == undefined || element.duration == undefined) {
                valid = false;
            }
            else {
                // the distance value in kilometers 
                var distance = element.distance.value;
                var duration = element.duration.value;
            }
            // populate the distance matrix with the row element's distance value
            distanceMatrix[i][j] = distance;

            // populate the duration matrix with the row element's duration value
            durationMatrix[i][j] = duration;

            console.log("from:", response.originAddresses[i], "\n", "to:", response.destinationAddresses[j], "\n", "distance:", distance, "\n", "duration:", duration);
        }
    }
    console.log("Distance Matrix:", distanceMatrix, "\n", "Duration matrix:", durationMatrix);

    // return the distanceMatrix, durationMatrix, and a boolean indicator of whether or not those matrices are valid
    return { 'valid': valid, 'distanceMatrix': distanceMatrix, 'durationMatrix': durationMatrix, };
}

/****************************************************************************************************************************************************************************
Function getOptimalRoute

This function sends a POST HTTP request to the '/optimalroute' URL of the Flask server and receives a response containing the optimal route produced by a TSP algorithm
The request consists of the number of inputted destinations and the distance or destination matrix as a JSON.

The Flask server responds with a JSON that contains the optimal order in which to travel to each destination (determined by TSP algorithm).
The async/await keywords allow the the function to operate asynchronously. The function will pause until the request completes.

The algorithm parameter can be either 'MST' or 'genetic'.
****************************************************************************************************************************************************************************/
async function getOptimalRoute(algorithm, matrix, destinations) {
    // send HTTP POST request to the URL /optimalroute
    // header specifies to the receiving Flask server that we are sending a json
    // body of request is a JSON with the number of destinations on the route and distance matrix
    console.log("Algorithm requested:", algorithm);
    const flask_response = await fetch('/algo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 'numDests': destinations.length - 1, 'distMatrix': matrix, 'algorithm': algorithm }),
    });

    // extract the JSON object from the response (the data sent back from the Flask server)
    // Note: response.json() returns a Promise, therefore await is necessary
    const data = await flask_response.json();
    console.log('POST response:', data);

    // an array that represents optimal destination order
    var optimal_route = data['optimal_route'];

    // sanity-check confirmation to confirm that the requested algorithm was used by the backend
    // logging purposes only
    var algorithmConfirmation = data['algorithm_used'];
    return optimal_route;
}