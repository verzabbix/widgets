<?php declare(strict_types = 0);

namespace Modules\WMRoute\Actions;

use API,
	CControllerDashboardWidgetView,
	CControllerResponseData;

class WidgetView extends CControllerDashboardWidgetView {

	protected function init(): void {
		parent::init();

		$this->addValidationRules([
			'with_templates' => 'in 1',
			'has_custom_time_period' => 'in 1'
		]);
	}

	protected function doAction(): void {
		$item = $this->getItem();

		$output = [
			'name' => $this->getName($item),
			'info' => $this->makeWidgetInfo(),
			'with_templates' => $this->hasInput('with_templates'),
			'user' => [
				'debug_mode' => $this->getDebugMode()
			]
		];

		if ($item !== null) {
			$route = $this->getRoute($item['itemid']);

			if (array_key_exists('error', $route)) {
				$output['error'] = $route['error'];
			}
			else {
				$output['points'] = $route['points'];
			}
		}
		else {
			$output['error'] = _('No permissions to referred object or it does not exist!');
		}

		$this->setResponse(new CControllerResponseData($output));
	}

	private function getItem(): ?array {
		$item_options = [
			'output' => ['itemid', 'name']
		];

		if (!$this->isTemplateDashboard() && $this->fields_values['override_hostid']) {
			$src_items = API::Item()->get([
				'output' => ['key_'],
				'itemids' => $this->fields_values['itemid']
			]);

			if (!$src_items) {
				return null;
			}

			$item_options['hostids'] = $this->fields_values['override_hostid'];
			$item_options['filter']['key_'] = $src_items[0]['key_'];
		}
		else {
			$item_options['itemids'] = $this->fields_values['itemid'];
		}

		$items = API::Item()->get($item_options);

		if (!$items) {
			return null;
		}

		return $items[0];
	}

	private function getRoute(string $itemid): array {
		$result = API::History()->get([
	 		'history' => ITEM_VALUE_TYPE_STR,
	 		'itemids' => [$itemid],
	 		'time_from' => $this->fields_values['time_period']['from_ts'],
	 		'time_till' => $this->fields_values['time_period']['to_ts'],
	 		'output' => ['value'],
	 		'sortfield' => 'clock',
	 		'sortorder' => 'ASC'
		]);

		$points = [];

		foreach ($result as ['value' => $value]) {
			$location = json_decode($value, true);

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

	private function getName(?array $item): string {
		if ($this->getInput('name', '') !== '') {
			return $this->getInput('name');
		}

		if ($this->isTemplateDashboard() && !$this->fields_values['override_hostid']) {
			return $this->widget->getDefaultName();
		}

		$name = $item !== null ? $item['name'] : $this->widget->getDefaultName();

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
				$name = $hosts[0]['name'].NAME_DELIMITER.$name;
			}
		}

		return $name;
	}

	private function makeWidgetInfo(): array {
		$info = [];

		if ($this->hasInput('has_custom_time_period')) {
			$info[] = [
				'icon' => ZBX_ICON_TIME_PERIOD,
				'hint' => relativeDateToText($this->fields_values['time_period']['from'],
					$this->fields_values['time_period']['to']
				)
			];
		}

		return $info;
	}
}
