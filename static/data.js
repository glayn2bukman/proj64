"use strict";
// this file contains all data that could change in the application. having such data eg list of meter manufacturers
// enables us to separate logic from the data hence when a change occurs, we dont edit the html file but rather this
// file

var APP_DATA = {
	'buses':{
		'Trinity':{			
			icon: 'bus.png',
			routes:[
				// from,via,to,time,price
				['Kampala','Mpigi','Masaka','09:00,21:00',15000],
				['Masaka','Mpigi','Kampala','*',15000],
				['Kampala','Masaka','Mbarara','09:00,21:00',20000],
				['Mbarara','Masaka','Kampala','13:00',20000],
				['Kampala','Mbarara,Kabale,Kisoro','Kigali','09:00,19:00,21:00',40000],
				['Mbarara','','Bushenyi','*',5000],
				['kampala','mubende','kasese','09:30',30000],
			],
		},

		'Link Bus Services':{
			icon: 'bus.png',
			routes:[
				['Kampala','Mitiyana,Mubende','Fort Portal','*',25000],
				['Fort Portal','Mitiyana','Kampala','09:00,11:30,14:30',25000],
				['Kampala','Fort Portal','kasese','*',30000],
				['kasese','Mubende','Kampala','07:00,09:00,12:00',30000],
			],
		},
	},
}
