class WMRoute extends CWidget {

	#map = null;

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
		if (!this.hasEverUpdated()) {
			return this.#createAndShowMap();
		}

		return Promise.resolve();
	}

	#createAndShowMap() {
		const map_wrapper = document.createElement('div');

		map_wrapper.classList.add('map-wrapper');

		this._body.appendChild(map_wrapper);

		this.#map = L.map(map_wrapper).setView([51.505, -0.09], 13);

		L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
			attribution: '&copy; OpenStreetMap contributors'
		}).addTo(this.#map);

		const time = Math.floor(Date.now() / 1000);

		return ApiCall('history.get', {
			history: ITEM_VALUE_TYPE_STR,
			itemids: ['68626'],
			time_from: time - 60 * 60,
			time_till: time,
			output: ['value'],
			sortfield: 'clock',
			sortorder: 'ASC'
		})
			.then(response => {
				const points = response.result
					.map(row => JSON.parse(row.value))
					.map(row => [row.lat, row.lng]);

				L.polyline(points, {color: 'blue'}).addTo(this.#map);

				const icon = L.icon({
					iconUrl: `data:image/svg+xml;base64,${btoa(this.#icon_svg)}`,
					iconSize: [46, 61],
					iconAnchor: [22, 44]
				});

				L.marker(...points.slice(-1), {icon}).addTo(this.#map);

				this.#map.fitBounds(points);
			});
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
