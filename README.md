Tele chart
====================
#### Demos: 
- https://muiota.github.io/TeleChart/
- https://muiota.github.io/TeleChart/demos/swiper/index.html
- https://muiota.github.io/TeleChart/demos/bigdata/index.html
- https://muiota.github.io/TeleChart/demos/edit/index.html

#### Features:
 - Pure js (without css)
 - ES5 only (compatible with old browsers)
 - Small size (11kB "~5kB gZip") 
 - Advanced navigation/zoom (Vertical/horizontal) 
 - Smart axes labels
 - Day/night switch
 - High resolution (fix blur, retina support)
 - Switch series  
 - Mobile touches support
 - Material design animations (smooth)
 - Tooltip legend
 - Out of range highlighting
 - Resizible container
 - Transparent background for wallpapers
  
#### Getting Started With Tele chart:
 - First of all we need to download <b>telechart.min.js</b>
 - Include Tele chart file To Website/App
 - Initialize Tele chart
```js 
var tc = new TeleChart(id,          //div container id
    {
        startAxisAtZero: {Boolean}, //Start axis-Y at zero, if false will auto calculated (default true)
        withYearLabel: {Boolean},   //Year in timestamp legend label (default false)
        scrollDisabled: {Boolean},  //Disable scroll in selection window, navigator only (default false)
        lineWidth: {Number},         //Line width in selection window (default 3)
        showTouches: {Boolean},       //Show positions of touch on navigator (default true)
        showBounds: {Boolean}        //Chart highlights when out of range bounds (default true) (default 3)
    });
tc.draw(data);  
```

#### Road map:
- Area type of series 
- Performance, minimize & fixes
```` 
 - Date format config
 - Zoom chart in selection window for mobile 
 - Cleanup code 
 - GlobalAlpha performance issue
 - fillText cache tiles (getTextWidth cache)
 - drawButton cache


 video 1
  - label on top (name "Followers" and range "1 April 2019 - 30 April 2019")
  - zoom in 168-hour timeline
  - zoom out
  
 video 2
  -   
 
 - stacked bar type
 - Zoom in and zoom out
 - Label on top
 

 - 
````
##### Desktop:
<img src="https://i.imgur.com/D1GVf9l.png?raw=true" alt="Desktop" width="998" height="556">

##### Mobile:
<img src="https://i.imgur.com/QB5HBHw.jpg?raw=true" alt="Desktop" width="360" height="640">
