after-school-program-finder
===========================

This app is a stand-alone HTML5 app that can be 
dropped into the doc root of any web server.

The afterschool.json file included is a snapshot of the 
Pre-K facilities data for development use only.

In production the After School facilities data is served
by GeoServer as http://maps.nyc.gov/afterschool/afterschool.json.
This data may be modified and is cached at a CDN daily.

The project will ultimately be converted to a Gradle
project and include a build for minifying scripts and 
css files.  
