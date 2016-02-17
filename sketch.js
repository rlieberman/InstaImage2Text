//ISSUES
//not sure why i can't get more results from instagram - rate limit issue?
//create a button to clear everything
//weird stuff with loading order - want the images to be invisible, also div padding is off

var instaClientID = "da01bc3ba31a430c8c6796999587de56"; //client ID for instagram
var allURLS = []; //empty array to hold all of the image URLS

var input; //form field
var bttnSubmit; //button to submit
var hashtag; //variable to hold the hashtag

//credentials for querying clarifai
var clientID = 'eWxNW-xStnWuGcwpRWd-hD17g1GEGCDonqxQ8iAk';
var clientSecret = 'ckGbfL_gcWWtdEV8x9B_g0Pp8ptcX5K6wshY_PUK';
var baseUrl = 'https://api-alpha.clarifai.com/v1/';

var accessToken; //for programmatically generating a new access token

function setup(){

  noCanvas();

  //create the form field
  input = createInput('enter a hashtag (no spaces, plz)');
  input.mousePressed(function() {input.style('background', '#e6e6e6')}); //make the box grey when you click in it 

  //create the submit button
  bttnSubmit = createButton('submit');
  bttnSubmit.mousePressed(queryInstagram);  //when button is clicked, run function getWordEamples
  bttnSubmit.mousePressed(function() {input.style('background', 'none')});

  //use this ajax request to programmatically generate a new access token
  var data = {
    'grant_type': 'client_credentials',
    'client_id': clientID,
    'client_secret': clientSecret
  }

  $.ajax({
    'type': 'POST',
    'url': baseUrl + 'token',
    'data': data,
    success: function (response) { 
      console.log(response);
      accessToken = response;
    },
    error: function (err) { 
      console.log(err);
    }
  });

}


function queryInstagram(){ //this function makes an API request to Instgram

  hashtag = input.value();
  console.log(hashtag);

  var url = "https://api.instagram.com/v1/tags/" + hashtag + "/media/recent?count=500&client_id=" + instaClientID;
  console.log(url);

  loadJSON(url, gotData, 'jsonp');
}


function gotData(data){

  var imageArray = data.data; //returns an array of all the results
  console.log(imageArray.length);

  for (var i = 0; i<imageArray.length; i++) {

    var imgURL = imageArray[i].images.low_resolution.url;  //get the image source URL from instagram
    // console.log(imageArray[i].images);

    var div = createDiv(''); //make an empty div to be a container for the image 
    var imgElt = createImg(imgURL); //create the image using p5 dom library
    imgElt.parent(div); //put the image inside the container

    imageToText(imgElt, imgURL, div);

  }
}

function imageToText(imgElt, imgURL, div) {

  queryClarifai();

  function queryClarifai() {
      
        $.ajax({
          url: 'https://api.clarifai.com/v1/tag/',
          type: 'GET',
          beforeSend: function(xhr) {
          xhr.setRequestHeader('Authorization', 'Bearer ' + accessToken.access_token);
        },
        data: {
          url: imgURL //here's where you access the image URL to make the query
        },

      success: function (response) {  //run this function if you get the data back successfully
      
        //Get all the image tags from clarifai
        var tagsArray = response.results[0].result.tag.classes;
        // console.log(tagsArray);


        //For every tag from clarifai
        //Do the part of speech tagging using NLP Compromise - create an object that holds POS as the key, with all of the tags
        var posTagging = {}; //empty object to hold parts of speech

        for (var i = 0; i<tagsArray.length; i++){

          var partSpeech = RiTa.getPosTags(tagsArray[i]); //get part of speech, convert from array to string //get part of speech, convert from array to string
          // console.log(tagsArray[i], partSpeech);

          if (!posTagging[partSpeech]) { //if the part of speech is not yet a key in the object posTagging, set it as a key
            posTagging[partSpeech] = [];
          }

          posTagging[partSpeech].push(tagsArray[i]); //add the tag to the corresponding part of speech array inside the object

        }

        // console.log(posTagging); //print the object with tags and parts of speech


        //hide the image, create the grey div and add the desription
        imgElt.hide();
        console.log("image is hidden");

        div.size(imgElt.width, imgElt.height);
        div.style('background-color', '#e6e6e6');

        var imgDescription; //empty variable for the image description

        //step 1 get a first noun
        var firstNoun = tagsArray[0];

        //step 2 pick an adjective if there is one
            if ('jj' in posTagging) {
              var adjective = RiTa.randomItem(posTagging['jj']);
            }

            else {
              adjective = ""; //if there's no adjective, return nothing
            }

        //step 3 get the second noun (not using wordnik query for now)
        var secondNoun = RiTa.randomItem(posTagging['nn']);
  

        //suggestion for next time context-free grammar; build a sentence from part 1, part 2, part 3, etc.
        imgDescription = createP("This is a " + RiTa.singularize(firstNoun) + ", an image of "  + adjective + " " + RiTa.pluralize(secondNoun) + ".");
        imgDescription.parent(div);


        //when you click the div, show the image and hide the description
        div.mousePressed(function() { 

          imgElt.show(); 
          imgDescription.hide();
          div.style('background-color', 'transparent');

        });


      },

    error: function (err) { 
      console.log(err);
    },
  });
  }
}
