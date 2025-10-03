/**
 * Custom presentation class for the Route widget.
 *
 * Extends the base class which implements the default functionality of any widget.
 */
class WMRoute extends CWidget {

	/**
	 * Inline SVG image for use as a finish marker of the route.
	 *
	 * @type {string}
	 */
	static #icon_svg = `
		<svg width="24" height="32" viewBox="0 0 24 32" xmlns="http://www.w3.org/2000/svg">
			<path fill="#B44" fill-rule="evenodd" clip-rule="evenodd" d="M12 24C12.972 24 18 15.7794 18 12.3C18 8.82061 15.3137 6 12 6C8.68629 6 6 8.82061 6 12.3C6 15.7794 11.028 24 12 24ZM12.0001 15.0755C13.4203 15.0755 14.5716 13.8565 14.5716 12.3528C14.5716 10.8491 13.4203 9.63011 12.0001 9.63011C10.58 9.63011 9.42871 10.8491 9.42871 12.3528C9.42871 13.8565 10.58 15.0755 12.0001 15.0755Z"/>
		</svg>
	`;

	/**
	 * Map object of the Leaflet component.
	 */
	#map = null;

	/**
	 * Resolve as soon as the widget is fully rendered (ready for printing).
	 *
	 * Overloads the default implementation of the readiness method.
	 * Readiness state is crucial for PDF reporting of dashboards.
	 *
	 * @returns {Promise<unknown>}
	 */
	promiseReady() {
		return new Promise(resolve => {
			// Wait unless the map is ready (Leaflet implements its own readiness callback).
			this.#map.whenReady(() => {
				// When the map is ready, wait unless the default readiness promise is resolved.
				super.promiseReady()
					// Lastly, wait for the final animations to finish.
					.then(() => setTimeout(resolve, 300));
			});
		});
	}

	/**
	 * Promise to update the widget.
	 *
	 * Overloads the default implementation of the update method.
	 *
	 * @see CWidget.promiseUpdate
	 *
	 * @returns {Promise<void>}
	 */
	promiseUpdate() {
		// Use convenient methods from the base CWidget and CWidgetBase classes.
		if (!this.hasEverUpdated()) {
			return this.#promiseCreateAndShowMap();
		}

		// Return a resolved promise, since the update routine is promise-based.
		return Promise.resolve();
	}

	/**
	 * Promise to create and show the map with the way-points fetched for a particular item.
	 *
	 * @returns {Promise<void>}
	 */
	#promiseCreateAndShowMap() {
		const map_wrapper = document.createElement('div');

		map_wrapper.classList.add('map-wrapper');

		// Set the content for a particular widget instance.
		this._body.appendChild(map_wrapper);

		// Focus the map in the center of London.
		this.#map = L.map(map_wrapper).setView([51.505, -0.09], 13);

		L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
			attribution: '&copy; OpenStreetMap contributors'
		}).addTo(this.#map);

		// Calculate current UNIX timestamp.
		const time = Math.floor(Date.now() / 1000);

		// Run the "history.get" ZABBIX API method and return a promise.
		return ApiCall('history.get', {
			// Use inline constant instead of numbers.
			history: ITEM_VALUE_TYPE_STR,
			// Use exact Item ID for testing purposes.
			itemids: ['68626'],
			// Specify the last hour for history data extraction.
			time_from: time - 60 * 60,
			time_till: time,
			// Get only the values from the history, timestamps are not needed.
			output: ['value'],
			// Sort the data by the clock.
			sortfield: 'clock',
			sortorder: 'ASC'
		})
			.then(response => {
				const points = response.result
					// Parse received JSON data.
					.map(row => JSON.parse(row.value))
					// Convert the data to the required format.
					.map(row => [row.lat, row.lng]);

				// Display the way-points on the map.
				L.polyline(points, {color: 'blue'}).addTo(this.#map);

				// Create a marker icon from the inline SVG image.
				const icon = L.icon({
					iconUrl: `data:image/svg+xml;base64,${btoa(WMRoute.#icon_svg)}`,
					iconSize: [46, 61],
					iconAnchor: [22, 44]
				});

				// Display the icon over the last way-point as a finish marker.
				L.marker(...points.slice(-1), {icon}).addTo(this.#map);

				// Show the whole route centered and fully visible on the map.
				this.#map.fitBounds(points);
			});
	}

	/**
	 * Intercept the resizing event of the widget container.
	 */
	onResize() {
		if (this.#map !== null) {
			// Inform the map component that the size of the container has changed.
			this.#map.invalidateSize();
		}
	}

	/**
	 * Turn off the text mode and use all available space for widget presentation.
	 *
	 * @returns {boolean}
	 */
	hasPadding() {
		return false;
	}
}
