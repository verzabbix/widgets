<?php declare(strict_types = 0);

namespace Modules\WMRoute\Includes;

use Zabbix\Widgets\{
	CWidgetField,
	CWidgetForm
};

use Zabbix\Widgets\Fields\{
	CWidgetFieldMultiSelectItem,
	CWidgetFieldMultiSelectOverrideHost,
	CWidgetFieldTimePeriod
};

use CWidgetsData;

/**
 * Custom configuration class for the Route widget.
 *
 * The class defines the configuration data structure along with the validation rules of the widget.
 */
class WidgetForm extends CWidgetForm {

	/**
	 * Specify the configuration fields of the widget.
	 *
	 * Invoked by the dashboard framework.
	 *
	 * @return static
	 */
	public function addFields(): self {
		return $this
			->addField(
				// Add an item selection field to the configuration.
				(new CWidgetFieldMultiSelectItem('itemid', _('Item')))
					// Mark as required.
					->setFlags(CWidgetField::FLAG_LABEL_ASTERISK)
					// Only allow a single item selection.
					->setMultiple(false)
			)
			->addField(
				// Add a time period selection field to the configuration.
				(new CWidgetFieldTimePeriod('time_period', _('Time period')))
					// Configure the field for taking the time period from the dashboard time selector by default.
					->setDefault([
						CWidgetField::FOREIGN_REFERENCE_KEY => CWidgetField::createTypedReference(
							CWidgetField::REFERENCE_DASHBOARD, CWidgetsData::DATA_TYPE_TIME_PERIOD
						)
					])
					// Configure the default time period if the user chooses to enter the exact time period.
					->setDefaultPeriod(['from' => 'now/d', 'to' => 'now'])
					// Make the field mandatory.
					->setFlags(CWidgetField::FLAG_NOT_EMPTY | CWidgetField::FLAG_LABEL_ASTERISK)
			)
			->addField(
				// Add a host override field to the configuration.
				new CWidgetFieldMultiSelectOverrideHost()
			);
	}
}
