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

  function get_pos(track) {
    track.segments = [];
    track.corners = {};
    track.corners.max_lat = "0";
    track.corners.max_lon = "0";
    track.corners.min_lat = "90";
    track.corners.min_lon = "180";

    if ('TrainingCenterDatabase' == track.filetype) {
      $segment = 'Lap';
      $point = 'Trackpoint';
    }
    else if ('gpx' == tracks.filetype) {
      $segment = 'trk';
      $point = 'trkpt';
    }

    $(track.xml).find($segment).each(function () {
      var segment = {};
      segment.points = [];
      segment.gpoints = [];
      segment.raw = $(this);

      $(this).find($point).each(function () {
        var p = {};
        if ('TrainingCenterDatabase' == track.filetype) {
          p.lat = $(this).find('LatitudeDegrees').text();
          p.lon = $(this).find('LongitudeDegrees').text();
          p.time = $(this).find('Time').text();
        }
        else if ('gpx' == tracks.filetype) {
          p.lat = $(this).attr("lat");
          p.lon = $(this).attr("lon");
          p.time = $(this).find('time').text();
        }

        p.raw = $(this);

        if (p.lat && p.lon) {
          if (p.lat < track.corners.min_lat) {
            track.corners.min_lat = p.lat;
          }

          if (p.lat > track.corners.max_lat) {
            track.corners.max_lat = p.lat;
          }

          if (p.lon < track.corners.min_lon) {
            track.corners.min_lon = p.lon;
          }

          if (p.lon > track.corners.max_lon) {
            track.corners.max_lon = p.lon;
          }

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

    // Set track corner:
    var corner = new google.maps.LatLng(track.corners.max_lat, track.corners.max_lon);
    track.google.bounds.extend(corner);
    var corner = new google.maps.LatLng(track.corners.min_lat, track.corners.min_lon);
    track.google.bounds.extend(corner);

    for (var i = 0; i < track.segments.length; i++) {
      // Create track
      track.segments[i].poly = new google.maps.Polyline({
        path: track.segments[i].gpoints,
        strokeColor: '#FF0000',
        strokeOpacity: .7,
        strokeWeight: 3
      });

      // Display track
      track.segments[i].poly.setMap(map);

    }

    // fit bounds to tracks
    map.fitBounds(track.google.bounds);
  }

  function add_track_region(track) {
    var trackid = 'track-1';
    var new_track = '<h3 class="' + trackid + '">' + tracks.file.name + '</h3>';
    new_track += '<div id="' + trackid + '" class="track ' + trackid + '" filename="' + tracks.file.name + '">';
    var segment_titles = '';
    var segment_body = '';

    for (var i = 0; i < track.segments.length; i++) {
      segment_titles += '<li><a href="#' + trackid + '-segment-' + i + '">Segment ' + i + '</a></li>';
      segment_body += '<div id="' + trackid + '-segment-' + i + '" class="segment" segment="' + i + '">';
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

    new_track += segment_body + '</div>';
    new_track += '<button class="delete">Delete</button>';
    new_track += '<button class="download">Download</button>';
    new_track += '</div>';

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

    $('.' + trackid + ' .delete').button().click(function( event ) {
      delete_track_point(this);
      event.preventDefault();
    });

    $('.' + trackid + ' .download').button().click(function( event ) {
      download_track(this);
      event.preventDefault();
    });
  }

  /**
   * Delete selected track points.
   * @param delete_button
   */
  function delete_track_point(delete_button) {
    var active_track = $(delete_button).parent('div.track').attr('id');
    var active_segment = $(delete_button).parent('div.track').find('li.ui-tabs-active').attr('aria-controls');
    var segment = $('#' + active_segment).attr('segment');


    $('#' + active_segment).find('li.selected').each(function () {
      var pos = $(this).attr('pos');

      if (tracks.segments[segment].points[pos].raw) {
        $(tracks.segments[segment].points[pos].raw).remove();
        delete tracks.segments[segment].points[pos];
      }
    });

    $('#' + active_segment).find('li.selected').remove();

    var gpoints = [];

    for (var i = 0; i < tracks.segments[segment].points.length; i++) {
      if (tracks.segments[segment].points[i]) {
        var lat = tracks.segments[segment].points[i].lat;
        var lon = tracks.segments[segment].points[i].lon;

        if (lat && lon) {
          var gp = new google.maps.LatLng(lat, lon);
          gpoints.push(gp);
        }
      }
    }

    tracks.segments[segment].gpoints = gpoints;

    tracks.segments[segment].poly.setMap(null);
    tracks.segments[segment].poly.setPath(gpoints);
    tracks.segments[segment].poly.setMap(map);

    google_map.selected_track.setMap(null);
    google_map.selected_track.setPath([]);
    google_map.selected_track.setMap(map);
  }

  /**
   * Download track file.
   * @param download_button
   */
  function download_track(download_button) {
    var active_track = $(download_button).parent('div.track').attr('id');
    var active_segment = $(download_button).parent('div.track').find('li.ui-tabs-active').attr('aria-controls');
    var segment = $('#' + active_segment).attr('segment');

    window.URL = window.webkitURL || window.URL;

    var contentType = tracks.file.type;
    var track_content = '';

    if ('TrainingCenterDatabase' == tracks.filetype) {
      for (var i = 0; i < tracks.segments.length; i++) {
        var TotlaTimeSeconds = 0;
        var DistanceMeters = 0;
        var HeartRateBpmSum = 0;
        var MaximumHeartRateBpm = 0;
        var MaximumSpeed = 0;
        var SpeedSum = 0;
        var number = 0;

        for (var j = 0; j < tracks.segments[i].points.length; j++) {
          if (tracks.segments[i].points[j]) {
            number++;

            var HeartRateBpm = 0;
            HeartRateBpm += parseFloat(tracks.segments[i].points[j].raw.find('HeartRateBpm').find('Value').text());
            if (HeartRateBpm) {
              HeartRateBpmSum += HeartRateBpm;
              if (MaximumHeartRateBpm < HeartRateBpm) {
                MaximumHeartRateBpm = HeartRateBpm;
              }
            }

            var Speed = 0;
            Speed += parseFloat(tracks.segments[i].points[j].raw.find('Speed').text());
            if (Speed) {
              SpeedSum += Speed;
              if (MaximumSpeed < Speed) {
                MaximumSpeed = Speed;
              }
            }
          }
        }

        tracks.segments[i].raw.find('MaximumSpeed').text(MaximumSpeed);
        tracks.segments[i].raw.find('AverageHeartRateBpm').find('Value').text(parseInt(HeartRateBpmSum / number));
        tracks.segments[i].raw.find('MaximumHeartRateBpm').find('Value').text(MaximumHeartRateBpm);
        tracks.segments[i].raw.find('Extensions').find('AvgSpeed').text(SpeedSum / number);
      }


      var file_lines = tracks.filedata.split("\n");
      for (var i = 0; i < file_lines.length; i++) {
        if (file_lines[i] == '  <Activities>') {
          break;
        }
        else {
          // right trim
          track_content += file_lines[i].replace(/\s+$/,'') + "\n";
        }
      }
    }
    else if ('gpx' == tracks.filetype) {
      //<metadata>
      //  <bounds maxlat="46.9106160" maxlon="17.2600210" minlat="46.8911740" minlon="17.2296120"/>
      corners = {};
      corners.max_lat = "0";
      corners.max_lon = "0";
      corners.min_lat = "90";
      corners.min_lon = "180";

      for (var i = 0; i < tracks.segments.length; i++) {
        for (var j = 0; j < tracks.segments[i].points.length; j++) {
          if (tracks.segments[i].points[j]) {
            if (tracks.segments[i].points[j].lat < corners.min_lat) {
              corners.min_lat = tracks.segments[i].points[j].lat;
            }

            if (tracks.segments[i].points[j].lat > corners.max_lat) {
              corners.max_lat = tracks.segments[i].points[j].lat;
            }

            if (tracks.segments[i].points[j].lon < corners.min_lon) {
              corners.min_lon = tracks.segments[i].points[j].lon;
            }

            if (tracks.segments[i].points[j].lon > corners.max_lon) {
              corners.max_lon = tracks.segments[i].points[j].lon;
            }
          }
        }
      }
      tracks.xml.find('metadata').find('bounds').attr('maxlat', corners.max_lat);
      tracks.xml.find('metadata').find('bounds').attr('maxlon', corners.max_lon);
      tracks.xml.find('metadata').find('bounds').attr('minlat', corners.min_lat);
      tracks.xml.find('metadata').find('bounds').attr('minlon', corners.min_lon);

      var file_lines = tracks.filedata.split("\n");
      for (var i = 0; i < file_lines.length; i++) {
        if (file_lines[i].substr(0, 12) == '  <metadata>') {
          break;
        }
        else {
          // right trim
          track_content += file_lines[i].replace(/\s+$/,'') + "\n";
        }
      }
    }

    track_content += tracks.xmlData.documentElement.innerHTML;
    track_content += '</' + tracks.filetype + ">\n";

    var track_content_lines = track_content.split("\n");

    for (var i = track_content_lines.length -1; i >= 0; i--) {
      // right trim
      if (track_content_lines[i].replace(/\s+$/,'') != track_content_lines[i]) {
        track_content_lines.splice(i, 1);
      }
    }

    track_content = track_content_lines.join("\n");
    var gpsFile = new Blob([track_content], {type: contentType});

    var a = document.createElement('a');
    a.download = tracks.file.name;
    a.href = window.URL.createObjectURL(gpsFile);
    a.textContent = 'Download';
    a.dataset.downloadurl = [contentType, a.download, a.href].join(':');

    // Append anchor to body.
    document.body.appendChild(a)
    a.click();

    // Remove anchor from body
    document.body.removeChild(a)
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

          if (('TrainingCenterDatabase' == tracks.filetype) || ('gpx' == tracks.filetype)) {
            get_pos(tracks);
          }
          else {
            $('#list').html('Wrong file format!');
            tracks = {};
            return false;
          }

          add_track_region(tracks);
          initialize(tracks);
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
