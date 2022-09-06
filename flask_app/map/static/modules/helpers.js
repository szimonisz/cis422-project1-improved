/*****************************************************************************************************************************************************************************
File Name: helpers.js
 
Author: Kelemen Szimonisz
Organization: Map Culture (University of Oregon, CIS422, FALL 2021)

This JavaScript file contains the helper functions used for the user input interface.

Creation Date: 09/05/2022
Last Modified: 09/06/2022
****************************************************************************************************************************************************************************/

export {displayMessage, sleep, hideElementForSeconds}

/****************************************************************************************************************************************************************************
FUNCTION: displayMessage

This function populates a div on the html page with text. It is used to display error messages and help messages to the user.

ERROR messages are displayed with red text.
HELP messages are displayed with white text.
****************************************************************************************************************************************************************************/
function displayMessage(message, isError) {
    var messageDiv = document.getElementById('show-error');
    messageDiv.innerText = message;
    // if the message is an error message
    if (isError) {
        // color the text red
        messageDiv.style.color = "red";
    }
    // else the message is a help message
    else {
        // color the text white
        messageDiv.style.color = "white";
    }
}
/****************************************************************************************************************************************************************************
FUNCTION: sleep

This function returns a promise after a timeout.
Using this function requires that you call it from within an asynchronous function and use a 'then' callback to perform some operations after it resolves.

Source: This function was taken from: https://www.sitepoint.com/delay-sleep-pause-wait/
****************************************************************************************************************************************************************************/
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/****************************************************************************************************************************************************************************
FUNCTION: hideElementForSeconds

This function hides an html element from the user for a given amount of time.
****************************************************************************************************************************************************************************/
async function hideElementForSeconds(element, ms) {
    // hide the element
    element.style.display = "none";
    // sleep some milliseconds
    sleep(ms).then(() => {
        // un-hide the element
        element.style.display = "block";
    });
}