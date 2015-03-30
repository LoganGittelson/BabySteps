/*
 * Looper for YouTube
 * http://looperforyoutube.alvinhkh.com
 * Copyright (c) 2011-2015, AlvinHKH
 * http://alvinhkh.com
 * All rights reserved.
 */
 
 /*
  * L: My notes
  *
  * Check prototype and match behaviour - refine existing behaviour (seek out of loop)
  * Center button
  * Create divs showing loops - when to track?
  * Move button and slider
  * Considering keeping some other functions (loop count etc)
  * Do stuff with 'in-loop'
  * Reset everything on break loop? - remember to take out code from set start then
  * 
  * Track search
  *
  *
  * look at setInterval functions - how is loopaction called so often inside loops
  *
  */
  
/*
 * QUICK FIND
 *
 * button defined - thebuttons - %%
 * definition of loopsdiv - theloops
 * loopaction which is called on player state change - [[
 * where seeking is kept track of - theseeks - ]]
 * Where panel is set in the page (currently supper hacky) - thepage
 * my on state change listener - trackchange
 * segment loop - {{
 */

var chromePage = "", 
	chromeInIncognito = false;
if (chrome.extension) {
	chromePage = chrome.extension.getURL('');
	chromeInIncognito = chrome.extension.inIncognitoContext;
}

// Check whether new version is installed
if (typeof(chrome.runtime) == 'object') {
	var thisVersion = chrome.runtime.getManifest().version;
	if (localStorage['yt-loop-show-changelog'] == "true" && localStorage['yt-loop-version'] && localStorage['yt-loop-version'] != thisVersion.toString()) {
		// check version number, if they are different, show changelog
		var changelog_url = "http://looperforyoutube.alvinhkh.com/changelog/updated";
		window.open(changelog_url, "changelogWindow");
	}
	// save current extension version
	localStorage['yt-loop-version'] = thisVersion;
}

function inject(func) {
	var script = document.createElement('script');
	script.setAttribute('type', 'text/javascript');
	script.appendChild(document.createTextNode("var chromePage = \"" + chromePage + "\";\n"));
	script.appendChild(document.createTextNode("var inIncognito = " + chromeInIncognito + ";\n"));
	script.appendChild(document.createTextNode("var player_reference;\n"));
	script.appendChild(document.createTextNode("if (typeof onYouTubePlayerReady != 'function'){onYouTubePlayerReady = function (player){player_reference = player;}}\n"));
	script.appendChild(document.createTextNode("(" + func + ")();"));
	document.addEventListener("DOMContentLoaded", function(event) { 
		document.body.appendChild(script);
		// alert("Test!");
	});
}

inject(function() {

var MutationObserver = window.MutationObserver || window.WebKitMutationObserver || window.MozMutationObserver;
var clog = console.log;
var cinfo = console.log;

ytl = {
	
	logging: [],
	log: function() {
		var input = '';
		for (var i = 0; i < arguments.length; i++)
			input += arguments[i] + " ";
		if (ytl.isDebug) {
			clog.apply(console, ["[LOOPER FOR YOUTUBE]", input]);
			ytl.logging.push(input);
		}
	},
	llog: function(eventType, vidTime, logMessage) {
		var mylogger = {};
		mylogger['date'] = new Date();
		mylogger['eventType'] = eventType;
		mylogger['vidTime'] = vidTime;
		mylogger['message'] = logMessage;
		console.log('logging: '+ mylogger);
		localStorage[ytl.kw + ytl.ls] = JSON.stringify(mylogger);
	},
	info: function() {
		var input = '';
		for (var i = 0; i < arguments.length; i++)
			input += arguments[i] + " ";
		cinfo.apply(console, ["[LOOPER FOR YOUTUBE]", input]);
		ytl.logging.push(input);
	},

	isDebug: (localStorage['yt-loop-debug'] == 'true' ? true : false),
	setDebug: function(bool) {
		if (bool == true) {
			localStorage['yt-loop-debug'] = true;
		} else {
			localStorage['yt-loop-debug'] = false;
			localStorage.removeItem('yt-loop-debug');
		}
		window.location.reload();
	},

	setVisitorCookies: function(value, reload) {
		ytl.log('Set YouTube Visitor as', (value == '' ? undefined : value));
		document.cookie="VISITOR_INFO1_LIVE=" + value + "; path=/; domain=.youtube.com";
		if (reload == true) {
			window.location.reload();
		}
	},

	/*
	 * Initialise variables holders
	 */
	initialiseVariables: function() {
		ytl.log('Initialise Variables');

		// Static Variables
		ytl.layout = '2013';
		ytl.optionPage = chromePage ? chromePage + 'options.html' : null;
		ytl.qualityLevels = new Array("highres", "hd1440", "hd1080", "hd720", "large", "medium", "small", "tiny");
		ytl.session = sessionStorage;
		ytl.storage = localStorage;
		
		// Element Holders
		ytl.button = null;
		ytl.buttonContainer = null;
		ytl.buttonicon = null;
		ytl.buttoncontent = null;
		ytl.dislikebutton = null;
		ytl.likebutton = null;
		ytl.sharebutton = null;
		ytl.panel = null;
		ytl.panelContainer = null;
		ytl.panelParentContainer = null;
		ytl.player = null;
		ytl.slider = null;
		ytl.sliderBar = null;
		ytl.space = document.createTextNode(' ');
		
		// Event Holder
		ytl.getReadyTimes = 0;
		ytl.playAction = null;
		ytl.manualChecker = null;
		ytl.doubleChecker = null;
        ytl.seekChecker = null;
		
		// Event Boolean
		ytl.playlistAutoplayButtonManualClick = true;
		ytl.playlistAutoplayListenerAttach = false;
		ytl.setLoopEventloaded = false;
		ytl.urlChecked = false;
		ytl.windowResized = false;
        // L: For printing to log
        ytl.showState = false;
        // Set to false to skip first seek done by player
        ytl.showSeek = false;
		
		// Session Variables
		ytl.session['yt-duration'] = 0;
		ytl.session['yt-player-size'] = 'normal';
		ytl.session['yt-player-size-initial'] = 'normal';
		ytl.session['yt-loop'] = false;
		ytl.session['yt-loop-attached'] = false;
		ytl.session['yt-loop-autoclick'] = false;
		ytl.session['yt-loop-count'] = 10;
		ytl.session['yt-loop-th'] = 0;
		ytl.session['yt-loop-time'] = 0;
		ytl.session['yt-loop-timer'] = 10;
		ytl.session['yt-loop-incount'] = false;
		ytl.session['yt-loop-playlist-endplay'] = false;
		ytl.session['yt-loop-intimer'] = false;
		ytl.session['yt-loop-inrange'] = false;
		ytl.session['yt-loop-range'] = JSON.stringify([]);
        
        // L: My variables
        // 0: set loop
        // 1: set end
        // 2: break loop
        ytl.session['yt-button-state'] = 0;
        
        // L: Loop num
        ytl.session['loop-num'] = 0;
        
        // L: To help catch seeks
        ytl.session['prev-time'] = 0;
		
		// L: localStorage logging - keyword and count
		ytl.kw = 'logan.';
		ytl.ls = 0;
	},

	/*
	 * Function to get locale strings from each message.json file
	 * Limitation: Cannot idenfity placeholder in message.json
	 */
	localeFetch: function (locale, prefix) {
		locale = locale.replace("-", "_");
		var file = chromePage + "_locales/" + locale + "/messages.json";
		prefix = prefix ? prefix + "_" : "script_";
		var return_message = {};
		var xhr = new XMLHttpRequest();
		xhr.open("GET", file, false);
		xhr.onreadystatechange = function() {
			if(this.status == 200 && this.readyState == 4 && this.responseText != "") {
				var messages = JSON.parse(this.responseText);
				var return_array = {};
				for (var name in messages) {
					var regex = new RegExp("^" + prefix + "(.*)$", "g");
					if (name.match(regex)) {
						var attr = name.replace(regex, "$1");
						if (attr && messages[name] && messages[name].message != null) {
							return_array[attr] = messages[name].message;
						}
					}
				}
				return_message = return_array;
			}
		};
		try {
			xhr.send();
		}
		catch (e) {
		}
		return return_message;
	},

	/*
	 * Corrent lang to the right locale
	 */
	getCorrectLocale: function (lang) {
		lang = lang.replace(/-/g,'_');
		switch (lang) {
		case "fr_CA":
			return "fr";
			break;
		case "pt":
		case "pt_PT":
			return "pt_BR";
			break;
		case "zh":
			return "zh_CN";
			break;
		case "en_GB":
		case "en_US":
			return "en";
			break;
		default:
			return lang;
		}
	},

	/*
	 * Get translated text
	 */
	i18n: function (s) {
		// Initialise i18n Variables
		if (ytl.i18n == undefined)
			ytl.i18n = {};
		if (ytl.i18n['en'] == undefined)
			ytl.i18n['en'] = {};
		if (Object.keys(ytl.i18n['en']).length < 1)
			ytl.i18n['en'] = ytl.localeFetch("en");
		if (ytl.lang != undefined) {
			if (ytl.i18n[ytl.lang] == undefined)
				ytl.i18n[ytl.lang] = {};
			if (ytl.lang && Object.keys(ytl.i18n[ytl.lang]).length < 1)
				ytl.i18n[ytl.lang] = ytl.localeFetch(ytl.lang);
		}
		// Translate
		var r = '';
		if (r = ytl.i18n[ytl.lang][s]) {
			return r;
		} else if (ytl.i18n[ytl.lang][s] == '') {
			return '';
		} else if (r = ytl.i18n['en'][s]) {
			return r;
		} else {
			return '';
		}
	},

	/*
	 * set all event listeners
	 * L: Why remove then add?
	 */
	setEventListener: function () {
		window.removeEventListener('message', ytl.messageAction, false);
		window.addEventListener('message', ytl.messageAction, false);
		
		document.removeEventListener('keydown', ytl.keydownAction, false);
		document.addEventListener('keydown', ytl.keydownAction, false);
		
		if (ytl.playerObserver) ytl.playerObserver.disconnect();
		ytl.playerObserver = new MutationObserver(function (mutations) {
			mutations.forEach(ytl.observePlayerSize);
		});
		ytl.playerObserver.observe(document.getElementById('player-legacy') || document.getElementById('player'), { attributes: true, subtree: false });
		
		window.removeEventListener('resize', ytl.windowResizedAction, false);
		window.addEventListener('resize', ytl.windowResizedAction, false);	
		
		// L: Adding my own event listeners
		// on click button will trigger
		// on enter 'enter' will trigger, then button
		// Search button click
		document.getElementById("search-btn").removeEventListener('click', ytl.searchActionButton);
		document.getElementById("search-btn").addEventListener('click', ytl.searchActionButton);
		
		//Enter press in search bar
		document.getElementById("masthead-search-term").removeEventListener('keydown', ytl.searchActionEnter);
		document.getElementById("masthead-search-term").addEventListener('keydown', ytl.searchActionEnter);

	},
	
	searchActionButton: function(evt) {
		//evt.stopPropagation(); evt.preventDefault();
		console.log("Button was clicked: "+ document.getElementById("masthead-search-term").value);
		return;
	},
	
	searchActionEnter: function (evt) {
		//evt.stopPropagation(); evt.preventDefault();
		if (evt.keyCode === 13)
		{
			console.log("Enter was pressed: " + document.getElementById("masthead-search-term").value);
		}
		return;
	},

	/*
	 * set all variables related to elements
	 */
	setVariables: function () {
	try {	
		try {
			ytl.lang = (yt.prefs.UserPrefs.prefs_.hl||document.documentElement.getAttribute("lang")).replace(/-/g,'_');
		} catch (e) {
			ytl.lang = (document.documentElement.getAttribute("lang")).replace(/-/g,'_');
		}
		ytl.lang = ytl.getCorrectLocale(ytl.lang);
		ytl.player = ytl.getVariable('player');
		ytl.layout = '2013';
		ytl.buttonContainer = document.getElementById('watch7-sentiment-actions');
		ytl.panelContainer = document.getElementById('watch7-action-panels');
		ytl.panelParentContainer = document.getElementById('watch7-action-panels');
		ytl.dislikebutton = document.getElementById('watch-dislike');
		ytl.likebutton = document.getElementById('watch-like');
		if (!ytl.buttonContainer || !ytl.panelContainer || !ytl.panelParentContainer) {
			ytl.layout = '2014';
			ytl.buttonContainer = document.getElementById('watch8-secondary-actions');
//			ytl.panelContainer = document.getElementById('watch8-action-panels') || document.getElementById('watch-action-panels');
//			ytl.buttonContainer = document.getElementById('watch8-secondary-actions');

			// L: These work for outside of watch7, but formatting becomes weird
			// ytl.panelContainer = document.getElementById('page');
			// ytl.panelParentContainer = document.getElementById('page');
			ytl.panelContainer = document.getElementById('watch7-content');
			ytl.panelParentContainer = document.getElementById('watch7-content');
			
			ytl.sharebutton = ytl.buttonContainer.getElementsByClassName('action-panel-trigger-share')[0];
		}
	} catch (e) {
		if(ytl.isDebug) console.debug('[LOOPER FOR YOUTUBE]', 'Error: '+e.message);
	} finally {
		ytl.setEventListener();
	}
	},

	getUrlVars: function(s) {
		var v = {};	var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,k,e) { v[k] = e;	});	return v[s];
	},

	replaceUrlVar: function (s, value) {
		if(value==null || value == undefined) {
			window.history.replaceState(null, null, 
				window.location.href.replace(/([?&])+([^=&]+)=([^&]*)/gi, function(o,m,k,e) { 
					if(k==s) if(m=='?') return m; else return ''; 
					else return m+k+'='+e; 
				})
			);
			return;
		}
		if(ytl.getUrlVars(s)) {
			window.history.replaceState(null, null, 
				window.location.href.replace(/([?&])+([^=&]+)=([^&]*)/gi, function(o,m,k,e) { 
					if(k==s) return m+k+'='+value; 
					else return m+k+'='+e; 
				})
			);
		}
		else window.history.replaceState(null, null, window.location.href+'&'+s+'='+value); 
	},

	checkIf: function (c) {
		switch (c) {
			case 'inloop': return (ytl.session['yt-loop'] == 'true');
			case 'inloopPrevious': return (ytl.storage['yt-loop'] == 'true');
			case 'incount': return (ytl.session['yt-loop-incount'] == 'true' && ytl.getVariable('loopCount') > 0);
			case 'incountPrevious': return (ytl.storage['yt-loop-incount'] == 'true' && ytl.getVariable('loopCountPrevious') > 0);
			case 'intimer': return (ytl.session['yt-loop-intimer'] == 'true' && ytl.getVariable('loopTimer') > 0);
			case 'intimerPrevious': return (ytl.storage['yt-loop-intimer'] == 'true' && ytl.getVariable('loopTimerPrevious') > 0);
			case 'inrange': return (ytl.session['yt-loop-inrange'] == 'true');
			case 'loopdisplay': return ( (ytl.player!=null) && (ytl.button!=null) && (ytl.panel!=null) && (ytl.player.addEventListener!=null) && (document.getElementById('loop-button')!=null) && (document.getElementById('action-panel-loop')!=null) );
			case 'buttonDisable': if(ytl.likebutton) return (ytl.likebutton.getAttribute('disabled') && ytl.likebutton.getAttribute('disabled').toLowerCase() == 'true' && ytl.likebutton != 'null'); else return false;
			case 'playerSizeInitial': return ytl.session['yt-player-size-initial'];
			case 'playlistExist': return document.getElementById('watch-appbar-playlist') && ( !isNaN(Number(yt.config_.LIST_AUTO_PLAY_VALUE)) && Number(yt.config_.LIST_AUTO_PLAY_VALUE) >= 1 );
			case 'playlistAutoPlayButtonExist':
				return document.getElementById('watch-appbar-playlist') && 
				document.getElementById('watch-appbar-playlist').getElementsByClassName('playlist-nav-controls') && document.getElementById('watch-appbar-playlist').getElementsByClassName('playlist-nav-controls')[0].getElementsByTagName('button') &&
				document.getElementsByClassName('yt-uix-button-icon-watch-appbar-autoplay').length > 0;
			case 'playlistAutoPlay':
				if (document.getElementById('watch-appbar-playlist') && document.getElementById('watch-appbar-playlist').getElementsByClassName('playlist-nav-controls') && document.getElementById('watch-appbar-playlist').getElementsByClassName('playlist-nav-controls')[0].getElementsByTagName('button')) {
					return (document.getElementsByClassName('yt-uix-button-icon-watch-appbar-autoplay')) && isNaN(document.getElementById('watch-appbar-playlist').getElementsByClassName('playlist-nav-controls')[0].getElementsByTagName('button')[0].className.match(/yt-uix-button-toggled/));
				} 
				return (yt.config_.LIST_AUTO_PLAY_ON == true);
			case 'playlistAutoPlayInitial': return (ytl.session['yt-playlist-autoplay-initial'] == 'true');
			case 'playlist-queue':
				var list = document.getElementsByClassName('watch-queue-items-list')[0];
				if (list) {
					return (list.childNodes.length > 0);
				}
				return false;
			case 'playlist-endplay': return (ytl.session['yt-loop-playlist-endplay'] == 'true');
			case 'playlist-endplayPrevious': return (ytl.storage['yt-loop-playlist-endplay'] == 'true');
			case 'url-loopCount': return (ytl.getUrlVars('loop') > 0 ? true : false);
			case 'url-loopTimer': return (ytl.getUrlVars('timer') > 0 ? true : false);
			case 'url-starttime': return (ytl.getUrlVars('start') ? true : false);
			case 'url-endtime': return (ytl.getUrlVars('end') ? true : false);
			case 'check-always': return false;
			case 'check-usually': return ytl.checkIf('inrange') || ytl.checkIf('check-always');
		}
	},
	
	getOption: function (o) {
		switch (o) {
		case 'autoLoop': 
			return (ytl.storage['yt-auto-loop'] == 'true');
		case 'buttonIcon':
			switch (ytl.storage['yt-loop-button']) {
				case 'all':
				case 'icon':
					return true;
				case 'text':
					return false;
					break;
			}
			return true;
			return (ytl.storage['yt-loop-icon'] == 'true');
		case 'buttonText':
			switch (ytl.storage['yt-loop-button']) {
				case 'all':
				case 'text':
					return true;
				case 'icon':
					return false;
					break;
			}
			return true;
		case 'defaultShowPanel':
			return ytl.getOption('showPanel');
		case 'playerSize':
			return (ytl.storage['yt-player-size'] ? ytl.storage['yt-player-size'] : 'normal');
		case 'playerSizeEnable':
			return (ytl.storage['yt-player-resize'] == 'true');
		case 'quality':
			switch (ytl.storage['yt-quality']) {
				case 'highres':
				case 'hd1440':
				case 'hd1080':
				case 'hd720':
				case 'large':
				case 'medium':
				case 'small':
				case 'tiny':
					return ytl.storage['yt-quality'];
					break;
			}
			return 'default';
		case 'saveStateLoop':
			return (ytl.storage['yt-auto-loop'] == 'saveState');
		case 'shortcut':
			return (ytl.storage['yt-loop-shortcut'] == 'true');
		case 'shortcut-pause':
			return (ytl.storage['yt-pause-shortcut'] == 'true');
		case 'showPanel':
			return (ytl.storage['yt-loop-options'] == 'true');
		}
	},
	
	/* L: PLAYER GET! */
	getVariable: function (c) {
		switch (c) {
			case 'player':
				if (typeof player_reference === 'object' && typeof player_reference.getDuration == 'function') {
					if (ytl.isDebug) ytl.log('Player Object', 'player_reference from onYouTubePlayerReady');
					return player_reference;
				} else if (typeof window.yt.config_.PLAYER_REFERENCE === 'object') {
					if (ytl.isDebug) ytl.log('Player Object', 'yt.config_.PLAYER_REFERENCE');
					return window.yt.config_.PLAYER_REFERENCE;
				} else if (typeof document.getElementById('movie_player') === 'object') {
					if (ytl.getReadyTimes > 10) {
						if (ytl.isDebug) ytl.log('Player Object', 'movie_player');
						return document.getElementById('movie_player');
					}
					return;
				} else {
					return;
				}
			case 'loopCount':
				return Number(ytl.session['yt-loop-count']);
			case 'loopCounter':
				return Number(ytl.session['yt-loop-th']);
			case 'loopCountPrevious':
				return Number(ytl.storage['yt-loop-count']);
			case 'loopTime':
				return Number(ytl.session['yt-loop-time']);
			case 'loopTimer':
				return Number(ytl.session['yt-loop-timer']);
			case 'loopTimerPrevious':
				return Number(ytl.storage['yt-loop-timer']);
			case 'starttime':
				var data = JSON.parse(ytl.session['yt-loop-range']);
				if (data.length > 0 && data[0].start) {
					return Number(data[0].start);
				} else {
					return 0;
				}
			case 'endtime':
				var data = JSON.parse(ytl.session['yt-loop-range']);
				if (data.length > 0 && data[0].end) {
					return Number(data[0].end);
				} else {
					return 0;
				}
			case 'input-starttime':
				return Number(ytl.getSeconds(document.getElementById('loop-start-time').value));
			case 'input-endtime':
				return Number(ytl.getSeconds(document.getElementById('loop-end-time').value));
			case 'currenttime':
				return  (ytl.player.getCurrentTime != undefined) ? ytl.player.getCurrentTime() : false;
			case 'duration':
				return (ytl.player.getDuration != undefined) ? ytl.player.getDuration() : false;
			case 'playerstate':
				return (ytl.player.getPlayerState != undefined) ? ytl.player.getPlayerState() : false;
			case 'url-loopCount':
				return ytl.checkIf('url-loopCount') ? Number(ytl.getUrlVars('loop')) : Number(false);
			case 'url-loopTimer':
				return ytl.checkIf('url-loopTimer') ? Number(ytl.getUrlVars('timer')) : Number(false);
			case 'url-starttime':
				return ytl.checkIf('url-starttime') ? Number(ytl.getSeconds(ytl.getUrlVars('start'))) : Number(false);
			case 'url-endtime':
				return ytl.checkIf('url-endtime') ? Number(ytl.getSeconds(ytl.getUrlVars('end'))) : Number(false);
			case 'quality':
				return (ytl.player.getPlaybackQuality != undefined && ytl.qualityLevels.indexOf(ytl.player.getPlaybackQuality()) > 0) ? ytl.player.getPlaybackQuality() : false;
			case 'qualitySet':
				return ytl.session['yt-quality-set'];
			case 'availableQuality':
				return (ytl.player.getAvailableQualityLevels != undefined && ytl.player.getAvailableQualityLevels() != '') ? ytl.player.getAvailableQualityLevels() : [];
			case 'highestQuality':
				return (ytl.player.getAvailableQualityLevels != undefined && ytl.player.getAvailableQualityLevels() != '') ? ytl.player.getAvailableQualityLevels()[0] : false;
			case 'lowestQuality':
				return (ytl.player.getAvailableQualityLevels != undefined && ytl.player.getAvailableQualityLevels() != '') ? ytl.player.getAvailableQualityLevels()[ytl.player.getAvailableQualityLevels().length-2] : false;
            case 'buttonState': //L: My variable - no special function for getting
                return (Number(ytl.session['yt-button-state']));
		}
	},
			
	setVariable: function (variable, value) {
		switch (variable) {
			case 'starttime':
				var range = JSON.parse(ytl.session['yt-loop-range']);
				if (range.length > 0 && range[0].start) {
					range[0].start = value;
				} else {
					range = [{start: value, end: ytl.getVariable('endtime')}];
				}
				ytl.session['yt-loop-range'] = JSON.stringify(range);
				break;
			case 'endtime':
				var range = JSON.parse(ytl.session['yt-loop-range']);
				if (range.length > 0 && range[0].end) {
					range[0].end = value;
				} else {
					range = [{start: ytl.getVariable('starttime'), end: value}];
				}
				ytl.session['yt-loop-range'] = JSON.stringify(range);
				break;
		}
	},

	getTime: function (i) {
		var num = i.toFixed(2).toString().split('.');
		var digit = (num.length > 1 && Number(num[1]) != 0) ? num[1] : '';
		i = Math.floor(i);
		var s = ((i) % 60).toFixed(),
			m = Math.floor((i) % (60 * 60) / 60).toFixed(),
			h = Math.floor((i) / (60 * 60)).toFixed();
		s = (s < 10 ? '0' : '') + s;
		m = (m < 10 ? '0' : '') + m;
		h = (h == 0 ? '' : (h < 10 ? '0' : '') + h);
		return (h!='' ? h+':' : '') + m + ':' + s + (digit!='' ? '.'+digit : '');
	},
	
	getSeconds: function (t) {
		t = t.split(':');
		if (t.length>3||t.length<1) return 0;
		if (t.length == 3) {
			h = Number(t[0]); m = Number(t[1]); s = Number(t[2]);
		} else if (t.length == 2) {
			h = 0; m = Number(t[0]); s = Number(t[1]);
		} else {
			h = 0; m = 0; s = Number(t[0]);
		}
		return (h * 60 * 60) + (m * 60) + s;
	},

	setButton: function() {
		if(ytl.button && document.getElementById('loop-button')) return;
		if(ytl.buttonContainer==null) return;
		if (document.getElementById('loop-button')) {
			document.getElementById('loop-button').remove();
		}
		var group = document.createElement('span'),
			button = document.createElement('button'), 
			icon_wrapper = document.createElement('span'),
			icon = document.createElement('span'),
			icon_valign = document.createElement('span'), 
			label = document.createElement('label'),
			buttonContent = document.createElement('span'),
			buttonClassName = null,
			disable = ytl.checkIf('buttonDisable');
		if (ytl.layout == '2014') {
			buttonClassName = ytl.sharebutton.getAttribute('class').replace('action-panel-trigger-share', '').replace('yt-uix-button-has-icon', '').replace('no-icon-markup', '');
		} else {
			buttonClassName =  ytl.dislikebutton.getAttribute('class').replace('yt-uix-clickcard-target', '');
		}
		button.setAttribute('id', 'loop-button');
		button.setAttribute('class', 'loop-button ' + buttonClassName);
		button.setAttribute('type','button');
		if(!disable) button.setAttribute('title', ytl.i18n('button_hover'));
		button.setAttribute('onclick', ';return false;');
		button.setAttribute('data-trigger-for', 'action-panel-loop');
		button.setAttribute('data-button-toggle', 'true');
		button.setAttribute('role','button');
		button.style.padding = '0 7px';
		button.style.boxShadow = 'none';
		button.style.outline = 'none';
		if(disable) button.setAttribute('disabled', disable);
		icon_wrapper.className = 'yt-uix-button-icon-wrapper';
		icon.setAttribute('id', 'loop-button-icon');
		icon.className = 'yt-uix-button-icon yt-sprite';
		icon.style.width = '20px';
		if (ytl.layout == '2014') {
			icon.style.height = '20px';
		} else {
			icon.style.height = '23px';
			icon.style.marginRight = '3px';
		}
		icon.style.background = 'no-repeat url(//s.ytimg.com/yts/imgbin/www-hitchhiker-vfl87ArTO.webp) -134px -231px';
		icon.style.position = 'relative';
		icon.style.display = 'inline-block';
		label.style.position = 'absolute';
		label.style.bottom = '2px';
		label.style.right = '0';
		label.style.fontSize = '11px';
		label.style.display = 'none';
		icon.appendChild(label);
		icon_wrapper.appendChild(icon);
		if (ytl.layout == '2014') {
		} else {
			icon_valign.className = 'yt-uix-button-valign';
			icon_wrapper.appendChild(icon_valign);
		}
		button.appendChild(icon_wrapper);
		buttonContent.id = 'loop-button-content';
		buttonContent.className = 'yt-uix-button-content';
		buttonContent.innerText = ytl.i18n('button_text');
		button.appendChild(buttonContent);
		button.addEventListener ('click', ytl.buttonAction);
		while (document.getElementById('loop-button')) {
			document.getElementById('loop-button').remove();
		}
		if (ytl.layout == '2014') {
		} else {
			group.setAttribute('class', 'yt-uix-button-group actionable');
		}
		group.appendChild(button);
		ytl.buttonContainer.insertBefore(group, ytl.buttonContainer.firstChild);
		
		ytl.button = document.getElementById('loop-button');
		ytl.buttonicon = document.getElementById('loop-button-icon');
		ytl.buttoncontent = document.getElementById('loop-button-content');
	},
	buttonClick: function (s) { ytl.log('Button Click - Done'); if(ytl.button) return ytl.button.click(); },

	setInfoPanel: function () {
		// show loop count and timer
		var info = document.createElement('div');
		info.id = 'loop-panel-info-container';
		//info.style.display = 'block';
		// L: HIDING THIS !!!!!!!!!!!!!!!!!!!
		info.style.display = 'none';
		info.style.margin = '0 15px 10px';
		info.style.fontWeight = 'bold';
		
		var count = document.createElement('span');
		var counter = document.createElement('span');
		counter.id = 'loop-counter';
		count.appendChild(document.createTextNode(ytl.i18n('played')));
		count.appendChild(counter);
		count.appendChild(document.createTextNode(ytl.i18n('times')));
		
		var timer = document.createElement('span');
		var time = document.createElement('span');
		time.id = 'loop-timerTime';
		timer.appendChild(document.createTextNode(ytl.i18n('played')));
		timer.appendChild(time);
		timer.appendChild(document.createTextNode(ytl.i18n('minutes')));
		
		info.appendChild(count);
		//info.appendChild(document.createTextNode(ytl.i18n('and')));
		//info.appendChild(timer);
		return info;
	},
	
	/* L: What's up with all these event listeners? */
	setCountInputPanel: function () {
		// Set loop count
		var count = document.createElement('div');
		count.id = 'loop-panel-count-container';
		//count.style.display = 'inline-block';
		// L: HIDING THIS!
		count.style.display = 'none';
		count.style.margin = '0 15px';
		count.style.height = '40px';
		count.style.lineHeight = '40px';
		count.style.verticalAlign = 'middle';
		
		var countCheckboxContainer = document.createElement('span');
		countCheckboxContainer.className = 'yt-uix-form-input-checkbox-container';
		countCheckboxContainer.style.margin = '0 4px';
		var countCheckbox = document.createElement('input');
		countCheckbox.type = 'checkbox';
		countCheckbox.name = 'loop-count-enable';
		countCheckbox.className = 'yt-uix-form-input-checkbox';
		countCheckbox.id = 'loop-count-checkbox';
		var countCheckboxElement = document.createElement('span');
		countCheckboxElement.className = 'yt-uix-form-input-checkbox-element';
		countCheckboxContainer.appendChild(countCheckbox);
		countCheckboxContainer.appendChild(countCheckboxElement);
		var countCheckboxLabel1 = document.createElement('label'),
			countCheckboxLabel2 = document.createElement('label');
		countCheckboxLabel1.setAttribute('for', 'loop-count-checkbox');
		countCheckboxLabel2.setAttribute('for', 'loop-count-checkbox');
		countCheckboxLabel1.innerText = ' '+ytl.i18n('loop_for');
		countCheckboxLabel2.innerText = ytl.i18n('times');
		var countInput = document.createElement('input');
		countInput.type = 'text';
		countInput.id = 'loop-count';
		countInput.className = 'yt-uix-form-input-text';
		countInput.style.cssText = 'width: 30px; text-align: center; border: 0; font-size: 1.2em';
		countInput.value = 10;
		countInput.maxlength = 4;
		
		count.appendChild(countCheckboxContainer);
		count.appendChild(countCheckboxLabel1);
		count.appendChild(countInput);
		count.appendChild(countCheckboxLabel2);
		
		var maxTimes = 999;
		countInput.addEventListener ('change', function() { 
			var t = Math.round(Number(countInput.value));
			if (ytl.getOption('showPanel') && t>=0) {
				ytl.session['yt-loop-count'] = t;
				ytl.storage['yt-loop-count'] = t;
			}
			countInput.value = ytl.getVariable('loopCount');
			if(ytl.checkIf('incount')) ytl.replaceUrlVar('loop', ytl.getVariable('loopCount'));
			ytl.playlistAutoPlayCheck();
		}, false);
		
		countInput.addEventListener ('keydown', function(e){ 
			var k = e.keyCode, t = Math.round(Number(countInput.value));
			if (!ytl.getOption('showPanel')) return;
			if ( k == 38 || k == 40 ) {
				if ( k == 38 ) t += 1; else if ( k == 40 ) t-=1;
				if (t < 1) t = maxTimes;
				var count = ( t>0 && t<=maxTimes ) ? t : 1;
				ytl.session['yt-loop-count'] = count;
				ytl.storage['yt-loop-count'] = count;
				countInput.value = ytl.getVariable('loopCount').toFixed(0);
				if(ytl.checkIf('incount')) ytl.replaceUrlVar('loop', ytl.getVariable('loopCount'));
				ytl.playlistAutoPlayCheck();
			}
		}, false);
		
		countInput.addEventListener ('mousewheel', function(e){ 
			if (!ytl.getOption('showPanel')) return;
			var t = Math.round(Number(countInput.value));
			e.preventDefault();
			t += (e.wheelDelta / 120);
			t = t.toFixed(0);
			var count = ( t>0 && t<=maxTimes ) ? t : 1;
			ytl.session['yt-loop-count'] = count;
			ytl.storage['yt-loop-count'] = count;
			
			countInput.value = ytl.getVariable('loopCount').toFixed(0);
			if(ytl.checkIf('incount')) ytl.replaceUrlVar('loop', ytl.getVariable('loopCount'));
			ytl.playlistAutoPlayCheck();
		}, false);
		
		countCheckbox.addEventListener ('click', function() { 
			if (ytl.getOption('showPanel'))
			if (countCheckbox.checked) { 
				ytl.session['yt-loop-incount'] = true;
				ytl.storage['yt-loop-incount'] = true;
				ytl.replaceUrlVar('loop', ytl.checkIf('incount') ? ytl.getVariable('loopCount') : null);
				ytl.playlistAutoPlayCheck();
				return;
			}
			ytl.session['yt-loop-incount'] = false;
			ytl.storage['yt-loop-incount'] = false;
			ytl.replaceUrlVar('loop', null);
			ytl.playlistAutoPlayCheck();
			return;
		}, false);
		
		return count;
	},
	
	setTimerPanel: function () {
		//
		var timer = document.createElement('div');
		timer.id = 'loop-panel-timer-container';
		timer.style.display = 'inline-block';
		timer.style.margin = '0 15px';
		timer.style.height = '40px';
		timer.style.lineHeight = '40px';
		timer.style.verticalAlign = 'middle';
		var timerCheckboxContainer = document.createElement('span');
		timerCheckboxContainer.className = 'yt-uix-form-input-checkbox-container';
		timerCheckboxContainer.style.margin = '0 4px';
		var timerCheckbox = document.createElement('input');
		timerCheckbox.type = 'checkbox';
		timerCheckbox.name = 'loop-timer-enable';
		timerCheckbox.className = 'yt-uix-form-input-checkbox';
		timerCheckbox.id = 'loop-timer-checkbox';
		var timerCheckboxElement = document.createElement('span');
		timerCheckboxElement.className = 'yt-uix-form-input-checkbox-element';
		timerCheckboxContainer.appendChild(timerCheckbox);
		timerCheckboxContainer.appendChild(timerCheckboxElement);
		var timerCheckboxLabel1 = document.createElement('label'),
			timerCheckboxLabel2 = document.createElement('label');
		timerCheckboxLabel1.setAttribute('for', 'loop-timer-checkbox');
		timerCheckboxLabel2.setAttribute('for', 'loop-timer-checkbox');
		timerCheckboxLabel1.innerText = ' ' + ytl.i18n('loop_for');
		timerCheckboxLabel2.innerText = ytl.i18n('minutes');
		var timerInput = document.createElement('input');
		timerInput.type = 'text';
		timerInput.id = 'loop-timer';
		timerInput.className = 'yt-uix-form-input-text';
		timerInput.style.cssText = 'width: 34px; text-align: center; border: 0; font-size: 1.2em';
		timerInput.value = 10;
		timerInput.maxlength = 4;
		
		timer.appendChild(timerCheckboxContainer);
		timer.appendChild(timerCheckboxLabel1);
		timer.appendChild(timerInput);
		timer.appendChild(timerCheckboxLabel2);
		
		var maxTimes = 1440;
		timerInput.addEventListener ('change', function() { 
			var t = Math.round(Number(timerInput.value));
			if (ytl.getOption('showPanel') && t>=0) {
				ytl.session['yt-loop-timer'] = t;
				ytl.storage['yt-loop-timer'] = t;
			}
			timerInput.value = ytl.getVariable('loopTimer');
			if (ytl.checkIf('intimer')) ytl.replaceUrlVar('timer', ytl.getVariable('loopTimer'));
			ytl.playlistAutoPlayCheck();
		}, false);
		
		timerInput.addEventListener ('keydown', function(e){ 
			var k = e.keyCode, t = Math.round(Number(timerInput.value));
			if(!ytl.getOption('showPanel')) return;
			if ( k == 38 || k == 40 ) {
				if ( k == 38 ) t += 1; else if ( k == 40 ) t-=1;
				if (t < 1) t = maxTimes;
				var timer = ( t>0 && t<=maxTimes ) ? t : 1
				ytl.session['yt-loop-timer'] = timer;
				ytl.storage['yt-loop-timer'] = timer;
				timerInput.value = ytl.getVariable('loopTimer').toFixed(0);
				if(ytl.checkIf('intimer')) ytl.replaceUrlVar('timer', ytl.getVariable('loopTimer'));
				ytl.playlistAutoPlayCheck();
			}
		}, false);
		
		timerInput.addEventListener ('mousewheel', function(e){ 
			if(!ytl.getOption('showPanel')) return;
			var t = Math.round(Number(timerInput.value));
			e.preventDefault();
			t += (e.wheelDelta / 120);
			t = t.toFixed(0);
			var timer = ( t>0 && t<=maxTimes ) ? t : 1;
			ytl.session['yt-loop-timer'] = timer;
			ytl.storage['yt-loop-timer'] = timer;
			
			timerInput.value = ytl.getVariable('loopTimer').toFixed(0);
			if(ytl.checkIf('intimer')) ytl.replaceUrlVar('timer', ytl.getVariable('loopTimer'));
			ytl.playlistAutoPlayCheck();
		}, false);
		
		timerCheckbox.addEventListener ('click', function() { 
			if(ytl.getOption('showPanel'))
			if(timerCheckbox.checked) { 
				ytl.session['yt-loop-intimer'] = true;
				ytl.storage['yt-loop-intimer'] = true;
				ytl.replaceUrlVar('timer', ytl.checkIf('intimer') ? ytl.getVariable('loopTimer') : null);
				ytl.playlistAutoPlayCheck();
				return;
			}
			ytl.session['yt-loop-intimer'] = false;
			ytl.storage['yt-loop-intimer'] = false;
			ytl.replaceUrlVar('timer', null);
			ytl.playlistAutoPlayCheck();
			return;
		}, false);
		
		return timer;
	},
	
	setEndPanel: function () {
		//
		var end = document.createElement('div');
		end.id = 'loop-panel-end-container';
		end.style.display = 'inline-block';
		end.style.margin = '0 18px';
		end.style.height = '40px';
		var countEndContainer = document.createElement('span');
		countEndContainer.id = 'loop-count-end';
		countEndContainer.className = 'yt-uix-button-group';
		countEndContainer.setAttribute('data-button-toggle-group', 'required');
		var countEndStopButton = document.createElement('button'),
			countEndPlayButton = document.createElement('button');
		countEndStopButton.id = 'loop-playlist-end-stop';
		countEndStopButton.style.height = '29px';
		countEndPlayButton.id = 'loop-playlist-end-play';
		countEndPlayButton.style.height = '29px';
		countEndStopButton.type = countEndPlayButton.type = 'button';
		countEndStopButton.role = countEndPlayButton.role = 'button';
		countEndStopButton.className = countEndPlayButton.className = 'yt-uix-button yt-uix-button-hh-text yt-uix-button-default yt-uix-button-short';
		countEndStopButton.className += ' start yt-uix-button-toggled';
		countEndPlayButton.className += ' end';
		countEndStopButton.setAttribute('data-button-toggle', 'true');
		countEndPlayButton.setAttribute('data-button-toggle', 'true');
		var countEndStopSpan = document.createElement('span'),
			countEndPlaySpan = document.createElement('span');
		countEndStopSpan.className = countEndPlaySpan.className = 'yt-uix-button-content';
		countEndStopSpan.innerText = ytl.i18n('stop_video');
		countEndPlaySpan.innerText = ytl.i18n('continue_to_play_playlist');
		countEndStopButton.appendChild(countEndStopSpan);
		countEndPlayButton.appendChild(countEndPlaySpan);
		countEndContainer.appendChild(countEndStopButton);
		countEndContainer.appendChild(countEndPlayButton);
		
		countEndStopButton.addEventListener ('click', function() { 
			if(ytl.getOption('showPanel')) if(ytl.checkIf('playlistExist')) { 
				ytl.session['yt-loop-playlist-endplay'] = false; 
				ytl.storage['yt-loop-playlist-endplay'] = false;
				countEndStopButton.style.fontWeight = 'bold';
				countEndPlayButton.style.fontWeight = 'normal';
				ytl.playlistAutoPlayCheck();
			}
			return;
		}, false);
		countEndPlayButton.addEventListener ('click', function() { 
			if(ytl.getOption('showPanel')) if(ytl.checkIf('playlistExist')) {
				ytl.session['yt-loop-playlist-endplay'] = true; 
				ytl.storage['yt-loop-playlist-endplay'] = true; 
				countEndStopButton.style.fontWeight = 'normal';
				countEndPlayButton.style.fontWeight = 'bold';
				ytl.playlistAutoPlayCheck();
			}
			return;
		}, false);
		
		end.appendChild(countEndContainer);
		return end;
	},
	
	setRangePanel: function (panel) {
		// Set Range Input
		var range = document.createElement('div');
		range.id = 'loop-panel-range-container';
		range.style.display = 'inline-block';
		range.style.margin = '0 15px';
		range.style.height = '40px';
		range.style.lineHeight = '40px';
		range.style.verticalAlign = 'middle';
		
		var rangeCheckboxContainer = document.createElement('span');
		rangeCheckboxContainer.className = 'yt-uix-form-input-checkbox-container';
		rangeCheckboxContainer.style.margin = '0 4px';
		var rangeCheckbox = document.createElement('input');
		rangeCheckbox.type = 'checkbox';
		rangeCheckbox.id = 'loop-range-checkbox';
		rangeCheckbox.name = 'loop-range-enable';
		rangeCheckbox.className = 'yt-uix-form-input-checkbox';
		rangeCheckboxContainer.appendChild(rangeCheckbox);
		var rangeCheckboxElement = document.createElement('span');
		rangeCheckboxElement.className = 'yt-uix-form-input-checkbox-element';
		rangeCheckboxContainer.appendChild(rangeCheckboxElement);
		var rangeCheckboxLabel1 = document.createElement('label'),
			rangeCheckboxLabel2 = document.createElement('label'),
			rangeCheckboxLabel3 = document.createElement('label'),
			rangeCheckboxLabel4 = document.createElement('label');
		rangeCheckboxLabel1.setAttribute('for', 'loop-range-checkbox');
		rangeCheckboxLabel2.setAttribute('for', 'loop-range-checkbox');
		rangeCheckboxLabel3.setAttribute('for', 'loop-range-checkbox');
		rangeCheckboxLabel4.setAttribute('for', 'loop-range-checkbox');
		rangeCheckboxLabel1.innerText = ' '+ytl.i18n('loop_in_portion_start');
		rangeCheckboxLabel2.innerText = ytl.i18n('from');
		rangeCheckboxLabel3.innerText = ytl.i18n('to');
		rangeCheckboxLabel4.innerText = ytl.i18n('loop_in_portion_end');
		var startTime = document.createElement('input'), 
			endTime = document.createElement('input');
		startTime.type = endTime.type = 'text';
		startTime.className = endTime.className = 'yt-uix-form-input-text';
		startTime.value = endTime.value = '0';
		startTime.style.cssText = endTime.style.cssText = 'width: 60px; text-align: center; border: 0; font-size: 1.2em';
		startTime.title = endTime.title = ytl.i18n('double_click_to_get_current_time');
		startTime.id = 'loop-start-time';
		endTime.id = 'loop-end-time';
		
		
		range.appendChild(rangeCheckboxContainer);
		range.appendChild(rangeCheckboxLabel1);
		range.appendChild(rangeCheckboxLabel2);
		range.appendChild(startTime);
		range.appendChild(rangeCheckboxLabel3);
		range.appendChild(endTime);
		range.appendChild(rangeCheckboxLabel4);
		
		/* L: Creating button(s) here */
		// Find better place to put
		// Set up CSS
		var setButtons = document.createElement('div');
		setButtons.id = 'set-buttons-div';
		setButtons.style.margin = "20px 0 10px";
		
		var startButton = document.createElement('input'),
			endButton = document.createElement('input'),
			loopButton = document.createElement('input');
		startButton.type = endButton.type = loopButton.type = 'button';
		startButton.className = endButton.className = loopButton.className = 'yt-uix-set-button';
		var butt_atr = 'padding: 10px 15px; font-size: 18px; margin: auto;';
		startButton.setAttribute('style', butt_atr);
		endButton.setAttribute('style', butt_atr);
		loopButton.setAttribute('style', butt_atr);
		startButton.value = 'Set Start';
		endButton.value = 'Set End';
		loopButton.value = 'Break Loop';
		startButton.id = 'start-button';
		endButton.id = 'end-button';
		loopButton.id = 'loop-button';
		endButton.style.display = loopButton.style.display = 'none';
		startButton.style.display = 'block';
		
		/* L: Add buttons to setButtons */
		setButtons.appendChild(startButton);
		setButtons.appendChild(endButton);
		setButtons.appendChild(loopButton);
		
		// Set Range Slider
		var slider = document.createElement('div');
		slider.id = 'loop-range-slider';
		slider.style.height = '10px';
		slider.style.position = 'relative';
		slider.style.background = '#2A2A2A';
		slider.style.WebkitUserSelect = 'none';
		var bar = document.createElement('div');
		bar.id = 'loop-range-bar';
		bar.setAttribute('style', 'position: relative; z-index: 9; width: auto; height: 100%; margin-left: 0; margin-right: 0;  right: initial;');
		bar.style.background = '#757575';
		bar.title = ytl.i18n('double_click_to_start_loop_in_portion');
		var selectorStyle = 'background: no-repeat url(https://s.ytimg.com/yts/imgbin/player-common-vflGpPVmw.png) -54px -135px; height: 17px; width: 16px; position: absolute; z-index: 10; left: initial; cursor: pointer;';
		var startPoint = document.createElement('div');
		//startPoint.className = 'html5-scrubber-button';
		startPoint.setAttribute('style', selectorStyle);
		startPoint.style.left = '-'+parseInt(startPoint.style.width)/2+'px';
		startPoint.style.top = '-'+parseInt(startPoint.style.height)/4+'px';
		var endPoint = document.createElement('div');
		//endPoint.className = 'html5-scrubber-button';
		endPoint.setAttribute('style', selectorStyle);
		endPoint.style.right = '-'+parseInt(endPoint.style.width)/2+'px';
		endPoint.style.top = '-'+parseInt(endPoint.style.height)/4+'px';
		
		var arrow_style = 'left: 22px; top: -5px; border-bottom: 5px solid rgba(22, 22, 22, 0.8); border-left: 5px solid transparent; border-right: 5px solid transparent; position: absolute;';
		var arrow_start = document.createElement('div');
		arrow_start.setAttribute('style', arrow_style);
		var arrow_end = document.createElement('div');
		arrow_end.setAttribute('style', arrow_style);
		var timestamp_style = 'display: block; width: 50px; height: 20px; margin: 0; padding: 0; font-size: 11px; line-height: 20px; color: #E3E3E3; text-align: center; border: 0; background: transparent; outline: none; cursor: pointer; -webkit-user-select: none; user-select: none;';
		var timestamp_start = document.createElement('input');
		var timestamp_end = document.createElement('input');
		timestamp_start.type = timestamp_end.type = 'text';
		timestamp_start.className = timestamp_end.className = 'html5-progress-tooltip-timestamp';
		timestamp_start.value = timestamp_end.value = '00:00';
		timestamp_start.disabled = timestamp_end.disabled = 'true';
		timestamp_start.id = 'loop-range-start-time';
		timestamp_start.setAttribute('style', timestamp_style);
		timestamp_end.id = 'loop-range-end-time';
		timestamp_end.setAttribute('style', timestamp_style);
		var tooltip_style = 'position: absolute; width: 50px; height: 20px; background-color: rgba(22, 22, 22, 0.8); border-radius: 4px; margin: 0; padding: 2px; overflow: visible; cursor: pointer;';
		var tooltip_start = document.createElement('div');
		var tooltip_end = document.createElement('div');
		tooltip_start.setAttribute('style', tooltip_style);
		tooltip_end.setAttribute('style', tooltip_style);
		tooltip_start.title = tooltip_end.title = ytl.i18n('double_click_to_get_current_time');
		tooltip_start.className = tooltip_end.className = 'html5-progress-tooltip';
		tooltip_start.style.top = tooltip_end.style.top = '16px';
		tooltip_start.appendChild(arrow_start);
		tooltip_start.appendChild(timestamp_start);
		tooltip_end.appendChild(arrow_end);
		tooltip_end.appendChild(timestamp_end);
		tooltip_start.style.left = '-27px';
		tooltip_end.style.left = 'initial';
		tooltip_end.style.right = '-27px';
		
		bar.appendChild(startPoint);
		bar.appendChild(tooltip_start);
		bar.appendChild(endPoint);
		bar.appendChild(tooltip_end);
		slider.appendChild(bar);
		
		var sliderContainer = document.createElement('div');
		sliderContainer.id = 'loop-panel-slider-container';
		sliderContainer.style.paddingTop = '4px';
		// sliderContainer.style.margin = '0 25px 30px';
		sliderContainer.style.margin = '0 0 30px';
		sliderContainer.appendChild(slider);
		
		// Add to Panel
		// L: Hide other stuff
		range.style.display = 'none';
		if (panel) {
			panel.appendChild(range); 
			// L: Add buttons
			panel.appendChild(setButtons);
			panel.appendChild(sliderContainer); 
		} else return false;

		// Event for input start time (change, key, mouse wheel)
		startTime.addEventListener('change', function(){
			var duration = ytl.getVariable('duration'), t = ytl.getVariable('input-starttime');
			if(t<0) { startTime.value = ytl.getTime(0); ytl.replaceUrlVar('start', ytl.getVariable(0)); return; }
			if(t>=duration) { startTime.value = ytl.getTime(ytl.getVariable('starttime')); ytl.replaceUrlVar('start', ytl.getTime(ytl.getVariable('starttime'))); return; }
			if (ytl.getOption('showPanel') && t<ytl.getVariable('endtime')) {
				ytl.setVariable('starttime', t);
			}
			startTime.value = ytl.getTime(ytl.getVariable('starttime'));
			if(ytl.checkIf('inrange')) ytl.replaceUrlVar('start', ytl.getTime(ytl.getVariable('starttime')));
			ytl.sliderDisplay();
		}, false);
		
		startTime.addEventListener ('keydown', function(e){ 
		var k = e.keyCode, t = ytl.getVariable('starttime');
		if(!ytl.getOption('showPanel')) return;
		if ( k == 38 || k == 40 ) {
			if ( k == 38 ) t += 1; else if ( k == 40 ) t-=1;
			if ( t<ytl.getVariable('endtime') && t>=0 ) {
				ytl.setVariable('starttime', t);
			}
			startTime.value = ytl.getTime(ytl.getVariable('starttime'));
			if(ytl.checkIf('inrange')) ytl.replaceUrlVar('start', ytl.getTime(ytl.getVariable('starttime')));
			ytl.sliderDisplay();
		}
		}, false);
		
		startTime.addEventListener ('mousewheel', function(e){ 
			if(!ytl.getOption('showPanel')) return;
			var t = ytl.getVariable('starttime');
			e.preventDefault();
			t = t + (e.wheelDelta / 120);
			if ( t<ytl.getVariable('endtime') && t>=0 ) {
				ytl.setVariable('starttime', t);
			}
			startTime.value = ytl.getTime(ytl.getVariable('starttime'));
			if(ytl.checkIf('inrange')) ytl.replaceUrlVar('start', ytl.getTime(ytl.getVariable('starttime')));
			ytl.sliderDisplay();
		}, false);

		// Event for input end time (change, key, mouse wheel)
		endTime.addEventListener('change', function(){
			var duration = ytl.getVariable('duration'), t = ytl.getVariable('input-endtime');
			if(t<0) { endTime.value = ytl.getTime(ytl.getVariable('endtime')); ytl.replaceUrlVar('end', ytl.getTime(ytl.getVariable('endtime'))); return; }
			if(t>=duration) t = duration;
			if (ytl.getOption('showPanel') && t>ytl.getVariable('starttime')) {
				ytl.setVariable('endtime', t);
			}
			endTime.value = ytl.getTime(ytl.getVariable('endtime'));
			if(ytl.checkIf('inrange')) ytl.replaceUrlVar('end', ytl.getTime(ytl.getVariable('endtime')));
			ytl.sliderDisplay();
		}, false);
		
		endTime.addEventListener('click', function(){
			if (isNaN(ytl.getVariable('endtime'))) {
				ytl.setVariable('endtime', Number(ytl.getVariable('duration')).toFixed(0));
				endTime.value = ytl.getTime(ytl.getVariable('endtime'));
				if(ytl.checkIf('inrange')) ytl.replaceUrlVar('end', ytl.getTime(ytl.getVariable('endtime')));
				ytl.sliderDisplay();
			}
			return;
		}, false);
		
		endTime.addEventListener ('keydown', function(e){ 
		var k = e.keyCode, t = ytl.getVariable('endtime');
		if(!ytl.getOption('showPanel')) return;
		if ( k == 38 || k == 40 ) {
			if ( k == 38 ) t += 1; else if ( k == 40 ) t-=1;
			if ( t<=ytl.getVariable('duration') && t>ytl.getVariable('starttime') ) {
				ytl.setVariable('endtime', t);
			}
			endTime.value = ytl.getTime(ytl.getVariable('endtime'));
			if(ytl.checkIf('inrange')) ytl.replaceUrlVar('end', ytl.getTime(ytl.getVariable('endtime')));
			ytl.sliderDisplay();
		}
		}, false);
		
		endTime.addEventListener ('mousewheel', function(e){ 
			if(!ytl.getOption('showPanel')) return;
			var t = ytl.getVariable('endtime');
			e.preventDefault();
			t = t + (e.wheelDelta / 120);
			if ( t<=ytl.getVariable('duration') && t>ytl.getVariable('starttime') ) {
				ytl.setVariable('endtime', t);
			}
			endTime.value = ytl.getTime(ytl.getVariable('endtime'));
			if(ytl.checkIf('inrange')) ytl.replaceUrlVar('end', ytl.getTime(ytl.getVariable('endtime')));
			ytl.sliderDisplay();
		}, false);

		// Event for Slider Actions
		startPoint.addEventListener('mousedown', function () {
			window.addEventListener('mousemove', movingStartTime, false);
		}, false);
		endPoint.addEventListener('mousedown', function (){
			window.addEventListener('mousemove', movingEndTime, false);
		}, false);
		tooltip_start.addEventListener('mousedown', function () {
			window.addEventListener('mousemove', movingStartTime, false);
		}, false);
		tooltip_end.addEventListener('mousedown', function (){
			window.addEventListener('mousemove', movingEndTime, false);
		}, false);
		window.addEventListener('mouseup', stopMove, false);
		
		function stopMove(event){
			window.removeEventListener('mousemove', movingStartTime, false);
			window.removeEventListener('mousemove', movingEndTime, false);
			if(ytl.checkIf('inrange')) ytl.replaceUrlVar('start', ytl.getTime(ytl.getVariable('starttime')));
			if(ytl.checkIf('inrange')) ytl.replaceUrlVar('end', ytl.getTime(ytl.getVariable('endtime')));
			ytl.sliderDisplay();
		}
		
		function movingStartTime(event){
			// Function for moving start time in slider
			startPoint.style.zIndex = 11;
			endPoint.style.zIndex = 10;
			tooltip_start.style.zIndex = 11;
			tooltip_end.style.zIndex = 10;
			var duration = ytl.getVariable('duration'),
				pos = (((event.pageX-slider.offsetLeft-ytl.panel.offsetParent.offsetParent.offsetLeft) / slider.offsetWidth) * 100 ).toFixed(4);
			if ( pos < 0 || pos > 100 ) return false;
			if ( parseInt(pos)+parseInt(bar.style.marginRight) > 99 ) return false;
			t = (parseInt(pos)/100*duration).toFixed(0);
			ytl.setVariable('starttime', t);
			ytl.sliderDisplay();
		}
		
		function movingEndTime(event){
			// Function for moving end time in slider
			startPoint.style.zIndex = 10;
			endPoint.style.zIndex = 11;
			tooltip_start.style.zIndex = 10;
			tooltip_end.style.zIndex = 11;
			var duration = ytl.getVariable('duration'),
				pos = (((slider.offsetWidth-event.pageX+slider.offsetLeft+ytl.panel.offsetParent.offsetParent.offsetLeft) / slider.offsetWidth) * 100 ).toFixed(4);
			if ( pos < 0 || pos > 100 ) return false;
			if ( parseInt(pos)+parseInt(bar.style.marginLeft) > 99 ) return false;
			t = ((1-parseInt(pos)/100)*duration).toFixed(0);
			ytl.setVariable('endtime', t);
			ytl.sliderDisplay();
		}
		
		// Event to get current time
		function startTimeGetCurrent (e){
			e.stopPropagation();
			// L: Modified to reset endtime
			ytl.setVariable('endtime', Number(ytl.getVariable('duration')).toFixed(0));
			var t = Math.floor(ytl.getVariable('currenttime'));
			if (ytl.getOption('showPanel')&&t<ytl.getVariable('endtime')) {
				ytl.setVariable('starttime', t);
			}
			if(ytl.checkIf('inrange')) ytl.replaceUrlVar('start', ytl.getTime(ytl.getVariable('starttime')));
			ytl.sliderDisplay();
		}
		
		function endTimeGetCurrent (e){
			e.stopPropagation();
			var t = Math.floor(ytl.getVariable('currenttime'));
			if (ytl.getOption('showPanel')&&t>ytl.getVariable('starttime')) {
				ytl.setVariable('endtime', t);
			}
			if(ytl.checkIf('inrange')) ytl.replaceUrlVar('end', ytl.getTime(ytl.getVariable('endtime')));
			ytl.sliderDisplay();
			
			// L: Then make a loop div - could be trouble if there's an unexpected way to call func
			createLoopDiv();
		}
        
        // L: Add functions to appropriately switch buttons ~~~~~~~~~~~~~~~~~~~~***************~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        // thebuttons - %%
		// Consider having this take in a var, maybe problems with async?
        function updateButton (){
            var bstate = ytl.getVariable('buttonState');
			// clear button container
            // Set up button for appropriate state
			
			// Get setButtons
			// Can I rely on order?
			var itemDivs = document.getElementById('set-buttons-div').children;
			for(var i = 0; i < itemDivs.length; i++) {   
				if(i == bstate) {
					itemDivs[i].style.display = 'block';   
				}
				else {
					itemDivs[i].style.display = 'none'; 
				}
			}
            return;
        }
        
        function switchButtons (e){
            // Not sure if this is necessary, might break non-click calls
            e.stopPropagation();
            // Need a state variable, maybe in session?
            var bstate = ytl.getVariable('buttonState');
			// console.log("button press: " + bstate);
            console.log("pressed '" + document.getElementById('set-buttons-div').children[bstate].value + "' @ "+ ytl.getVariable('currenttime'));
			// 0, 1, 2
			var nstate = (bstate+1) % 3;
			// Check nstate
			ytl.session['yt-button-state'] = nstate;
			updateButton();
            return;
        }
        
		/* L: When endtime is double clicked it is set as current time */
		startTime.addEventListener('dblclick', startTimeGetCurrent, false);
		tooltip_start.addEventListener('dblclick', startTimeGetCurrent, false);
		endTime.addEventListener('dblclick', endTimeGetCurrent, false);
		tooltip_end.addEventListener('dblclick', endTimeGetCurrent, false);
		// L: Now with buttons!
		// End gets reset at beginning set
		startButton.addEventListener('click', startTimeGetCurrent, false);
		endButton.addEventListener('click', endTimeGetCurrent, false);
		
		startButton.addEventListener('click', switchButtons, false);
		endButton.addEventListener('click', switchButtons, false);
		loopButton.addEventListener('click', switchButtons, false);
        
        // L: Add event listeners to switch buttons on click
        
        function createLoopDiv() {
            // L: Save loop when it is broken, then clear
            // create div with an id
            //console.log('creating loop with loopnum: '+ytl.session['loop-num']);
            var loopnum = ytl.session['loop-num'];
            ytl.session['loop-num'] = Number(ytl.session['loop-num']) + 1;
            var myloop = document.createElement('div');
            myloop.id = 'loop-'+loopnum;
            myloop.innerText = 'Loop #'+loopnum+': '+ytl.getTime(ytl.getVariable('starttime'))+' - '+ytl.getTime(ytl.getVariable('endtime'));
            myloop.dataset.starttime = ytl.getVariable('starttime');
            myloop.dataset.endtime = ytl.getVariable('endtime');
            // add info from getTime
            // add a name
            // append to loopsdiv
            document.getElementById('loops-div').appendChild(myloop);
			
			console.log(myloop.id+": "+myloop.dataset.starttime+" - "+myloop.dataset.endtime);
            
            //add event listener for when clicked
            myloop.addEventListener('click', function(e) {
				console.log("loop clicked: " + myloop.id);
				ytl.setVariable('starttime', myloop.dataset.starttime);
				ytl.setVariable('endtime', myloop.dataset.endtime);
				ytl.session['yt-button-state'] = 2;
				startLoop();
				rangeCheckbox.checked = true;
				updateButton();
				return;
			}, false);
            return;
        };
		
		// Event for toggle loop-in-range
		// L: Made this its own function
		
		function startLoop (){
			ytl.session['yt-loop-inrange'] = true;
			ytl.replaceUrlVar('start', ytl.getTime(ytl.getVariable('starttime')));
			ytl.replaceUrlVar('end', ytl.getTime(ytl.getVariable('endtime')));
			ytl.sliderDisplay();
			ytl.loopAction();
			return;
		}
		
		function toggleLoop (e) {
			e.stopPropagation();
			if(ytl.getOption('showPanel'))
			if(rangeCheckbox.checked){
				startLoop();
				return;
			}
			//console.log("breaking loop from: ");
            //createLoopDiv(); - moved to when loop is broken
            
			ytl.session['yt-loop-inrange'] = false;
			ytl.replaceUrlVar('start', null);
			ytl.replaceUrlVar('end', null);
			ytl.sliderDisplay();
			return;
		}
		// L: Same thing as toggling checked then calling toggleLoop
		rangeCheckbox.addEventListener('click', toggleLoop, false);
		
		loopButton.addEventListener('click', function(e) {
			rangeCheckbox.checked = !rangeCheckbox.checked;
			toggleLoop(e);
			return;
		}, false);
		
		startButton.addEventListener('click', function(e) {
			rangeCheckbox.checked = !rangeCheckbox.checked;
			toggleLoop(e);
			return;
		}, false);
		
		slider.addEventListener('dblclick', function(e) {
			e.stopPropagation(); e.preventDefault();
			if(ytl.getOption('showPanel'))
			if(ytl.checkIf('inrange') == false){
				ytl.session['yt-loop-inrange'] = true;
				ytl.replaceUrlVar('start', ytl.getTime(ytl.getVariable('starttime')));
				ytl.replaceUrlVar('end', ytl.getTime(ytl.getVariable('endtime')));
				ytl.loopAction();
				ytl.sliderDisplay();
				return;
			}
			ytl.session['yt-loop-inrange'] = false;
			ytl.replaceUrlVar('start', null);
			ytl.replaceUrlVar('end', null);
			ytl.sliderDisplay();
			return;
		}, false);
	},
	
	sliderDisplay: function () {
		if(!ytl.slider||!ytl.sliderBar) return false;
		var duration = ytl.getVariable('duration'),
			starttime = ytl.getVariable('starttime'),
			endtime = ytl.getVariable('endtime');
		ytl.sliderBar.style.marginLeft = (starttime/duration*100).toFixed(4) + '%';
		ytl.sliderBar.style.marginRight = ((1-(endtime/duration))*100).toFixed(4) + '%';
		ytl.sliderBar.style.background = ytl.checkIf('inrange') ? '#B91F1F' : '#757575' ;
		document.getElementById('loop-range-checkbox').checked = ytl.checkIf('inrange');
		document.getElementById('loop-start-time').value = ytl.getTime(starttime);
		document.getElementById('loop-end-time').value = ytl.getTime(endtime);
		document.getElementById('loop-range-start-time').value = ytl.getTime(starttime);
		document.getElementById('loop-range-end-time').value = ytl.getTime(endtime); 
	},
	
	setPanel: function() {
		if(ytl.panel && document.getElementById('action-panel-loop')) return;
		if(ytl.panelContainer==null) return;
		if (document.getElementById('action-panel-loop')) {
			document.getElementById('action-panel-loop').remove();
		}
		var content = document.createElement('div');
		// L: This is where we set our panel in the page - thepage
		var p = ytl.panelContainer.childNodes[0]; // SUPER hack -- the fourth child is the 'content' pane, which we want to insert the timeline before - set to 4
			content.setAttribute('id', 'action-panel-loop');
			content.setAttribute('class', 'action-panel-content hid');
			content.setAttribute('data-panel-loaded', 'true');
			if (ytl.layout == '2014') {
				//content.style.padding = '14px 20px';
				content.style.padding = 0;
			} else {
				//content.style.padding = '24px 35px 32px';
				content.style.padding = 0;
				content.style.width = '568px';
				if(document.getElementById('watch7-secondary-actions'))
				document.getElementById('watch7-secondary-actions').addEventListener('click', function(){
					if(!ytl.panel.className.match('hid')) ytl.panel.className += ' hid';
					ytl.panel.style.display = 'none';
					ytl.panelDisplay('isfalse');
				});
			}
			if(document.getElementById('watch-like'))
			document.getElementById('watch-like').addEventListener('click', function(){
				if(!ytl.panel.className.match('hid')) ytl.panel.className += ' hid';
				ytl.panel.style.display = 'none';
				ytl.panelDisplay('isfalse');
			});
		
		var option = document.createElement('div');
		option.id = 'loop-panel-optionslink-container';
		option.style.position = 'absolute';
		if (ytl.layout == '2014') {
			option.style.right = '34px';
			option.style.top = '12px';
		} else {
			option.style.right = '20px';
			option.style.top = '8px';
		}
		var optionsLink = document.createElement('a');
		optionsLink.setAttribute('id', 'options-page-link');
		optionsLink.setAttribute('href', ytl.optionPage);
		optionsLink.setAttribute('target', '_blank');
		optionsLink.style.color = '#999';
		optionsLink.innerText = ytl.i18n('options');
		if(ytl.optionPage && !inIncognito) option.appendChild(optionsLink);
		
		var space = document.createElement('div');
		space.style.clear = 'both';
		
		var tipsContainer = document.createElement('div');
		tipsContainer.id = 'loop-panel-tips-container';
		tipsContainer.style.textAlign = 'center';
        // L: Hiding this
        ytl.storage['ytl-hide-information'] = 'true';
		if (ytl.optionPage && !inIncognito && ytl.storage['ytl-hide-information'] != 'true') {
			var tipsSpace = document.createElement('div');
			if (ytl.layout == '2014') {
				tipsSpace.style.height = '12px';
			} else {
				tipsSpace.style.height = '18px';
			}
			tipsContainer.appendChild(tipsSpace);
			var tipsContent = document.createElement('div');
			tipsContent.style.lineHeight = '16px';
			var tipsLink = document.createElement('a');
			tipsLink.setAttribute('href', ytl.optionPage);
			tipsLink.setAttribute('target', '_blank');
			tipsLink.style.color = '#A9382E';
			tipsLink.innerText = '** ' + ytl.i18n('information');
			var tipsHide = document.createElement('a');
			tipsHide.style.color = '#999';
			tipsHide.innerText = '(' + ytl.i18n('hide_info') + ')';
			tipsHide.addEventListener('click', function() {
				ytl.storage['ytl-hide-information'] = true;
				tipsContainer.style.display = 'none';
			});
			tipsContent.appendChild(tipsLink);
			tipsContent.appendChild(document.createTextNode('  '));
			tipsContent.appendChild(tipsHide);
			tipsContainer.appendChild(tipsContent);
            // L: hide this - set "ytl-hide-information" instead
            // tipsContainer.style.display = 'none';
		}
		
		content.appendChild(option);
		content.appendChild(ytl.setInfoPanel());
		content.appendChild(ytl.setCountInputPanel());
		//content.appendChild(ytl.setTimerPanel());
		content.appendChild(ytl.setEndPanel());
		ytl.setRangePanel(content);
		content.appendChild(space);
		content.appendChild(tipsContainer);
		p.parentNode.insertBefore(content, p);

		// L: ADDING DIV for keeping track of loops
        // theloops
		if (document.getElementById('loops-div')) {
			document.getElementById('loops-div').remove();
		}
		var loopsDiv = document.createElement('div');
		loopsDiv.setAttribute('id', 'loops-div');
		//loopsDiv.innerHTML = '<b>Hello this is logan div</b> <div id="logan-subdiv-1">a subdiv inside</div>';
		p.parentNode.insertBefore(loopsDiv, p);

		ytl.panel = document.getElementById('action-panel-loop');
		ytl.slider = document.getElementById('loop-range-slider');
		ytl.sliderBar = document.getElementById('loop-range-bar');
	},

	setQuality: function (args) {
		var setQualityCount = 0;
		sessionStorage['loadVideoById'] = args && args.loadVideoById == true ? true : false;
		ytl.setQualityAction = function() {
			if (ytl.player == null) return false;
			if (ytl.getVariable('quality') == false) return false;
			if (ytl.isDebug) ytl.log('Quality before setQuality:', ytl.getVariable('quality'), setQualityCount);
			clearTimeout(ytl.setQualityAction);
			var setQualityAs = '';
			if (ytl.getOption('quality')) {
				setQualityAs = ytl.getOption('quality');
				if (setQualityAs != "default") {
					if ( ytl.qualityLevels.indexOf(ytl.getVariable('highestQuality')) > ytl.qualityLevels.indexOf(ytl.getOption('quality')) ) {
						// Set the highest quality available
						setQualityAs = ytl.getVariable('highestQuality');
					} else if ( ytl.qualityLevels.indexOf(ytl.getVariable('lowestQuality')) < ytl.qualityLevels.indexOf(ytl.getOption('quality')) ) {
						// Set the lowest quality available
						setQualityAs = ytl.getVariable('lowestQuality');
					}
					if ( ytl.qualityLevels.indexOf(ytl.getVariable('quality')) < ytl.qualityLevels.indexOf(ytl.getOption('quality')) ) {
						// Quality willing to set is worse than current quality
						// As-of Sept-2014, YouTube unable to handle this quality change
						// use loadVideoById as a workaround
						sessionStorage['loadVideoById'] = true;
					}
				}
			}
			ytl.session['yt-quality-set'] = setQualityAs;
			
			if (setQualityAs == false) {
				if (ytl.isDebug) ytl.log('Error: invalid quality level');
				if (ytl.getVariable('availableQuality').indexOf(ytl.getOption('quality')) > 0) {
					setQualityAs = ytl.getOption('quality');
					ytl.session['yt-quality-set'] = setQualityAs;
				} else {
					clearTimeout(ytl.setQualityAction);
					setQualityCount = 0;
					return false;
				}
			} else if (setQualityAs == ytl.getVariable('quality')) {
				// Nothing to do
				if (ytl.isDebug) ytl.log('PlaybackQuality Done.');
				clearTimeout(ytl.setQualityAction);
				setQualityCount = 0;
				return true;
			}
			
			if (sessionStorage['loadVideoById'] == "true" && setQualityCount < 1) {
				// Using loadVideoById API to reload video in certain quality
				sessionStorage['loadVideoById'] = false;
				if (typeof ytl.player.loadVideoById === 'function' && typeof ytl.player.getVideoData === 'function' && ytl.player.getVideoData().video_id) {
					var setTimeAs = 0;
					if (ytl.getVariable('currenttime') && parseInt(ytl.getVariable('currenttime')) > 0) {
						setTimeAs = parseInt(ytl.getVariable('currenttime'));
					} else {
						if (ytl.isDebug) ytl.log('Unable to get current time:', ytl.getVariable('currenttime'));
						setTimeAs = 1;
					}
					if (ytl.player.getPlaylistId() != null) {
						// In playlist
						/*
						if (ytl.isDebug) ytl.log('Set Quality using loadPlaylist:', setQualityAs);
						ytl.player.loadPlaylist({
							list: ytl.player.getPlaylistId(), 
							index: ytl.player.getPlaylistIndex(), 
							startSeconds: setTimeAs,
							suggestedQuality: setQualityAs
						});*/
					} else {
						if (ytl.isDebug) ytl.log('Set Quality using loadVideoById:', setQualityAs);
						ytl.player.loadVideoById(ytl.player.getVideoData().video_id, setTimeAs, setQualityAs);
					}
				} else {
					if (ytl.isDebug) ytl.log('Error: unable to set Playback Quality using loadVideoById api');
				}
				setTimeout(ytl.setQualityAction, 1000);
			} else if (setQualityCount > 5) {
				clearTimeout(ytl.setQualityAction);
				if (ytl.isDebug) ytl.log('Stop trying to set Playback Quality');
				setQualityCount = 0;
			} else {
				if (typeof ytl.player.setPlaybackQuality === 'function' && typeof ytl.player.getPlayerState === 'function' && ytl.player.getPlayerState() != -1) {
					if (ytl.isDebug) ytl.log('Set Quality using setPlaybackQuality:', setQualityAs);
					ytl.player.setPlaybackQuality(setQualityAs);
					
					if ( ytl.qualityLevels.indexOf(ytl.getVariable('highestQuality')) < ytl.qualityLevels.indexOf(ytl.getVariable('quality'))
						&& ytl.qualityLevels.indexOf(ytl.getVariable('lowestQuality')) > ytl.qualityLevels.indexOf(ytl.getVariable('quality'))
						&& (ytl.getOption('quality') != "default")
						&& (ytl.getOption('quality') != ytl.getVariable('quality'))
					) {
						
					} else if (ytl.getVariable('availableQuality').indexOf(setQualityAs) > 0 && setQualityAs != ytl.getVariable('quality')) {
						// Quality willing to set is available but not set
					} else {
						// Success
						if (ytl.isDebug) ytl.log('PlaybackQuality Done.');
						clearTimeout(ytl.setQualityAction);
						setQualityCount = 0;
					}
				} else {
					if (ytl.isDebug) ytl.log('Error: missing PlaybackQuality function');
				}
				setTimeout(ytl.setQualityAction, 1000);
			}
			
			if (ytl.isDebug) ytl.log('Quality after setQuality:', ytl.getVariable('quality'));
			setQualityCount++;
		}
		ytl.setQualityAction();
	},
	
	setPlayerSize: function(e) {
		if (ytl.player==null) return false;
		
		var _body = document.getElementById('body');
		var _page = document.getElementById('page');
		var _container = document.getElementById('watch7-container');
		var _player = document.getElementById('player-legacy') || document.getElementById('player');
		
		if (_body==null) return false;
		if (_player==null) return false;
		if (_container==null) return false;
		if (ytl.getOption('playerSizeEnable') != true ) return false;

		_page.className = _page.className.replace(/( )?watch-(non-)?stage-mode/, '');
		_container.className = _container.className.replace(/( )?watch-wide/, '');
		_player.className = _player.className.replace(/( )?watch-medium/, '').replace(/( )?watch-large/, '').replace(/( )?watch-small/, '').replace(/( )?watch-full/, '');
		if (document.getElementsByClassName('html5-video-container').length > 0) {
			document.getElementsByClassName('html5-video-container')[0].style.width = 'initial';
		}
		if (document.getElementsByClassName('video-annotations').length > 0) {
			document.getElementsByClassName('video-annotations')[0].style.WebkitTransform = 'initial';
		}
		
		if (ytl.checkIf('playlist-queue')) {
			_page.className += ' watch-non-stage-mode';
			_player.className += ' watch-small';
			document.cookie = "wide=0; path=/; domain=.youtube.com";
			setTimeout(function(){document.body.dataset.playerSize = 'small';}, 500);
			return;
		}
		if (ytl.getOption('playerSize') == 'normal') {
			_page.className += ' watch-non-stage-mode';
			_player.className += ' watch-small';
			document.cookie = "wide=0; path=/; domain=.youtube.com";
			setTimeout(function(){document.body.dataset.playerSize = 'small';}, 500);
		} else if (ytl.getOption('playerSize') == 'wide' || ytl.getOption('playerSize') == 'wider' || ytl.getOption('playerSize') == 'fullsize') {
			_page.className += ' watch-stage-mode';
			if (_container.className.match('watch-wide') == null)
				_container.className += ' watch-wide';
			if (ytl.getOption('playerSize') == 'fullsize' && _player.className.match('watch-full') == null) {
				_player.className += ' watch-full';
				if (_player.className.match('watch-large') == null)
					_player.className += ' watch-large';
				setTimeout(function(){
					if (document.getElementsByClassName('html5-video-container').length > 0 && document.getElementsByClassName('video-stream').length > 0) {
						if (document.getElementsByTagName('html')[0].getAttribute('data-player-size') != 'fullscreen') {
							document.getElementsByClassName('html5-video-container')[0].style.width = document.getElementsByClassName('video-stream')[0].offsetWidth + 'px';
						}
					}
					if (document.getElementsByClassName('video-annotations').length > 0 && document.getElementsByClassName('video-stream').length > 0) {
						if (document.getElementsByTagName('html')[0].getAttribute('data-player-size') != 'fullscreen') {
							var predictVideoHeight = ( document.getElementsByClassName('video-stream')[0].offsetWidth / parseInt(document.getElementsByClassName('video-stream')[0].style.width) ) * parseInt(document.getElementsByClassName('video-stream')[0].style.height);
							var VideoHeight = predictVideoHeight;
							var offsetVideoHeight = document.getElementsByClassName('video-stream')[0].offsetHeight;
							if (offsetVideoHeight > (predictVideoHeight / 2)) {
								document.getElementsByClassName('video-annotations')[0].style.top = ((offsetVideoHeight - predictVideoHeight) / 2) + 'px';
							} else {
								document.getElementsByClassName('video-annotations')[0].style.top = 'initial';
								VideoHeight = document.getElementsByClassName('video-stream')[0].offsetHeight;
							}
							document.getElementsByClassName('video-annotations')[0].style.WebkitTransform = 'scale(' + (document.getElementsByClassName('video-stream')[0].offsetWidth/parseInt(document.getElementsByClassName('video-stream')[0].style.width)) + ',' + (VideoHeight/parseInt(document.getElementsByClassName('video-stream')[0].style.height)) + ')';
							document.getElementsByClassName('video-annotations')[0].style.width = 'initial';
						}
					}
				}, 100);
			}
			if (ytl.getOption('playerSize') == 'wider' && _player.className.match('watch-large') == null)
				_player.className += ' watch-large';
			if (ytl.getOption('playerSize') == 'wide' && _player.className.match('watch-medium') == null)
				_player.className += ' watch-medium';
			document.cookie = "wide=1; path=/; domain=.youtube.com";
			setTimeout(function(){document.body.dataset.playerSize = 'large';}, 500);
		}
	},
	
	windowResizedAction: function (e) {
		if (e && e.type && e.type == 'resize') {
			if (ytl.session['yt-player-size'] == 'normal') return false;
			ytl.setPlayerSize();
			ytl.log('Window is resized, set player size again.');
		}
	},
	
	observePlayerSize: function (mutation) {
		if (mutation && mutation.target && mutation.target.getAttribute('id') == 'player') {
			var _currentSize;
			if (mutation.target.className.match('watch-small') != null) {
				_currentSize = 'normal';
			} else if (mutation.target.className.match('watch-full') != null) {
				_currentSize = 'fullsize';
			} else if (mutation.target.className.match('watch-large') != null) {
				_currentSize = 'wider';
			} else if (mutation.target.className.match('watch-medium') != null) {
				_currentSize = 'wide';
			} else {
				_currentSize = 'normal';
			}
			ytl.session['yt-player-size'] = _currentSize;
		}
	},
	
	setAutoLoop: function () {
		var autoLoopInterval = setInterval(function() {
			if (ytl.player==null) return false;
			if (!ytl.button||!ytl.buttonicon) return false;
			// reset button varables
			ytl.buttonicon.childNodes[0].innerText = '';
			ytl.buttonicon.childNodes[0].style.display = 'none';
			// 
			clickButton = false;
			if (ytl.getOption('saveStateLoop')) {
				ytl.log('SaveStateLoop - Check');
				if (ytl.checkIf('inloop') != ytl.checkIf('inloopPrevious')) {
					clickButton = true;
					if (ytl.checkIf('playlist-endplayPrevious')) {
						if (ytl.checkIf('incountPrevious')) {
							ytl.session['yt-loop-incount'] = true;
							ytl.session['yt-loop-count'] = ytl.getVariable('loopCountPrevious');
						}
						if (ytl.checkIf('intimerPrevious')) {
							ytl.session['yt-loop-intimer'] = true;
							ytl.session['yt-loop-timer'] = ytl.getVariable('loopTimerPrevious');
						}
					}
				}
			} else if (ytl.getOption('autoLoop')) {
				ytl.log('AutoLoop - Check');
				ytl.buttonicon.childNodes[0].innerText = 'A';
				ytl.buttonicon.childNodes[0].style.display = 'inline';
				if (!ytl.checkIf('inloop')) {
					clickButton = true;
				}
			}
			if (clickButton == true) {
				ytl.log('Toggle Click Button Action');
				if (typeof ytl.player.getPlayerState === 'function' && ytl.player.getPlayerState() != -1) {
					clearInterval(autoLoopInterval);
					ytl.session['yt-loop-autoclick'] = true;
					ytl.buttonClick();
				} else {
					ytl.log('Video is not started (maybe on ads).');
				}
			} else {
				clearInterval(autoLoopInterval);
			}
			ytl.buttonDisplay();
		}, 500);
	},
	
	setUrlLoop: function () {
		if(!ytl.button||!ytl.buttonicon) return false;
		if (ytl.urlChecked == false) {
			ytl.urlChecked = true;
			if (ytl.checkIf('url-loopCount')) {
				ytl.log('URL - Loop '+ytl.getVariable('url-loopCount')+' times');
				ytl.session['yt-loop-count'] = ytl.getVariable('url-loopCount');
				ytl.storage['yt-loop-count'] = ytl.getVariable('url-loopCount');
				if (ytl.getVariable('url-loopCount')>1) {
					ytl.session['yt-loop-incount'] = true;
					ytl.storage['yt-loop-incount'] = true;
				}
			}
			if (ytl.checkIf('url-loopTimer')) {
				ytl.log('URL - Loop '+ytl.getVariable('url-loopTimer')+' minutes');
				ytl.session['yt-loop-timer'] = ytl.getVariable('url-loopTimer');
				ytl.storage['yt-loop-timer'] = ytl.getVariable('url-loopTimer');
				if (ytl.getVariable('url-loopTimer')>0) {
					ytl.session['yt-loop-intimer'] = true;
					ytl.storage['yt-loop-intimer'] = true;
				}
			}
			if (ytl.checkIf('url-starttime')||ytl.checkIf('url-endtime')) {
				var duration = ytl.getVariable('duration'), t = null;
				if(ytl.checkIf('url-starttime')) {
					var t = ytl.getVariable('url-starttime');
					if ( t >= 0 ) {
						if(t>=duration) t = 0;
						if( t<ytl.getVariable('endtime') && (
							ytl.checkIf('url-endtime') && t<ytl.getVariable('url-endtime') ||
							!ytl.checkIf('url-endtime') )
						) {
							ytl.setVariable('starttime', t);
							ytl.session['yt-loop-inrange'] = true;
						}
					}
					ytl.log('URL - Loop in Range - ST:' + ytl.getVariable('starttime'), ytl.session['yt-loop-range']);
				}
				if(ytl.checkIf('url-endtime')) {
					var t = ytl.getVariable('url-endtime');
					if ( t >= 0 ) {
						if(t>=duration) t = duration;
						if( t>ytl.getVariable('starttime') && (
							ytl.checkIf('url-starttime') && t>ytl.getVariable('url-starttime') ||
							!ytl.checkIf('url-starttime') )
						) {
							ytl.setVariable('endtime', t);
							ytl.session['yt-loop-inrange'] = true;
						}
					}
					ytl.log('URL - Loop in Range - ET:' + ytl.getVariable('endtime'), ytl.session['yt-loop-range']);
				}
			}
			if( (ytl.checkIf('url-loopCount')||ytl.checkIf('url-starttime')||ytl.checkIf('url-endtime')) && !ytl.checkIf('inloop') && !ytl.getOption('autoLoop') ) {
				ytl.session['yt-loop-autoclick'] = true;
				ytl.buttonClick();
			}
			ytl.loopAction();
		}
	},
	
	setLoopTime: function () {
		clearInterval(ytl.loopTimerAction);
		ytl.loopTimerAction = setInterval( function() {
			ytl.session['yt-loop-time'] = ytl.getVariable('loopTime') + 1;
			if (document.getElementById('loop-timerTime'))
				document.getElementById('loop-timerTime').innerText = ytl.getVariable('loopTime');
			if ( ytl.checkIf('inloop') && ytl.checkIf('intimer') && ytl.getVariable('loopTime') >= ytl.getVariable('loopTimer') ) {
				if (ytl.checkIf('playlist-endplay')) {
					ytl.player.stopVideo();
				} else {
					ytl.player.pauseVideo();
					console.log("seek at line 1877");
					ytl.player.seekTo(ytl.getVariable('starttime'), false);
				}
				ytl.log('Looped - in timer');
			}
		}, 60000);
	},

    // L: This is called on player state change - [[
	loopAction: function (s) {
		clearTimeout(ytl.manualChecker);
		clearTimeout(ytl.playAction);
        
        // L: Testing state changing
        //console.log('loopAction was called');
        //ytl.showState = true;
		
		if (s!=undefined) ytl.session['yt-loop-attached'] = true;
		if ( ytl.getVariable('endtime') == '0' || ytl.getVariable('endtime') == 'false' || (ytl.getVariable('endtime') == ytl.session['yt-duration'] && Number(ytl.session['yt-duration']) != ytl.getVariable('duration')) ) {
			ytl.setVariable('endtime', Number(ytl.getVariable('duration')).toFixed(0));
		}
		if ( ytl.session['yt-duration'] == '0' || ytl.session['yt-duration'] == 'false' || Number(ytl.session['yt-duration']) != ytl.getVariable('duration') ) {
			ytl.session['yt-duration'] = ytl.getVariable('duration');
		}
		
		if (ytl.isDebug) console.log('[LOOPER FOR YOUTUBE]', 'at', ytl.getVariable('currenttime'), 'playerState:', s, ytl.getVariable('playerstate'));
		
		if ( ytl.checkIf('inloop') ) 
		ytl.playAction = setTimeout( function() {
			if ( ytl.getVariable('duration') == 0 ) {
				ytl.log('Error: duration is zero');
				return false;
			}
			clearTimeout(ytl.manualChecker);
			
			if ( ytl.checkIf('inrange') && (ytl.getVariable('playerstate') > -1 || s > -1) ) {
				// Loop in Range
				if(
					(ytl.getVariable('currenttime') >= ytl.getVariable('endtime') - 0.1 && ytl.getVariable('currenttime') <= ytl.getVariable('endtime') + 0.1) ||
					(ytl.getVariable('currenttime') > ytl.getVariable('endtime') - 0.1) ||
					(ytl.getVariable('starttime') > ytl.getVariable('currenttime') + 0.1)
				) {
					if ( !ytl.checkIf('incount') || 
						( ytl.checkIf('incount') && ytl.getVariable('loopCount') > ytl.getVariable('loopCounter') ) 
					) {
						if(!(ytl.getVariable('starttime') >= ytl.getVariable('currenttime')))
							ytl.session['yt-loop-th'] = ytl.getVariable('loopCounter')+1;
					
                        // L: Segment loop - {{
						// L: Loop when end of segment is reached. Triggers states 2, 3, 1 if simply playing to the end
						// If user tried to seek outside of video, will trigger states 3, 1
                        if(ytl.getVariable('currenttime') > ytl.getVariable('endtime') + 2)
                        { console.log("user tried to seek forward out of loop to "+ ytl.getVariable('currenttime')); }
						else if(ytl.getVariable('currenttime') > ytl.getVariable('endtime') - 0.1)
						{ }//console.log("end of loop crossed naturally"); }
						else if(ytl.getVariable('starttime') > ytl.getVariable('currenttime') + 0.1)
						{ console.log("user tried to seek backwards out of loop to "+ytl.getVariable('currenttime')); }
					
                        // L: Turn off state printing, may be problem with async
                        //ytl.showState = false;
                        ytl.showSeek = false;
					
                        // L: Taking out manual pause and plays
						//ytl.player.pauseVideo();
						ytl.player.seekTo(ytl.getVariable('starttime'), true);
						//ytl.player.playVideo();
						ytl.log('Looped - in range');
						//console.log("auto loop end");
					} else { 
						// Loop in count
						if (ytl.checkIf('playlistExist') && ytl.checkIf('playlist-endplay')) {
							// play next video in playlist
							//ytl.player.stopVideo();
							ytl.player.nextVideo();
						} else {
							ytl.player.pauseVideo();
							console.log("seek at line 1936");
							ytl.player.seekTo(ytl.getVariable('starttime'), true);
						}
						ytl.log('Looped - in range & count');
					}
					ytl.panelAction();
				}
			} else if ( ytl.checkIf('intimer') && ytl.getVariable('loopTime') >= ytl.getVariable('loopTimer') ) {
				// Loop in timer
				if ( ytl.getVariable('currenttime') > ytl.getVariable('starttime') ) {
					if (ytl.checkIf('playlistExist') && ytl.checkIf('playlist-endplay')) {
						// play next video in playlist
						//ytl.player.stopVideo();
						ytl.player.nextVideo();
					} else {
						//console.log("end of loop reached");
						ytl.player.pauseVideo();
						console.log("seek at line 1954");
						ytl.player.seekTo(ytl.getVariable('starttime'), false);
					}
					ytl.log('Looped - in timer');
				} else {
					ytl.session['yt-loop-intimer'] = false;
					ytl.storage['yt-loop-intimer'] = false;
				}
				ytl.panelAction();
			} else if ( ytl.getVariable('currenttime') >= ytl.getVariable('duration') - 1 && (ytl.getVariable('playerstate') > -1 || s > -1) ) { 
				if( 
					!ytl.checkIf('incount') || 
					( ytl.checkIf('incount') && ytl.getVariable('loopCount') > ytl.getVariable('loopCounter') ) 
				){
					// Normal Loop
					// L: Loop that happens at end of video, triggers states 1, 3, 1
                    // L: Turn off state printing, may be problem with async
                    //ytl.showState = false;
                    ytl.showSeek = false;
					console.log("full vid auto loop");
                    // L: Taking out manual pause and plays
					// ytl.player.pauseVideo();
					ytl.player.seekTo(0, true);
					// ytl.player.playVideo();
					//console.log("full vid auto loop end");
					ytl.playlistAutoPlayCheck();
					ytl.session['yt-loop-th'] = ytl.getVariable('loopCounter')+1;
					ytl.log('Looped - normal');
				} else if( ytl.checkIf('incount') && ytl.getVariable('loopCount') <= ytl.getVariable('loopCounter') ){
					// Loop in count
					if (ytl.checkIf('playlistExist') && ytl.checkIf('playlist-endplay')) {
						// play next video in playlist
						//ytl.player.stopVideo();
					} else {
						ytl.player.pauseVideo();
					}
					ytl.log('Looped - in count');
				}
				ytl.panelAction();
			}
			
			if ( s == -1 || ytl.getVariable('playerstate') == -1 ) {
				ytl.log('playerstate -1');
				//ytl.player.pauseVideo();
				console.log("seek at line 1987");
				ytl.player.seekTo(ytl.checkIf('check-usually') ? ytl.getVariable('starttime') : 0, true);
				ytl.player.playVideo();
			}
			if ( ytl.getVariable('currenttime') == 0 && ytl.getVariable('playerstate') == 0 ) {
				ytl.log('currenttime 0, playerstate 0');
				ytl.player.stopVideo();
				console.log("seek at line 1994");
				ytl.player.seekTo(ytl.checkIf('check-usually') ? ytl.getVariable('starttime') : 0, true);
				ytl.player.playVideo();
			}
			
			if (
				(ytl.checkIf('check-usually') == true) ||
				(ytl.setLoopEventloaded === false && !ytl.checkIf('check-usually'))
			) {
				second = 0.5;
				if (ytl.checkIf('check-always')) second = 0.25;
				ytl.manualChecker = setTimeout(ytl.loopAction, second * 1000);
			}
		}, 10);
	},

	onStateChangeCheckAction: function () {
		// console.log("onStateChangeCheckAction was called");
		if ( ytl.checkIf('inloop') ) {
			if ( ytl.getVariable('currenttime') >= ytl.getVariable('endtime') - 1 && ytl.getVariable('playerstate') != -1 ) {
				if (ytl.isDebug) ytl.log('force loopAction');
				ytl.loopAction();
			}
		}
	},
    
    // L: setting up seek catch
    // theseeks - ]]
    catchSeeks: function () {
        // Careful of rounding here, especially for logging
        var curr_time = Math.floor(ytl.getVariable('currenttime'));
        var prev_time = Math.floor(Number(ytl.session['prev_time']));
        if(ytl.showSeek)
        {
            if( curr_time > (prev_time + 1) )
            {
                console.log('forward seek detected from '+ytl.session['prev_time']+' to ' +ytl.getVariable('currenttime'));
            }
            else if( curr_time < prev_time )
            {
                console.log('backwards seek detected from '+ytl.session['prev_time']+' to ' +ytl.getVariable('currenttime'));
            }
        } else    {ytl.showSeek = true;}
        ytl.session['prev_time'] = ytl.getVariable('currenttime');
        // Check current time
        // See if there's more than a second diff with previous time
        // save current time as prev time
        return;
    },

	onPlaybackQualityChange: function(e) {
		ytl.log('onPlaybackQualityChange', e);
	},
	
	// L: My own function on state change
	trackChange: function(yt_event) {
        if(yt_event == 2)
        {
            console.log("video paused @ "+ytl.getVariable('currenttime'));
            ytl.showState = true;
        }
        if(ytl.showState && yt_event == 1)   
        {
            console.log("video played @ "+ytl.getVariable('currenttime'));
            ytl.showState = false;
        }
        
		// 1 - play
		// 2 - pause
		// 3 - buffer (sometimes on seek?)
		// autoloops look like 2, 3, 1 (pause, buffer, play)
		// 3 returns on seek (buffer) - is other things too?
		// seek looks like 3, 1 or 3, 2
		// WON'T ALWAYS GET TRIGGERED ON SEEK
		return;
		
	},

	setLoopEvent: function () {
		if(ytl.isDebug) console.log('[LOOPER FOR YOUTUBE]', 'Attach loop action event to the button and Request options setting.');
		try {
			if (ytl.player==null || ytl.player != ytl.getVariable('player')) ytl.player = ytl.getVariable('player');
			if (ytl.player == player_reference || ytl.player == window.yt.config_.PLAYER_REFERENCE) {
				ytl.setLoopEventloaded = true;
				if (ytl.player == player_reference) {
					if (ytl.isDebug) ytl.log('REFERENCE PLAYER: onYouTubePlayerReady');
				} else if (ytl.player == window.yt.config_.PLAYER_REFERENCE) {
					if (ytl.isDebug) ytl.log('REFERENCE PLAYER: yt.config_.PLAYER_REFERENCE');
				}
				ytl.player.removeEventListener('onPlaybackQualityChange', ytl.onPlaybackQualityChange, false);
				ytl.player.addEventListener('onPlaybackQualityChange', ytl.onPlaybackQualityChange, false);
                // L: This is where the state change event listener is set up
				ytl.player.removeEventListener('onStateChange', ytl.loopAction, false);
				ytl.player.addEventListener('onStateChange', ytl.loopAction, false);
				clearInterval(ytl.doubleChecker);
				ytl.doubleChecker = setInterval(ytl.onStateChangeCheckAction, 2000);

                // L: Added a function to check for seeks every (half) second
                clearInterval(ytl.seekChecker);
                ytl.seekChecker = setInterval(ytl.catchSeeks, 500);
				// L: Adding my own event listener - may need to be outside this func?
				ytl.player.removeEventListener('onStateChange', ytl.trackChange, false);
				ytl.player.addEventListener('onStateChange', ytl.trackChange, false);

			} else {
				ytl.log('NO REFERENCE PLAYER', '(Usually cause by using other youtube extensions at the same time)');
				return;
			}
		} catch (e) {
			if (ytl.isDebug) console.error('[LOOPER FOR YOUTUBE]', e);
			ytl.setLoopEventloaded = false;
			return;
		} finally {
			window.postMessage({type: 'loopActionDone'}, '*'); 
			window.postMessage({type: 'requestMessage'}, '*');
		}
	},

	panelDisplay: function (display) {
		if(!ytl.panelParentContainer||!ytl.panel||!ytl.button) return false;
		
		ytl.button.className = ytl.button.className.replace(/( )?action-panel-trigger/g, '');
		
		if(ytl.getOption('showPanel') && !ytl.button.className.match('action-panel-trigger')) 
			ytl.button.className += ' action-panel-trigger';
			
		if( display == true || display == "action-panel-loop" ){
			var panelButtons = null;
			if (ytl.layout == '2014') {
				panelButtons = document.getElementById('watch8-secondary-actions').getElementsByClassName('yt-uix-button-toggled');
			} else {
				panelButtons = document.getElementById('watch7-secondary-actions').getElementsByClassName('yt-uix-button-toggled');
			}
			for(i=0;i<panelButtons.length;i++)
				panelButtons[i].className = panelButtons[i].className.replace(/( )?yt-uix-button-toggled/g,'');
			setTimeout(function(){
				var panelContent = ytl.panelContainer.getElementsByClassName('action-panel-content');
				for(i=0;i<panelContent.length;i++) {
					if(panelContent[i].className.match('hid') == null) panelContent[i].className += ' hid';
					panelContent[i].style.display = 'none';
				}
				ytl.panel.className = ytl.panel.className.replace(/( )?hid/g, '');
				ytl.panel.style.display = 'block';
				if (ytl.layout == '2014') {
					ytl.panelContainer.className = ytl.panelContainer.className.replace(/( )?hid/g, '');
					ytl.panelContainer.style.display = 'block';
				}
			}, 100);
		} else if (display == false) {
			if (ytl.layout == '2014') {
				if(document.getElementById('action-panel-dismiss'))
					setTimeout(function(){document.getElementById('action-panel-dismiss').click();}, 100);
			} else {
				if(document.getElementById('watch7-secondary-actions'))
					setTimeout(function(){document.getElementById('watch7-secondary-actions').getElementsByTagName('button')[0].click();}, 100);
			}
		} else {
			if(!ytl.panel.className.match('hid')) ytl.panel.className += ' hid';
			ytl.panel.style.display = 'none';
			if (ytl.layout == '2014') {
				buttons = document.getElementById('watch8-secondary-actions').getElementsByTagName('button');
			} else {
				buttons = document.getElementById('watch7-secondary-actions').getElementsByTagName('button');
			}
			for (i=0; i<buttons.length; i++) {
				if (buttons[i].getAttribute('data-trigger-for') == display) {
					buttons[i].click();
				}
			}
		}
	},
	
	panelAction: function () {
		if(!ytl.panel||!ytl.button) return false;
		
		if (ytl.getVariable('endtime') == ytl.session['yt-duration'] && Number(ytl.session['yt-duration']) != ytl.getVariable('duration')) {
			ytl.setVariable('endtime', Number(ytl.getVariable('duration')).toFixed(0));
		}
		if ( ytl.session['yt-duration'] == '0' || ytl.session['yt-duration'] == 'false' || Number(ytl.session['yt-duration']) != ytl.getVariable('duration') ) {
			ytl.session['yt-duration'] = ytl.getVariable('duration');
		}
		if ( isNaN(ytl.getVariable('endtime')) ) {
			ytl.setVariable('endtime', Number(ytl.getVariable('duration')).toFixed(0));
		} else if( ytl.getVariable('duration') && (ytl.getVariable('endtime') > ytl.getVariable('duration')) ) {
			ytl.setVariable('endtime', Number(ytl.getVariable('duration')).toFixed(0));
		}
		
		ytl.sliderDisplay();
		if (ytl.getTime(ytl.getVariable('endtime')).length > 5)
			document.getElementById('loop-start-time').style.width = document.getElementById('loop-end-time').style.width = "62px";
		
		if (document.getElementById('loop-counter')) document.getElementById('loop-counter').innerText = ytl.getVariable('loopCounter');
		if (document.getElementById('loop-timerTime')) document.getElementById('loop-timerTime').innerText = ytl.getVariable('loopTime');
		
		if (document.getElementById('loop-count-checkbox')) document.getElementById('loop-count-checkbox').checked = ytl.checkIf('incount');
		if (document.getElementById('loop-count')) {
			document.getElementById('loop-count').value = ytl.getVariable('loopCount');
			if (ytl.getVariable('loopCount') > 999)
				document.getElementById('loop-count').style.width = "40px";
		}
		ytl.replaceUrlVar('loop', ytl.checkIf('incount') ? ytl.getVariable('loopCount') : null);
		
		if (document.getElementById('loop-timer-checkbox')) document.getElementById('loop-timer-checkbox').checked = ytl.checkIf('intimer');
		if (document.getElementById('loop-timer'))
			document.getElementById('loop-timer').value = ytl.getVariable('loopTimer');
		ytl.replaceUrlVar('timer', ytl.checkIf('intimer') ? ytl.getVariable('loopTimer') : null);
		
		if (ytl.checkIf('playlistExist')) {
			// L: Will hide playlist stuff
			if(document.getElementById('loop-panel-end-container')) document.getElementById('loop-panel-end-container').style.display = 'inline-block';  // L: Setting to none makes playlist weird
			if (ytl.checkIf('playlist-endplay') || ytl.checkIf('playlist-endplayPrevious')) {
				if(document.getElementById('loop-playlist-end-play')) document.getElementById('loop-playlist-end-play').click();
			} else {
				if(document.getElementById('loop-playlist-end-stop')) document.getElementById('loop-playlist-end-stop').click();
			}
		} else { 
			if(document.getElementById('loop-panel-end-container')) document.getElementById('loop-panel-end-container').style.display = 'none';
		}
	},
	
	buttonDisplay: function () {
		if (!ytl.button) return false;
		if (ytl.buttonicon && ytl.buttonicon.parentNode) {
			// button icon
			ytl.buttonicon.style.display = ytl.getOption('buttonIcon') ? 'inline-block' : 'none';
			ytl.buttonicon.parentNode.style.display = ytl.getOption('buttonIcon') ? 'inline-block' : 'none';
			ytl.buttonicon.parentNode.setAttribute('class', (ytl.getOption('buttonIcon') ? 'yt-uix-button-icon-wrapper' : ''));
			if (ytl.buttonicon.parentNode.parentNode) ytl.buttonicon.parentNode.parentNode.style.padding = ytl.getOption('buttonIcon') ? '0 7px' : '';
		}
		if (ytl.buttoncontent) {
			// button text
			ytl.buttoncontent.style.display = ytl.getOption('buttonText') ? 'inline-block' : 'none';
		}
		ytl.button.style.color = ytl.checkIf('inloop') ? '#cc181e' : '';
		ytl.buttoncontent.style.color = ytl.checkIf('inloop') ? '#cc181e' : '';
		ytl.buttonicon.style.backgroundPosition = ytl.checkIf('inloop') ? '-344px -68px' : '-134px -232px';
		if (ytl.layout == '2014') {
		} else {
			document.getElementById('watch7-action-buttons').parentNode.onmouseover = function () {
				ytl.button.parentNode.id = ytl.checkIf('inloop') ? 'watch-like-dislike-buttons' : '';
			}
			document.getElementById('watch7-action-buttons').parentNode.onmouseout = function () {
				ytl.button.parentNode.id = '';
			}
		}
		ytl.button.className = ytl.checkIf('inloop') ? ( ytl.button.className.match('yt-uix-button-toggled') ? ytl.button.className : ytl.button.className.replace('yt-uix-button yt','yt-uix-button yt-uix-button-toggled yt')) : ytl.button.className.replace(/( )?yt-uix-button-toggled/g,'');
	},
	
	buttonAction: function () {
		// console.log('panel button clicked');
		ytl.llog('panel', ytl.getVariable('currenttime'), "");
		
		// L: Hiding side panel
		document.getElementById('watch7-sidebar-contents').style.display = 'none';
		if (ytl.getOption('showPanel') == false) ytl.panelDisplay(false);
		if ( ytl.checkIf('playlist-queue') ) {
			// Not working with google cast at this moment.
			ytl.button.setAttribute('title', ytl.i18n('button_hover_disabled_watchqueue'));
			ytl.button.setAttribute('data-tooltip-text', ytl.i18n('button_hover_disabled_watchqueue'));
		} else if (ytl.button.disabled != true) {
			ytl.button.setAttribute('title', ytl.i18n('button_hover'));
			ytl.button.setAttribute('data-tooltip-text', ytl.i18n('button_hover'));
		}
		if ( ytl.checkIf('inloop') == false ) {
			// Start Loop
			ytl.session['yt-loop'] = true;
			ytl.storage['yt-loop'] = true;
			ytl.session['yt-loop-th'] = 0;
			ytl.session['yt-loop-time'] = 0;
			ytl.session['yt-playlist-autoplay-initial'] = ytl.checkIf('playlistAutoPlay');
			ytl.setLoopTime();
			ytl.loopAction();
			ytl.playlistAutoPlayCheck();
			if( ytl.getOption('showPanel') && (ytl.panel!=null) ){
				// Panel
				ytl.panelAction();
				if (ytl.session['yt-loop-autoclick'] == 'true') {
					setTimeout(function() {
						ytl.panelDisplay(ytl.getOption('defaultShowPanel'));
					}, 500);
				} else {
					ytl.panelDisplay(true);
				}
			}
			ytl.playlistClear();
		} else {
			if ( ytl.checkIf('inloop') && ytl.panel.className.match('hid')!=null && ytl.panel!=null && ytl.getOption('showPanel') ) {
				ytl.panelDisplay(true);
			} else {
				// Stop Loop
				ytl.session['yt-loop'] = false;
				ytl.storage['yt-loop'] = false;
				ytl.playlistAutoPlayCheck();
				if( ytl.panel.className.match('hid')==null && ytl.panel!=null )
					ytl.panelDisplay(false);
				ytl.replaceUrlVar('loop', null);
				ytl.replaceUrlVar('timer', null);
				ytl.replaceUrlVar('start', null);
				ytl.replaceUrlVar('end', null);
				ytl.playlistReplace();
			}
		}
		ytl.session['yt-loop-autoclick'] = false;
		setTimeout(ytl.buttonDisplay, 500);
		return;
	},
	
	playlistInit: null,
	
	playlistClear: function()
	{
		if (!ytl.checkIf('playlistExist')) return;
		videoList = document.getElementById('watch-appbar-playlist').getElementsByClassName('playlist-videos-list')[0];
		if (videoList.childNodes.length > 0) {
			ytl.playlistInit = videoList.cloneNode(true);
		}
		document.getElementById('watch-appbar-playlist').getElementsByClassName('playlist-videos-list')[0].innerHTML = '';
		document.getElementById('watch-appbar-playlist').style.display = 'none';
	},
	
	playlistReplace: function()
	{
		if (ytl.checkIf('playlistExist') == false) return;
		if (ytl.playlistInit == null) return false;
		document.getElementById('watch-appbar-playlist').style.display = 'block'
		document.getElementById('watch-appbar-playlist').getElementsByClassName('playlist-videos-container')[0].replaceChild(ytl.playlistInit, document.getElementById('watch-appbar-playlist').getElementsByClassName('playlist-videos-list')[0]);
	},
	
	playlistAutoplayButtonClick: function ()
	{
		ytl.playlistAutoplayButtonManualClick = false;
		if (document.getElementById('watch-appbar-playlist') && ytl.checkIf('playlistAutoPlayButtonExist'))
		{
			document.getElementById('watch-appbar-playlist').getElementsByClassName('playlist-nav-controls')[0].getElementsByTagName('button')[0].click();
			ytl.playlistAutoplayButtonManualClick = true;
		}
	},
	
	playlistAutoPlayCheck: function () {
		// Suggested AutoPlay
		if (document.getElementById('autoplay-checkbox'))
		{
			document.getElementById('autoplay-checkbox').checked = !ytl.checkIf('inloop');
		}
		// Playlist AutoPlay
		if (ytl.checkIf('playlistExist') && ytl.checkIf('playlistAutoPlayButtonExist'))
		{
			if ((ytl.checkIf('incount') == false && ytl.checkIf('intimer') == false) && ytl.checkIf('playlistAutoPlay'))
			{
				ytl.playlistAutoplayButtonClick();
			}
			else if ((ytl.checkIf('incount') || ytl.checkIf('intimer')) && ytl.checkIf('playlistAutoPlay')) 
			{
				if ( !ytl.checkIf('playlist-endplay') )
					ytl.playlistAutoplayButtonClick();
				else if (ytl.getVariable('loopCount') > ytl.getVariable('loopCounter')) 
					ytl.playlistAutoplayButtonClick();
			}
			else if ((ytl.checkIf('incount') || ytl.checkIf('intimer')) && ytl.checkIf('playlistAutoPlay') == false) 
			{
				if ( ytl.checkIf('playlist-endplay') )
					if (ytl.getVariable('loopCount') <= ytl.getVariable('loopCounter')) 
						ytl.playlistAutoplayButtonClick();
			}
		}
	},

	getReady: function () {
		try {
			ytl.getReadyTimes += 1;
			if (
				ytl.player == null ||
				ytl.player.addEventListener == null ||
				ytl.player != ytl.getVariable('player')
			)
				ytl.player = ytl.getVariable('player');
		
			if (ytl.button==null || document.getElementById('loop-button')==null) ytl.setButton(); else if (ytl.button) ytl.button.disabled = true;
			if (ytl.panel==null || document.getElementById('action-panel-loop')==null) ytl.setPanel();
		
			if (ytl.getVariable('starttime') != 0) {
				ytl.setVariable('starttime', 0);
			}
			if (ytl.getVariable('endtime')==0 && ytl.getVariable('duration')) {
				ytl.setVariable('endtime', Number(ytl.getVariable('duration')).toFixed(0));
			}
			if (ytl.session['yt-duration']=='0' && ytl.getVariable('duration')) ytl.session['yt-duration'] = ytl.getVariable('duration');
			
			ytl.session['yt-player-size-initial'] = ytl.getOption('playerSize');

			// Playlist AutoPlay
			if (ytl.checkIf('playlistExist') && ytl.checkIf('playlistAutoPlayButtonExist')) {
				// Check play-list auto-play status
				if ( ytl.checkIf('playlistExist') && ytl.checkIf('playlistAutoPlayButtonExist')
					&& isNaN( yt.config_.LIST_AUTO_PLAY_ON || 
					document.getElementById('watch-appbar-playlist') && document.getElementById('watch-appbar-playlist').getElementsByClassName('playlist-nav-controls')[0].getElementsByTagName('button')[0].className.match(/yt-uix-button-toggled/)
					) ) {
					ytl.playlistAutoplayButtonClick();
					ytl.playlistAutoplayButtonClick();
				}
				// Check play-list auto-play button click action
				if ( ytl.playlistAutoplayListenerAttach == false ) {
					if (document.getElementById('watch-appbar-playlist') && document.getElementById('watch-appbar-playlist').getElementsByClassName('playlist-nav-controls') && document.getElementById('watch-appbar-playlist').getElementsByClassName('playlist-nav-controls')[0].getElementsByTagName('button')) {
						document.getElementById('watch-appbar-playlist').getElementsByClassName('playlist-nav-controls')[0].getElementsByTagName('button')[0].addEventListener('click', function() { 
							//if(ytl.isDebug) console.log('[LOOPER FOR YOUTUBE]', ytl.checkIf('inloop'), ytl.playlistAutoplayButtonManualClick == true);
							if( ytl.checkIf('inloop') && ytl.playlistAutoplayButtonManualClick == true ) ytl.buttonClick();
						});
						ytl.playlistAutoplayListenerAttach = true;
					}
				}
			} else {
				// Reset
				ytl.storage['yt-loop-playlist-endplay'] = false;
				ytl.storage['yt-loop-incount'] = false;
				ytl.storage['yt-loop-count'] = 10;
				ytl.storage['yt-loop-intimer'] = false;
				ytl.storage['yt-loop-timer'] = 10;
			}
		} catch (e) {
			ytl.log('getReady - Error:', e.message);
		} finally {
			if (ytl.getReadyTimes > 100) {
				ytl.log('Unable to get Ready');
				if (ytl.button) ytl.button.disabled = true;
				return;
			}
			if ( ytl.checkIf('loopdisplay') ) {
				if (ytl.player.addEventListener == null) {
					ytl.log('getReady - Restart'+' (ytl.player not set properly)');
					setTimeout(ytl.getReady, 100);
					return;
				}
				if( ytl.getVariable('endtime') == 0 || Number(ytl.session['yt-duration']) == 0 ) { 
					ytl.log('getReady - Restart'+' (session of endtime / duration not set)');
					if(ytl.checkIf('buttonDisable')) {
						ytl.log('No Video on the page (Button Disabled)');
					} else {
						setTimeout(ytl.getReady, 100);
					}
				} else {
					ytl.log('getReady - Done');
					if (ytl.button) ytl.button.disabled = false;
					if(ytl.setLoopEventloaded == false) ytl.setLoopEvent();
				}
			} else {
				ytl.log('getReady - Restart'+' (Button not Display)');
				if(ytl.checkIf('buttonDisable')) {
					ytl.log('No Video on the page'+' (Button Disabled)');
				} else {
					setTimeout(ytl.getReady, 100);
				}
			}
		}
		return;
	},

	keydownAction: function (e) {
		if(ytl == null) return;
		if(!ytl.getOption('shortcut') && !ytl.getOption('shortcut-pause')) return;
		if(e.srcElement || e.target)
		if(e.target.localName=='input' || e.target.localName=='textarea' || e.srcElement.localName=='input' || e.srcElement.localName=='textarea') return;
		var key = e.keyCode, keys = [80, 32];
		if(!ytl.getOption('shortcut') && key == 80) return;
		if(!ytl.getOption('shortcut-pause') && key == 32) return; 
		if( keys.indexOf( e.which ) > -1 ) { e.stopPropagation(); e.preventDefault(); }
		switch(key) {
			case 80: //P
				ytl.buttonClick(); break;
			case 32: //Space
				if ( ytl.getVariable('playerstate') == 1 )
					ytl.player.pauseVideo();
				else
					ytl.player.playVideo(); 
				break;
		}
	},

	messageAction: function(e) {
		if (e.data.type)
		if (e.data.type == 'optionsMsg') {
			if (ytl.isDebug) console.debug(e);
			if ( (e.origin !== 'https://www.youtube.com') && (e.origin !== 'http://www.youtube.com') ) return;
			if (e.data.key!=undefined) {
				ytl.storage['yt-loop-shortcut'] = (e.data['key'] == true) ? 'true' : 'false';
			}
			if (e.data.auto!=undefined) {
				switch(e.data['auto']) {
					case 'true':
					case 'false':
					case 'saveState':
						ytl.storage['yt-auto-loop'] = e.data['auto']; 
						break;
					default: 
						ytl.storage['yt-auto-loop'] = 'false'; 
						break;
				}
				ytl.setAutoLoop();
			}
			if (e.data.button!=undefined) {
				switch(e.data['button']) {
					case 'all':
					case 'icon':
					case 'text':
						ytl.storage['yt-loop-button'] = e.data['button']; 
						break;
					default: 
						ytl.storage['yt-loop-button'] = 'all'; 
						break;
				}
				ytl.buttonDisplay();
			}
			if (e.data.panel!=undefined) {
				ytl.storage['yt-loop-options'] = (e.data['panel'] == true) ? 'true' : 'false';
			}
			if (e.data.pausekey!=undefined) {
				ytl.storage['yt-pause-shortcut'] = (e.data['pausekey'] == true) ? 'true' : 'false';
			}
			if (e.data.playersizeEnable!=undefined) {
				ytl.storage['yt-player-resize'] = (e.data['playersizeEnable'] == true) ? 'true' : 'false';
				ytl.setPlayerSize();
			}
			if (e.data.playersize!=undefined) {
				switch(e.data['playersize']) {
					case 'fullsize':
					case 'wider':
					case 'wide':
					case 'normal':
						ytl.storage['yt-player-size'] = e.data['playersize']; 
						break;
					default: 
						ytl.storage['yt-player-size'] = 'normal'; 
						break;
				}
				ytl.setPlayerSize();
			}
			if (e.data.quality!=undefined) {
				switch(e.data['quality']) {
					case 'highres':
					case 'hd1440':
					case 'hd1080':
					case 'hd720':
					case 'large':
					case 'medium':
					case 'small':
					case 'tiny':
						ytl.storage['yt-quality'] = e.data['quality']; 
						break;
					default: 
						ytl.storage['yt-quality'] = 'default'; 
						break;
				}
				ytl.setQuality();
			}
			if (e.data.show_changelog!=undefined) {
				ytl.storage['yt-loop-show-changelog'] = (e.data['show_changelog'] == true) ? 'true' : 'false';
			}
			if (e.data.oldchrome!=undefined) {
				if (document.getElementById('options-page-link'))
					document.getElementById('options-page-link').style.display = 'none';
				if (document.getElementById('loop-panel-tips-container'))
					document.getElementById('loop-panel-tips-container').style.display = 'none';
			}
		} else if (e.data.type == 'resetHidePromotion') {
			ytl.storage['ytl-hide-information'] = false;
		} else if (e.data.type == 'loopActionDone') {
			if(ytl.isDebug) console.debug(e.data);
			ytl.setPlayerSize();
			ytl.setQuality();
			ytl.setAutoLoop();
			ytl.setUrlLoop();
			ytl.buttonDisplay();
		}
	}

};


/*
 * monitoring document.body
 * L: stuck on this, when does this run?
 */
if (ytl.bodyObserver) ytl.bodyObserver.disconnect();
ytl.bodyObserver = new MutationObserver(function (mutations) {
	mutations.forEach(function (mutation) {
		if (mutation.attributeName && mutation.attributeName == 'class') {
			var host = document.location.host;
			var isYouTube_host = (host.substr(host.length - 11) == 'youtube.com' && host != 'm.youtube.com');
			var isYouTube_target = ((mutation.target.baseURI).match("youtube.com") != null);
			if (mutation && mutation.target && isYouTube_host && isYouTube_target) {
				if ((mutation.target.baseURI).match("watch\\?") != null) {
					if (mutation.target.className.match('page-loaded') != null) {
						if (sessionStorage['yt-body-class'] == undefined || sessionStorage['yt-body-class'].match('page-loaded') == null) {
							
							ytl.logging = [];
							ytl.info('Debug Mode:', (localStorage['yt-loop-debug'] == 'true' ? true : false));
							ytl.info('Browser is in Incognito window: ' + inIncognito);
							var cookies = document.cookie.match(/VISITOR_INFO1_LIVE=([a-zA-z0-9_-]*);/);
							ytl.info('YouTube Visitor Cookies is:', cookies ? cookies[1] : '');
							
							ytl.initialiseVariables();
							ytl.setVariables();
							if (ytl.getReadyTimes == 0) {
								ytl.getReady();
							}
							
						}
					}
					sessionStorage['yt-body-class'] = mutation.target.className;
				} else {
					ytl.logging = [];
					ytl.log('This is not a video page');
					if(ytl.player) ytl.player.stopVideo();
					if(typeof ytl.initialiseVariables == "function") ytl.initialiseVariables();
				}
			} else {
				ytl.logging = [];
				ytl.log('NOT IN YOUTUBE.COM');
			}
		}
	});
});
ytl.bodyObserver.observe(document.body, { attributes: true, subtree: false });

/* L: end inject */
});


function getMessageFromChromeSync () {
	if ( !chrome.storage ) {
		console.info('[LOOPER FOR YOUTUBE]', 'BROWSER YOU ARE USING DO NOT SUPPORT CHROME.STORAGE API, OPTIONS IS NOT AVAILABLE IN THIS CASE');
		window.postMessage({
			type: 'optionsMsg',
			auto: false,
			button: 'all',
			key: true,
			panel: true,
			pausekey: false,
			playersizeEnable: false,
			playersize: 'normal',
			quality:  'default',
			show_changelog: true,
			oldchrome: true
		}, '*');
		return false;
	}
	chrome.storage.sync.get(null, function(value){ 
		window.postMessage({
			type: 'optionsMsg',
			auto: value['ytAutoLoop'] ? value['ytAutoLoop'] : false,
			button: value['option_button'] ? value['option_button'] : 'all',
			key: value['ytShortcut'] ? ( value['ytShortcut']=='false' ? false : true ) : true,
			panel: value['ytLoopPanel'] ? ( value['ytLoopPanel']=='false' ? false : true ) : true,
			pausekey: value['ytShortcut_Pause'] ? ( value['ytShortcut_Pause']=='true' ? true : false ) : false,
			playersizeEnable: value['ytPlayerSizeEnable'] ? ( value['ytPlayerSizeEnable']=='true' ? true : false ) : false,
			playersize: value['ytPlayerSize'] ? value['ytPlayerSize'] : 'normal',
			quality: value['ytQuality'] ? value['ytQuality'] : 'default',
			show_changelog: value['option_show_changelog'] ? ( value['option_show_changelog']=='false' ? false : true ) : true,
		}, '*');
	});
}

/* L: When does this run? on page load? Whenever anything happens in the page? */
try {
	chrome.storage.onChanged.addListener(function(changes, namespace) {
		for (key in changes) {
			var storageChange = changes[key], option = {type: 'optionsMsg'}
			switch(key) {
				case 'ytAutoLoop':
					switch(storageChange.newValue) {
						case 'true':
						case 'false':
						case 'saveState':
							option.auto = storageChange.newValue; 
							break;
						default: 
							option.auto = 'false';
							break;
					}
					break;
				case 'option_button':
					switch(storageChange.newValue) {
						case 'all':
						case 'icon':
						case 'text':
							option.button = storageChange.newValue; 
							break;
						default: 
							option.button = 'all';
							break;
					}
					break;
				case 'ytShortcut':
					option.key = storageChange.newValue=='false' ? false : true;
					break;
				case 'ytLoopPanel':
					option.panel = storageChange.newValue=='false' ? false : true;
					break;
				case 'ytShortcut_Pause':
					option.pausekey = storageChange.newValue=='true' ? true : false;
					break;
				case 'ytPlayerSizeEnable':
					option.playersizeEnable = storageChange.newValue=='true' ? true : false;
					break;
				case 'ytPlayerSize':
					switch(storageChange.newValue) {
						case 'fullsize':
						case 'wider':
						case 'wide':
						case 'normal':
							option.playersize = storageChange.newValue; 
							break;
						default: 
							option.playersize = 'normal';
							break;
					}
					break;
				case 'ytQuality':
					switch(storageChange.newValue) {
						case 'default':
						case 'highres':
						case 'hd1440':
						case 'hd1080':
						case 'hd720':
						case 'large':
						case 'medium':
						case 'small':
						case 'tiny':
							option.quality = storageChange.newValue; 
							break;
						default: 
							option.quality = 'default';
							break;
					}
					break;
				case 'option_show_changelog':
					option.show_changelog = storageChange.newValue=='false' ? false : true;
					break;
			}
			window.postMessage(option, '*');
		}
	});
	getMessageFromChromeSync();
} catch (e) {
}


window.addEventListener('message', function (e) {
	if (e.data.type)
	if (e.data.type == 'requestMessage') {
		getMessageFromChromeSync();
	}
}, false);
