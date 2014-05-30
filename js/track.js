$(document).ready(function () {
  tracks = {};
  google_map = {};

  var mapOptions = {
    center: new google.maps.LatLng(46.77, 17.36),
    zoom: 9
  };

  map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);

  google_map.selected_track = new google.maps.Polyline({
    path: [],
    strokeColor: '#FF00FF',
    strokeOpacity: .6,
    strokeWeight: 7,
    zIndex: 100
  });

  $("#tracks").accordion({
    collapsible: true,
    heightStyle: 'auto'
  });

  // tcx: http://googlemapapitips.wordpress.com/2012/05/18/display-tcx-tracks-using-google-maps-api/
  // gpx: http://www.jacquet80.eu/blog/post/2011/02/Display-GPX-tracks-using-Google-Maps-API

  function get_tcx_pos(track) {
    track.segments = [];

    $(track.xml).find('Lap').each(function () {
      var segment = {};
      segment.points = [];
      segment.gpoints = [];

      $(this).find('Trackpoint').each(function () {
        var p = {};
        p.lat = $(this).find('LatitudeDegrees').text();
        p.lon = $(this).find('LongitudeDegrees').text();
        p.time = $(this).find('Time').text();
        p.raw = $(this);

        if (p.lat && p.lon) {
          var gp = new google.maps.LatLng(p.lat, p.lon);
          segment.gpoints.push(gp);
        }

        segment.points.push(p);
      });

      track.segments.push(segment);
    });
  }

  function get_gpx_pos(track) {
    track.segments = [];

    $(track.xml).find("trk").each(function () {
      var segment = {};
      segment.points = [];
      segment.gpoints = [];

      $(this).find("trkpt").each(function () {
        var p = {};
        p.lat = $(this).attr("lat");
        p.lon = $(this).attr("lon");
        p.time = $(this).find('time').text();
        p.raw = $(this);

        if (p.lat && p.lon) {
          var gp = new google.maps.LatLng(p.lat, p.lon);
          segment.gpoints.push(gp);
        }

        segment.points.push(p);
      });

      track.segments.push(segment);
    });
  }

  function initialize(track) {
    track.google = {};
    track.google.bounds = new google.maps.LatLngBounds();

    for (var i = 0; i < track.segments.length; i++) {
      for (var j = 0; j < track.segments[i].gpoints.length; j++) {
        track.google.bounds.extend(track.segments[i].gpoints[j]);
      }

      track.segments[i].poly = new google.maps.Polyline({
        path: track.segments[i].gpoints,
        strokeColor: '#FF0000',
        strokeOpacity: .7,
        strokeWeight: 3
      });

      track.segments[i].poly.setMap(map);

    }

    // fit bounds to tracks
    map.fitBounds(track.google.bounds);
  }

  function add_track_region(track) {
    var trackid = 'track-1';
    var new_track = '<h3 class="' + trackid + '">' + tracks.file.name + '</h3>';
    new_track += '<div class="track ' + trackid + '" filename="' + tracks.file.name + '">';
    var segment_titles = '';
    var segment_body = '';

    for (var i = 0; i < track.segments.length; i++) {
      segment_titles += '<li><a href="#segment-' + i + '">Segment ' + i + '</a></li>';
      segment_body += '<div id="segment-' + i + '" class="segment">';
      segment_body += '<ul id="segment-selectable-' + i + '" class="segment-list">';
      for (var j = 0; j < track.segments[i].points.length; j++) {
        var date = new Date(track.segments[i].points[j].time);

        segment_body += '<li track="1" segment="' + i + '" pos="' + j + '">';
        segment_body += '<span class="pos">' + j + '</span>';
        segment_body += '<span class="time">' + $.datepicker.formatDate('yy-mm-dd ', date) + date.toLocaleTimeString() + '</span>';
        segment_body += '<span class="lat">' + track.segments[i].points[j].lat + '</span>';
        segment_body += '<span class="lon">' + track.segments[i].points[j].lon + '</span>';
        segment_body += '</li>';
      }
      segment_body += '</ul>';
      segment_body += '</div>';
    }

    new_track += '<div id="' + trackid + '-segments"><ul>' + segment_titles + '</ul>';

    new_track += segment_body + '</div></div>';

    // Attached new track
    $('#tracks').append(new_track);

    // Create selectable segment widgets
    for (var i = 0; i < track.segments.length; i++) {
      $('#segment-selectable-' + i).multipleSelectBox({
        onSelectEnd: function () {
          /* put all results into a component */
          var selected_points = [];

          $(this).find('li.selected').each(function () {
            var pos = $(this).attr('pos');
            var segment = $(this).attr('segment');

            if (tracks.segments[segment].points[pos].lat && tracks.segments[segment].points[pos].lon) {
              var gp = new google.maps.LatLng(tracks.segments[segment].points[pos].lat, tracks.segments[segment].points[pos].lon);
              selected_points.push(gp);
            }
          });

          if (selected_points.length) {
            google_map.selected_track.setMap(null);
            google_map.selected_track.setPath(selected_points);
            google_map.selected_track.setMap(map);
          }
        }
      });
    }

    // Create segment tabs
    $('#' + trackid + '-segments').tabs();

    // Refresh tracks accordion
    $('#tracks').accordion("refresh");

  }

  function handleFileSelect(evt) {
    var files = evt.target.files; // FileList object

    // Loop through the FileList and render image files as thumbnails.
    for (var i = 0, f; f = files[i]; i++) {
      var reader = new FileReader();

      // Closure to capture the file information.
      reader.onload = (function (theFile) {
        return function (e) {
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

          add_track_region(tracks);
          initialize(tracks);

          // xmlData.documentElement < return XML file.
        };
      })(f);

      // Read in the XML file as a filedata URL.
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


  $("#selectable").multipleSelectBox({
    maxLimit: 2
  });


});
