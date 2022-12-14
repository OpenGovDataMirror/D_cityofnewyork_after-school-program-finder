window.nyc = window.nyc || {};

nyc.Asp = (function(){
	/*
	 * nyc.Asp extends a geoJSON Feature with fields and convenience methods
	 * @constructor
	 * 
	 * @param {Object} f
	 * 
	 */
	var aspClass = function(f){
		var c = f.geometry.coordinates,
			pt = new OpenLayers.Geometry.Point(c[0], c[1]),
			attr = f.properties;
		this.aspFeature = new OpenLayers.Feature.Vector(pt, attr);
		this.geometry = this.aspFeature.geometry;
		this.attributes = this.aspFeature.attributes;
		this.id = this.aspFeature.id;
		this.distance = null;
	};
	aspClass.prototype = {
		siebName: function(){
			return this.attributes.SIEB_NAME;
		},
		name: function(){
			return this.attributes.NAME;
		},
		address1: function(){
			return this.attributes.ADDRESS;
		},
		address2: function(){
			return this.attributes.BOROUGH + ", NY " + this.attributes.ZIP;
		},
		address: function(){
			return this.address1() + ", " + this.address2();
		},
		phone: function(){
			return this.attributes.PHONE || "";
		},
		email: function(){
			return this.attributes.EMAIL;
		},
		contact: function(){
			return this.attributes.CONTACT;
		},
		type: function(){
			return this.attributes.TYPE;
		}
	};
	return aspClass;
}());

nyc.AspList = (function(){
	/*
	 * nyc.AspList extends a geoJSON FeatureCollection providing methods to sort by distance from a user's location
	 * @constructor
	 * 
	 */
	var aspListClass = function(){
		this.ready = false;
		this.allFeatures = [];
		this.filteredFeatures = {};
	};
	aspListClass.prototype = {
		filter: function(filters){
			var me = this;
			me.filteredFeatures = {};
			$.each(me.allFeatures, function(_, asp){
				var type = filters.type;
				if ($.inArray(asp.type() + "", type) > -1)
					me.filteredFeatures[asp.id] = asp;
			});
		},
		sorted: function(p, ol){
			var me = this, result = [];
			for (var id in this.filteredFeatures){
				var asp = this.filteredFeatures[id], f = asp.aspFeature;
				f.distance = asp.distance;
				result.push(ol ? f : asp);
			}
			if (p){
				$.each(result, function(_, asp){
					asp.distance = me.distance(p, asp.geometry);
				});
				result.sort(function(a, b){
					if (a.distance < b.distance) return -1;
					if (a.distance > b.distance) return 1;
					return 0;
				});				
			}
			return result;
		},
		asps: function(p){
			return this.sorted(p);
		},
		features: function(p){
			return this.sorted(p, true);
		},
		populate: function(features){
			var me = this;
			me.allFeatures = [];
			me.filteredFeatures = {};
			$.each(features, function(_, f){
				var asp = new nyc.Asp(f);
				me.allFeatures.push(asp);
				me.filteredFeatures[asp.id] = asp;
			});
			this.ready = true;
		},
		asp: function(id){
			var asp = null;
			$.each(this.filteredFeatures, function(_, f){
				if (f.id == id){
					asp = f;
					return;
				}
			});
			return asp;
		},
		distance: function(a, b){
			var dx = a.x - b.x, 
				dy = a.y - b.y;
			return Math.sqrt(dx*dx + dy*dy)/5280;
		}
	};
	return aspListClass;
}());