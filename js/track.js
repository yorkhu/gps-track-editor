$(document).ready(function () {
  tracks = {};

  var mapOptions = {
    center: new google.maps.LatLng(46.77, 17.36),
    zoom: 9
  };

  var map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);

  // tcx: http://googlemapapitips.wordpress.com/2012/05/18/display-tcx-tracks-using-google-maps-api/
  // gpx: http://www.jacquet80.eu/blog/post/2011/02/Display-GPX-tracks-using-Google-Maps-API

  function get_tcx_pos(track) {
    track.segments = [];

    $(track.xml).find('Lap').each(function() {
      var segment = {};
      segment.points = [];

      $(this).find('Position').each(function() {
        var p = new google.maps.LatLng($(this).find('LatitudeDegrees').text(), $(this).find('LongitudeDegrees').text());
        segment.points.push(p);
      });

      track.segments.push(segment);
    });
  }

  function get_gpx_pos(track) {
    track.segments = [];

    $(track.xml).find("trk").each(function() {
      var segment = {};
      segment.points = [];
      $(this).find("trkpt").each(function() {
        var p = new google.maps.LatLng($(this).attr("lat"), $(this).attr("lon"));
        segment.points.push(p);
      });

      track.segments.push(segment);
    });
  }


  function initialize(track) {
    track.google = {};
    track.google.bounds = new google.maps.LatLngBounds();

    for (var i = 0; i < track.segments.length; i++) {
      for (var j = 0; j < track.segments[i].points.length; j++) {
        track.google.bounds.extend(track.segments[i].points[j]);
      };

      track.segments[i].poly = new google.maps.Polyline({
  //      use your own style here
        path: track.segments[i].points,
        strokeColor: '#FF0000',
        strokeOpacity: .7,
        strokeWeight: 3
      });

      track.segments[i].poly.setMap(map);

    };

    // fit bounds to tracks
    map.fitBounds(track.google.bounds);
  }



function handleFileSelect(evt) {
  var files = evt.target.files; // FileList object

  // Loop through the FileList and render image files as thumbnails.
  for (var i = 0, f; f = files[i]; i++) {
    var reader = new FileReader();

    // Closure to capture the file information.
    reader.onload = (function(theFile) {
      return function(e) {
        tracks.filedata = e.target.result;
        tracks.file = theFile;

        tracks.xmlData = $.parseXML(tracks.filedata);
        tracks.xml = $(tracks.xmlData);
        tracks.filetype = tracks.xml.children().prop('tagName');

        if ('TrainingCenterDatabase' == tracks.filetype) {
          get_tcx_pos(tracks);
        }
        else if ('gpx' == tracks.filetype) {
          get_gpx_pos(tracks);
        }
        else {
          $('#list').html('Wrong file format!');
          tracks = {};
          return false;
        }

        $('#list').html(tracks.file.name);
//        $('#data').html(tracks.filedata);

        initialize(tracks);

        // xmlData.documentElement < visszaadja az XML filet.
      };
    })(f);

    // Read in the image file as a filedata URL.
//    reader.readAsDataURL(f);
    reader.readAsText(f);
  }
}

document.querySelector('#files').addEventListener('change', handleFileSelect, false);

// XML to array OR object
//  http://www.ibm.com/developerworks/xml/tutorials/x-processxmljquerytut/index.html?ca=dat-
//  http://www.sitepoint.com/how-to-convert-xml-to-a-javascript-object/
//  http://goessner.net/download/prj/jsonxml/
//  http://stackoverflow.com/questions/13600219/convert-xml-to-javascript-object
//  https://code.google.com/p/x2js/
//  http://stackoverflow.com/questions/16411199/convert-xml-to-object-using-jquery-of-plain-javascript
//  http://stackoverflow.com/questions/14306854/convert-xml-to-object-with-jquery
//  http://stackoverflow.com/questions/6542187/xml-to-javascript-array-with-jquery

});
