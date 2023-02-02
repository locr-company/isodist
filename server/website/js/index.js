class IsoDistDemo {
	constructor() {
		this._center = [ 53.0758196, 8.8071646 ];
		this._map = L.map('map').setView(this._center, 13);
		L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
			attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
		}).addTo(this._map);

		L.control.isodist({ position: 'topright' })
			.addTo(this._map);

		this._marker = L.marker(this._center, {
			draggable: true
		});
		this._marker.addTo(this._map);
		this._marker.on('moveend', (evt) => {
			this.refreshIsoDist(evt.target.getLatLng());
		});
		this._polygons = [];
		this._circles = [];

		this.refreshIsoDist(this._marker.getLatLng());
	}

	get DisplayRadius() {
		let displayRadius = false;

		const displayRadiusInput = document.getElementById('isodist-display-radius');
		if (displayRadiusInput instanceof HTMLInputElement) {
			displayRadius = displayRadiusInput.checked;
		}

		return displayRadius;
	}

	get Distance1() {
		let distance = 1;

		const distanceInput = document.getElementById('isodist-distance-1');
		if (distanceInput instanceof HTMLInputElement) {
			const parsedInput = parseFloat(distanceInput.value);
			if (!isNaN(parsedInput)) {
				distance = parsedInput;
			}
		}

		return distance;
	}

	get Distance2() {
		let distance = 1;

		const distanceInput = document.getElementById('isodist-distance-2');
		if (distanceInput instanceof HTMLInputElement) {
			const parsedInput = parseFloat(distanceInput.value);
			if (!isNaN(parsedInput)) {
				distance = parsedInput;
			}
		}

		return distance;
	}

	get Distance3() {
		let distance = 1;

		const distanceInput = document.getElementById('isodist-distance-3');
		if (distanceInput instanceof HTMLInputElement) {
			const parsedInput = parseFloat(distanceInput.value);
			if (!isNaN(parsedInput)) {
				distance = parsedInput;
			}
		}

		return distance;
	}

	get HexSize() {
		let hexSize = 1;

		const hexSizeInput = document.getElementById('isodist-hex-size');
		if (hexSizeInput instanceof HTMLInputElement) {
			const parsedInput = parseFloat(hexSizeInput.value);
			if (!isNaN(parsedInput)) {
				hexSize = parsedInput;
			}
		}

		return hexSize;
	}

	get NoDeburr() {
		let noDeburr = false;

		const noDeburrInput = document.getElementById('isodist-no-deburr');
		if (noDeburrInput instanceof HTMLInputElement) {
			noDeburr = noDeburrInput.checked;
		}

		return noDeburr;
	}

	get Provider() {
		let provider = '';

		const providerSelect = document.getElementById('isodist-provider');
		if (providerSelect instanceof HTMLSelectElement) {
			provider = providerSelect.value;
		}

		return provider;
	}

	get Resolution() {
		let resolution = 1;

		const resolutionInput = document.getElementById('isodist-resolution');
		if (resolutionInput instanceof HTMLInputElement) {
			const parsedInput = parseFloat(resolutionInput.value);
			if (!isNaN(parsedInput)) {
				resolution = parsedInput;
			}
		}

		return resolution;
	}

	getMarkerCenter() {
		return this._marker.getLatLng();
	}

	refreshIsoDist(center) {
		const applyChangesButton = document.getElementById('isodist-apply-settings');
		if (applyChangesButton instanceof HTMLButtonElement) {
			applyChangesButton.disabled = true;
		}

		const distances = [{
			distance: this.Distance1
		}];
		if (this.Distance2 > 0) {
			distances.push({
				distance: this.Distance2
			});
		}
		if (this.Distance3 > 0) {
			distances.push({
				distance: this.Distance3
			});
		}
		const inputJson = {
			origin: {
				type: 'Point',
				coordinates: [ center.lng, center.lat ]
			},
			deintersect: true,
			hexSize: this.HexSize,
			noDeburr: this.NoDeburr,
			provider: this.Provider,
			resolution: this.Resolution,
			distances
		};
	
		const options = {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(inputJson)
		};
		fetch('api/', options)
			.then(res => res.json())
			.then(json => {
				if (applyChangesButton instanceof HTMLButtonElement) {
					applyChangesButton.disabled = false;
				}

				let oldPolygon = undefined;
				while(oldPolygon = this._polygons.pop()) {
					oldPolygon.remove();
				}
				let oldCircle = undefined;
				while(oldCircle = this._circles.pop()) {
					oldCircle.remove();
				}
	
				if (!json.type) {
					alert('no type found in geojson');
					return;
				}

				const reverseLatLongCoordinates = function(coordinates) {
					const leafletCoordinates = [];
					for(const subCoordinates of coordinates) {
						const leafletCoordinatesSub = [];
						for(const point of subCoordinates) {
							leafletCoordinatesSub.push([point[1], point[0]]);
						}
						leafletCoordinates.push(leafletCoordinatesSub)
					}

					return leafletCoordinates;
				};

				const colors = ['lime', 'yellow', 'red'];
				let polygonCounter = 0;

				switch(json.type) {
					case 'Feature':
						alert(`unhandled geojson-type: ${json.type}`);
						break;
					
					case 'FeatureCollection':
						if (!(json.features instanceof Array)) {
							alert('geojson-features is not an array');
							break;
						}

						const featuresCount = json.features.length;
						for(const feature of json.features) {
							if (feature.type !== 'Feature') {
								alert(`invalid geojson-feature-type: ${feature.type}`);
								continue;
							}
							if (!feature.geometry) {
								alert('no geojson-feature-geometry');
								continue;
							}
							const geometry = feature.geometry;
							if (!geometry.type) {
								alert('no type found in geojson-geometry');
							}
							if (!geometry.coordinates) {
								alert('no geometry-coordinates found.');
								break;
							}
							if (!(geometry.coordinates instanceof Array)) {
								alert('geometry-coordinates is not an array');
								break;
							}

							let color = colors[featuresCount - 1 - polygonCounter] || 'white';

							switch(geometry.type) {
								case 'Polygon':
									const leafletCoordinates = reverseLatLongCoordinates(geometry.coordinates);
									const polygon = L.polygon(leafletCoordinates, { color: color });
									polygon.addTo(this._map);
									this._polygons.push(polygon);

									if (this.DisplayRadius && feature.properties && feature.properties.distance) {
										const circle = L.circle(this.getMarkerCenter(), { color: color, fill: false, radius: feature.properties.distance * 1000 });
										circle.addTo(this._map);
										this._circles.push(circle);
									}

									polygonCounter++;
									break;
								
								case 'MultiPolygon':
									let multiCoordinates = geometry.coordinates;
									for(let i in multiCoordinates) {
										multiCoordinates[i] = reverseLatLongCoordinates(multiCoordinates[i]);
									}
									const multiPolygon = L.polygon(multiCoordinates, { color: color });
									multiPolygon.addTo(this._map);
									this._polygons.push(multiPolygon);

									if (this.DisplayRadius && feature.properties && feature.properties.distance) {
										const circle = L.circle(this.getMarkerCenter(), { color: color, fill: false, radius: feature.properties.distance * 1000 });
										circle.addTo(this._map);
										this._circles.push(circle);
									}

									polygonCounter++;
									break;
								
								default:
									alert(`unhandled geometry-type: ${geometry.type}`);
									break;
							}
						}
						break;
					
					default:
						alert(`invalid geojson-type: ${json.type}`);
						break;
				}
			})
			.catch(exc => {
				if (applyChangesButton instanceof HTMLButtonElement) {
					applyChangesButton.disabled = false;
				}
				let oldPolygon = undefined;
				while(oldPolygon = this._polygons.pop()) {
					oldPolygon.remove();
				}
				let oldCircle = undefined;
				while(oldCircle = this._circles.pop()) {
					oldCircle.remove();
				}
				alert(exc);
			});
	}
}

let isodistDemo = null;

L.Control.IsoDist = L.Control.extend({
	onAdd: function(_map) {
		const buildNumberInputRow = function(col1Content, inputId, defaults) {
			const tRowDistance = document.createElement('tr');
			const tColDistance1 = document.createElement('td');
			tColDistance1.appendChild(document.createTextNode(col1Content));
			tRowDistance.appendChild(tColDistance1);
			const tColDistance2 = document.createElement('td');
			tColDistance2.style.width = '75px';
			const distanceInput = document.createElement('input');
			distanceInput.id = inputId;
			distanceInput.type = 'number';
			if (defaults) {
				if (typeof defaults.value === 'number') {
					distanceInput.value = defaults.value;
				}
				if (typeof defaults.min === 'number') {
					distanceInput.min = defaults.min;
				}
				if (typeof defaults.step === 'number') {
					distanceInput.step = defaults.step;
				}
			}
			distanceInput.style.width = '100%';
			tColDistance2.appendChild(distanceInput);
			tRowDistance.appendChild(tColDistance2);

			return tRowDistance;
		};

		const container = document.createElement('div');
		container.classList.add('leaflet-bar');
		container.id = 'isodist-control';
		container.addEventListener('dblclick', evt => {
			evt.stopPropagation();
		});

		const isodistImg = document.createElement('img');
		isodistImg.id = 'isodist-control-symbol';
		isodistImg.src = 'gfx/svg/favicon.svg';
		isodistImg.width = 32;
		isodistImg.height = 32;
		isodistImg.style.position = 'absolute';
		isodistImg.style.top = '-1px';
		isodistImg.style.right = '-1px';
		container.appendChild(isodistImg);

		const contentContainer = document.createElement('div');
		contentContainer.id = 'isodist-control-content';

		const table = document.createElement('table');
		const tBody = document.createElement('tbody');
		const tFoot = document.createElement('tfoot');
		table.appendChild(tBody);
		table.appendChild(tFoot);

		const tRowProvider = document.createElement('tr');
		const tColProvider1 = document.createElement('td');
		tColProvider1.appendChild(document.createTextNode('provider'));
		const tColProvider2 = document.createElement('td');
		const providerSelect = document.createElement('select')
		providerSelect.id = 'isodist-provider';
		providerSelect.style.width = '100%';
		const providers = ['valhalla', 'osrm'];
		for(const provider of providers) {
			const providerOption = document.createElement('option');
			providerOption.value = provider;
			providerOption.appendChild(document.createTextNode(provider));
			providerSelect.appendChild(providerOption);
		}
		tColProvider2.appendChild(providerSelect);
		tRowProvider.appendChild(tColProvider1);
		tRowProvider.appendChild(tColProvider2);
		tBody.appendChild(tRowProvider);

		const tRowDistance1 = buildNumberInputRow('distance 1 (km):', 'isodist-distance-1', { value: 2, min: 0.1, step: 0.1 });
		tBody.appendChild(tRowDistance1);

		const tRowDistance2 = buildNumberInputRow('distance 2 (km):', 'isodist-distance-2', { value: 0, min: 0, step: 0.1 });
		tBody.appendChild(tRowDistance2);

		const tRowDistance3 = buildNumberInputRow('distance 3 (km):', 'isodist-distance-3', { value: 0, min: 0, step: 0.1 });
		tBody.appendChild(tRowDistance3);

		const tRowResolution = document.createElement('tr');
		const tColResolution1 = document.createElement('td');
		tColResolution1.appendChild(document.createTextNode('resolution:'));
		tRowResolution.appendChild(tColResolution1);
		const tColResolution2 = document.createElement('td');
		tColResolution2.style.width = '75px';
		const resolutionInput = document.createElement('input');
		resolutionInput.id = 'isodist-resolution';
		resolutionInput.type = 'number';
		resolutionInput.value = 0.2;
		resolutionInput.min = 0.1;
		resolutionInput.step = 0.1;
		resolutionInput.style.width = '100%';
		tColResolution2.appendChild(resolutionInput);
		tRowResolution.appendChild(tColResolution2);
		tBody.appendChild(tRowResolution);

		const tRowHexSize = document.createElement('tr');
		const tColHexSize1 = document.createElement('td');
		tColHexSize1.appendChild(document.createTextNode('hex-size:'));
		tRowHexSize.appendChild(tColHexSize1);
		const tColHexSize2 = document.createElement('td');
		tColHexSize2.style.width = '75px';
		const hexSizeInput = document.createElement('input');
		hexSizeInput.id = 'isodist-hex-size';
		hexSizeInput.type = 'number';
		hexSizeInput.value = 0.5;
		hexSizeInput.min = 0;
		hexSizeInput.step = 0.1;
		hexSizeInput.style.width = '100%';
		tColHexSize2.appendChild(hexSizeInput);
		tRowHexSize.appendChild(tColHexSize2);
		tBody.appendChild(tRowHexSize);

		const tRowNoDeburr = document.createElement('tr');
		const tColNoDeburr1 = document.createElement('td');
		tColNoDeburr1.appendChild(document.createTextNode('no-deburr:'));
		tRowNoDeburr.appendChild(tColNoDeburr1);
		const tColNoDeburr2 = document.createElement('td');
		tColNoDeburr2.style.textAlign = 'center';
		const noDeburrInput = document.createElement('input');
		noDeburrInput.id = 'isodist-no-deburr';
		noDeburrInput.type = 'checkbox';
		tColNoDeburr2.appendChild(noDeburrInput);
		tRowNoDeburr.appendChild(tColNoDeburr2);
		tBody.appendChild(tRowNoDeburr);

		const tRowDisplayRadius = document.createElement('tr');
		const tColDisplayRadius1 = document.createElement('td');
		tColDisplayRadius1.appendChild(document.createTextNode('display radius:'));
		tRowDisplayRadius.appendChild(tColDisplayRadius1);
		const tColDisplayRadius2 = document.createElement('td');
		tColDisplayRadius2.style.textAlign = 'center';
		const displayRadiusInput = document.createElement('input');
		displayRadiusInput.id = 'isodist-display-radius';
		displayRadiusInput.type = 'checkbox';
		tColDisplayRadius2.appendChild(displayRadiusInput);
		tRowDisplayRadius.appendChild(tColDisplayRadius2);
		tBody.appendChild(tRowDisplayRadius);

		const tFootRow = document.createElement('tr');
		const tFootCol = document.createElement('td');
		tFootCol.colSpan = 2;
		tFootCol.style.textAlign = 'center';
		const applyChangesButton = document.createElement('button');
		applyChangesButton.id = 'isodist-apply-settings';
		applyChangesButton.appendChild(document.createTextNode('apply'));
		applyChangesButton.addEventListener('click', () => {
			isodistDemo.refreshIsoDist(isodistDemo.getMarkerCenter());
		});
		tFootCol.appendChild(applyChangesButton);
		tFootRow.appendChild(tFootCol);
		tFoot.appendChild(tFootRow);

		contentContainer.appendChild(table);

		container.appendChild(contentContainer);

		return container;
	},
	_mouseover: function() {
		console.log('_mouseover');
	},
	_mouseout: function() {
		console.log('_mouseout');
	}
});

L.control.isodist = function(opts) {
	return new L.Control.IsoDist(opts);
}

document.addEventListener('DOMContentLoaded', () => {
	isodistDemo = new IsoDistDemo();
});
