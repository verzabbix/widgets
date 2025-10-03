<?php declare(strict_types = 0);

namespace Modules\WMRoute\Actions;

use API,
	CControllerDashboardWidgetView,
	CControllerResponseData;

/**
 * Custom presentation controller class for the Route widget.
 *
 * Extends the base stub class which implements basic input data validation.
 */
class WidgetView extends CControllerDashboardWidgetView {

	/**
	 * The initialization method of the controller.
	 *
	 * Additional validation rules shall be added in this method.
	 *
	 * @return void
	 */
	protected function init(): void {
		parent::init();

		// Specify validation rules for custom parameters, supplied by the JavaScript class.
		$this->addValidationRules([
			// Indication that the templates (the finish icon marker) were requested by the JavaScript class.
			'with_templates' => 'in 1',
			// Indication that the widget is configured for a static time period.
			'has_custom_time_period' => 'in 1'
		]);
	}

	/**
	 * The entry point of the controller, as soon as the validation has succeeded.
	 *
	 * The data for the PHP presentation shall be prepared here.
	 *
	 * @return void
	 */
	protected function doAction(): void {
		// Get the actual item data, for which the way-points will be fetched from the history tables.
		$item = $this->getItem();

		// Prepare the data for the presentation.
		$output = [
			// Custom widget name, including the name of the override host.
			'name' => $this->getName($item),
			// Custom icon for the custom time period for addition in the widget header.
			'info' => $this->makeWidgetInfo(),
			// Whether to return the finish marker icon along with the way-points.
			'with_templates' => $this->hasInput('with_templates'),
			// Debug information for displaying under the contents of the widget when the debug mode is enabled for the
			// user group.
			'user' => [
				'debug_mode' => $this->getDebugMode()
			]
		];

		if ($item !== null) {
			// Fetch the way-points from the history.
			$route = $this->getRoute($item['itemid']);

			if (!array_key_exists('error', $route)) {
				// If there were no errors, pass the way-points to the presentation.
				$output['points'] = $route['points'];
			}
			else {
				// If it wasn't possible to fetch the way-points, pass the error to the presentation.
				$output['error'] = $route['error'];
			}
		}
		else {
			// Display a standard error message if the requested item was not found by the API.
			$output['error'] = _('No permissions to referred object or it does not exist!');
		}

		// Set the data object for the presentation.
		$this->setResponse(new CControllerResponseData($output));
	}

	/**
	 * Get the actual item to display the route for.
	 *
	 * Will match the item on override host if such is specified.
	 *
	 * @return array|null  Item ID and name or null if the item or the override host, or the matching item is not found.
	 */
	private function getItem(): ?array {
		$item_options = [
			// Get the item ID and name from the API.
			'output' => ['itemid', 'name']
		];

		// Calculate the item ID on the override host, on global dashboards.
		if (!$this->isTemplateDashboard() && $this->fields_values['override_hostid']) {
			// Get the key of the specified item.
			$src_items = API::Item()->get([
				'output' => ['key_'],
				'itemids' => $this->fields_values['itemid']
			]);

			if (!$src_items) {
				return null;
			}

			// Search for the similar item on the specified override host.
			$item_options['hostids'] = $this->fields_values['override_hostid'];
			$item_options['filter']['key_'] = $src_items[0]['key_'];
		}
		else {
			// Fetch the requested item if no host override was specified.
			$item_options['itemids'] = $this->fields_values['itemid'];
		}

		$items = API::Item()->get($item_options);

		if (!$items) {
			return null;
		}

		return $items[0];
	}

	/**
	 * Get the way-points for the specified item.
	 *
	 * @param string $itemid
	 *
	 * @return array  Either "points" containing decoded way-points or "error" containing the error string.
	 */
	private function getRoute(string $itemid): array {
		// Get the way-points data from the history.
		$result = API::History()->get([
			// Use inline constant instead of numbers.
	 		'history' => ITEM_VALUE_TYPE_STR,
			// Retrieve the history data for the specified item and the time period.
	 		'itemids' => [$itemid],
	 		'time_from' => $this->fields_values['time_period']['from_ts'],
	 		'time_till' => $this->fields_values['time_period']['to_ts'],
			// Get only the values from the history, timestamps are not needed.
	 		'output' => ['value'],
			// Sort the data by the clock.
	 		'sortfield' => 'clock',
	 		'sortorder' => 'ASC'
		]);

		$points = [];

		foreach ($result as ['value' => $value]) {
			// Parse the JSON data.
			$location = json_decode($value, true);

			// Validate the format.
			if (!is_array($location) || !array_key_exists('lat', $location) || !array_key_exists('lng', $location)) {
				return [
					'error' => 'Invalid location data!'
				];
			}

			$points[] = [
				'lat' => $location['lat'],
				'lng' => $location['lng']
			];
		}

		return [
			'points' => $points
		];
	}

	/**
	 * Get a better default name for the widget if no custom name was specified.
	 *
	 * @param array|null $item
	 *
	 * @return string
	 */
	private function getName(?array $item): string {
		if ($this->getInput('name', '') !== '') {
			// If a custom name is specified, return it as is.
			return $this->getInput('name');
		}

		if ($this->isTemplateDashboard() && !$this->fields_values['override_hostid']) {
			// If editing a widget on the template dashboard, return the default name without alteration.
			return $this->widget->getDefaultName();
		}

		// Use the item name as the last part of the widget name if the item was actually fetched.
		$name = $item !== null ? $item['name'] : $this->widget->getDefaultName();

		// Do not add more information to the name of the widget if working with a template dashboard.
		if (!$this->isTemplateDashboard()) {
			if ($this->fields_values['override_hostid']) {
				$hosts = API::Host()->get([
					'output' => ['name'],
					'hostids' => $this->fields_values['override_hostid']
				]);
			}
			elseif ($item !== null) {
				$hosts = API::Host()->get([
					'output' => ['name'],
					'itemids' => $item['itemid']
				]);
			}
			else {
				$hosts = [];
			}

			if ($hosts) {
				// Prefix the name of the widget with a host name.
				$name = $hosts[0]['name'].NAME_DELIMITER.$name;
			}
		}

		return $name;
	}

	/**
	 * Get a specification of icons for displaying on the header of the widget.
	 *
	 * @return array
	 */
	private function makeWidgetInfo(): array {
		$info = [];

		if ($this->hasInput('has_custom_time_period')) {
			// Add a custom time period icon to the header of the widget.
			$info[] = [
				'icon' => ZBX_ICON_TIME_PERIOD,
				// Add a mouse-over hint with the exact time period.
				'hint' => relativeDateToText($this->fields_values['time_period']['from'],
					$this->fields_values['time_period']['to']
				)
			];
		}

		return $info;
	}
}
