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
	 * The route and the finish marker layers on the map.
	 *
	 * @type {Array}
	 */
	#map_layers = [];

	/**
	 * The ID of the item, for which the route is currently being displayed.
	 *
	 * @type {string|null}
	 */
	#itemid = null;

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
		// Get the ID of the item, for which the route shall be displayed (IDs always have a type of array).
		const itemid = this.getFieldsData().itemid[0];

		return this.#promiseShowRoute(itemid);
	}

	/**
	 * Create and show the map.
	 *
	 * Currently displayed contents will be cleared.
	 */
	#createAndShowMap() {
		this.clearContents();

		const map_wrapper = document.createElement('div');

		map_wrapper.classList.add('map-wrapper');

		// Set the content for a particular widget instance.
		this._body.appendChild(map_wrapper);

		// Focus the map in the center of London.
		const map = L.map(map_wrapper);

		L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
			attribution: '&copy; OpenStreetMap contributors'
		}).addTo(map);

		return map;
	}

	/**
	 * Promise to show the route of the specified item.
	 *
	 * @param {string} itemid
	 *
	 * @returns {Promise<void>}
	 */
	#promiseShowRoute(itemid) {
		if (itemid === this.#itemid) {
			// Do nothing if the route of the specified item ID is already being displayed.
			return Promise.resolve();
		}

		// Save the new displayed item ID.
		this.#itemid = itemid;

		// Remove previous way-points and the finish marker from the map.
		this.#map_layers.forEach(layer => this.#map.removeLayer(layer));
		this.#map_layers = [];

		// Calculate current UNIX timestamp.
		const time = Math.floor(Date.now() / 1000);

		// Run the "history.get" ZABBIX API method and return a promise.
		return ApiCall('history.get', {
			// Use inline constant instead of numbers.
			history: ITEM_VALUE_TYPE_STR,
			// Retrieve the history data for the specified item.
			itemids: [itemid],
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
				if (this.#map === null) {
					this.#map = this.#createAndShowMap();
				}

				const points = response.result
					// Parse received JSON data.
					.map(row => JSON.parse(row.value))
					// Convert the data to the required format.
					.map(row => [row.lat, row.lng]);

				// Draw the way-points and the marker only if there is any data.
				if (points.length > 0) {
					const polyline = L.polyline(points, {color: 'blue'});

					// Display the way-points on the map.
					polyline.addTo(this.#map);

					// Create a marker icon from the inline SVG image.
					const icon = L.icon({
						iconUrl: `data:image/svg+xml;base64,${btoa(WMRoute.#icon_svg)}`,
						iconSize: [46, 61],
						iconAnchor: [22, 44]
					});

					const marker = L.marker(...points.slice(-1), {icon});

					// Display the icon over the last way-point as a finish marker.
					marker.addTo(this.#map);

					// Show the whole route centered and fully visible on the map.
					this.#map.fitBounds(points);

					this.#map_layers.push(polyline, marker);
				}
			});
	}

	/**
	 * Intercept the clear-contents event.
	 *
	 * Resets the state as if the map was never displayed.
	 */
	onClearContents() {
		if (this.#map !== null) {
			// Shut down and remove the map.
			this.#map.remove();
		}

		this.#map = null;
		this.#map_layers = [];

		this.#itemid = null;
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
