import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';

import { scatterPlot } from '../../plotters/scatterplot';
import { LandscapeSidepanel } from './landscape-sidepanel';

import { ViewInitialiser } from '../view-initialiser';
import { Canvas } from '../canvas';

import { firstMatchingKey } from '../../js/util';

class LandscapeMatrix extends PureComponent {
	componentWillMount() {
		const { xAttrs, yAttrs } = this.props.dataset.viewState.col;
		// filter out undefined attributes;
		let newXattrs = [];
		for (let i = 0; i < xAttrs.length; i++) {
			let attr = xAttrs[i];
			if (attr) {
				newXattrs.push(attr);
			}
		}
		let newYattrs = [];
		for (let i = 0; i < yAttrs.length; i++) {
			let attr = yAttrs[i];
			if (attr) {
				newYattrs.push(attr);
			}
		}

		let matrixChangedArr = [];
		for (let i = 0; i < xAttrs.length; i++) {
			matrixChangedArr.push(xAttrs[i].attr);
		}
		for (let i = 0; i < yAttrs.length; i++) {
			matrixChangedArr.push(yAttrs[i].attr);
		}
		const matrixChanged = matrixChangedArr.join('');

		this.setState({
			mounted: false,
			xAttrs: newXattrs,
			yAttrs: newYattrs,
			matrixChanged,
		});
	}

	componentDidMount() {
		this.setState({ mounted: true });
	}

	componentWillReceiveProps(nextProps) {
		const { xAttrs, yAttrs } = nextProps.dataset.viewState.col;
		// filter out undefined attributes;
		let newXattrs = [];
		for (let i = 0; i < xAttrs.length; i++) {
			let attr = xAttrs[i];
			if (attr) {
				newXattrs.push(attr);
			}
		}
		let newYattrs = [];
		for (let i = 0; i < yAttrs.length; i++) {
			let attr = yAttrs[i];
			if (attr) {
				newYattrs.push(attr);
			}
		}

		let matrixChangedArr = [];
		for (let i = 0; i < xAttrs.length; i++) {
			matrixChangedArr.push(xAttrs[i].attr);
		}
		for (let i = 0; i < yAttrs.length; i++) {
			matrixChangedArr.push(yAttrs[i].attr);
		}

		const matrixChanged = matrixChangedArr.join(''),
			mounted = matrixChanged === this.state.matrixChanged;

		this.setState({
			mounted,
			matrixChanged,
			xAttrs: newXattrs,
			yAttrs: newYattrs,
		});
	}

	componentDidUpdate() {
		if (!this.state.mounted) {
			this.setState({ mounted: true });
		}
	}

	render() {
		const { mounted, xAttrs, yAttrs } = this.state;
		if (mounted) {
			const { dataset } = this.props;
			const {
				colorAttr,
				colorMode,
				ascendingIndices,
				settings,
			} = dataset.viewState.col;

			const el = this.refs.landscapeContainer;
			// Avoid triggering scrollbars
			const containerW = el.clientWidth - 20;
			const containerH = el.clientHeight - 20;

			const { col } = dataset;
			const color = col.attrs[colorAttr];
			let matrix = [];
			const xLength = xAttrs.length,
				yLength = yAttrs.length;
			for (let j = 0; j < yLength; j++) {
				const rowW = containerW;
				const rowH = ((containerH * (j + 1) / yLength) | 0) -
					((containerH * j / yLength) | 0);
				let _row = [];
				for (let i = 0; i < xLength; i++) {
					const canvasW = ((containerW * (i + 1) / xLength) | 0) -
						((containerW * i / xLength) | 0) - 2;
					const canvasH = rowH - 2;
					const xAttr =
						xAttrs[i],
						yAttr = yAttrs[j],
						x = col.attrs[xAttr.attr],
						y = col.attrs[yAttr.attr],
						scatterPlotSettings = {
							colorMode,
							logX: xAttr.logScale,
							logY: yAttr.logScale,
							jitter: {
								x: xAttr.jitter,
								y: yAttr.jitter,
							},
						};
					_row.push(
						<Canvas
							key={`${j}_${yAttrs[j].attr}_${i}_${xAttrs[i].attr}`}
							style={{
								border: '1px solid lightgrey',
								flex: '0 0 auto',
								margin: '1px',
							}}
							width={canvasW}
							height={canvasH}
							paint={scatterPlot(x, y, color, ascendingIndices, settings, scatterPlotSettings)}
							redraw
							clear
						/>
					);

				}
				matrix.push(
					<div
						key={'row_' + j}
						className={'view'}
						style={{
							flex: '0 0 auto',
							minWidth: `${rowW}px`,
							maxWidth: `${rowW}px`,
							minHeight: `${rowH}px`,
							maxHeight: `${rowH}px`,
						}}>
						{_row}
					</div>
				);
			}

			return (
				<div className='view-vertical' ref='landscapeContainer'>
					{matrix}
				</div>
			);
		} else {
			return (
				<div className='view centred' ref='landscapeContainer'>
					Initialising Landscape
				</div>
			);
		}
	}
}

LandscapeMatrix.propTypes = {
	// Passed down by ViewInitialiser
	dataset: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};

class LandscapeComponent extends PureComponent {
	render() {
		const { dispatch, dataset } = this.props;

		return (
			<div className='view' style={{ overflowX: 'hidden', minHeight: 0 }}>
				<LandscapeSidepanel
					style={{
						overflowX: 'hidden',
						overFlowY: 'hidden',
						minHeight: 0,
						width: '300px',
						margin: '10px',
					}}
					dataset={dataset}
					dispatch={dispatch}
				/>
				<LandscapeMatrix
					dataset={dataset}
					dispatch={dispatch}
				/>
			</div>
		);
	}
}

LandscapeComponent.propTypes = {
	dataset: PropTypes.object.isRequired,
	dispatch: PropTypes.func.isRequired,
};

const stateInitialiser = (dataset) => {
	// Initialise landscapeState for this dataset
	const attrs = dataset.col.attrs;
	return {
		landscapeInitialized: true,
		col: {
			xAttrs: [{
				attr: firstMatchingKey(attrs, ['_X', 'X', 'SFDP_X', '_tSNE1', '_PCA1', '_LogMean']),
				jitter: false,
				logScale: false,
			}],
			yAttrs: [{
				attr: firstMatchingKey(attrs, ['_Y', 'Y', 'SFDP_Y', '_tSNE2', '_PCA2', '_LogCV']),
				jitter: false,
				logScale: false,
			}],
			colorAttr: firstMatchingKey(attrs, ['Clusters', 'Class', 'Louvain_Jaccard', '_KMeans_10']),
			colorMode: 'Categorical',
			settings: {
				scaleFactor: 40,
				lowerBound: 0,
				upperBound: 100,
				logScale: true,
				clip: false,
			},
		},
	};
};

export class LandscapeViewInitialiser extends PureComponent {
	render() {
		return (
			<ViewInitialiser
				View={LandscapeComponent}
				stateName={'landscapeInitialized'}
				stateInitialiser={stateInitialiser}
				dispatch={this.props.dispatch}
				params={this.props.params}
				datasets={this.props.datasets} />
		);
	}
}

LandscapeViewInitialiser.propTypes = {
	params: PropTypes.object.isRequired,
	datasets: PropTypes.object,
	dispatch: PropTypes.func.isRequired,
};

import { connect } from 'react-redux';

// react-router-redux passes URL parameters
// through ownProps.params. See also:
// https://github.com/reactjs/react-router-redux#how-do-i-access-router-state-in-a-container-component
const mapStateToProps = (state, ownProps) => {
	return {
		params: ownProps.params,
		datasets: state.datasets.list,
	};
};

export const LandscapeView = connect(mapStateToProps)(LandscapeViewInitialiser);