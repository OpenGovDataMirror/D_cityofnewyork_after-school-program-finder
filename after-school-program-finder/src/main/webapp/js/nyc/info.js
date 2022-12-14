window.nyc = window.nyc || {};

nyc.AspInfo = (function(){
	/*
	 * nyc.AspInfo extends an  nyc.Asp object to provide Asp rendering functionality
	 * @constructor
	 * 
	 * @param {nyc.Asp} asp
	 * @param {string} currentLocation
	 * 
	 */
	var aspInfoClass = function(asp, currentLocation){
		this.asp = asp;
		this.currentLocation = currentLocation;
	};
	aspInfoClass.prototype = {
		schedule: function(asp){
			return DAY_LENGTH[asp.dayLength()];
		},
		render: function(idPrefix){
			var asp = this.asp, id = idPrefix + asp.id;
			return "<div id='" + id + "' class='aspInfo'>" +
				"<div class='name'><img class='aspType' src='img/" + asp.type() + "0.png'/>" + asp.name() + "</div>" +
				"<div class='addr'>" + asp.address1() + "</div>" +
				"<div class='addr'>" + asp.address2() + "</div>" +
				"<div class='contact'>Contact: " + asp.contact() + "</div>" +
				"<div class='phone'><a href='tel:" + encodeURI(asp.phone()) + "' target='_blank'>" + asp.phone() + "</a></div>" +
				"<div class='email'><a href='mailto:" + asp.email() + "' target='_blank'>" + asp.email() + "</a></div>" +
				"<table class='aspAction'><tbody><tr>" +
				"<td class='directions'><a class='ui-btn' target='directions' data-href=\"directions.html?from=" + encodeURIComponent(this.currentLocation) + 
				"&to=" + encodeURIComponent(asp.address()) + "&asp=" + encodeURIComponent(asp.name()) + 
				"\" onclick='nyc.app.external(this);'>Directions</a></td>" +
				"<td class='map'><a class='ui-btn' href='#' onclick=\"nyc.app.centerAsp('" + asp.id + "')\">Map</a></td>" +
				"<td class='apply'><a class='ui-btn' target='apply' data-href=\"" + this.apply(asp) +
				"\" onclick='nyc.app.external(this);'>Apply</a></td>" +
				"</tr></tbody></table>" +
				"</div>";
		},
		apply: function(asp){
			return APPLICATION_URL + "form=" + asp.type() + "&school=" + encodeURIComponent(asp.siebName());
		}
	};
	return aspInfoClass;
}());

nyc.AspTable = (function(){
	/*
	 * nyc.AspInfo extends an  nyc.AspTable object to provide AspList rendering functionality
	 * @constructor
	 * 
	 */
	var aspTableClass = function(){
		$(window).resize(this.fixJqCss);
		this.aspList = null;
		this.currentLocation = null;
	};
	aspTableClass.prototype = {
		render: function(aspList, p){			
			var tbl = $("#aspTable");
			this.aspList = aspList;
			this.currentLocation = p;
			tbl.html("<tbody></tbody>");
			$("#more").data("current-pg", "0");
			this.rows(tbl[0], 0);
		},
		rows: function(tbl, pg){
			var start = pg * 10, end = start + 10, asps = this.aspList.asps(this.currentLocation);
			if (end >= asps.length){
				end = asps.length;
				$("#pgCtrl").hide();
			}else{
				$("#pgCtrl").show();
			}
			for (var i = start; i < end; i++){
				var asp = asps[i], tr0 = tbl.insertRow(i), td0 = tr0.insertCell(0), td1 = tr0.insertCell(1), info = new nyc.AspInfo(asp);
				tr0.id = "table" + asp.id;
				tr0.className = asp.type();
				if (i % 2 == 0) $(tr0).addClass("oddRow");
				td0.className = "distCell";
				td1.className = "aspCell";
				td1.id = asp.id;
				if (asp.distance != null){
					$(td0).html(asp.distance.toFixed(2) + " mi");
				}
				$(td1).html(info.render("table"));
			}
			$.each($(".phone"), function(_, n){
				if (!$(n).html()) $(n).parent().hide();
			});
			$("#more").data("current-pg", pg + 1);
			this.fixJqCss();				
		},
		more: function(){
			this.rows($("#aspTable")[0], $("#more").data("current-pg") * 1);
		},
		fixJqCss: function(){
			$("#aspContent").height($("body").height() - $("#banner").height() - $("#filters").height() - $("#pgCtrl .ui-btn").height());		
		}
	};
	return aspTableClass;
}());