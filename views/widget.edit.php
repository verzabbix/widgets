<?php declare(strict_types = 0);

/**
 * @var CView $this
 * @var array $data
 */

// The presentation of the Route widget configuration form.

(new CWidgetFormView($data))
	->addField(
		(new CWidgetFieldMultiSelectItemView($data['fields']['itemid']))
			// Only allow selection of string-typed items.
			->setPopupParameter('value_types', [ITEM_VALUE_TYPE_STR])
	)
	->addField(
		(new CWidgetFieldTimePeriodView($data['fields']['time_period']))
			->setDateFormat(ZBX_FULL_DATE_TIME)
			->setFromPlaceholder(_('YYYY-MM-DD hh:mm:ss'))
			->setToPlaceholder(_('YYYY-MM-DD hh:mm:ss'))
	)
	// Provide the host override selection option only for the global dashboards.
	->addField($data['templateid'] === null
		? new CWidgetFieldMultiSelectOverrideHostView($data['fields']['override_hostid'])
		: null
	)
	->show();
