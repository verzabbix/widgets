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
	 * The time period for which the route is currently being displayed.
	 *
	 * @type {Object|null}
	 */
	#time_period = null;

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
		// Get the actual configuration data.
		const fields_data = this.getFieldsData();

		// Get the ID of the item, for which the route shall be displayed (IDs always have a type of array).
		const itemid = fields_data.itemid[0];

		// Time period object, containing "from", "to", "from_ts" and "to_ts" keys.
		const time_period = fields_data.time_period;

		/*
		 * Match the item on the override host only if presenting the widget on a global dashboard.
		 *
		 * If presenting on a host dashboard (see Monitoring => Hosts => Dashboards), the item substitution will be done
		 * automatically and the item ID will point to the matched item on the presented host.
		 */

		// Is the widget being presented on a global dashboard?
		if (this._dashboard.templateid === null) {
			// The ID of the host for which a similar item should be searched for.
			const override_hostid = fields_data.override_hostid.length > 0
				? fields_data.override_hostid[0]
				: null;

			if (override_hostid !== null) {
				// Show the route for the matched item if the host override is specified.
				return this.#matchItem(itemid, override_hostid)
					.then(matched_itemid => this.#promiseShowRoute(matched_itemid, time_period));
			}
		}

		return this.#promiseShowRoute(itemid, time_period);
	}

	/**
	 * Find a matching item on the specified host, having the same key as the original item.
	 *
	 * @param itemid
	 * @param override_hostid
	 *
	 * @returns {Promise<string>}
	 */
	#matchItem(itemid, override_hostid) {
		// Get the key of the specified item.
		return ApiCall('item.get', {
			itemids: [itemid],
			output: ['key_']
		})
			// Extract the key from the result data.
			.then(response => response.result[0].key_)
			.then(key_ =>
				// Search for the similar item on the specified override host.
				ApiCall('item.get', {
					hostids: [override_hostid],
					filter: {key_},
					output: ['itemid']
				})
			)
			// Extract matched item ID from the result data.
			.then(response => response.result[0].itemid);
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
	 * @param {Object} time_period
	 *
	 * @returns {Promise<void>}
	 */
	#promiseShowRoute(itemid, time_period) {
		if (itemid === this.#itemid && time_period === this.#time_period) {
			// Do nothing if the route of the specified item ID and the time period is already being displayed.
			return Promise.resolve();
		}

		// Save the new displayed item ID and the time period.
		this.#itemid = itemid;
		this.#time_period = time_period;

		// Remove previous way-points and the finish marker from the map.
		this.#map_layers.forEach(layer => this.#map.removeLayer(layer));
		this.#map_layers = [];

		// Run the "history.get" ZABBIX API method and return a promise.
		return ApiCall('history.get', {
			// Use inline constant instead of numbers.
			history: ITEM_VALUE_TYPE_STR,
			// Retrieve the history data for the specified item and the time period.
			itemids: [itemid],
			time_from: time_period.from_ts,
			time_till: time_period.to_ts,
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

				if (points.length === 0) {
					// Show a nice message in case if there are no way-points to show.
					this.#showNoDataFound();

					return;
				}

				if (this.#map === null) {
					this.#map = this.#createAndShowMap();
				}

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
			});
	}

	/**
	 * Show a no-data message and clear the previously displayed contents.
	 */
	#showNoDataFound() {
		// Calling this method will also invoke the onClearContents method.
		this.clearContents();

		const message_wrapper = document.createElement('div');

		message_wrapper.textContent = 'No data found';

		// Use standard classes to specify the look of the message.
		message_wrapper.classList.add(ZBX_STYLE_NO_DATA_MESSAGE, ZBX_ICON_SEARCH_LARGE);

		this._body.appendChild(message_wrapper);
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
		this.#time_period = null;
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
