/* Open campsite Map 

(c) 2019-2022 Sven Geggus <sven-osm@geggus.net>

*/

/* URL for JSON data change https://opencampingmap.org/getcampsites
   if you want to run the javascript code from a local filesystem.
*/
var JSONurl = "/getcampsites";

/* stylesheet for dynamic stuff */
var dynsheet = document.createElement('style');
document.head.appendChild(dynsheet);

var osmde = L.tileLayer('https://{s}.tile.openstreetmap.de/tiles/osmde/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: l10n['attribution']
});

var osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: l10n['attribution']
});

var otopo = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
  maxZoom: 17,
  attribution: l10n['attribution']
});

var esri_img = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
  maxZoom: 19,
  attribution: l10n['esri_attribution']
});

var osmen = L.tileLayer('https://opencampingmap.{s}.tile.maphosting.uk/en/map/v1/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: l10n['attribution']
});

var osmfr = L.tileLayer('https://opencampingmap.{s}.tile.maphost.fr/fr/map/v1/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: l10n['attribution']
});

var osmes = L.tileLayer('https://opencampingmap.{s}.tile.maphost.es/es/map/v1/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: l10n['attribution']
});

var cfeatures =
  L.tileLayer('camping_features/{z}/{x}/{y}.png', {
    maxZoom: 19, minZoom: 18
  });

var hiking = L.tileLayer('https://tile.waymarkedtrails.org/hiking/{z}/{x}/{y}.png', {
  maxZoom: 18,
});

var cycling = L.tileLayer('https://tile.waymarkedtrails.org/cycling/{z}/{x}/{y}.png', {
  maxZoom: 18,
});

var baseMaps = {
  "OSM (en)": osmen,
  "OSM (de)": osmde,
  "OSM (fr)": osmfr,
  "OSM (es)": osmes,
  "OSM": osm,
  "TOPO": otopo,
  "World Imagery": esri_img
};

var overlayMaps = {
  '<img src="cicons/camping.svg">': cfeatures,
  '<img src="cicons/hiking.svg">': hiking,
  '<img src="cicons/cycling.svg">': cycling
};

// need to set minZoom and maxZoom here to prevent strang defaults  
var map = L.map('map', {
  layers: [baseMaps[l10n['mapstyle']]],
  minZoom: 3,
  maxZoom: 19
});

// default view: black forest :)
if (window.location.href.indexOf('#') < 0) {
  map.setView([48.61, 8.24], 10);
}

var geocoderControl = new L.Control.geocoder({
  showResultIcons: true
});
geocoderControl.addTo(map);

L.control.layers(baseMaps, overlayMaps).addTo(map);

// enable cfeatures layer by default
map.addLayer(cfeatures)

L.control.scale({ position: 'bottomright' }).addTo(map);

var hash = new L.Hash(map, baseMaps, overlayMaps, CategoriesFromHash, ["bef"]);

var sidebar = L.control.sidebar('sidebar').addTo(map);

var LeafIcon = L.Icon.extend({
  options: {
    iconSize: [32, 40],
    iconAnchor: [16, 40]
  }
});

// Setup associative arrays which contains all custom icons we have
var public_icons = new Array();
var private_icons = new Array();
var public_icons_warn = new Array();
var categories = ["standard", "caravan", "camping", "nudist", "group_only", "backcountry"];

var cat_color = {
  "backcountry": "#225500",
  "group_only": "#552200",
  "nudist": "#68228b",
  "standard": "#000080",
  "camping": "#000080",
  "caravan": "#000080",
  "private": "#666666"
};

var private_values = ['private', 'members'];

// iterate over the names from geoJSON which are used as a reference to the
// corresponding icon instances
categories.forEach(function (entry) {
  public_icons[entry] = new LeafIcon({ iconUrl: 'markers/m_' + entry + '.png' });
  public_icons_warn[entry] = new LeafIcon({ iconUrl: 'markers/m_' + entry + '_warn.png' });
  private_icons[entry] = new LeafIcon({ iconUrl: 'markers/m_private_' + entry + '.png' });
});

// GeoJSON layer with campsite POI
var gjson = L.uGeoJSONLayer({ endpoint: JSONurl, usebbox: true, minzoom: 10 }, {
  // called when drawing point features
  pointToLayer: function (featureData, latlng) {
    // campsite needs fixing
    // Use modified icon in this case
    var attn = false;

    if (!('name' in featureData.properties)) {
      // console.log(Object.keys(featureData.properties).length);
      attn = true;
    } else {
      // in this case the name tag is the only tag
      if (Object.keys(featureData.properties).length == 4) {
        attn = true;
      }
    }

    // standard icon is fallback
    var icon = attn ? public_icons_warn['standard'] : public_icons['standard'];

    if (categories.indexOf(featureData.properties["category"]) >= 0) {
      icon = attn ? public_icons_warn[featureData.properties["category"]] : public_icons[featureData.properties["category"]];
      if ('access' in featureData.properties) {
        if (private_values.indexOf(featureData.properties['access']) >= 0) {
          icon = private_icons[featureData.properties["category"]];
          if (!(document.getElementById('private_' + featureData.properties["category"]).checked)) {
            return;
          };
        } else {
          if (!(document.getElementById(featureData.properties["category"]).checked)) {
            return;
          };
        };
      } else {
        if (!(document.getElementById(featureData.properties["category"]).checked)) {
          return;
        };
      };
    };
    return L.marker(latlng, { icon: icon });
  },
  // Executes on each feature in the dataset
  onEachFeature: function (featureData, featureLayer) {
    featureLayer.on('click', function () {
      updateSidebars(featureData);
    });
  }
}).addTo(map);

// GPS location for smartphone use
var gps = new L.Control.Gps({
  autoCenter: true
  //  textErr: "Hallo"
}).addTo(map);

function updateSidebars(featureData) {
  f2html(featureData);
  f2bugInfo(featureData);
  var cat;
  var private = false;
  if ('access' in featureData.properties) {
    if (private_values.indexOf(featureData.properties['access']) >= 0) {
      private = true;
    };
  };
  if (categories.indexOf(featureData.properties["category"]) >= 0) {
    cat = featureData.properties["category"];
  } else {
    cat = "standard";
  }
  if (private) {
    dynsheet.innerHTML = ".sidebar-header, .sidebar-tabs > ul > li.active {background-color: " + cat_color['private'] + ";}";

  } else {
    dynsheet.innerHTML = ".sidebar-header, .sidebar-tabs > ul > li.active {background-color: " + cat_color[cat] + ";}";
  };
  var html;
  if (private) {
    html = '<img src=\"markers/l_private_' + cat + '.svg\"> ' + l10n[cat];
  } else {
    html = '<img src=\"markers/l_' + cat + '.svg\"> ' + l10n[cat];
  };
  document.getElementById('cs_cat').innerHTML = html;
  sidebar.open('info');
}

//add facilities to map legend
var fdiv = document.getElementsByClassName("facilities")[0];
fdiv.innerHTML = gen_facilities4legend();

function openURL(lang) {
  var urlpos = window.location.href.split("#");
  var baseurl = urlpos[0].replace(/[^/]*$/g, "")
  window.open(baseurl + 'index.html.' + lang + '#' + urlpos[1], '_self');
};

for (var i = 0; i < categories.length; i++) {
  document.getElementById(categories[i]).addEventListener('click', function () {
    gjson.onMoveEnd();
    CategoriesToHash();
  });
  document.getElementById('private_' + categories[i]).addEventListener('click', function () {
    gjson.onMoveEnd();
    CategoriesToHash();
  });
};

function CategoriesToHash() {
  var newhash = 0;

  for (var i = 0; i < categories.length; i++) {
    if (document.getElementById(categories[categories.length - 1 - i]).checked) {
      newhash += Math.pow(2, i + 6);
    }
    if (document.getElementById('private_' + categories[categories.length - 1 - i]).checked) {
      newhash += Math.pow(2, i);
    }
  }
  // do not store additional options in hash
  hash.updateAUX([newhash.toString(16)]);
}

function CategoriesFromHash(hash) {
  var h0;
  h0 = hash[0];

  if (hash.length > 1) {
    get_site_data(hash.slice(1));
  }

  // we support 12 categories (FFF -> FFFF)
  // this hack prevents that leading zeros get lost
  // and gives us a minimum lenght of 4hex digits (16bit)
  if (h0.length == 3) h0 = "f" + h0;
  if (h0.length == 2) h0 = "f0" + h0;
  if (h0.length == 1) h0 = "f00" + h0;

  var bstr = parseInt(h0, 16).toString(2);
  for (var i = 0; i < categories.length; i++) {
    // public is +4
    if (bstr[i + 4] == 1) {
      document.getElementById(categories[i]).checked = true;
    } else {
      document.getElementById(categories[i]).checked = false;
    }
    // private is +10
    if (bstr[i + 10] == 1) {
      document.getElementById('private_' + categories[i]).checked = true;
    } else {
      document.getElementById('private_' + categories[i]).checked = false;
    }
  }
}

function gen_facilities4legend() {
  var fhtml = '<p>';
  var icon = "";
  // generic facilities
  for (var f in facilities) {
    if (["motor_vehicle", "sauna", "toilets"].indexOf(f) >= 0) {
      fhtml += '</p>\n<p>';
    };
    var kv = facilities[f];
    for (var k in kv) {
      // this prevents duplicate icons
      if (icon != kv[k].icon) {
        fhtml += '<img src="cicons/' + kv[k].icon + '">&nbsp;' + kv[k]['text'] + '<br />\n'
        icon = kv[k].icon;
      };
    };
  };
  // sport facilities
  for (var s in sport_facilities) {
    if ((s != 'swimming') && (s != 'golf')) {
      fhtml += '<img src="cicons/' + sport_facilities[s].icon + '">&nbsp;' + sport_facilities[s]['text'] + '<br />\n'
    };
  };
  fhtml += "</p>";
  fhtml += "<p>";
  fhtml += '<img src=' + camp_pitches['generic'].icon + '>&nbsp;' + camp_pitches['generic'].text + '<br />\n'
  fhtml += '<img src=' + camp_pitches['tents'].icon + '>&nbsp;' + camp_pitches['tents'].text + '<br />\n'
  fhtml += '<img src=' + camp_pitches['permanent'].icon + '>&nbsp;' + camp_pitches['permanent'].text + '<br />\n'
  fhtml += '<img src="feature-icons/reception.svg">&nbsp;' + l10n['reception'] + '<br />\n'
  fhtml += '<img src="feature-icons/power_supply.svg">&nbsp;' + l10n['power-supply'] + '<br />\n'
  fhtml += '<img src="feature-icons/fire_extinguisher.svg">&nbsp;' + l10n['fire-extinguisher'] + '<br />\n'
  fhtml += "</p>";
  return (fhtml);
};

/*

fetch campsite data as given on URL bar and update sidebar accordingly 


*/
function get_site_data(type_id) {
  var osm_id;
  if (["node", "way", "relation"].indexOf(type_id[0]) == -1) {
    return
  }
  if ((osm_id = Number(type_id[1])) == NaN) {
    return
  }

  var gcsr = new XMLHttpRequest();
  gcsr.open("GET", JSONurl + "?osm_id=" + osm_id + "&osm_type=" + type_id[0]);
  gcsr.addEventListener('load', function (event) {
    if (gcsr.status >= 200 && gcsr.status < 300) {
      var obj = JSON.parse(gcsr.responseText);
      updateSidebars(obj.features[0]);
      hash.aux = [hash.aux[0]];
    } else {
      console.warn(gcsr.statusText, gcsr.responseText);
    }
  });
  gcsr.send();
}
