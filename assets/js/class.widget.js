class WMRoute extends CWidget {

	#map = null;
	#map_layers = [];

	#itemid = null;
	#time_period = null;

	#icon_svg = `
		<svg width="24" height="32" viewBox="0 0 24 32" xmlns="http://www.w3.org/2000/svg">
			<path fill="#B44" fill-rule="evenodd" clip-rule="evenodd" d="M12 24C12.972 24 18 15.7794 18 12.3C18 8.82061 15.3137 6 12 6C8.68629 6 6 8.82061 6 12.3C6 15.7794 11.028 24 12 24ZM12.0001 15.0755C13.4203 15.0755 14.5716 13.8565 14.5716 12.3528C14.5716 10.8491 13.4203 9.63011 12.0001 9.63011C10.58 9.63011 9.42871 10.8491 9.42871 12.3528C9.42871 13.8565 10.58 15.0755 12.0001 15.0755Z"/>
		</svg>
	`;

	promiseReady() {
		return new Promise(resolve => {
			this.#map.whenReady(() => {
				super.promiseReady()
					.then(() => setTimeout(resolve, 300));
			});
		});
	}

	promiseUpdate() {
		const fields_data = this.getFieldsData();

		const itemids = fields_data.itemid;
		const time_period = fields_data.time_period;
		const override_hostids = fields_data.override_hostid;

		if (override_hostids.length > 0) {
			return this.#matchItem(itemids[0], override_hostids[0])
				.then(matched_itemid => this.#promiseShowRoute(matched_itemid, time_period));
		}

		return this.#promiseShowRoute(itemids[0], time_period);
	}

	#matchItem(itemid, override_hostid) {
		return ApiCall('item.get', {
			itemids: [itemid],
			output: ['key_']
		})
			.then(response => response.result[0].key_)
			.then(key_ =>
				ApiCall('item.get', {
					hostids: [override_hostid],
					filter: {key_},
					output: ['itemid']
				})
			)
			.then(response => response.result[0].itemid);
	}

	#createAndShowMap() {
		this.clearContents();

		const map_wrapper = document.createElement('div');

		map_wrapper.classList.add('map-wrapper');

		this._body.appendChild(map_wrapper);

		const map = L.map(map_wrapper);

		L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
			attribution: '&copy; OpenStreetMap contributors'
		}).addTo(map);

		return map;
	}

	#promiseShowRoute(itemid, time_period) {
		if (itemid === this.#itemid && time_period === this.#time_period) {
			return Promise.resolve();
		}

		this.#itemid = itemid;
		this.#time_period = time_period;

		this.#map_layers.forEach(layer => this.#map.removeLayer(layer));
		this.#map_layers = [];

		return ApiCall('history.get', {
			history: ITEM_VALUE_TYPE_STR,
			itemids: [itemid],
			time_from: time_period.from_ts,
			time_till: time_period.to_ts,
			output: ['value'],
			sortfield: 'clock',
			sortorder: 'ASC'
		})
			.then(response => {
				const points = response.result
					.map(row => JSON.parse(row.value))
					.map(row => [row.lat, row.lng]);

				if (points.length === 0) {
					this.#showNoDataFound();

					return;
				}

				if (this.#map === null) {
					this.#map = this.#createAndShowMap();
				}

				const polyline = L.polyline(points, {color: 'blue'});

				polyline.addTo(this.#map);

				const icon = L.icon({
					iconUrl: `data:image/svg+xml;base64,${btoa(this.#icon_svg)}`,
					iconSize: [46, 61],
					iconAnchor: [22, 44]
				});

				const marker = L.marker(...points.slice(-1), {icon});

				marker.addTo(this.#map);

				this.#map.fitBounds(points);

				this.#map_layers.push(polyline, marker);
			});
	}

	#showNoDataFound() {
		this.clearContents();

		const message_wrapper = document.createElement('div');

		message_wrapper.textContent = 'No data found';
		message_wrapper.classList.add(ZBX_STYLE_NO_DATA_MESSAGE, ZBX_ICON_SEARCH_LARGE);

		this._body.appendChild(message_wrapper);
	}

	onClearContents() {
		if (this.#map !== null) {
			this.#map.remove();
		}

		this.#map = null;
		this.#map_layers = [];

		this.#itemid = null;
		this.#time_period = null;
	}

	onResize() {
		if (this.#map !== null) {
			this.#map.invalidateSize();
		}
	}

	hasPadding() {
		return false;
	}
}
