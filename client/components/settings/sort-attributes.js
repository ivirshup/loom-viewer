import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Glyphicon } from 'react-bootstrap';
import { DropdownMenu } from './dropdown';

import { setViewProps } from '../../actions/set-viewprops';

export class SortAttributeComponent extends Component {
	constructor(props) {
		super(props);
		const { dispatch, dataset, stateName, axis } = props;
		const path = dataset.path;

		this.onChange = (value) => {
			dispatch(setViewProps(dataset, {
				path,
				axis,
				sortAttrName: value,
				stateName,
			}));
		};
	}

	shouldComponentUpdate(nextProps) {
		return nextProps.dataset.viewState[nextProps.axis].order !==
			this.props.dataset.viewState[this.props.axis].order;
	}

	render() {
		const { dataset, axis } = this.props;
		const { allKeysNoUniques, dropdownOptions } = dataset[axis];
		// Show first four attributes to use as sort keys
		const { order } = dataset.viewState[axis];
		let sortOrderList = [(
			<DropdownMenu
				key={'dropdown'}
				value={order[0].key}
				options={allKeysNoUniques}
				filterOptions={dropdownOptions.allNoUniques}
				onChange={this.onChange} />
		)];
		for (let i = 0; i < Math.min(order.length, 5); i++) {
			const val = order[i];
			sortOrderList.push(
				<span key={i + 1}>
					&nbsp;&nbsp;&nbsp;
					{val.key}
					&nbsp;
					<Glyphicon
						glyph={val.asc ?
							'sort-by-attributes' : 'sort-by-attributes-alt'} />
				</span>
			);
		}

		return (
			<div className={'view-vertical'} >
				{sortOrderList}
			</div >
		);
	}
}

SortAttributeComponent.propTypes = {
	attributes: PropTypes.object.isRequired,
	attrKeys: PropTypes.array.isRequired,
	axis: PropTypes.string.isRequired,
	stateName: PropTypes.string.isRequired,
	dataset: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};