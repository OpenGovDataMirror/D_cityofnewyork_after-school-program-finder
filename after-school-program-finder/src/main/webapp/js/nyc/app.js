window.nyc = window.nyc || {};

OpenLayers.Util.DOTS_PER_INCH = 96.0;
OpenLayers.Util.onImageLoadErrorColor = "transparent";		
if (document.domain == "maps.nyc.gov") document.domain = "nyc.gov"; /* allow us to manipulate feedback form document */

nyc.App = (function(){	
	/*
	 * nyc.App 
	 * @constructor
	 * 
	 * @param {OpenLayers.Map} map
	 * @param {nyc.Locate} locate
	 * @param {nyc.AspList} aspList
	 * @param {nyc.AspTable} aspTable
	 * 
	 */
	var appClass = function(map, locate, aspList, aspTable){
		var me = this;
		me.po = null;
		me.currentLocation = {attributes:{title:""}};
		me.map = map;
		me.locate = locate;
		me.aspList = aspList;
		me.aspTable = aspTable;
		me.ios = navigator.userAgent.match(/(iPad|iPhone|iPod|iOS)/g) ? true : false;
		
		if (me.ios) $("#iframeContainer iframe").addClass("ios");		
		$("#panel").panel({
			  close: function(e, ui){
				  me.toggle({target:$("#toggleToMap")[0]});
			  }
		});
		$("#panel").panel("open");
		$("#aspTypes a, #aspTypes img, #dayLengths a").click($.proxy(me.filter, me));
		$("#toggles").click(me.toggle);
		$(nyc).on("locate.fail", function(_, msg){me.alert(msg);});
		
		me.map.zoomToExtent(NYC_EXT);			
		me.map.events.register("featureover", map, me.hover);
		me.map.events.register("featureout", map, me.out);
		
		$(window).resize(function(){
			me.map.render(map.div);
		});
		
		$(nyc).on("locate.found", function(_, f){
			me.currentLocation = f;
			var i = setInterval(function(){
				if (me.aspList.ready){
					me.aspTable.render(me.aspList, f.geometry);		
					me.aspInView();
					clearInterval(i);
				}
			}, 200);
			$("#callout").remove();
			$("#alert").fadeOut();
			me.pop = null;
		});
		
		$.ajax({
			url:"afterschool.json",
			success: function(data){
				if (!data.features){
					this.error();
					return;
				}
				me.aspLayer = new OpenLayers.Layer.Vector("", {
					styleMap: ASP_STYLE_MAP,
					maxResolution: RESOLUTIONS[3],
					/* 
					 * 
					 * for some reason links inside of the identify popup do not  
					 * work on iphone unless renderer is Canvas, but feature  
					 * clicks do not work well on pc if renderer is Canvas 
					 * 
					 */
					renderers: (function(){
						if (me.ios) return ["Canvas", "SVG", "VML"];
						return ["SVG", "VML", "Canvas"];
					})(),
					eventListeners:{
					    featuresadded: function(){
							$("body").removeClass("firstLoad");
						}
					}
				});
				me.map.addControl(
					new OpenLayers.Control.SelectFeature(me.aspLayer, {
						onSelect: function(f){
							me.identify(f);
						},
						autoActivate: true
					})
				);				
				me.map.addLayer(me.aspLayer);
				me.map.setLayerIndex(me.aspLayer, UPK_LAYER_IDX);
				me.aspList.populate(data.features);
				me.aspLayer.addFeatures(me.aspList.features());
				me.aspTable.render(me.aspList);				
			},
			error: function(){
				$("body").removeClass("firstLoad");
				me.alert("There was an error loading the After School Program sites.  Please Try again."); 
				}
			});	
		};
		
		appClass.prototype = {
			more: function(){
				this.aspTable.more();
			},
			aspInView: function(){
				var features = this.aspList.features(this.currentLocation.geometry);
				if (features.length){
					var e = this.map.getExtent(), 
						g = features[0].geometry, 
						p = new OpenLayers.LonLat(g.x, g.y);
					if (!e.containsLonLat(p)){
						e.extend(p);
						this.map.zoomToExtent(e);
					}
				}
			},
			alert: function(msg){
				$("#msg").html(msg);
				$("body").append($("#alert"));
				$("#alert").fadeIn(400, function(){
					$("#alert input").focus();				
				});
			},
			search: function(){
				var me = this,
					width = $("#search").width() > 1 ? 1 : $("#_search").width(),
					left = width == 1 ? $("#search").position().left : $("#_srch").position().left;					
				$("#search").css("visibility", "visible");
				$("#search").animate({width:width},
					function(){
						if (width == 1){
							me.locate.search();
							$("#search").css("visibility", "hidden");
						}else{
							$("#address").focus();
							$("#address").select();
						}
					}
				);
				$("#srch").animate({left:left});
			},
			centerAsp: function(id){
				var me = this, asp = me.aspList.asp(id), g = asp.geometry;
				me.map.setCenter(new OpenLayers.LonLat(g.x, g.y), 8);
				asp.aspFeature.renderIntent = "select";
				$("#toggleToMap").trigger("click");
				me.aspLayer.redraw();
		    	if ($(window).height() < 550){
		    		var id = function(){
		    			me.map.events.un({moveend:id});
		    			me.identify(asp);
		    		};
					me.map.events.on({moveend:id});
		    		me.map.pan(100, 100);
		    	}else{
	    			me.identify(asp);
		    	}
			},
			hover: function(e){
			    var f = e.feature;
			    if (f){
				    f.renderIntent = "select";
				    f.layer.drawFeature(f);
			    }
			}, 
			out: function(e){
				var f = e.feature;
			    if (f){
			    	f.renderIntent = "default";
			    	f.layer.drawFeature(f);
			    }
			},
			toggle: function(e){
				var target = $(e.target);
				$("#toggles .ui-btn").removeClass("ui-btn-active");
				$("#panel").panel(target.html() == "Map" ? "close" : "open");
				setTimeout(function(){target.addClass("ui-btn-active");}, 100);
			},
			filter: function(e){
				var me = this, target = $(e.target);
				if (!target.data("filter-name")) target = target.parent(); /* user clicked on the hand icon */
				target.parent().children().removeClass("ui-btn-active");
				target.addClass("ui-btn-active");
				setTimeout(function(){ /* timeout allows applied css to rerender before more expensive filtering and table rendering */
					var filters = {type:[], dayLength:[]};
					$.each($("#aspTypes .ui-btn-active"), function(_, n){
						var name = $(n).data("filter-name"), values = $(n).data("filter-values");
						values = filters[name].concat(values.split(","));
						filters[name] = values;
					});
					me.aspList.filter(filters);
					me.aspTable.render(me.aspList, me.currentLocation.geometry);
					me.aspLayer.removeAllFeatures();
					me.aspLayer.addFeatures(me.aspList.features());
					$("#callout").remove();
					me.aspLayer.redraw();
				}, 2);
			},
			zoom: function(by){
				var map = this.map;
				map.zoomTo(map.getZoom() + by);
			},
			removeCallout: function(){
				var f = this.aspList.asp(this.pop._f.id).aspFeature;
				$("#callout").remove();
				f.renderIntent = "default";
			    this.pop = null;
			    /* if we don't do 3 lines below you can't identify same feature after closing popup - why? - dunno */
				this.aspLayer.removeFeatures([f]);
				this.aspLayer.addFeatures([f]);
				$(this.aspLayer.div).trigger("click");
			},
			identify:function(f){
				var me = this,
					g = f.geometry, 
					p = new OpenLayers.LonLat(g.x, g.y), 
					asp = me.aspList.asp(f.id),
					loc = me.currentLocation,
					html = new nyc.AspInfo(asp, loc.attributes.title).render("callout");
			    if (me.pop) me.removeCallout();
				me.pop = new OpenLayers.Popup.FramedCloud("callout", p, null, html, null, true, function(){me.removeCallout();});
				me.pop._f = f;
				me.pop.panMapIfOutOfView = true;
				
				$("#infoSizeChecker").html(html);	
				me.pop.maxSize = new OpenLayers.Size(320, $("#infoSizeChecker").height());				
				me.pop.minSize = new OpenLayers.Size(320, $("#infoSizeChecker").height());				
				
				me.map.addPopup(me.pop);

		    	$(me.pop.closeDiv).removeClass("olPopupCloseBox");
		    	$(me.pop.closeDiv).addClass("ui-icon-delete");
		    	$(me.pop.closeDiv).css({width:"24px", height:"24px"});
		    	$(nyc).trigger("app.identify");
			},
			external:function(n){
				var url = $(n).data("href"), target = n.target;
		    	$("#iframeContainer iframe").prop("src", "");
				$("#iframeContainer")[target == "feedback" ? "addClass" : "removeClass"]("feedback");
				$("#iframeContainer").addClass("firstLoad");
				$("#iframeContainer iframe").css("visibility", "hidden");
				$("#iframeContainer iframe").one("load", function(){
					try{
						$($("#iframeContainer iframe")[0].contentWindow.document.body).width($(window).width());
					}catch(ignore){}
					$("#iframeContainer").removeClass("firstLoad");
					$("#iframeContainer iframe").css("visibility", "visible");
				});
		    	$("#iframeContainer iframe").prop("src", url);
		    	$("#external").slideToggle();
			}
		};
		
		return appClass;
}());

$(document).ready(function(){
	var map = new OpenLayers.Map(
		"map", 
		{
			resolutions: RESOLUTIONS,
			projection: EPSG_2263,
			maxExtent: MAX_EXT,
			units: "ft"
		}
	);
	var base = new OpenLayers.Layer.ArcGISCache(
		"Street Map",
		(function(){
			var uris = [],
				protocol = document.location.protocol + "//",
				host = document.location.hostname;
			if (host == "localhost") host = DEV_HOST;
			uris.push(protocol + host + BASEMAP_URI);
			if (host == "maps.nyc.gov"){
				for (var i = 1; i < 4; i++){
					var parts = host.split(".");
					uris.push(protocol + parts[0] + i + host.substr(host.indexOf(".")) + BASEMAP_URI);
				}
			}
			return uris;
		})(),
		{
		    tileOrigin: ORIGIN,
		    resolutions: RESOLUTIONS,
		    tileSize:SIZE,
		    sphericalMercator: false,
		    maxExtent: MAX_EXT,
		    useArcGISServer: false,
		    isBaseLayer: true,
		    type: "jpg",
		    projection: EPSG_2263,
		    hexZoom: true
	});
	
	map.addLayer(base);

	nyc.app = new nyc.App(map, new nyc.Locate(map), new nyc.AspList(), new nyc.AspTable()); 
	
	$("#copyright").html("&copy; " + new Date().getFullYear() + " City of New York");
	
});