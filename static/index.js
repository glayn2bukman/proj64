"use strict";
var global = this; // will acess global variables with global.{VARNAMR}

function request(url,method,payload=null,onsucess=null,onfailure=null,server=0,glue=null, onprogress=null, async=true){
    // glue will be passed on to onsucess along witht the server reply...

    if(!isOnline()){
            onfailure?onfailure():flag_error('failed to communicate with all UNBS servers. are we online?');
            // save the payload(data) at this point
            return;
    }else{
        if(server==UNBS_SERVERS.length){
            onfailure?onfailure():flag_error('failed to communicate with all UNBS servers. are we online?');
            // save the payload(data) at this point
            return;
        }

        start_loading();
        jQuery.ajax({
            type: "POST",
            url: UNBS_SERVERS[server],
            data: JSON.stringify(payload),
            complete:function(){stop_loading();},
            success: onsucess,
            error:function(req){request(url,method,payload,onsucess,onfailure,++server,glue, onprogress,async);},
            dataType: "json",
            contentType: "application/json",
            processData: false,
            async:async,
        });    
    }
}

function readserial(){
    try{
        DEVICE_SERIAL_NUMBER = device.serial;
    }catch(e){
        
    }
}

function GPSon(callback=null){
    try{
        /*
            the CheckGPS module is included in the config.xml by
            
            <plugin name="cordova-plugin-fastrde-checkgps" spec="https://github.com/fastrde/cordova-plugin-fastrde-checkgps" />

        */
        CheckGPS.check(function(){
            //GPS is enabled!
            if(callback){callback();}
          },
          function fail(){
            //GPS is disabled!
            showToast('please turn on your GPS(location), if location is on, set mode to HIGH ACCURACY');
          });
    }catch(e){
        // in browser...
        if(callback){callback();}
    }
}

function get_location(callback=null, callback_payload=null, err_callback=null, show_loading=true){
    /*
        in the config.xml, add        
        <plugin name="cordova-plugin-geolocation" version="2.1.0" />
        and NOT just
        <plugin name="cordova-plugin-geolocation" />
    */
    
    GPSon(function(){
        try{
            if(show_loading){start_loading();}
            
            LOCATION = {
                'time':0,
                'latitude':0, 
                'longitude':0,
                'address_line':'',
                'address':'',

                "locality": "",
                "sub_locality": "",
                "admin_area": "",
                "sub_admin_area": "",
                "feature_name": "",
            };

            navigator.geolocation.getCurrentPosition(
                function(pos){
                    stop_loading();

                    LOCATION.time = pos.timestamp;
                    LOCATION.latitude = pos.coords.latitude; 
                    LOCATION.longitude = pos.coords.longitude;

                    // since reverseGeocode is asynchronous, pass it the callback along with callback_paylod
                    // so that it may call the callback when its ready!
                    reverseGeocode({lat:pos.coords.latitude, lon:pos.coords.longitude},callback,callback_payload);
                    
                },
                function(err){
                    stop_loading();
                    showToast('gps failed, continuing without coordinates...');
                    if(callback){callback(callback_payload);}
                },
                
                { // options
                    enableHighAccuracy: true, // is not set, app wont get gps from device gps sensor
                                              // you DONT WANT this shit, believe me
                    timeout: 50000
                } // if this aint set and GPS is off, Android wont fire the onerror EvHandler
            );

        }catch(e){
            if(err_callback){err_callback(e);}
        }
        
    });
}

function login(){
	document.getElementById("login_div").style.display = "none";
	document.getElementById("search_div").style.display = "block";
	return;

    // send login credentials ALONG WITH the device serial number to the server to check the login

    let uname = document.getElementById('uname').value;
    let pswd = document.getElementById('pswd').value;

    if(!uname.length || !pswd.length){
        flag_error('please fill in both fields');
        return;
    }

    let onsuccess = function(reply){
            if(reply.error){
                flag_error(reply.message);
                return;
            }

            write_local_data('login',JSON.stringify({uname:uname, pswd:pswd}),function(e){},function(v){});

            AGENT.uname = uname;
            AGENT.names = reply.names;
            SESSION_ID = reply.session_id;

            document.getElementById('login_div').style.display = 'none';
            
            // do these when login is successfull
            document.getElementById('meter_details').style.display = 'block';
            //get_location();
            
            document.getElementById('pswd').value = '';

            GPSon();
            
            document.getElementById('watermark').style.display = 'inline-block';
            
            fetch_app_data();
        }

    request('','POST',{
        'action':'login',
        'device':{'serial':DEVICE_SERIAL_NUMBER},
        'login_id':uname,
        'password': pswd},
        onsuccess,
        function(){
            read_local_data('login',function(){}, function(value){
                if(!value){
                    flag_error('Failed to communicate with all UNBS servers and no offline data is available')
                    //write_local_data('login','',function(e){},function(v){});
                }else{
                    let credentials = JSON.parse(value);
                    if(credentials.uname==uname && credentials.pswd==pswd){
                        onsuccess({error:false});
                    }else{
                        onsuccess({error:true, message:'Invalid login credentials'});
                    }
                }
            });
        },0,null, null);
}


function showToast(msg,duration='long',position='bottom'){
    try{
        window.plugins.toast.show(msg,duration,position);
    }catch(e){
        // probably in browser where we dont have the toast plugin...
        console.log(msg);
    }
}

function write_local_data(key,value,errCallback,sucessCallback){
    key = 'unbs_Jerm_'+key; // just to ensure keys dont clash accross different applications
    localforage.setItem(key, value, function (err) {
        if(err && errCallback){errCallback(err);}
        else if(!err && sucessCallback){sucessCallback(key);}
    });

}
function read_local_data(key,errCallback,sucessCallback){
    key = 'unbs_Jerm_'+key; // just to ensure keys dont clash accross different applications
    localforage.getItem(key, function (err, value) {
        if(err && errCallback){errCallback(err);}
        else if(!err && sucessCallback){sucessCallback(value);}
    });    
}

function isOnline(){
    try{ return navigator.connection.type!=Connection.NONE;
    }catch(e){return true;/*assume we're online by default*/}
}

function showSerialError(){
    showToast('This application is NOT targeted for this device. Please talk to JERM Technology about this');
}

function fetch_app_data(){
        jQuery.ajax({
        type: "POST",
        url: UNBS_SERVERS[0],//'https://meters-dev.unbs.go.ug/api/',
        data: JSON.stringify({"action": "getsettings", "session_id": SESSION_ID}),
        complete:function(){stop_loading();},
        success: function(reply){
            if(reply.error){
                show_info('error in fetching app data');
                return;
            }
            delete reply.error;
            write_local_data('appdata',JSON.stringify(reply),null,populate_app_data);
        },
        error:function(req){console.log('fetching app data failed!');},
        dataType: "json",
        contentType: "application/json",
        processData: false,
        async:true,
    });    

}

function search(){
	let src = document.getElementById('from').value;
	let dest = document.getElementById('dest').value;
	
	if(!src || !dest){
		flag_error('both addresses are needed');
		return;
	}else if(src==dest){
		flag_error('the journey cant end where it started!');
		return;
		
	}
	
	let _;
	
	// now start matching all possible buses that can satisfy this
	let results = [];
	for(let bus in APP_DATA.buses){
		if(APP_DATA.buses.hasOwnProperty(bus)){
			for(let i=0; i<APP_DATA.buses[bus].routes.length; ++i){
				if(src==APP_DATA.buses[bus].routes[i][0] && dest==APP_DATA.buses[bus].routes[i][2]){
					_ = [bus].concat(APP_DATA.buses[bus].routes[i]);
					_ = _.concat([APP_DATA.buses[bus].icon]);
					results.push(_);
				}
			}
		}
	}
	
	if(results.length){
		populate_results(results);
	}else{
		show_info("sorry, no buses make the trip from "+src+' to '+dest);
	}
}

function _24to12(t){ // convert 24 hr time t 12 hr time
	t = t.split(':'); // t is in format HH:MM
	let _hr=t[0], _min=t[1];
	_hr = ((_hr.length>1)?(_hr[0]=='0'?parseInt(_hr[1]):parseInt(_hr)):parseInt(_hr));
	_min = ((_min.length>1)?(_min[0]=='0'?parseInt(_min[1]):parseInt(_min)):parseInt(_min));
	
	let _ = ((_hr<12)?'AM':'PM');
	_hr>12 ? _hr-=12 : 0;
	
	return (_hr<10?'0':'')+_hr+':'+(_min<10?'0':'')+_min+' '+_;
}

function _capitalize(str){
	str = str.split(' ');
	for(let i=0; i<str.length; ++i){
		str[i] = str[i][0].toUpperCase() + str[i].slice(1,str[i].length).toLowerCase();
	} str = str.join(' ');
	
	return str;
}

function book_bus(){
	document.getElementById('search_div').setAttribute('class','blured');

	let data = this.data;

	document.getElementById('bstart').innerHTML = document.getElementById('from').value;
	document.getElementById('bdest').innerHTML = document.getElementById('dest').value;
	document.getElementById('bvia').innerHTML = (data[2].length?data[2]:'(not specified)');
	document.getElementById('btransporter').innerHTML = data[0];
	document.getElementById('btime').innerHTML = (data[4]=='*'?'ANYTIME':_24to12(data[4]));
	document.getElementById('bprice').innerHTML = human_readable(data[5],0);
	
	document.getElementById('bdate').value = '';

	show_modal('book_modal');
}

function _verify_phone_number(number){
	let reply = {'status':false, sanitized_number:''};
	
	if(!number || number.length<9){return reply;}
	
	if(number.indexOf('+256')==0){ // +256xxx...
		number = number.slice('+256'.length, number.length);
	}else if(number.indexOf('256')==0){ // 256xxx...
		number = number.slice('256'.length, number.length);
	}
	
	if(number.indexOf('07')==0){ // 07xxx...
		if(number.length != 10){return reply;}
		number = number.slice(1,number.length);
	}else if(number.indexOf('7')==0){ // 7xxx...
		if(number.length != 9){return reply;}
	}else{return reply;}

	for(let i=0; i<number.length; ++i){
		if(number[i]<'0' || number[i]>'9'){
			return reply;
		}
	}

	reply.status = true;
	reply.sanitized_number = '+256'+number;
	
	return reply;
}

function _book(){
	let date = document.getElementById('bdate').value;
	if(!date){
		flag_error('when are you planning to travel?');
		return;
	}
	let use_credit = (document.getElementById('bcredit').checked?true:false);

	let mm_number=null;
	if(!use_credit){
		mm_number = document.getElementById('bMMnumber').value;
		let _ = _verify_phone_number(mm_number);
		console.log(_);
		
		if(!_.status){
			flag_error("invalid phone number entered");
			return;
		}
	}

}

function populate_results(data){
	// data: [[bus,from,via,to,time,price,icon],...]

	let hr = 0, _hr = '', _hr_nxt;
	let buses = [];
	
	let _last_hr = '';
	let _,__,___;
	
	let mom = document.getElementById('search_results'),
		div,row,img,span1,span2;
	
	clear(mom);
	
	let all_day = [];
	
	while(hr<24){
		_hr = ((hr>9) ? ''+hr : '0'+hr)+':01';
		_hr_nxt = ((hr+2>9) ? ''+(hr+2) : '0'+(hr+2))+':00';
		
		buses = [];
		for(let i=0; i<data.length; ++i){
			_ = data[i][4];
			_ = _.split(',');
			for(let j=0; j<_.length; ++j){
				if(_[j]=='*') {
					if(all_day.indexOf(data[i])<0){all_day.push(data[i]);}
					continue;
				}
				__ = _[j].split(':')[0];
				___ = _[j].split(':')[1];
				__ = ((__.length>1) ? __ : '0'+__)+':'+((___.length>1) ? ___ : '0'+___);
				if((__>=_hr) && (__<=_hr_nxt)){
					buses.push([
						data[i][0],data[i][1],data[i][2],
						data[i][3],_[j],data[i][5],data[i][6],_[j]]);
				}
			}
		}
		buses.sort();

		if(buses.length){
			row = document.createElement('div');
				row.setAttribute('class','time');
				row.innerHTML = _hr+((hr<12)?' AM':'PM')+' - '+_hr_nxt+(((hr+2)<12)?' AM':'PM');
				mom.appendChild(row);

			for(let i=0; i<buses.length; ++i){

				row = document.createElement('div');
					row.setAttribute('class','bus_entry');
					row.data = buses[i];
					row.onclick = book_bus;
				
				img = document.createElement('img');
					img.setAttribute('class','bus-icon');
					img.setAttribute('src','res/'+buses[i][6]);
					row.appendChild(img);
				row.appendChild(document.createElement('br'));

				span1 = document.createElement('span');
					span1.setAttribute('class','bus-details');

						span2 = document.createElement('span');
							span2.setAttribute('class','bus-name');
							span2.innerHTML = buses[i][0];
							span1.appendChild(span2);

						span2 = document.createElement('span');
							span2.setAttribute('class','bus-price');
							span2.innerHTML = '<span style="font-size:1em;">UGX</span> '+human_readable(buses[i][5]);
							span1.appendChild(span2);

						span2 = document.createElement('span');
							span2.setAttribute('class','bus-route');
							span2.innerHTML = '<strong>Via</strong> '+buses[i][2];
							span1.appendChild(span2);

						_ = _24to12(buses[i][7]);
						span2 = document.createElement('span');
							span2.setAttribute('class','bus-route');
							span2.innerHTML = "<strong>Departs at</strong> "+_;
							span1.appendChild(span2);

					row.appendChild(span1);

				mom.appendChild(row);

			}
		}

		hr += 2; // we shall use 2hr spans eg 07-09 AM
	}
	
	if(all_day.length){
		// insert these results before the others...
		all_day.sort();
		buses = all_day;
		for(let i=0; i<buses.length; ++i){

			row = document.createElement('div');
				row.setAttribute('class','bus_entry');
				row.data = buses[i];
				row.onclick = book_bus;
			
			img = document.createElement('img');
				img.setAttribute('class','bus-icon');
				img.setAttribute('src','res/'+buses[i][6]);
				row.appendChild(img);
			row.appendChild(document.createElement('br'));

			span1 = document.createElement('span');
				span1.setAttribute('class','bus-details');

					span2 = document.createElement('span');
						span2.setAttribute('class','bus-name');
						span2.innerHTML = buses[i][0];
						span1.appendChild(span2);

					span2 = document.createElement('span');
						span2.setAttribute('class','bus-price');
						span2.innerHTML = '<span style="font-size:1em;">UGX</span> '+human_readable(buses[i][5]);
						span1.appendChild(span2);

					span2 = document.createElement('span');
						span2.setAttribute('class','bus-route');
						span2.innerHTML = '<strong>Via</strong> '+buses[i][2];
						span1.appendChild(span2);

					span2 = document.createElement('span');
						span2.setAttribute('class','bus-route');
						span2.innerHTML = "Departs <strong>ANYTIME</strong>";
						span1.appendChild(span2);

				row.appendChild(span1);

			mom.insertBefore(row, mom.childNodes[0]);

		}

		row = document.createElement('div');
			row.setAttribute('class','time');
			row.innerHTML = 'Travel Anytime of Day';
			mom.insertBefore(row, mom.childNodes[0]);

	}
	
}

function _fetch_appdata(){
	// perform logic in the following manner...
	// if(we have saved data in localStorage){
	// 		fetch current data HASH from server;
	//		if(remote HASH is same as local HASH){use locally saved data;}
	// 		else{fetch data; store data locally, store data HASH locally;}
	// }else{
	// 		fetch data;
	//		store data in localStorage;
	// 		store data HASH in localStorage;
	// }
	
	
	// call _load_appdata
	// for demo, lets assume we fetched APP_DATA from server
	let data = APP_DATA;
	_load_appdata(APP_DATA);
}

function _load_appdata(data){
	if(!data || !data.buses) {console.log('_load_apdata: silly data'); return;}
	
	APP_DATA = data; // set global app data to new data
	let _start_addr_mom = document.getElementById('from'), 
		_dest_mom       = document.getElementById('dest');
	
	clear(_start_addr_mom); clear(_dest_mom);
	
	let _start_addrs=[], _dest_addrs=[];
	let addr;

	for(let bus in data.buses){
		if(data.buses.hasOwnProperty(bus)){
			for(let i=0; i<data.buses[bus].routes.length; ++i){
				addr = _capitalize(data.buses[bus].routes[i][0]);
				data.buses[bus].routes[i][0] = addr;				
				if(_start_addrs.indexOf(addr)<0){_start_addrs.push(addr);}

				addr = _capitalize(data.buses[bus].routes[i][2]);
				data.buses[bus].routes[i][2] = addr;				
				if(_dest_addrs.indexOf(addr)<0){_dest_addrs.push(addr);}
			}
		}
	}
	
	_start_addrs.sort(); _dest_addrs.sort();

	let option;
	for(let i=0; i<_start_addrs.length; ++i){
		option = document.createElement('option');
		option.setAttribute('value',_start_addrs[i]);
		option.innerHTML = _start_addrs[i];
		_start_addr_mom.appendChild(option);
	}

	for(let i=0; i<_start_addrs.length; ++i){
		option = document.createElement('option');
		option.setAttribute('value',_dest_addrs[i]);
		option.innerHTML = _dest_addrs[i];
		_dest_mom.appendChild(option);
	}
}

// ************************************************************************************************************
function init(){
    // to bend text...include the CirleType.min.js file
    new CircleType(document.getElementById('title')).radius(190)/*.dir(-1)//this would reverse the bend*/;    

    document.addEventListener("backbutton", function(e){
        e.stopPropagation();
		
		if(1){ // use back button event for something custom
			e.preventDefault();
		}
		
		return true; // proceed normally
    }, false);

	_fetch_appdata(); // load application data...
	
	$("#book_modal").on('hidden.bs.modal',function(){
		document.getElementById('search_div').setAttribute('class','noblur');
	});
}

window.onload = function(){
	// run your startup code in <init> NOT HERE
    if(!("deviceready" in window)){init();}
    else{
        document.addEventListener("deviceready", function(){
            init();
        }, false);
    }
}
